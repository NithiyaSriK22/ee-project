import { DoctorReviewRepository } from '../doctor-review.repository.js';
import { ClaimService } from '../review/claim.service.js';
import { RedFlagsService } from '../../redflags/redflags.service.js';
import { StaffUserPayload } from '../../../types/auth.types.js';
import {
  VisitQueueEntryDTO,
  QueueStatuses,
  QueueStatus,
  DoctorReviewAuditEvents,
} from '../doctor-review.types.js';
import { ForbiddenError } from '../../../errors/app-error.js';

export class QueueService {
  /**
   * Retrieves deterministic patient review queue scoped by department, assigned doctor, and role
   */
  public static async getQueue(
    user: StaffUserPayload,
    options?: {
      department?: string;
      status?: QueueStatus;
      assignedDoctorId?: string;
      scope?: 'my_queue' | 'unassigned' | 'all' | 'department';
    }
  ): Promise<VisitQueueEntryDTO[]> {
    const isDoctor = user.role === 'DOCTOR';
    const isStaff = user.role === 'STAFF_ATTENDANT';
    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';

    if (!isDoctor && !isStaff && !isAdmin) {
      throw new ForbiddenError(`Role '${user.role}' cannot access patient queue.`);
    }

    let filterDepartment = options?.department;
    let filterAssignedDoctor: string | undefined = undefined;
    let unassignedOnly = false;

    // Evaluate scope
    const scope = options?.scope;

    if (scope === 'unassigned') {
      unassignedOnly = true;
    } else if (scope === 'my_queue') {
      filterAssignedDoctor = isDoctor ? user.id : options?.assignedDoctorId;
    } else if (options?.assignedDoctorId) {
      filterAssignedDoctor = options.assignedDoctorId;
    }

    if (options?.department) {
      filterDepartment = options.department;
    } else if (isDoctor && user.hospitalDepartment && scope !== 'unassigned' && scope !== 'all') {
      filterDepartment = user.hospitalDepartment;
    }

    const queue = await DoctorReviewRepository.listQueue({
      department: filterDepartment,
      assignedDoctorId: filterAssignedDoctor,
      unassignedOnly,
      status: options?.status,
    });

    // Refresh has_open_alert flag dynamically from Module 6
    const enriched = await Promise.all(
      queue.map(async (entry) => {
        try {
          const openAlerts = await RedFlagsService.listAlerts({ visitId: entry.visitId });
          const hasOpen = openAlerts.length > 0
            ? openAlerts.some((a) => a.status === 'RAISED' || a.status === 'IN_ASSESSMENT')
            : entry.hasOpenAlert;
          entry.hasOpenAlert = hasOpen;
        } catch {
          // Keep existing flag on error
        }
        return entry;
      })
    );

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
  public static async claimVisit(
    visitId: string,
    user: StaffUserPayload,
    options?: { forceTakeover?: boolean; takeoverReason?: string; outOfQueueReason?: string }
  ) {
    if (user.role !== 'DOCTOR' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenError('Only physicians can claim a case for clinical review');
    }

    // Check existing queue entry or ensure one exists
    let entry = await DoctorReviewRepository.getQueueEntry(visitId);
    if (!entry) {
      entry = await DoctorReviewRepository.upsertQueueEntry({
        visitId,
        department: user.hospitalDepartment || 'General Medicine',
        queueStatus: QueueStatuses.READY_FOR_REVIEW,
      });
    }

    // Out-of-queue scoping check: if visit is in different department
    const isDifferentDept = (d1?: string | null, d2?: string | null): boolean => {
      if (!d1 || !d2) return false;
      const c1 = d1.toLowerCase().replace(/^(department of\s*|opd\s*)/i, '').trim();
      const c2 = d2.toLowerCase().replace(/^(department of\s*|opd\s*)/i, '').trim();
      return c1 !== c2 && !c1.includes(c2) && !c2.includes(c1);
    };

    if (
      user.hospitalDepartment &&
      entry.department &&
      isDifferentDept(user.hospitalDepartment, entry.department)
    ) {
      if (!options?.outOfQueueReason) {
        throw new ForbiddenError(
          `Visit belongs to '${entry.department}'. Out-of-department case review requires a typed justification reason.`
        );
      }
      await DoctorReviewRepository.recordAuditEvent({
        action: DoctorReviewAuditEvents.OUT_OF_QUEUE_ACCESS,
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
    const claim = await ClaimService.claimVisit(
      visitId,
      user.id,
      user.fullName,
      options?.forceTakeover,
      options?.takeoverReason
    );

    // Update queue status to IN_CONSULTATION
    await DoctorReviewRepository.upsertQueueEntry({
      visitId,
      assignedDoctorId: user.id,
      queueStatus: QueueStatuses.IN_CONSULTATION,
    });

    await DoctorReviewRepository.recordAuditEvent({
      action: DoctorReviewAuditEvents.QUEUE_VISIT_CLAIMED,
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
  public static async releaseVisit(visitId: string, user: StaffUserPayload) {
    const released = await ClaimService.releaseClaim(visitId, user.id);
    if (!released) {
      throw new ForbiddenError('Cannot release a claim held by another physician.');
    }

    await DoctorReviewRepository.upsertQueueEntry({
      visitId,
      queueStatus: QueueStatuses.READY_FOR_REVIEW,
    });

    await DoctorReviewRepository.recordAuditEvent({
      action: DoctorReviewAuditEvents.QUEUE_VISIT_RELEASED,
      visitId,
      actorId: user.id,
      actorRole: user.role,
    });

    return { released: true };
  }
}
