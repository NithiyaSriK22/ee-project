"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisitOrchestratorService = void 0;
const event_bus_js_1 = require("./event-bus.js");
const visit_state_machine_js_1 = require("./visit-state-machine.js");
const logger_js_1 = require("../../config/logger.js");
const dev_fallback_admin_store_js_1 = require("../admin/dev-fallback-admin-store.js");
class VisitOrchestratorService {
    static visitStore = new Map();
    static documentsPending = new Map(); // visitId -> Set of documentIds pending validation
    static interviewCompletedVisits = new Set();
    // Thresholds for stuck visit detection (in milliseconds)
    static INTAKE_STUCK_THRESHOLD_MS = 45 * 60 * 1000; // 45 minutes
    static REVIEW_STUCK_THRESHOLD_MS = 90 * 60 * 1000; // 90 minutes
    static initialize() {
        // Subscribe to Canonical Events to derive visit lifecycle status
        event_bus_js_1.CanonicalEventBus.subscribe('VISIT_CHECKED_IN', async (e) => this.handleCheckedIn(e));
        event_bus_js_1.CanonicalEventBus.subscribe('INTERVIEW_ANSWER_RECORDED', async (e) => this.handleAnswerRecorded(e));
        event_bus_js_1.CanonicalEventBus.subscribe('INTERVIEW_COMPLETED', async (e) => this.handleInterviewCompleted(e));
        event_bus_js_1.CanonicalEventBus.subscribe('DOCUMENT_UPLOADED', async (e) => this.handleDocumentUploaded(e));
        event_bus_js_1.CanonicalEventBus.subscribe('DOCUMENT_VALIDATED', async (e) => this.handleDocumentValidated(e));
        event_bus_js_1.CanonicalEventBus.subscribe('REVIEW_STARTED', async (e) => this.handleReviewStarted(e));
        event_bus_js_1.CanonicalEventBus.subscribe('RECORD_CONFIRMED', async (e) => this.handleRecordConfirmed(e));
    }
    static registerVisit(visit) {
        this.visitStore.set(visit.id, visit);
    }
    static getVisit(visitId) {
        return this.visitStore.get(visitId) || null;
    }
    static getAllVisits() {
        return Array.from(this.visitStore.values());
    }
    // --- Event Handlers & State Derivation ---
    static async handleCheckedIn(event) {
        const visit = this.visitStore.get(event.visitId);
        if (!visit)
            return;
        if (visit.status === 'CREATED') {
            this.transitionVisit(visit, 'CHECKED_IN', 'EVENT_ORCHESTRATOR');
        }
    }
    static async handleAnswerRecorded(event) {
        const visit = this.visitStore.get(event.visitId);
        if (!visit)
            return;
        if (visit.status === 'CHECKED_IN' || visit.status === 'CREATED') {
            this.transitionVisit(visit, 'INTAKE_IN_PROGRESS', 'EVENT_ORCHESTRATOR');
        }
    }
    static async handleDocumentUploaded(event) {
        const documentId = event.payload.documentId;
        if (!documentId)
            return;
        const pendingSet = this.documentsPending.get(event.visitId) || new Set();
        pendingSet.add(documentId);
        this.documentsPending.set(event.visitId, pendingSet);
    }
    static async handleDocumentValidated(event) {
        const documentId = event.payload.documentId;
        const pendingSet = this.documentsPending.get(event.visitId);
        if (pendingSet && documentId) {
            pendingSet.delete(documentId);
        }
        // If interview already completed and zero documents pending, advance visit to READY_FOR_REVIEW
        if (this.interviewCompletedVisits.has(event.visitId) && (!pendingSet || pendingSet.size === 0)) {
            await this.advanceToReadyForReview(event.visitId, event.patientId);
        }
    }
    static async handleInterviewCompleted(event) {
        this.interviewCompletedVisits.add(event.visitId);
        const pendingDocs = this.documentsPending.get(event.visitId);
        // If no documents pending validation, advance immediately
        if (!pendingDocs || pendingDocs.size === 0) {
            await this.advanceToReadyForReview(event.visitId, event.patientId);
        }
        else {
            logger_js_1.logger.info('[ORCHESTRATOR_WAITING_FOR_DOCUMENTS]', {
                visitId: event.visitId,
                pendingCount: pendingDocs.size,
            });
        }
    }
    static async advanceToReadyForReview(visitId, patientId) {
        const visit = this.visitStore.get(visitId);
        if (!visit)
            return;
        if (visit.status === 'INTAKE_IN_PROGRESS' || visit.status === 'CHECKED_IN') {
            this.transitionVisit(visit, 'INTAKE_COMPLETE', 'EVENT_ORCHESTRATOR');
            this.transitionVisit(visit, 'READY_FOR_REVIEW', 'EVENT_ORCHESTRATOR');
            // Trigger summary generation event
            const summaryReqEvent = event_bus_js_1.CanonicalEventBus.createEvent('SUMMARY_REQUESTED', visitId, patientId, { visitId, requestedBy: 'ORCHESTRATOR_PIPELINE' });
            await event_bus_js_1.CanonicalEventBus.publish(summaryReqEvent);
            logger_js_1.logger.info('[SUMMARY_TRIGGERED_BY_ORCHESTRATOR]', { visitId });
        }
    }
    static async handleReviewStarted(event) {
        const visit = this.visitStore.get(event.visitId);
        if (!visit)
            return;
        if (visit.status === 'READY_FOR_REVIEW') {
            this.transitionVisit(visit, 'IN_CONSULTATION', 'EVENT_ORCHESTRATOR');
        }
    }
    static async handleRecordConfirmed(event) {
        const visit = this.visitStore.get(event.visitId);
        if (!visit)
            return;
        if (visit.status === 'IN_CONSULTATION' || visit.status === 'READY_FOR_REVIEW') {
            this.transitionVisit(visit, 'COMPLETED', 'EVENT_ORCHESTRATOR');
            visit.closed_at = new Date();
            const completedEvent = event_bus_js_1.CanonicalEventBus.createEvent('VISIT_COMPLETED', visit.id, visit.patient_id, { visitId: visit.id, confirmedRecordId: event.payload.recordId });
            await event_bus_js_1.CanonicalEventBus.publish(completedEvent);
        }
    }
    static transitionVisit(visit, targetStatus, actorRole = 'SYSTEM', actorId = 'orchestrator') {
        visit_state_machine_js_1.VisitStateMachine.validateTransition(visit.id, visit.status, targetStatus, actorRole, actorId);
        const prevStatus = visit.status;
        visit.status = targetStatus;
        visit.updated_at = new Date();
        logger_js_1.logger.info('[VISIT_STATUS_TRANSITIONED]', {
            visitId: visit.id,
            previousStatus: prevStatus,
            newStatus: targetStatus,
            actorRole,
        });
    }
    // --- Stuck-Visit Detector ---
    static detectStuckVisits(now = new Date()) {
        const stuckVisits = [];
        for (const visit of this.visitStore.values()) {
            if (visit_state_machine_js_1.VisitStateMachine.isTerminal(visit.status))
                continue;
            const elapsedMs = now.getTime() - new Date(visit.updated_at).getTime();
            if (visit.status === 'INTAKE_IN_PROGRESS' && elapsedMs > this.INTAKE_STUCK_THRESHOLD_MS) {
                const durationMinutes = Math.floor(elapsedMs / 60000);
                stuckVisits.push({
                    visitId: visit.id,
                    patientId: visit.patient_id,
                    tokenNumber: visit.token_number,
                    status: visit.status,
                    durationMinutes,
                    thresholdMinutes: 45,
                });
                this.notifyStuckVisit(visit, durationMinutes, 'Patient interview in progress beyond 45 minutes.');
            }
            else if (visit.status === 'READY_FOR_REVIEW' && elapsedMs > this.REVIEW_STUCK_THRESHOLD_MS) {
                const durationMinutes = Math.floor(elapsedMs / 60000);
                stuckVisits.push({
                    visitId: visit.id,
                    patientId: visit.patient_id,
                    tokenNumber: visit.token_number,
                    status: visit.status,
                    durationMinutes,
                    thresholdMinutes: 90,
                });
                this.notifyStuckVisit(visit, durationMinutes, 'Patient waiting for physician consultation beyond 90 minutes.');
            }
        }
        return stuckVisits;
    }
    static notifyStuckVisit(visit, durationMinutes, reason) {
        logger_js_1.logger.warn('[STUCK_VISIT_OPERATIONAL_NOTIFICATION]', {
            visitId: visit.id,
            tokenNumber: visit.token_number,
            status: visit.status,
            durationMinutes,
            reason,
        });
        try {
            dev_fallback_admin_store_js_1.devFallbackAdminStore.appendAuditLog({
                actorType: 'SYSTEM',
                actorId: 'stuck-visit-detector',
                actorRole: 'SYSTEM_MONITOR',
                action: 'STUCK_VISIT_DETECTED',
                entityType: 'VISIT',
                entityId: visit.id,
                visitRef: visit.id,
                result: 'SUCCESS',
                reasonCode: 'STUCK_VISIT_NOTIFICATION',
                reasonText: reason,
                metadata: { tokenNumber: visit.token_number, status: visit.status, durationMinutes },
            });
        }
        catch {
            // Safe fallback
        }
    }
    // Testing helper to reset orchestrator state between test suites
    static resetState() {
        this.visitStore.clear();
        this.documentsPending.clear();
        this.interviewCompletedVisits.clear();
    }
}
exports.VisitOrchestratorService = VisitOrchestratorService;
