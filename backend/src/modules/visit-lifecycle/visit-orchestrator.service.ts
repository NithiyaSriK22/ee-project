import { CanonicalEvent, VisitRecord, VisitStatus } from './visit.types.js';
import { CanonicalEventBus } from './event-bus.js';
import { VisitStateMachine } from './visit-state-machine.js';
import { logger } from '../../config/logger.js';
import { devFallbackAdminStore } from '../admin/dev-fallback-admin-store.js';

export class VisitOrchestratorService {
  private static visitStore = new Map<string, VisitRecord>();
  private static documentsPending = new Map<string, Set<string>>(); // visitId -> Set of documentIds pending validation
  private static interviewCompletedVisits = new Set<string>();

  // Thresholds for stuck visit detection (in milliseconds)
  private static readonly INTAKE_STUCK_THRESHOLD_MS = 45 * 60 * 1000; // 45 minutes
  private static readonly REVIEW_STUCK_THRESHOLD_MS = 90 * 60 * 1000; // 90 minutes

  public static initialize(): void {
    // Subscribe to Canonical Events to derive visit lifecycle status
    CanonicalEventBus.subscribe('VISIT_CHECKED_IN', async (e) => this.handleCheckedIn(e));
    CanonicalEventBus.subscribe('INTERVIEW_ANSWER_RECORDED', async (e) => this.handleAnswerRecorded(e));
    CanonicalEventBus.subscribe('INTERVIEW_COMPLETED', async (e) => this.handleInterviewCompleted(e));
    CanonicalEventBus.subscribe('DOCUMENT_UPLOADED', async (e) => this.handleDocumentUploaded(e));
    CanonicalEventBus.subscribe('DOCUMENT_VALIDATED', async (e) => this.handleDocumentValidated(e));
    CanonicalEventBus.subscribe('REVIEW_STARTED', async (e) => this.handleReviewStarted(e));
    CanonicalEventBus.subscribe('RECORD_CONFIRMED', async (e) => this.handleRecordConfirmed(e));
  }

  public static registerVisit(visit: VisitRecord): void {
    this.visitStore.set(visit.id, visit);
  }

  public static getVisit(visitId: string): VisitRecord | null {
    return this.visitStore.get(visitId) || null;
  }

  public static getAllVisits(): VisitRecord[] {
    return Array.from(this.visitStore.values());
  }

  // --- Event Handlers & State Derivation ---
  private static async handleCheckedIn(event: CanonicalEvent): Promise<void> {
    const visit = this.visitStore.get(event.visitId);
    if (!visit) return;
    if (visit.status === 'CREATED') {
      this.transitionVisit(visit, 'CHECKED_IN', 'EVENT_ORCHESTRATOR');
    }
  }

  private static async handleAnswerRecorded(event: CanonicalEvent): Promise<void> {
    const visit = this.visitStore.get(event.visitId);
    if (!visit) return;
    if (visit.status === 'CHECKED_IN' || visit.status === 'CREATED') {
      this.transitionVisit(visit, 'INTAKE_IN_PROGRESS', 'EVENT_ORCHESTRATOR');
    }
  }

  private static async handleDocumentUploaded(event: CanonicalEvent): Promise<void> {
    const documentId = event.payload.documentId;
    if (!documentId) return;
    const pendingSet = this.documentsPending.get(event.visitId) || new Set<string>();
    pendingSet.add(documentId);
    this.documentsPending.set(event.visitId, pendingSet);
  }

