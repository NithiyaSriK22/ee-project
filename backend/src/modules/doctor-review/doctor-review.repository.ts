import { prisma } from '../../database/prisma.js';
import { logger } from '../../config/logger.js';
import { devFallbackDoctorReviewStore } from './dev-fallback-doctor-review-store.js';
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
  DoctorReviewAuditEvent,
} from './doctor-review.types.js';
import { InMemDoctorReview } from './dev-fallback-doctor-review-store.js';

let isDbReachable: boolean | null = null;
let lastDbCheck = 0;

export async function checkDatabaseAvailability(): Promise<boolean> {
  const now = Date.now();
  if (isDbReachable !== null && now - lastDbCheck < 15000) {
    return isDbReachable;
  }

  try {
    const checkPromise = prisma.$queryRaw`SELECT 1`;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('DB check timeout')), 300)
    );
    await Promise.race([checkPromise, timeoutPromise]);
    isDbReachable = true;
  } catch {
    isDbReachable = false;
  }
  lastDbCheck = now;
  return isDbReachable;
}

export class DoctorReviewRepository {
  // ============================================================================
  // QUEUE OPERATIONS
  // ============================================================================

  public static async upsertQueueEntry(entry: Partial<VisitQueueEntryDTO> & { visitId: string }): Promise<VisitQueueEntryDTO> {
    const available = await checkDatabaseAvailability();
    if (available) {
      try {
        const row = await prisma.visitQueueEntry.upsert({
          where: { visit_id: entry.visitId },
          create: {
            visit_id: entry.visitId,
            department: entry.department || 'General Medicine',
            assigned_doctor_id: entry.assignedDoctorId || null,
            queue_status: entry.queueStatus || QueueStatuses.WAITING,
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

        return {
          id: row.id,
          visitId: row.visit_id,
          department: row.department,
          assignedDoctorId: row.assigned_doctor_id,
          queueStatus: row.queue_status as QueueStatus,
          hasOpenAlert: row.has_open_alert,
          readyAt: row.ready_at,
          patientTokenOrName: entry.patientTokenOrName || `Token #${row.visit_id.substring(0, 4).toUpperCase()}`,
          patientAge: entry.patientAge,
          patientGender: entry.patientGender,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      } catch (err) {
        logger.warn('Database error in upsertQueueEntry, falling back to memory store', { error: (err as any).message });
      }
    }

    return devFallbackDoctorReviewStore.upsertQueueEntry(entry);
  }

  public static async getQueueEntry(visitId: string): Promise<VisitQueueEntryDTO | null> {
    const available = await checkDatabaseAvailability();
    if (available) {
      try {
        const row = await prisma.visitQueueEntry.findUnique({
          where: { visit_id: visitId },
        });
        if (row) {
          return {
            id: row.id,
            visitId: row.visit_id,
            department: row.department,
            assignedDoctorId: row.assigned_doctor_id,
            queueStatus: row.queue_status as QueueStatus,
            hasOpenAlert: row.has_open_alert,
            readyAt: row.ready_at,
            patientTokenOrName: `Token #${row.visit_id.substring(0, 4).toUpperCase()}`,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          };
        }
      } catch (err) {
        logger.warn('Database error in getQueueEntry', { error: (err as any).message });
      }
    }

    return devFallbackDoctorReviewStore.getQueueEntry(visitId);
  }

  public static async listQueue(filters?: {
    department?: string;
    assignedDoctorId?: string;
    status?: QueueStatus;
  }): Promise<VisitQueueEntryDTO[]> {
    const available = await checkDatabaseAvailability();
    if (available) {
      try {
        const where: any = {};
        if (filters?.department) where.department = filters.department;
        if (filters?.assignedDoctorId) where.assigned_doctor_id = filters.assignedDoctorId;
        if (filters?.status) where.queue_status = filters.status;

        const rows = await prisma.visitQueueEntry.findMany({
          where,
          orderBy: [{ has_open_alert: 'desc' }, { ready_at: 'asc' }],
        });

        return rows.map((r) => ({
          id: r.id,
          visitId: r.visit_id,
          department: r.department,
          assignedDoctorId: r.assigned_doctor_id,
          queueStatus: r.queue_status as QueueStatus,
          hasOpenAlert: r.has_open_alert,
          readyAt: r.ready_at,
          patientTokenOrName: `Token #${r.visit_id.substring(0, 4).toUpperCase()}`,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }));
      } catch (err) {
        logger.warn('Database error in listQueue, using fallback', { error: (err as any).message });
      }
    }

    return devFallbackDoctorReviewStore.listQueue(filters);
  }

  // ============================================================================
  // CLAIMS (Soft Concurrency Locks)
  // ============================================================================

  public static async getClaim(visitId: string): Promise<ReviewClaimDTO | null> {
    const available = await checkDatabaseAvailability();
    if (available) {
      try {
        const row = await prisma.reviewClaim.findUnique({
          where: { visit_id: visitId },
        });
        if (row) {
          if (new Date() > row.expires_at) {
            await prisma.reviewClaim.delete({ where: { visit_id: visitId } }).catch(() => {});
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
      } catch (err) {
        logger.warn('Database error in getClaim', { error: (err as any).message });
      }
    }

    return devFallbackDoctorReviewStore.getClaim(visitId);
  }

  public static async setClaim(
    visitId: string,
    doctorId: string,
    doctorName: string,
    ttlMs: number = 15 * 60 * 1000
  ): Promise<ReviewClaimDTO> {
    const available = await checkDatabaseAvailability();
    if (available) {
      try {
        const row = await prisma.reviewClaim.upsert({
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
      } catch (err) {
        logger.warn('Database error in setClaim', { error: (err as any).message });
      }
    }

    return devFallbackDoctorReviewStore.setClaim(visitId, doctorId, doctorName, ttlMs);
  }

  public static async releaseClaim(visitId: string, doctorId?: string): Promise<boolean> {
    const available = await checkDatabaseAvailability();
    if (available) {
      try {
        const claim = await prisma.reviewClaim.findUnique({ where: { visit_id: visitId } });
        if (!claim) return true;
        if (doctorId && claim.claimed_by_doctor_id !== doctorId) {
          return false;
        }
        await prisma.reviewClaim.delete({ where: { visit_id: visitId } });
        return true;
      } catch (err) {
        logger.warn('Database error in releaseClaim', { error: (err as any).message });
      }
    }

    return devFallbackDoctorReviewStore.releaseClaim(visitId, doctorId);
  }

  // ============================================================================
  // DOCTOR REVIEWS & REVIEW SESSIONS
  // ============================================================================

  public static async createReview(data: {
    visitId: string;
    baseSummaryId?: string | null;
    baseSummaryVersion: number;
    doctorId: string;
  }): Promise<InMemDoctorReview> {
    const available = await checkDatabaseAvailability();
    if (available) {
      try {
        const row = await prisma.doctorReview.create({
          data: {
            visit_id: data.visitId,
            base_summary_id: data.baseSummaryId || null,
            base_summary_version: data.baseSummaryVersion,
            created_by_doctor_id: data.doctorId,
            status: DoctorReviewStatuses.IN_REVIEW,
          },
        });
        return {
          id: row.id,
          visitId: row.visit_id,
          baseSummaryId: row.base_summary_id,
          baseSummaryVersion: row.base_summary_version,
          status: row.status as DoctorReviewStatus,
          rejectionReason: null,
          rejectionNote: null,
          createdByDoctorId: row.created_by_doctor_id,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      } catch (err) {
        logger.warn('Database error in createReview', { error: (err as any).message });
      }
    }

    return devFallbackDoctorReviewStore.createReview(data);
  }

  public static async getReviewById(reviewId: string) {
    const available = await checkDatabaseAvailability();
    if (available) {
      try {
        const row = await prisma.doctorReview.findUnique({
          where: { id: reviewId },
        });
        if (row) {
          return {
            id: row.id,
            visitId: row.visit_id,
            baseSummaryId: row.base_summary_id,
            baseSummaryVersion: row.base_summary_version,
            status: row.status as DoctorReviewStatus,
            rejectionReason: row.rejection_reason as RejectionReason | null,
            rejectionNote: row.rejection_note,
            createdByDoctorId: row.created_by_doctor_id,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          };
        }
      } catch (err) {
        logger.warn('Database error in getReviewById', { error: (err as any).message });
      }
    }

    return devFallbackDoctorReviewStore.getReviewById(reviewId);
  }

  public static async getActiveReviewByVisitId(visitId: string) {
    const available = await checkDatabaseAvailability();
    if (available) {
      try {
        const row = await prisma.doctorReview.findFirst({
          where: { visit_id: visitId, status: DoctorReviewStatuses.IN_REVIEW },
          orderBy: { created_at: 'desc' },
        });
        if (row) {
          return {
            id: row.id,
            visitId: row.visit_id,
            baseSummaryId: row.base_summary_id,
            baseSummaryVersion: row.base_summary_version,
            status: row.status as DoctorReviewStatus,
            rejectionReason: row.rejection_reason as RejectionReason | null,
            rejectionNote: row.rejection_note,
            createdByDoctorId: row.created_by_doctor_id,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          };
        }
      } catch (err) {
        logger.warn('Database error in getActiveReviewByVisitId', { error: (err as any).message });
      }
    }

    return devFallbackDoctorReviewStore.getActiveReviewByVisitId(visitId);
  }

  public static async updateReviewStatus(
    reviewId: string,
    status: DoctorReviewStatus,
    rejection?: { reason?: RejectionReason; note?: string }
  ) {
    const available = await checkDatabaseAvailability();
    if (available) {
      try {
        const row = await prisma.doctorReview.update({
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
          status: row.status as DoctorReviewStatus,
          rejectionReason: row.rejection_reason as RejectionReason | null,
          rejectionNote: row.rejection_note,
          createdByDoctorId: row.created_by_doctor_id,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      } catch (err) {
        logger.warn('Database error in updateReviewStatus', { error: (err as any).message });
      }
    }

    return devFallbackDoctorReviewStore.updateReviewStatus(reviewId, status, rejection);
  }

  // ============================================================================
  // RESOLUTIONS
  // ============================================================================

  public static async saveResolution(resolution: ReviewItemResolutionDTO): Promise<ReviewItemResolutionDTO> {
    const available = await checkDatabaseAvailability();
    if (available) {
      try {
        const row = await prisma.reviewItemResolution.create({
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
          itemType: row.item_type as any,
          resolutionType: row.resolution_type as any,
          correctedValue: row.corrected_value,
          sourceHash: row.source_hash,
          viewedSource: row.viewed_source,
          doctorId: row.doctor_id,
          resolvedAt: row.resolved_at,
        };
      } catch (err) {
        logger.warn('Database error in saveResolution', { error: (err as any).message });
      }
    }

    return devFallbackDoctorReviewStore.saveResolution(resolution);
  }

  public static async getResolutions(reviewId: string): Promise<ReviewItemResolutionDTO[]> {
    const available = await checkDatabaseAvailability();
    if (available) {
      try {
        const rows = await prisma.reviewItemResolution.findMany({
          where: { review_id: reviewId },
        });
        return rows.map((r) => ({
          id: r.id,
          reviewId: r.review_id,
          itemRef: r.item_ref,
          itemType: r.item_type as any,
          resolutionType: r.resolution_type as any,
          correctedValue: r.corrected_value,
          sourceHash: r.source_hash,
          viewedSource: r.viewed_source,
          doctorId: r.doctor_id,
          resolvedAt: r.resolved_at,
        }));
      } catch (err) {
        logger.warn('Database error in getResolutions', { error: (err as any).message });
      }
    }

    return devFallbackDoctorReviewStore.getResolutions(reviewId);
  }

  // ============================================================================
  // EDITS, ADDITIONS & REMOVALS
  // ============================================================================

  public static async saveStatementEdit(edit: StatementEditDTO): Promise<StatementEditDTO> {
    const available = await checkDatabaseAvailability();
    if (available) {
      try {
        const row = await prisma.statementEdit.create({
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
      } catch (err) {
        logger.warn('Database error in saveStatementEdit', { error: (err as any).message });
      }
    }

    return devFallbackDoctorReviewStore.saveStatementEdit(edit);
  }

  public static async getStatementEdits(reviewId: string): Promise<StatementEditDTO[]> {
    const available = await checkDatabaseAvailability();
    if (available) {
      try {
        const rows = await prisma.statementEdit.findMany({
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
      } catch (err) {
        logger.warn('Database error in getStatementEdits', { error: (err as any).message });
      }
    }

    return devFallbackDoctorReviewStore.getStatementEdits(reviewId);
  }

  public static async addDoctorStatement(stmt: DoctorAddedStatementDTO): Promise<DoctorAddedStatementDTO> {
    const available = await checkDatabaseAvailability();
    if (available) {
      try {
        const row = await prisma.doctorAddedStatement.create({
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
      } catch (err) {
        logger.warn('Database error in addDoctorStatement', { error: (err as any).message });
      }
    }

    return devFallbackDoctorReviewStore.addDoctorStatement(stmt);
  }

  public static async getDoctorAddedStatements(reviewId: string): Promise<DoctorAddedStatementDTO[]> {
    const available = await checkDatabaseAvailability();
    if (available) {
      try {
        const rows = await prisma.doctorAddedStatement.findMany({
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
      } catch (err) {
        logger.warn('Database error in getDoctorAddedStatements', { error: (err as any).message });
      }
    }

    return devFallbackDoctorReviewStore.getDoctorAddedStatements(reviewId);
  }

  public static async removeStatement(reviewId: string, statementId: string): Promise<void> {
    devFallbackDoctorReviewStore.removeStatement(reviewId, statementId);
  }

  public static async getRemovedStatementIds(reviewId: string): Promise<Set<string>> {
    return devFallbackDoctorReviewStore.getRemovedStatementIds(reviewId);
  }

  // ============================================================================
  // CONFIRMED RECORDS & AMENDMENTS (Atomic Transactions)
  // ============================================================================

  public static async createConfirmedRecord(record: ConfirmedRecordDTO): Promise<ConfirmedRecordDTO> {
    const available = await checkDatabaseAvailability();
    if (available) {
      try {
        const created = await prisma.$transaction(async (tx) => {
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
                  source_refs: s.sourceRefs ? (s.sourceRefs as any) : undefined,
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
            origin: s.origin as any,
            order: s.order,
            aiStatementId: s.ai_statement_id,
            resolutionType: s.resolution_type,
            sourceRefs: s.source_refs,
            createdAt: s.created_at,
          })),
          createdAt: created.created_at,
        };
      } catch (err) {
        logger.warn('Database error in createConfirmedRecord transaction', { error: (err as any).message });
      }
    }

    return devFallbackDoctorReviewStore.createConfirmedRecord(record);
  }

  public static async getLatestConfirmedRecord(visitId: string): Promise<ConfirmedRecordDTO | null> {
    const available = await checkDatabaseAvailability();
    if (available) {
      try {
        const row = await prisma.confirmedRecord.findFirst({
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
              origin: s.origin as any,
              order: s.order,
              aiStatementId: s.ai_statement_id,
              resolutionType: s.resolution_type,
              sourceRefs: s.source_refs,
              createdAt: s.created_at,
            })),
            createdAt: row.created_at,
          };
        }
      } catch (err) {
        logger.warn('Database error in getLatestConfirmedRecord', { error: (err as any).message });
      }
    }

    return devFallbackDoctorReviewStore.getLatestConfirmedRecord(visitId);
  }

  public static async getConfirmedRecordById(id: string): Promise<ConfirmedRecordDTO | null> {
    const available = await checkDatabaseAvailability();
    if (available) {
      try {
        const row = await prisma.confirmedRecord.findUnique({
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
              origin: s.origin as any,
              order: s.order,
              aiStatementId: s.ai_statement_id,
              resolutionType: s.resolution_type,
              sourceRefs: s.source_refs,
              createdAt: s.created_at,
            })),
            createdAt: row.created_at,
          };
        }
      } catch (err) {
        logger.warn('Database error in getConfirmedRecordById', { error: (err as any).message });
      }
    }

    return devFallbackDoctorReviewStore.getConfirmedRecordById(id);
  }

  public static async getConfirmedRecordVersions(visitId: string): Promise<ConfirmedRecordDTO[]> {
    const available = await checkDatabaseAvailability();
    if (available) {
      try {
        const rows = await prisma.confirmedRecord.findMany({
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
            origin: s.origin as any,
            order: s.order,
            aiStatementId: s.ai_statement_id,
            resolutionType: s.resolution_type,
            sourceRefs: s.source_refs,
            createdAt: s.created_at,
          })),
          createdAt: row.created_at,
        }));
      } catch (err) {
        logger.warn('Database error in getConfirmedRecordVersions', { error: (err as any).message });
      }
    }

    return devFallbackDoctorReviewStore.getConfirmedRecordVersions(visitId);
  }

  // ============================================================================
  // AUDIT EVENTS (Section 26 & 27: PHI-SAFE)
  // ============================================================================

  public static async recordAuditEvent(data: {
    action: DoctorReviewAuditEvent;
    visitId: string;
    actorId?: string;
    actorRole?: string;
    requestId?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    // PHI-SAFE: strictly ensure NO statement text, patient answers, or clinical values are included
    const safeMetadata = { ...(data.metadata || {}) };
    delete (safeMetadata as any).statementText;
    delete (safeMetadata as any).answerValue;
    delete (safeMetadata as any).rawText;
    delete (safeMetadata as any).extractedValue;

    logger.info(`[AUDIT] ${data.action}`, {
      visitId: data.visitId,
      actorId: data.actorId,
      actorRole: data.actorRole,
      action: data.action,
      ...safeMetadata,
    });

    const available = await checkDatabaseAvailability();
    if (available) {
      try {
        await prisma.auditLog.create({
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
      } catch {
        // Audit log persistence non-blocking in development
      }
    }
  }
}
