import crypto from 'node:crypto';
import {
  VisitQueueEntryDTO,
  DoctorReviewStatus,
  DoctorReviewStatuses,
  QueueStatus,
  QueueStatuses,
  ReviewItemResolutionDTO,
  StatementEditDTO,
  DoctorAddedStatementDTO,
  ReviewClaimDTO,
  ConfirmedRecordDTO,
  RejectionReason,
} from './doctor-review.types.js';

export interface InMemDoctorReview {
  id: string;
  visitId: string;
  baseSummaryId?: string | null;
  baseSummaryVersion: number;
  status: DoctorReviewStatus;
  rejectionReason?: RejectionReason | null;
  rejectionNote?: string | null;
  createdByDoctorId: string;
  createdAt: Date;
  updatedAt: Date;
}

class DevFallbackDoctorReviewStore {
  private queueEntries: Map<string, VisitQueueEntryDTO> = new Map(); // key: visitId
  private reviews: Map<string, InMemDoctorReview> = new Map(); // key: reviewId
  private resolutions: Map<string, ReviewItemResolutionDTO[]> = new Map(); // key: reviewId
  private edits: Map<string, StatementEditDTO[]> = new Map(); // key: reviewId
  private additions: Map<string, DoctorAddedStatementDTO[]> = new Map(); // key: reviewId
  private removedStatementIds: Map<string, Set<string>> = new Map(); // key: reviewId -> set of statementIds
  private claims: Map<string, ReviewClaimDTO> = new Map(); // key: visitId
  private confirmedRecords: Map<string, ConfirmedRecordDTO[]> = new Map(); // key: visitId -> records list

  // ============================================================================
  // QUEUE OPERATIONS
  // ============================================================================

