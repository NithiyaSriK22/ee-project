"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DoctorReviewRepository = void 0;
exports.checkDatabaseAvailability = checkDatabaseAvailability;
const prisma_js_1 = require("../../database/prisma.js");
const logger_js_1 = require("../../config/logger.js");
const dev_fallback_doctor_review_store_js_1 = require("./dev-fallback-doctor-review-store.js");
const doctor_review_types_js_1 = require("./doctor-review.types.js");
async function checkDatabaseAvailability() {
    return (0, prisma_js_1.checkDatabaseHealth)();
}
class DoctorReviewRepository {
    // ============================================================================
    // QUEUE OPERATIONS
    // ============================================================================
    static async upsertQueueEntry(entry) {
        const available = await checkDatabaseAvailability();
        if (available) {
            try {
                const row = await prisma_js_1.prisma.visitQueueEntry.upsert({
                    where: { visit_id: entry.visitId },
                    create: {
                        visit_id: entry.visitId,
                        department: entry.department || 'General Medicine',
                        assigned_doctor_id: entry.assignedDoctorId || null,
                        queue_status: entry.queueStatus || doctor_review_types_js_1.QueueStatuses.WAITING,
                        has_open_alert: entry.hasOpenAlert ?? false,
                        ready_at: entry.readyAt ? new Date(entry.readyAt) : new Date(),
                    },
                    update: {
                        department: entry.department,
                        assigned_doctor_id: entry.assignedDoctorId,
                        queue_status: entry.queueStatus,
                        has_open_alert: entry.hasOpenAlert,
                        ready_at: entry.readyAt ? new Date(entry.readyAt) : undefined,
                    },
                });
                dev_fallback_doctor_review_store_js_1.devFallbackDoctorReviewStore.upsertQueueEntry(entry);
                return {
                    id: row.id,
                    visitId: row.visit_id,
                    department: row.department,
                    assignedDoctorId: row.assigned_doctor_id,
                    queueStatus: row.queue_status,
                    hasOpenAlert: row.has_open_alert,
                    readyAt: row.ready_at,
                    patientTokenOrName: entry.patientTokenOrName || `Token #${row.visit_id.substring(0, 4).toUpperCase()}`,
                    patientAge: entry.patientAge,
                    patientGender: entry.patientGender,
                    createdAt: row.created_at,
                    updatedAt: row.updated_at,
                };
            }
            catch (err) {
                logger_js_1.logger.warn('Database error in upsertQueueEntry, falling back to memory store', { error: err.message });
            }
        }
        return dev_fallback_doctor_review_store_js_1.devFallbackDoctorReviewStore.upsertQueueEntry(entry);
    }
    static async getQueueEntry(visitId) {
        const available = await checkDatabaseAvailability();
        if (available) {
            try {
                const row = await prisma_js_1.prisma.visitQueueEntry.findUnique({
                    where: { visit_id: visitId },
                });
                if (row) {
                    return {
                        id: row.id,
                        visitId: row.visit_id,
                        department: row.department,
                        assignedDoctorId: row.assigned_doctor_id,
                        queueStatus: row.queue_status,
                        hasOpenAlert: row.has_open_alert,
                        readyAt: row.ready_at,
                        patientTokenOrName: `Token #${row.visit_id.substring(0, 4).toUpperCase()}`,
                        createdAt: row.created_at,
                        updatedAt: row.updated_at,
                    };
                }
            }
            catch (err) {
                logger_js_1.logger.warn('Database error in getQueueEntry', { error: err.message });
            }
        }
        return dev_fallback_doctor_review_store_js_1.devFallbackDoctorReviewStore.getQueueEntry(visitId);
    }
    static async listQueue(filters) {
        const available = await checkDatabaseAvailability();
        if (available) {
            try {
                const where = {};
                if (filters?.department) {
                    const cleanDept = filters.department.replace(/^(department of\s*|opd\s*)/i, '').trim();
                    const segments = cleanDept.split('&').map((s) => s.trim()).filter(Boolean);
                    if (segments.length > 1) {
                        where.OR = segments.map((seg) => ({
                            department: { contains: seg, mode: 'insensitive' },
                        }));
                    }
                    else {
                        where.department = {
                            contains: cleanDept,
                            mode: 'insensitive',
                        };
                    }
                }
                if (filters?.assignedDoctorId)
                    where.assigned_doctor_id = filters.assignedDoctorId;
                if (filters?.status)
                    where.queue_status = filters.status;
                const rows = await prisma_js_1.prisma.visitQueueEntry.findMany({
                    where,
                    orderBy: [{ has_open_alert: 'desc' }, { ready_at: 'asc' }],
                });
                if (rows.length > 0) {
                    const mapped = await Promise.all(rows.map(async (r) => {
                        let patientName = `Token #${r.visit_id.substring(0, 4).toUpperCase()}`;
                        let patientRegNumber = null;
                        let patientAge = null;
                        let patientGender = null;
                        try {
                            const profile = await prisma_js_1.prisma.patientVisitProfile.findFirst({
                                where: { visit_id: r.visit_id },
                                include: { patient: true },
                            });
                            if (profile?.patient) {
                                patientName = profile.patient.full_name;
                                patientRegNumber = profile.patient.hospital_registration_number;
                                patientAge = profile.patient.age;
                                patientGender = profile.patient.gender;
                            }
                        }
                        catch { }
                        // Retrieve actual chief complaint from interview answers or clinical summary
                        let chiefComplaint = null;
                        try {
                            const ccAnswer = await prisma_js_1.prisma.interviewAnswer.findFirst({
                                where: {
                                    visit_id: r.visit_id,
                                    question: {
                                        OR: [
                                            { question_code: 'CHIEF_COMPLAINT_PRIMARY' },
                                            { section: 'CHIEF_COMPLAINT' },
                                        ],
                                    },
                                    is_skipped: false,
                                },
                                select: { answer_value: true },
                            });
                            if (ccAnswer?.answer_value) {
                                if (typeof ccAnswer.answer_value === 'string') {
                                    chiefComplaint = ccAnswer.answer_value;
                                }
                                else if (typeof ccAnswer.answer_value === 'object') {
                                    chiefComplaint =
                                        ccAnswer.answer_value.text ||
                                            ccAnswer.answer_value.value ||
                                            String(ccAnswer.answer_value);
                                }
                            }
                        }
                        catch { }
                        if (!chiefComplaint) {
                            try {
                                const summary = await prisma_js_1.prisma.clinicalSummary.findFirst({
                                    where: { visit_id: r.visit_id },
                                    include: {
                                        sections: {
                                            where: { section: 'CHIEF_COMPLAINT' },
                                            include: { statements: true },
                                        },
                                    },
                                });
                                const stmt = summary?.sections?.[0]?.statements?.[0]?.text;
                                if (stmt && !stmt.startsWith('[No information') && !stmt.startsWith('[Question skipped')) {
                                    chiefComplaint = stmt;
                                }
                            }
                            catch { }
                        }
                        const formattedTokenOrName = patientRegNumber
                            ? `${patientName} (${patientRegNumber})`
                            : patientName;
                        return {
                            id: r.id,
                            visitId: r.visit_id,
                            department: r.department,
                            assignedDoctorId: r.assigned_doctor_id,
                            queueStatus: r.queue_status,
                            hasOpenAlert: r.has_open_alert,
                            readyAt: r.ready_at,
                            patientTokenOrName: formattedTokenOrName,
                            patientName,
                            patientRegistrationNumber: patientRegNumber,
                            patientAge,
                            patientGender,
                            chiefComplaint: chiefComplaint || (r.queue_status === 'COMPLETED' ? 'Consultation completed' : 'General clinical consultation'),
                            createdAt: r.created_at,
                            updatedAt: r.updated_at,
                        };
                    }));
                    return mapped;
                }
            }
            catch (err) {
                logger_js_1.logger.warn('Database error in listQueue, using fallback', { error: err.message });
            }
        }
        const fallbackList = dev_fallback_doctor_review_store_js_1.devFallbackDoctorReviewStore.listQueue(filters);
        return fallbackList;
    }
    /**
     * Calculates live dashboard statistics directly from authoritative PostgreSQL records
     */
    static async getDashboardStats(department) {
        const available = await checkDatabaseAvailability();
        if (available) {
            try {
                const startOfMonth = new Date();
                startOfMonth.setDate(1);
                startOfMonth.setHours(0, 0, 0, 0);
                const whereQueueDept = {};
                if (department) {
                    const cleanDept = department.replace(/^(department of\s*|opd\s*)/i, '').trim();
                    const segments = cleanDept.split('&').map((s) => s.trim()).filter(Boolean);
                    if (segments.length > 1) {
                        whereQueueDept.OR = segments.map((seg) => ({
                            department: { contains: seg, mode: 'insensitive' },
                        }));
                    }
                    else {
                        whereQueueDept.department = { contains: cleanDept, mode: 'insensitive' };
                    }
                }
                const [activeQueueCount, pendingSummariesCount, redFlagsCount, confirmedRecordsCount] = await Promise.all([
                    prisma_js_1.prisma.visitQueueEntry.count({
                        where: {
                            ...whereQueueDept,
                            queue_status: { in: [doctor_review_types_js_1.QueueStatuses.WAITING, doctor_review_types_js_1.QueueStatuses.READY_FOR_REVIEW, doctor_review_types_js_1.QueueStatuses.IN_CONSULTATION] },
                        },
                    }),
                    prisma_js_1.prisma.clinicalSummary.count({
                        where: {
                            status: { in: ['PENDING_DOCTOR_REVIEW', 'IN_REVIEW'] },
                        },
                    }),
                    prisma_js_1.prisma.redFlagAlert.count({
                        where: {
                            status: { in: ['RAISED', 'IN_ASSESSMENT'] },
                        },
                    }),
                    prisma_js_1.prisma.confirmedRecord.count({
                        where: {
                            created_at: { gte: startOfMonth },
                        },
                    }),
                ]);
                // Compute real average intake time from completed interview sessions
                let avgIntake = 3.2;
                try {
                    const sessions = await prisma_js_1.prisma.interviewSession.findMany({
                        where: { completed_at: { not: null } },
                        select: { started_at: true, completed_at: true },
                        take: 20,
                    });
                    if (sessions.length > 0) {
                        const totalDiff = sessions.reduce((acc, s) => {
                            const diffMs = (s.completed_at?.getTime() || 0) - s.started_at.getTime();
                            return acc + (diffMs > 0 && diffMs < 1800000 ? diffMs : 180000);
                        }, 0);
                        avgIntake = Math.round((totalDiff / sessions.length / 60000) * 10) / 10;
                    }
                }
                catch { }
                return {
                    patientsInQueue: {
                        count: activeQueueCount,
                        label: 'Patients in Queue',
                        subtext: 'Ready for intake',
                        avgIntakeMinutes: avgIntake > 0 ? avgIntake : 3.2,
                    },
                    pendingReviews: {
                        count: pendingSummariesCount,
                        label: 'Pending Reviews',
                        subtext: 'Draft summaries',
                        footer: 'Awaiting your confirmation',
                    },
                    redFlagAlerts: {
                        count: redFlagsCount,
                        label: 'Red-Flag Alerts',
                        subtext: 'Active screening',
                        footer: 'Requires attention',
                    },
                    confirmedRecords: {
                        count: confirmedRecordsCount,
                        label: 'Confirmed Records',
                        subtext: 'This month',
                        footer: 'Saved to OPD history',
                    },
                };
            }
            catch (err) {
                logger_js_1.logger.warn('Database error in getDashboardStats, calculating from in-memory store', {
                    error: err.message,
                });
            }
        }
        const fallbackQueue = dev_fallback_doctor_review_store_js_1.devFallbackDoctorReviewStore.listQueue();
        const waitingOrReady = fallbackQueue.filter((q) => q.queueStatus === 'WAITING' || q.queueStatus === 'READY_FOR_REVIEW').length;
        const inReview = fallbackQueue.filter((q) => q.queueStatus === 'READY_FOR_REVIEW').length;
        const alerts = fallbackQueue.filter((q) => q.hasOpenAlert).length;
        return {
            patientsInQueue: {
                count: waitingOrReady,
                label: 'Patients in Queue',
                subtext: 'Ready for intake',
                avgIntakeMinutes: 3.2,
            },
            pendingReviews: {
                count: inReview > 0 ? inReview : 1,
                label: 'Pending Reviews',
                subtext: 'Draft summaries',
                footer: 'Awaiting your confirmation',
            },
            redFlagAlerts: {
                count: alerts,
                label: 'Red-Flag Alerts',
                subtext: 'Active screening',
                footer: 'Requires attention',
            },
            confirmedRecords: {
                count: 0,
                label: 'Confirmed Records',
                subtext: 'This month',
                footer: 'Saved to OPD history',
            },
        };
    }
    /**
     * Adds an authenticated physician quick note attached to a patient visit
     */
    static async createQuickNote(data) {
        const auditId = crypto.randomUUID();
        const available = await checkDatabaseAvailability();
        if (available) {
            try {
                await prisma_js_1.prisma.auditLog.create({
                    data: {
                        id: auditId,
                        actor_type: 'STAFF',
                        actor_id: data.doctorId,
                        actor_role: 'DOCTOR',
                        action: 'DOCTOR_QUICK_NOTE_ADDED',
                        entity_type: 'VISIT',
                        entity_id: data.visitId,
                        visit_ref: data.visitId,
                        result: 'SUCCESS',
                        reason_text: data.noteText,
                        metadata: {
                            doctorName: data.doctorName,
                            noteText: data.noteText,
                        },
                    },
                });
            }
            catch (err) {
                logger_js_1.logger.warn('Failed to record quick note audit in DB', { error: err?.message });
            }
        }
        return {
            id: auditId,
            visitId: data.visitId,
            noteText: data.noteText,
            doctorName: data.doctorName,
            createdAt: new Date(),
        };
    }
    // ============================================================================
    // CLAIMS (Soft Concurrency Locks)
    // ============================================================================
    static async getClaim(visitId) {
        const available = await checkDatabaseAvailability();
        if (available) {
            try {
                const row = await prisma_js_1.prisma.reviewClaim.findUnique({
                    where: { visit_id: visitId },
                });
                if (row) {
                    if (new Date() > row.expires_at) {
                        await prisma_js_1.prisma.reviewClaim.delete({ where: { visit_id: visitId } }).catch(() => { });
                        return null;
                    }
                    return {
                        id: row.id,
                        visitId: row.visit_id,
                        claimedByDoctorId: row.claimed_by_doctor_id,
                        claimedByDoctorName: row.claimed_by_doctor_name,
                        claimedAt: row.claimed_at,
                        expiresAt: row.expires_at,
                    };
                }
            }
            catch (err) {
                logger_js_1.logger.warn('Database error in getClaim', { error: err.message });
            }
        }
        return dev_fallback_doctor_review_store_js_1.devFallbackDoctorReviewStore.getClaim(visitId);
    }
    static async setClaim(visitId, doctorId, doctorName, ttlMs = 15 * 60 * 1000) {
        const available = await checkDatabaseAvailability();
        if (available) {
            try {
                const row = await prisma_js_1.prisma.reviewClaim.upsert({
                    where: { visit_id: visitId },
                    create: {
                        visit_id: visitId,
                        claimed_by_doctor_id: doctorId,
                        claimed_by_doctor_name: doctorName,
                        claimed_at: new Date(),
                        expires_at: new Date(Date.now() + ttlMs),
                    },
                    update: {
                        claimed_by_doctor_id: doctorId,
                        claimed_by_doctor_name: doctorName,
                        claimed_at: new Date(),
                        expires_at: new Date(Date.now() + ttlMs),
                    },
                });
                return {
                    id: row.id,
                    visitId: row.visit_id,
                    claimedByDoctorId: row.claimed_by_doctor_id,
                    claimedByDoctorName: row.claimed_by_doctor_name,
                    claimedAt: row.claimed_at,
                    expiresAt: row.expires_at,
                };
            }
            catch (err) {
                logger_js_1.logger.warn('Database error in setClaim', { error: err.message });
            }
        }
        return dev_fallback_doctor_review_store_js_1.devFallbackDoctorReviewStore.setClaim(visitId, doctorId, doctorName, ttlMs);
    }
    static async releaseClaim(visitId, doctorId) {
        const available = await checkDatabaseAvailability();
        if (available) {
            try {
                const claim = await prisma_js_1.prisma.reviewClaim.findUnique({ where: { visit_id: visitId } });
                if (!claim)
                    return true;
                if (doctorId && claim.claimed_by_doctor_id !== doctorId) {
                    return false;
                }
                await prisma_js_1.prisma.reviewClaim.delete({ where: { visit_id: visitId } });
                return true;
            }
            catch (err) {
                logger_js_1.logger.warn('Database error in releaseClaim', { error: err.message });
            }
        }
        return dev_fallback_doctor_review_store_js_1.devFallbackDoctorReviewStore.releaseClaim(visitId, doctorId);
    }
    // ============================================================================
    // DOCTOR REVIEWS & REVIEW SESSIONS
    // ============================================================================
    static async createReview(data) {
        const available = await checkDatabaseAvailability();
        if (available) {
            try {
                const row = await prisma_js_1.prisma.doctorReview.create({
                    data: {
                        visit_id: data.visitId,
                        base_summary_id: data.baseSummaryId || null,
                        base_summary_version: data.baseSummaryVersion,
                        created_by_doctor_id: data.doctorId,
                        status: doctor_review_types_js_1.DoctorReviewStatuses.IN_REVIEW,
                    },
                });
                return {
                    id: row.id,
                    visitId: row.visit_id,
                    baseSummaryId: row.base_summary_id,
                    baseSummaryVersion: row.base_summary_version,
                    status: row.status,
                    rejectionReason: null,
                    rejectionNote: null,
                    createdByDoctorId: row.created_by_doctor_id,
                    createdAt: row.created_at,
                    updatedAt: row.updated_at,
                };
            }
            catch (err) {
                logger_js_1.logger.warn('Database error in createReview', { error: err.message });
            }
        }
        return dev_fallback_doctor_review_store_js_1.devFallbackDoctorReviewStore.createReview(data);
    }
    static async getReviewById(reviewId) {
        const available = await checkDatabaseAvailability();
        if (available) {
            try {
                const row = await prisma_js_1.prisma.doctorReview.findUnique({
                    where: { id: reviewId },
                });
                if (row) {
                    return {
                        id: row.id,
                        visitId: row.visit_id,
                        baseSummaryId: row.base_summary_id,
                        baseSummaryVersion: row.base_summary_version,
                        status: row.status,
                        rejectionReason: row.rejection_reason,
                        rejectionNote: row.rejection_note,
                        createdByDoctorId: row.created_by_doctor_id,
                        createdAt: row.created_at,
                        updatedAt: row.updated_at,
                    };
                }
            }
            catch (err) {
                logger_js_1.logger.warn('Database error in getReviewById', { error: err.message });
            }
        }
        return dev_fallback_doctor_review_store_js_1.devFallbackDoctorReviewStore.getReviewById(reviewId);
    }
    static async getActiveReviewByVisitId(visitId) {
        const available = await checkDatabaseAvailability();
        if (available) {
            try {
                const row = await prisma_js_1.prisma.doctorReview.findFirst({
                    where: { visit_id: visitId, status: doctor_review_types_js_1.DoctorReviewStatuses.IN_REVIEW },
                    orderBy: { created_at: 'desc' },
                });
                if (row) {
                    return {
                        id: row.id,
                        visitId: row.visit_id,
                        baseSummaryId: row.base_summary_id,
                        baseSummaryVersion: row.base_summary_version,
                        status: row.status,
                        rejectionReason: row.rejection_reason,
                        rejectionNote: row.rejection_note,
                        createdByDoctorId: row.created_by_doctor_id,
                        createdAt: row.created_at,
                        updatedAt: row.updated_at,
                    };
                }
            }
            catch (err) {
                logger_js_1.logger.warn('Database error in getActiveReviewByVisitId', { error: err.message });
            }
        }
        return dev_fallback_doctor_review_store_js_1.devFallbackDoctorReviewStore.getActiveReviewByVisitId(visitId);
    }
    static async updateReviewStatus(reviewId, status, rejection) {
        const available = await checkDatabaseAvailability();
        if (available) {
            try {
                const row = await prisma_js_1.prisma.doctorReview.update({
                    where: { id: reviewId },
                    data: {
                        status,
                        rejection_reason: rejection?.reason,
                        rejection_note: rejection?.note,
                    },
                });
                return {
                    id: row.id,
                    visitId: row.visit_id,
                    baseSummaryId: row.base_summary_id,
                    baseSummaryVersion: row.base_summary_version,
                    status: row.status,
                    rejectionReason: row.rejection_reason,
                    rejectionNote: row.rejection_note,
                    createdByDoctorId: row.created_by_doctor_id,
                    createdAt: row.created_at,
                    updatedAt: row.updated_at,
                };
            }
            catch (err) {
                logger_js_1.logger.warn('Database error in updateReviewStatus', { error: err.message });
            }
        }
        return dev_fallback_doctor_review_store_js_1.devFallbackDoctorReviewStore.updateReviewStatus(reviewId, status, rejection);
    }
    // ============================================================================
    // RESOLUTIONS
    // ============================================================================
    static async saveResolution(resolution) {
        const available = await checkDatabaseAvailability();
        if (available) {
            try {
                const row = await prisma_js_1.prisma.reviewItemResolution.create({
                    data: {
                        review_id: resolution.reviewId,
                        item_ref: resolution.itemRef,
                        item_type: resolution.itemType,
                        resolution_type: resolution.resolutionType,
                        corrected_value: resolution.correctedValue,
                        source_hash: resolution.sourceHash,
                        viewed_source: resolution.viewedSource,
                        doctor_id: resolution.doctorId,
                    },
                });
                return {
                    id: row.id,
                    reviewId: row.review_id,
                    itemRef: row.item_ref,
                    itemType: row.item_type,
                    resolutionType: row.resolution_type,
                    correctedValue: row.corrected_value,
                    sourceHash: row.source_hash,
                    viewedSource: row.viewed_source,
                    doctorId: row.doctor_id,
                    resolvedAt: row.resolved_at,
                };
            }
            catch (err) {
                logger_js_1.logger.warn('Database error in saveResolution', { error: err.message });
            }
        }
        return dev_fallback_doctor_review_store_js_1.devFallbackDoctorReviewStore.saveResolution(resolution);
    }
    static async getResolutions(reviewId) {
        const available = await checkDatabaseAvailability();
        if (available) {
            try {
                const rows = await prisma_js_1.prisma.reviewItemResolution.findMany({
                    where: { review_id: reviewId },
                });
                return rows.map((r) => ({
                    id: r.id,
                    reviewId: r.review_id,
                    itemRef: r.item_ref,
                    itemType: r.item_type,
                    resolutionType: r.resolution_type,
                    correctedValue: r.corrected_value,
                    sourceHash: r.source_hash,
                    viewedSource: r.viewed_source,
                    doctorId: r.doctor_id,
                    resolvedAt: r.resolved_at,
                }));
            }
            catch (err) {
                logger_js_1.logger.warn('Database error in getResolutions', { error: err.message });
            }
        }
        return dev_fallback_doctor_review_store_js_1.devFallbackDoctorReviewStore.getResolutions(reviewId);
    }
    // ============================================================================
    // EDITS, ADDITIONS & REMOVALS
    // ============================================================================
    static async saveStatementEdit(edit) {
        const available = await checkDatabaseAvailability();
        if (available) {
            try {
                const row = await prisma_js_1.prisma.statementEdit.create({
                    data: {
                        review_id: edit.reviewId,
                        original_statement_id: edit.originalStatementId,
                        edited_text: edit.editedText,
                        previous_text_ref: edit.previousTextRef,
                        doctor_id: edit.doctorId,
                    },
                });
                return {
                    id: row.id,
                    reviewId: row.review_id,
                    originalStatementId: row.original_statement_id,
                    editedText: row.edited_text,
                    previousTextRef: row.previous_text_ref,
                    doctorId: row.doctor_id,
                    createdAt: row.created_at,
                };
            }
            catch (err) {
                logger_js_1.logger.warn('Database error in saveStatementEdit', { error: err.message });
            }
        }
        return dev_fallback_doctor_review_store_js_1.devFallbackDoctorReviewStore.saveStatementEdit(edit);
    }
    static async getStatementEdits(reviewId) {
        const available = await checkDatabaseAvailability();
        if (available) {
            try {
                const rows = await prisma_js_1.prisma.statementEdit.findMany({
                    where: { review_id: reviewId },
                });
                return rows.map((r) => ({
                    id: r.id,
                    reviewId: r.review_id,
                    originalStatementId: r.original_statement_id,
                    editedText: r.edited_text,
                    previousTextRef: r.previous_text_ref,
                    doctorId: r.doctor_id,
                    createdAt: r.created_at,
                }));
            }
            catch (err) {
                logger_js_1.logger.warn('Database error in getStatementEdits', { error: err.message });
            }
        }
        return dev_fallback_doctor_review_store_js_1.devFallbackDoctorReviewStore.getStatementEdits(reviewId);
    }
    static async addDoctorStatement(stmt) {
        const available = await checkDatabaseAvailability();
        if (available) {
            try {
                const row = await prisma_js_1.prisma.doctorAddedStatement.create({
                    data: {
                        review_id: stmt.reviewId,
                        section: stmt.section,
                        text: stmt.text,
                        order: stmt.order,
                        doctor_id: stmt.doctorId,
                    },
                });
                return {
                    id: row.id,
                    reviewId: row.review_id,
                    section: row.section,
                    text: row.text,
                    order: row.order,
                    doctorId: row.doctor_id,
                    createdAt: row.created_at,
                };
            }
            catch (err) {
                logger_js_1.logger.warn('Database error in addDoctorStatement', { error: err.message });
            }
        }
        return dev_fallback_doctor_review_store_js_1.devFallbackDoctorReviewStore.addDoctorStatement(stmt);
    }
    static async getDoctorAddedStatements(reviewId) {
        const available = await checkDatabaseAvailability();
        if (available) {
            try {
                const rows = await prisma_js_1.prisma.doctorAddedStatement.findMany({
                    where: { review_id: reviewId },
                    orderBy: { order: 'asc' },
                });
                return rows.map((r) => ({
                    id: r.id,
                    reviewId: r.review_id,
                    section: r.section,
                    text: r.text,
                    order: r.order,
                    doctorId: r.doctor_id,
                    createdAt: r.created_at,
                }));
            }
            catch (err) {
                logger_js_1.logger.warn('Database error in getDoctorAddedStatements', { error: err.message });
            }
        }
        return dev_fallback_doctor_review_store_js_1.devFallbackDoctorReviewStore.getDoctorAddedStatements(reviewId);
    }
    static async removeStatement(reviewId, statementId) {
        dev_fallback_doctor_review_store_js_1.devFallbackDoctorReviewStore.removeStatement(reviewId, statementId);
    }
    static async getRemovedStatementIds(reviewId) {
        return dev_fallback_doctor_review_store_js_1.devFallbackDoctorReviewStore.getRemovedStatementIds(reviewId);
    }
    // ============================================================================
    // CONFIRMED RECORDS & AMENDMENTS (Atomic Transactions)
    // ============================================================================
    static async createConfirmedRecord(record) {
        const available = await checkDatabaseAvailability();
        if (available) {
            try {
                const created = await prisma_js_1.prisma.$transaction(async (tx) => {
                    const rec = await tx.confirmedRecord.create({
                        data: {
                            visit_id: record.visitId,
                            version: record.version,
                            based_on_summary_id: record.basedOnSummaryId || null,
                            summary_version: record.summaryVersion,
                            review_policy_version: record.reviewPolicyVersion,
                            confirmed_by_doctor_id: record.confirmedByDoctorId,
                            confirmed_by_doctor_name: record.confirmedByDoctorName,
                            attestation_version: record.attestationVersion,
                            attestation_text: record.attestationText,
                            supersedes_id: record.supersedesId || null,
                            amendment_reason: record.amendmentReason || null,
                            statements: {
                                create: record.statements.map((s, idx) => ({
                                    section: s.section,
                                    text: s.text,
                                    origin: s.origin,
                                    order: s.order ?? idx,
                                    ai_statement_id: s.aiStatementId,
                                    resolution_type: s.resolutionType,
                                    source_refs: s.sourceRefs ? s.sourceRefs : undefined,
                                })),
                            },
                        },
                        include: {
                            statements: true,
                        },
                    });
                    return rec;
                });
                return {
                    id: created.id,
                    visitId: created.visit_id,
                    version: created.version,
                    basedOnSummaryId: created.based_on_summary_id,
                    summaryVersion: created.summary_version,
                    reviewPolicyVersion: created.review_policy_version,
                    confirmedByDoctorId: created.confirmed_by_doctor_id,
                    confirmedByDoctorName: created.confirmed_by_doctor_name,
                    confirmedAt: created.confirmed_at,
                    attestationVersion: created.attestation_version,
                    attestationText: created.attestation_text,
                    supersedesId: created.supersedes_id,
                    amendmentReason: created.amendment_reason,
                    statements: created.statements.map((s) => ({
                        id: s.id,
                        recordId: s.record_id,
                        section: s.section,
                        text: s.text,
                        origin: s.origin,
                        order: s.order,
                        aiStatementId: s.ai_statement_id,
                        resolutionType: s.resolution_type,
                        sourceRefs: s.source_refs,
                        createdAt: s.created_at,
                    })),
                    createdAt: created.created_at,
                };
            }
            catch (err) {
                logger_js_1.logger.warn('Database error in createConfirmedRecord transaction', { error: err.message });
            }
        }
        return dev_fallback_doctor_review_store_js_1.devFallbackDoctorReviewStore.createConfirmedRecord(record);
    }
    static async getLatestConfirmedRecord(visitId) {
        const available = await checkDatabaseAvailability();
        if (available) {
            try {
                const row = await prisma_js_1.prisma.confirmedRecord.findFirst({
                    where: { visit_id: visitId },
                    orderBy: { version: 'desc' },
                    include: { statements: { orderBy: { order: 'asc' } } },
                });
                if (row) {
                    return {
                        id: row.id,
                        visitId: row.visit_id,
                        version: row.version,
                        basedOnSummaryId: row.based_on_summary_id,
                        summaryVersion: row.summary_version,
                        reviewPolicyVersion: row.review_policy_version,
                        confirmedByDoctorId: row.confirmed_by_doctor_id,
                        confirmedByDoctorName: row.confirmed_by_doctor_name,
                        confirmedAt: row.confirmed_at,
                        attestationVersion: row.attestation_version,
                        attestationText: row.attestation_text,
                        supersedesId: row.supersedes_id,
                        amendmentReason: row.amendment_reason,
                        statements: row.statements.map((s) => ({
                            id: s.id,
                            recordId: s.record_id,
                            section: s.section,
                            text: s.text,
                            origin: s.origin,
                            order: s.order,
                            aiStatementId: s.ai_statement_id,
                            resolutionType: s.resolution_type,
                            sourceRefs: s.source_refs,
                            createdAt: s.created_at,
                        })),
                        createdAt: row.created_at,
                    };
                }
            }
            catch (err) {
                logger_js_1.logger.warn('Database error in getLatestConfirmedRecord', { error: err.message });
            }
        }
        return dev_fallback_doctor_review_store_js_1.devFallbackDoctorReviewStore.getLatestConfirmedRecord(visitId);
    }
    static async getConfirmedRecordById(id) {
        const available = await checkDatabaseAvailability();
        if (available) {
            try {
                const row = await prisma_js_1.prisma.confirmedRecord.findUnique({
                    where: { id },
                    include: { statements: { orderBy: { order: 'asc' } } },
                });
                if (row) {
                    return {
                        id: row.id,
                        visitId: row.visit_id,
                        version: row.version,
                        basedOnSummaryId: row.based_on_summary_id,
                        summaryVersion: row.summary_version,
                        reviewPolicyVersion: row.review_policy_version,
                        confirmedByDoctorId: row.confirmed_by_doctor_id,
                        confirmedByDoctorName: row.confirmed_by_doctor_name,
                        confirmedAt: row.confirmed_at,
                        attestationVersion: row.attestation_version,
                        attestationText: row.attestation_text,
                        supersedesId: row.supersedes_id,
                        amendmentReason: row.amendment_reason,
                        statements: row.statements.map((s) => ({
                            id: s.id,
                            recordId: s.record_id,
                            section: s.section,
                            text: s.text,
                            origin: s.origin,
                            order: s.order,
                            aiStatementId: s.ai_statement_id,
                            resolutionType: s.resolution_type,
                            sourceRefs: s.source_refs,
                            createdAt: s.created_at,
                        })),
                        createdAt: row.created_at,
                    };
                }
            }
            catch (err) {
                logger_js_1.logger.warn('Database error in getConfirmedRecordById', { error: err.message });
            }
        }
        return dev_fallback_doctor_review_store_js_1.devFallbackDoctorReviewStore.getConfirmedRecordById(id);
    }
    static async getConfirmedRecordVersions(visitId) {
        const available = await checkDatabaseAvailability();
        if (available) {
            try {
                const rows = await prisma_js_1.prisma.confirmedRecord.findMany({
                    where: { visit_id: visitId },
                    orderBy: { version: 'asc' },
                    include: { statements: { orderBy: { order: 'asc' } } },
                });
                return rows.map((row) => ({
                    id: row.id,
                    visitId: row.visit_id,
                    version: row.version,
                    basedOnSummaryId: row.based_on_summary_id,
                    summaryVersion: row.summary_version,
                    reviewPolicyVersion: row.review_policy_version,
                    confirmedByDoctorId: row.confirmed_by_doctor_id,
                    confirmedByDoctorName: row.confirmed_by_doctor_name,
                    confirmedAt: row.confirmed_at,
                    attestationVersion: row.attestation_version,
                    attestationText: row.attestation_text,
                    supersedesId: row.supersedes_id,
                    amendmentReason: row.amendment_reason,
                    statements: row.statements.map((s) => ({
                        id: s.id,
                        recordId: s.record_id,
                        section: s.section,
                        text: s.text,
                        origin: s.origin,
                        order: s.order,
                        aiStatementId: s.ai_statement_id,
                        resolutionType: s.resolution_type,
                        sourceRefs: s.source_refs,
                        createdAt: s.created_at,
                    })),
                    createdAt: row.created_at,
                }));
            }
            catch (err) {
                logger_js_1.logger.warn('Database error in getConfirmedRecordVersions', { error: err.message });
            }
        }
        return dev_fallback_doctor_review_store_js_1.devFallbackDoctorReviewStore.getConfirmedRecordVersions(visitId);
    }
    // ============================================================================
    // AUDIT EVENTS (Section 26 & 27: PHI-SAFE)
    // ============================================================================
    static async recordAuditEvent(data) {
        // PHI-SAFE: strictly ensure NO statement text, patient answers, or clinical values are included
        const safeMetadata = { ...(data.metadata || {}) };
        delete safeMetadata.statementText;
        delete safeMetadata.answerValue;
        delete safeMetadata.rawText;
        delete safeMetadata.extractedValue;
        logger_js_1.logger.info(`[AUDIT] ${data.action}`, {
            visitId: data.visitId,
            actorId: data.actorId,
            actorRole: data.actorRole,
            action: data.action,
            ...safeMetadata,
        });
        const available = await checkDatabaseAvailability();
        if (available) {
            try {
                await prisma_js_1.prisma.auditLog.create({
                    data: {
                        action: data.action,
                        entity_type: 'DOCTOR_REVIEW',
                        entity_id: data.visitId,
                        actor_id: data.actorId,
                        actor_role: data.actorRole,
                        request_id: data.requestId,
                        metadata: safeMetadata,
                    },
                });
            }
            catch {
                // Audit log persistence non-blocking in development
            }
        }
    }
}
exports.DoctorReviewRepository = DoctorReviewRepository;
