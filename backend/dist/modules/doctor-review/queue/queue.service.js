"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueService = void 0;
const doctor_review_repository_js_1 = require("../doctor-review.repository.js");
const claim_service_js_1 = require("../review/claim.service.js");
const redflags_service_js_1 = require("../../redflags/redflags.service.js");
const doctor_review_types_js_1 = require("../doctor-review.types.js");
const app_error_js_1 = require("../../../errors/app-error.js");
class QueueService {
    /**
     * Retrieves deterministic patient review queue scoped by department and role
     */
    static async getQueue(user, options) {
        const isDoctor = user.role === 'DOCTOR';
        const isStaff = user.role === 'STAFF_ATTENDANT';
        const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
        if (!isDoctor && !isStaff && !isAdmin) {
            throw new app_error_js_1.ForbiddenError(`Role '${user.role}' cannot access patient queue.`);
        }
        // Doctors see visits in their department or assigned to them by default
        let filterDepartment = options?.department;
        let filterAssignedDoctor = undefined;
        if (isDoctor && !filterDepartment && user.hospitalDepartment) {
            filterDepartment = user.hospitalDepartment;
        }
        const queue = await doctor_review_repository_js_1.DoctorReviewRepository.listQueue({
            department: filterDepartment,
            assignedDoctorId: filterAssignedDoctor,
            status: options?.status,
        });
        // Refresh has_open_alert flag dynamically from Module 6
        const enriched = await Promise.all(queue.map(async (entry) => {
            try {
                const openAlerts = await redflags_service_js_1.RedFlagsService.listAlerts({ visitId: entry.visitId });
                const hasOpen = openAlerts.length > 0
                    ? openAlerts.some((a) => a.status === 'RAISED' || a.status === 'IN_ASSESSMENT')
                    : entry.hasOpenAlert;
                entry.hasOpenAlert = hasOpen;
            }
            catch {
                // Keep existing flag on error
            }
            return entry;
        }));
        // Deterministic sort: open alerts first, then waiting time (readyAt ASC)
        return enriched.sort((a, b) => {
            if (a.hasOpenAlert !== b.hasOpenAlert) {
                return a.hasOpenAlert ? -1 : 1;
            }
            const timeA = a.readyAt ? new Date(a.readyAt).getTime() : 0;
            const timeB = b.readyAt ? new Date(b.readyAt).getTime() : 0;
            return timeA - timeB;
        });
    }
    /**
     * Soft claims a visit for review by a doctor
     */
    static async claimVisit(visitId, user, options) {
        if (user.role !== 'DOCTOR' && user.role !== 'SUPER_ADMIN') {
            throw new app_error_js_1.ForbiddenError('Only physicians can claim a case for clinical review');
        }
        // Check existing queue entry or ensure one exists
        let entry = await doctor_review_repository_js_1.DoctorReviewRepository.getQueueEntry(visitId);
        if (!entry) {
            entry = await doctor_review_repository_js_1.DoctorReviewRepository.upsertQueueEntry({
                visitId,
                department: user.hospitalDepartment || 'General Medicine',
                queueStatus: doctor_review_types_js_1.QueueStatuses.READY_FOR_REVIEW,
            });
        }
        // Out-of-queue scoping check: if visit is in different department
        const isDifferentDept = (d1, d2) => {
            if (!d1 || !d2)
                return false;
            const c1 = d1.toLowerCase().replace(/^(department of\s*|opd\s*)/i, '').trim();
            const c2 = d2.toLowerCase().replace(/^(department of\s*|opd\s*)/i, '').trim();
            return c1 !== c2 && !c1.includes(c2) && !c2.includes(c1);
        };
        if (user.hospitalDepartment &&
            entry.department &&
            isDifferentDept(user.hospitalDepartment, entry.department)) {
            if (!options?.outOfQueueReason) {
                throw new app_error_js_1.ForbiddenError(`Visit belongs to '${entry.department}'. Out-of-department case review requires a typed justification reason.`);
            }
            await doctor_review_repository_js_1.DoctorReviewRepository.recordAuditEvent({
                action: doctor_review_types_js_1.DoctorReviewAuditEvents.OUT_OF_QUEUE_ACCESS,
                visitId,
                actorId: user.id,
                actorRole: user.role,
                metadata: {
                    doctorDepartment: user.hospitalDepartment,
                    caseDepartment: entry.department,
                    reason: options.outOfQueueReason,
                },
            });
        }
        // Check soft claim via ClaimService
        const claim = await claim_service_js_1.ClaimService.claimVisit(visitId, user.id, user.fullName, options?.forceTakeover, options?.takeoverReason);
        // Update queue status to IN_CONSULTATION
        await doctor_review_repository_js_1.DoctorReviewRepository.upsertQueueEntry({
            visitId,
            assignedDoctorId: user.id,
            queueStatus: doctor_review_types_js_1.QueueStatuses.IN_CONSULTATION,
        });
        await doctor_review_repository_js_1.DoctorReviewRepository.recordAuditEvent({
            action: doctor_review_types_js_1.DoctorReviewAuditEvents.QUEUE_VISIT_CLAIMED,
            visitId,
            actorId: user.id,
            actorRole: user.role,
            metadata: { claimId: claim.id, expiresAt: claim.expiresAt },
        });
        return {
            claimed: true,
            claim,
        };
    }
    /**
     * Releases a soft claim and puts the case back into READY_FOR_REVIEW
     */
    static async releaseVisit(visitId, user) {
        const released = await claim_service_js_1.ClaimService.releaseClaim(visitId, user.id);
        if (!released) {
            throw new app_error_js_1.ForbiddenError('Cannot release a claim held by another physician.');
        }
        await doctor_review_repository_js_1.DoctorReviewRepository.upsertQueueEntry({
            visitId,
            queueStatus: doctor_review_types_js_1.QueueStatuses.READY_FOR_REVIEW,
        });
        await doctor_review_repository_js_1.DoctorReviewRepository.recordAuditEvent({
            action: doctor_review_types_js_1.DoctorReviewAuditEvents.QUEUE_VISIT_RELEASED,
            visitId,
            actorId: user.id,
            actorRole: user.role,
        });
        return { released: true };
    }
}
exports.QueueService = QueueService;