  public upsertQueueEntry(entry: Partial<VisitQueueEntryDTO> & { visitId: string }): VisitQueueEntryDTO {
    const existing = this.queueEntries.get(entry.visitId);
    const updated: VisitQueueEntryDTO = {
      id: existing?.id || crypto.randomUUID(),
      visitId: entry.visitId,
      department: entry.department || existing?.department || 'General Medicine',
      assignedDoctorId: entry.assignedDoctorId !== undefined ? entry.assignedDoctorId : existing?.assignedDoctorId || null,
      queueStatus: entry.queueStatus || existing?.queueStatus || QueueStatuses.WAITING,
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

  public getQueueEntry(visitId: string): VisitQueueEntryDTO | null {
    return this.queueEntries.get(visitId) || null;
  }

  public listQueue(filters?: {
    department?: string;
    assignedDoctorId?: string;
    status?: QueueStatus;
  }): VisitQueueEntryDTO[] {
    let list = Array.from(this.queueEntries.values());

    if (filters?.department) {
      list = list.filter((e) => {
        const d1 = e.department.toLowerCase().replace(/^(department of\s*|opd\s*)/i, '').trim();
        const d2 = filters.department!.toLowerCase().replace(/^(department of\s*|opd\s*)/i, '').trim();
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

  public getClaim(visitId: string): ReviewClaimDTO | null {
    const claim = this.claims.get(visitId);
    if (!claim) return null;
    if (new Date() > new Date(claim.expiresAt)) {
      this.claims.delete(visitId);
      return null;
    }
    return claim;
  }

  public setClaim(visitId: string, doctorId: string, doctorName: string, ttlMs: number = 15 * 60 * 1000): ReviewClaimDTO {
    const claim: ReviewClaimDTO = {
      id: crypto.randomUUID(),
      visitId,
      claimedByDoctorId: doctorId,
      claimedByDoctorName: doctorName,
      claimedAt: new Date(),
      expiresAt: new Date(Date.now() + ttlMs),
    };
    this.claims.set(visitId, claim);
    return claim;
  }

  public releaseClaim(visitId: string, doctorId?: string): boolean {
    const existing = this.claims.get(visitId);
    if (!existing) return true;
    if (doctorId && existing.claimedByDoctorId !== doctorId) {
      return false;
    }
    this.claims.delete(visitId);
    return true;
  }

  // ============================================================================
  // REVIEWS & WORKSPACE STATE
  // ============================================================================

  public createReview(data: {
    visitId: string;
    baseSummaryId?: string | null;
    baseSummaryVersion: number;
    doctorId: string;
  }): InMemDoctorReview {
    const review: InMemDoctorReview = {
      id: crypto.randomUUID(),
      visitId: data.visitId,
      baseSummaryId: data.baseSummaryId || null,
      baseSummaryVersion: data.baseSummaryVersion,
      status: DoctorReviewStatuses.IN_REVIEW,
      rejectionReason: null,
      rejectionNote: null,
      createdByDoctorId: data.doctorId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.reviews.set(review.id, review);
    return review;
  }

  public getReviewById(reviewId: string): InMemDoctorReview | null {
    return this.reviews.get(reviewId) || null;
  }

  public getActiveReviewByVisitId(visitId: string): InMemDoctorReview | null {
    for (const r of this.reviews.values()) {
      if (r.visitId === visitId && r.status === DoctorReviewStatuses.IN_REVIEW) {
        return r;
      }
    }
    return null;
  }

  public updateReviewStatus(
    reviewId: string,
    status: DoctorReviewStatus,
    rejection?: { reason?: RejectionReason; note?: string }
  ): InMemDoctorReview | null {
    const review = this.reviews.get(reviewId);
    if (!review) return null;
    review.status = status;
    if (rejection?.reason) review.rejectionReason = rejection.reason;
    if (rejection?.note !== undefined) review.rejectionNote = rejection.note;
    review.updatedAt = new Date();
    return review;
  }

  // Resolutions
  public saveResolution(resolution: ReviewItemResolutionDTO): ReviewItemResolutionDTO {
    const list = this.resolutions.get(resolution.reviewId) || [];
    const existingIndex = list.findIndex((r) => r.itemRef === resolution.itemRef);
    const itemWithId = { ...resolution, id: resolution.id || crypto.randomUUID() };

    if (existingIndex >= 0) {
      list[existingIndex] = itemWithId;
    } else {
      list.push(itemWithId);
    }
    this.resolutions.set(resolution.reviewId, list);
    return itemWithId;
  }

  public getResolutions(reviewId: string): ReviewItemResolutionDTO[] {
    return this.resolutions.get(reviewId) || [];
  }

  // Statement Edits
  public saveStatementEdit(edit: StatementEditDTO): StatementEditDTO {
    const list = this.edits.get(edit.reviewId) || [];
    const existingIndex = list.findIndex((e) => e.originalStatementId === edit.originalStatementId);
    const itemWithId = { ...edit, id: edit.id || crypto.randomUUID() };

    if (existingIndex >= 0) {
      list[existingIndex] = itemWithId;
    } else {
      list.push(itemWithId);
    }
    this.edits.set(edit.reviewId, list);
    return itemWithId;
  }

  public getStatementEdits(reviewId: string): StatementEditDTO[] {
    return this.edits.get(reviewId) || [];
  }

  // Doctor Added Statements
  public addDoctorStatement(stmt: DoctorAddedStatementDTO): DoctorAddedStatementDTO {
    const list = this.additions.get(stmt.reviewId) || [];
    const itemWithId = { ...stmt, id: stmt.id || crypto.randomUUID() };
    list.push(itemWithId);
    this.additions.set(stmt.reviewId, list);
    return itemWithId;
  }

  public getDoctorAddedStatements(reviewId: string): DoctorAddedStatementDTO[] {
    return this.additions.get(reviewId) || [];
  }

  // Statement Removal
  public removeStatement(reviewId: string, statementId: string): void {
    let set = this.removedStatementIds.get(reviewId);
    if (!set) {
      set = new Set();
      this.removedStatementIds.set(reviewId, set);
    }
    set.add(statementId);
  }

  public getRemovedStatementIds(reviewId: string): Set<string> {
    return this.removedStatementIds.get(reviewId) || new Set();
  }

  // ============================================================================
  // CONFIRMED RECORDS & AMENDMENTS
  // ============================================================================

  public createConfirmedRecord(record: ConfirmedRecordDTO): ConfirmedRecordDTO {
    const records = this.confirmedRecords.get(record.visitId) || [];
    records.push(record);
    this.confirmedRecords.set(record.visitId, records);
    return record;
  }

  public getLatestConfirmedRecord(visitId: string): ConfirmedRecordDTO | null {
    const records = this.confirmedRecords.get(visitId);
    if (!records || records.length === 0) return null;
    return records[records.length - 1] ?? null;
  }

  public getConfirmedRecordById(id: string): ConfirmedRecordDTO | null {
    for (const records of this.confirmedRecords.values()) {
      for (const rec of records) {
        if (rec.id === id) return rec;
      }
    }
    return null;
  }

  public getConfirmedRecordVersions(visitId: string): ConfirmedRecordDTO[] {
    return this.confirmedRecords.get(visitId) || [];
  }

  public clearAll(): void {
    this.queueEntries.clear();
    this.reviews.clear();
    this.resolutions.clear();
    this.edits.clear();
    this.additions.clear();
    this.removedStatementIds.clear();
    this.claims.clear();
    this.confirmedRecords.clear();
  }

  public resetState(): void {
    this.clearAll();
  }
}

export const devFallbackDoctorReviewStore = new DevFallbackDoctorReviewStore();