  private static async handleDocumentValidated(event: CanonicalEvent): Promise<void> {
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

  private static async handleInterviewCompleted(event: CanonicalEvent): Promise<void> {
    this.interviewCompletedVisits.add(event.visitId);
    const pendingDocs = this.documentsPending.get(event.visitId);

    // If no documents pending validation, advance immediately
    if (!pendingDocs || pendingDocs.size === 0) {
      await this.advanceToReadyForReview(event.visitId, event.patientId);
    } else {
      logger.info('[ORCHESTRATOR_WAITING_FOR_DOCUMENTS]', {
        visitId: event.visitId,
        pendingCount: pendingDocs.size,
      });
    }
  }

  private static async advanceToReadyForReview(visitId: string, patientId: string): Promise<void> {
    const visit = this.visitStore.get(visitId);
    if (!visit) return;

    if (visit.status === 'INTAKE_IN_PROGRESS' || visit.status === 'CHECKED_IN') {
      this.transitionVisit(visit, 'INTAKE_COMPLETE', 'EVENT_ORCHESTRATOR');
      this.transitionVisit(visit, 'READY_FOR_REVIEW', 'EVENT_ORCHESTRATOR');

      // Trigger summary generation event
      const summaryReqEvent = CanonicalEventBus.createEvent(
        'SUMMARY_REQUESTED',
        visitId,
        patientId,
        { visitId, requestedBy: 'ORCHESTRATOR_PIPELINE' }
      );
      await CanonicalEventBus.publish(summaryReqEvent);
      logger.info('[SUMMARY_TRIGGERED_BY_ORCHESTRATOR]', { visitId });
    }
  }

  private static async handleReviewStarted(event: CanonicalEvent): Promise<void> {
    const visit = this.visitStore.get(event.visitId);
    if (!visit) return;
    if (visit.status === 'READY_FOR_REVIEW') {
      this.transitionVisit(visit, 'IN_CONSULTATION', 'EVENT_ORCHESTRATOR');
    }
  }

  private static async handleRecordConfirmed(event: CanonicalEvent): Promise<void> {
    const visit = this.visitStore.get(event.visitId);
    if (!visit) return;
    if (visit.status === 'IN_CONSULTATION' || visit.status === 'READY_FOR_REVIEW') {
      this.transitionVisit(visit, 'COMPLETED', 'EVENT_ORCHESTRATOR');
      visit.closed_at = new Date();

      const completedEvent = CanonicalEventBus.createEvent(
        'VISIT_COMPLETED',
        visit.id,
        visit.patient_id,
        { visitId: visit.id, confirmedRecordId: event.payload.recordId }
      );
      await CanonicalEventBus.publish(completedEvent);
    }
  }

  public static transitionVisit(
    visit: VisitRecord,
    targetStatus: VisitStatus,
    actorRole: string = 'SYSTEM',
    actorId: string = 'orchestrator'
  ): void {
    VisitStateMachine.validateTransition(visit.id, visit.status, targetStatus, actorRole, actorId);
    const prevStatus = visit.status;
    visit.status = targetStatus;
    visit.updated_at = new Date();

    logger.info('[VISIT_STATUS_TRANSITIONED]', {
      visitId: visit.id,
      previousStatus: prevStatus,
      newStatus: targetStatus,
      actorRole,
    });
  }

  // --- Stuck-Visit Detector ---
  public static detectStuckVisits(now: Date = new Date()): Array<{
    visitId: string;
    patientId: string;
    tokenNumber: string;
    status: VisitStatus;
    durationMinutes: number;
    thresholdMinutes: number;
  }> {
    const stuckVisits: Array<{
      visitId: string;
      patientId: string;
      tokenNumber: string;
      status: VisitStatus;
      durationMinutes: number;
      thresholdMinutes: number;
    }> = [];

    for (const visit of this.visitStore.values()) {
      if (VisitStateMachine.isTerminal(visit.status)) continue;

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
      } else if (visit.status === 'READY_FOR_REVIEW' && elapsedMs > this.REVIEW_STUCK_THRESHOLD_MS) {
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

  private static notifyStuckVisit(visit: VisitRecord, durationMinutes: number, reason: string): void {
    logger.warn('[STUCK_VISIT_OPERATIONAL_NOTIFICATION]', {
      visitId: visit.id,
      tokenNumber: visit.token_number,
      status: visit.status,
      durationMinutes,
      reason,
    });

    try {
      devFallbackAdminStore.appendAuditLog({
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
    } catch {
      // Safe fallback
    }
  }

  // Testing helper to reset orchestrator state between test suites
  public static resetState(): void {
    this.visitStore.clear();
    this.documentsPending.clear();
    this.interviewCompletedVisits.clear();
  }
}
