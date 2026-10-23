"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.devFallbackDoctorReviewStore = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
const doctor_review_types_js_1 = require("./doctor-review.types.js");
class DevFallbackDoctorReviewStore {
    queueEntries = new Map(); // key: visitId
    reviews = new Map(); // key: reviewId
    resolutions = new Map(); // key: reviewId
    edits = new Map(); // key: reviewId
    additions = new Map(); // key: reviewId
    removedStatementIds = new Map(); // key: reviewId -> set of statementIds
    claims = new Map(); // key: visitId
    confirmedRecords = new Map(); // key: visitId -> records list
    // ============================================================================
    // QUEUE OPERATIONS
    // ============================================================================
    upsertQueueEntry(entry) {
        const existing = this.queueEntries.get(entry.visitId);
        const updated = {
            id: existing?.id || node_crypto_1.default.randomUUID(),
            visitId: entry.visitId,
            department: entry.department || existing?.department || 'General Medicine',
            assignedDoctorId: entry.assignedDoctorId !== undefined ? entry.assignedDoctorId : existing?.assignedDoctorId || null,
            queueStatus: entry.queueStatus || existing?.queueStatus || doctor_review_types_js_1.QueueStatuses.WAITING,
            hasOpenAlert: entry.hasOpenAlert !== undefined ? entry.hasOpenAlert : existing?.hasOpenAlert || false,
            readyAt: entry.readyAt || existing?.readyAt || new Date(),
            patientTokenOrName: entry.patientTokenOrName || existing?.patientTokenOrName || `Token #${entry.visitId.substring(0, 4).toUpperCase()}`,
            patientAge: entry.patientAge !== undefined ? entry.patientAge : existing?.patientAge || null,
            patientGender: entry.patientGender !== undefined ? entry.patientGender : existing?.patientGender || null,
            createdAt: existing?.createdAt || new Date(),
            updatedAt: new Date(),
        };
        this.queueEntries.set(entry.visitId, updated);
        return updated;
    }
    getQueueEntry(visitId) {
        return this.queueEntries.get(visitId) || null;
    }
    listQueue(filters) {
        let list = Array.from(this.queueEntries.values());
        if (filters?.department) {
            list = list.filter((e) => {
                const d1 = e.department.toLowerCase().replace(/^(department of\s*|opd\s*)/i, '').trim();
                const d2 = filters.department.toLowerCase().replace(/^(department of\s*|opd\s*)/i, '').trim();
                return d1 === d2 || d1.includes(d2) || d2.includes(d1);
            });
        }
        if (filters?.assignedDoctorId) {
            list = list.filter((e) => e.assignedDoctorId === filters.assignedDoctorId);
        }
        if (filters?.status) {
            list = list.filter((e) => e.queueStatus === filters.status);
        }
        // Deterministic sort: open alerts first, then waiting time (readyAt ASC)
        return list.sort((a, b) => {
            if (a.hasOpenAlert !== b.hasOpenAlert) {
                return a.hasOpenAlert ? -1 : 1;
            }
            const timeA = a.readyAt ? new Date(a.readyAt).getTime() : 0;
            const timeB = b.readyAt ? new Date(b.readyAt).getTime() : 0;
            return timeA - timeB;
        });
    }
    // ============================================================================
    // CLAIMS
    // ============================================================================
    getClaim(visitId) {
        const claim = this.claims.get(visitId);
        if (!claim)
            return null;
        if (new Date() > new Date(claim.expiresAt)) {
            this.claims.delete(visitId);
            return null;
        }
        return claim;
    }
    setClaim(visitId, doctorId, doctorName, ttlMs = 15 * 60 * 1000) {
        const claim = {
            id: node_crypto_1.default.randomUUID(),
            visitId,
            claimedByDoctorId: doctorId,
            claimedByDoctorName: doctorName,
            claimedAt: new Date(),
            expiresAt: new Date(Date.now() + ttlMs),
        };
        this.claims.set(visitId, claim);
        return claim;
    }
    releaseClaim(visitId, doctorId) {
        const existing = this.claims.get(visitId);
        if (!existing)
            return true;
        if (doctorId && existing.claimedByDoctorId !== doctorId) {
            return false;
        }
        this.claims.delete(visitId);
        return true;
    }
    // ============================================================================
    // REVIEWS & WORKSPACE STATE
    // ============================================================================
    createReview(data) {
        const review = {
            id: node_crypto_1.default.randomUUID(),
            visitId: data.visitId,
            baseSummaryId: data.baseSummaryId || null,
            baseSummaryVersion: data.baseSummaryVersion,
            status: doctor_review_types_js_1.DoctorReviewStatuses.IN_REVIEW,
            rejectionReason: null,
            rejectionNote: null,
            createdByDoctorId: data.doctorId,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        this.reviews.set(review.id, review);
        return review;
    }
    getReviewById(reviewId) {
        return this.reviews.get(reviewId) || null;
    }
    getActiveReviewByVisitId(visitId) {
        for (const r of this.reviews.values()) {
            if (r.visitId === visitId && r.status === doctor_review_types_js_1.DoctorReviewStatuses.IN_REVIEW) {
                return r;
            }
        }
        return null;
    }
    updateReviewStatus(reviewId, status, rejection) {
        const review = this.reviews.get(reviewId);
        if (!review)
            return null;
        review.status = status;
        if (rejection?.reason)
            review.rejectionReason = rejection.reason;
        if (rejection?.note !== undefined)
            review.rejectionNote = rejection.note;
        review.updatedAt = new Date();
        return review;
    }
    // Resolutions
    saveResolution(resolution) {
        const list = this.resolutions.get(resolution.reviewId) || [];
        const existingIndex = list.findIndex((r) => r.itemRef === resolution.itemRef);
        const itemWithId = { ...resolution, id: resolution.id || node_crypto_1.default.randomUUID() };
        if (existingIndex >= 0) {
            list[existingIndex] = itemWithId;
        }
        else {
            list.push(itemWithId);
        }
        this.resolutions.set(resolution.reviewId, list);
        return itemWithId;
    }
    getResolutions(reviewId) {
        return this.resolutions.get(reviewId) || [];
    }
    // Statement Edits
    saveStatementEdit(edit) {
        const list = this.edits.get(edit.reviewId) || [];
        const existingIndex = list.findIndex((e) => e.originalStatementId === edit.originalStatementId);
        const itemWithId = { ...edit, id: edit.id || node_crypto_1.default.randomUUID() };
        if (existingIndex >= 0) {
            list[existingIndex] = itemWithId;
        }
        else {
            list.push(itemWithId);
        }
        this.edits.set(edit.reviewId, list);
        return itemWithId;
    }
    getStatementEdits(reviewId) {
        return this.edits.get(reviewId) || [];
    }
    // Doctor Added Statements
    addDoctorStatement(stmt) {
        const list = this.additions.get(stmt.reviewId) || [];
        const itemWithId = { ...stmt, id: stmt.id || node_crypto_1.default.randomUUID() };
        list.push(itemWithId);
        this.additions.set(stmt.reviewId, list);
        return itemWithId;
    }
    getDoctorAddedStatements(reviewId) {
        return this.additions.get(reviewId) || [];
    }
    // Statement Removal
    removeStatement(reviewId, statementId) {
        let set = this.removedStatementIds.get(reviewId);
        if (!set) {
            set = new Set();
            this.removedStatementIds.set(reviewId, set);
        }
        set.add(statementId);
    }
    getRemovedStatementIds(reviewId) {
        return this.removedStatementIds.get(reviewId) || new Set();
    }
    // ============================================================================
    // CONFIRMED RECORDS & AMENDMENTS
    // ============================================================================
    createConfirmedRecord(record) {
        const records = this.confirmedRecords.get(record.visitId) || [];
        records.push(record);
        this.confirmedRecords.set(record.visitId, records);
        return record;
    }
    getLatestConfirmedRecord(visitId) {
        const records = this.confirmedRecords.get(visitId);
        if (!records || records.length === 0)
            return null;
        return records[records.length - 1] ?? null;
    }
    getConfirmedRecordById(id) {
        for (const records of this.confirmedRecords.values()) {
            for (const rec of records) {
                if (rec.id === id)
                    return rec;
            }
        }
        return null;
    }
    getConfirmedRecordVersions(visitId) {
        return this.confirmedRecords.get(visitId) || [];
    }
    clearAll() {
        this.queueEntries.clear();
        this.reviews.clear();
        this.resolutions.clear();
        this.edits.clear();
        this.additions.clear();
        this.removedStatementIds.clear();
        this.claims.clear();
        this.confirmedRecords.clear();
    }
    resetState() {
        this.clearAll();
    }
}
exports.devFallbackDoctorReviewStore = new DevFallbackDoctorReviewStore();
