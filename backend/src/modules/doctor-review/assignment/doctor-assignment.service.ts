import { prisma, checkDatabaseHealth } from '../../../database/prisma.js';
import { logger } from '../../../config/logger.js';
import { ValidationError, NotFoundError } from '../../../errors/app-error.js';
import { QueueStatuses } from '../doctor-review.types.js';

export interface SpecialtyMatchResult {
  department: string;
  matchedCategory: string;
  confidence: 'HIGH' | 'MEDIUM' | 'FALLBACK';
  reason: string;
}

export interface DoctorAssignmentResult {
  assigned: boolean;
  visitId: string;
  department: string;
  doctorId: string | null;
  doctorName: string | null;
  assignmentMethod: 'AUTOMATIC' | 'MANUAL';
  matchingReason: string;
  assignedAt: Date;
}

export interface DoctorCandidate {
  id: string;
  fullName: string;
  email: string;
  hospitalDepartment: string | null;
  activeWorkload: number;
}

/**
 * Transparent dictionary mapping presenting complaints to clinical hospital departments
 */
const SPECIALTY_KEYWORDS: Array<{
  department: string;
  keywords: string[];
}> = [
  {
    department: 'Cardiology',
    keywords: [
      'chest pain',
      'angina',
      'palpitations',
      'shortness of breath',
      'heart',
      'cardiac',
      'cardio',
      'arrhythmia',
      'hypertension',
      'bp high',
      'irregular heartbeat',
    ],
  },
  {
    department: 'Pediatrics',
    keywords: [
      'child',
      'infant',
      'pediatric',
      'baby',
      'vaccination',
      'measles',
      'mumps',
      'chickenpox',
      'teething',
      'growth check',
    ],
  },
  {
    department: 'Orthopedics',
    keywords: [
      'bone',
      'fracture',
      'joint pain',
      'knee',
      'shoulder',
      'back pain',
      'spine',
      'sprain',
      'ortho',
      'arthritis',
      'ligament',
      'dislocation',
      'swollen joint',
      'hip pain',
    ],
  },
  {
    department: 'Dermatology',
    keywords: [
      'rash',
      'skin',
      'itching',
      'eczema',
      'psoriasis',
      'acne',
      'dermatitis',
      'boil',
      'skin lesion',
      'hives',
      'fungal',
    ],
  },
  {
    department: 'ENT',
    keywords: [
      'ear pain',
      'throat',
      'nasal',
      'sinus',
      'tonsil',
      'ear discharge',
      'hearing loss',
      'hoarseness',
      'vertigo',
      'ear infection',
    ],
  },
  {
    department: 'Ophthalmology',
    keywords: [
      'eye pain',
      'vision',
      'blur',
      'red eye',
      'cataract',
      'glaucoma',
      'conjunctivitis',
      'eye discharge',
      'watery eyes',
    ],
  },
  {
    department: 'Gynaecology',
    keywords: [
      'gynaecology',
      'gynecology',
      'obstetrics',
      'pregnancy',
      'pregnant',
      'menstrual',
      'period pain',
      'pelvic pain',
      'vaginal',
      'pcos',
      'pcod',
      'antenatal',
      'postnatal',
      'fibroid',
      'cramps',
    ],
  },
  {
    department: 'General Medicine',
    keywords: [
      'fever',
      'cough',
      'cold',
      'headache',
      'fatigue',
      'weakness',
      'diabetes',
      'vomiting',
      'abdominal pain',
      'nausea',
      'diarrhea',
      'general checkup',
      'dizziness',
      'infection',
      'malaise',
      'stomach',
    ],
  },
];

export class DoctorAssignmentService {
  /**
   * Evaluates patient presenting problem against supported clinical specialties.
   * Transparent and deterministic: returns department suggestion without clinical diagnosis.
   */
  public static matchSpecialty(
    presentingProblem?: string | null,
    requestedDepartment?: string | null
  ): SpecialtyMatchResult {
    // 1. Explicit department request
    if (requestedDepartment && requestedDepartment.trim()) {
      const cleanReq = requestedDepartment.trim();
      return {
        department: cleanReq,
        matchedCategory: 'PATIENT_REQUESTED',
        confidence: 'HIGH',
        reason: `Routed to ${cleanReq} per direct patient/staff department selection`,
      };
    }

    // 2. Text complaint analysis
    if (presentingProblem && presentingProblem.trim()) {
      const lowerComplaint = presentingProblem.toLowerCase();

      for (const entry of SPECIALTY_KEYWORDS) {
        for (const kw of entry.keywords) {
          if (lowerComplaint.includes(kw)) {
            return {
              department: entry.department,
              matchedCategory: kw,
              confidence: 'HIGH',
              reason: `Matched department '${entry.department}' based on presenting symptom '${kw}'`,
            };
          }
        }
      }

      return {
        department: 'General Medicine',
        matchedCategory: 'UNSTRUCTURED_COMPLAINT',
        confidence: 'MEDIUM',
        reason: 'General Medicine assigned for clinical triage of general complaint',
      };
    }

    // 3. Fallback default
    return {
      department: 'General Medicine',
      matchedCategory: 'DEFAULT_OPD',
      confidence: 'FALLBACK',
      reason: 'Standard Outpatient intake assigned to General Medicine',
    };
  }

  /**
   * Helper to normalize department names for flexible matching
   */
  public static normalizeDepartmentName(dept?: string | null): string {
    if (!dept) return '';
    return dept
      .toLowerCase()
      .replace(/^(department of\s*|opd\s*)/i, '')
      .replace(/_/g, ' ')
      .trim();
  }

  /**
   * Checks if doctor's department matches target department
   */
  public static isDepartmentCompatible(docDept?: string | null, targetDept?: string | null): boolean {
    if (!docDept || !targetDept) return false;
    const d1 = this.normalizeDepartmentName(docDept);
    const d2 = this.normalizeDepartmentName(targetDept);
    if (d1 === d2) return true;
    if (d1.includes(d2) || d2.includes(d1)) return true;

    // Both general medicine aliases
    const isGenMed1 = d1.includes('general') || d1.includes('med');
    const isGenMed2 = d2.includes('general') || d2.includes('med');
    if (isGenMed1 && isGenMed2) return true;

    // Both gynaecology / obstetrics aliases
    const isGyn1 = d1.includes('gyn') || d1.includes('obg') || d1.includes('obstetric');
    const isGyn2 = d2.includes('gyn') || d2.includes('obg') || d2.includes('obstetric');
    if (isGyn1 && isGyn2) return true;

    return false;
  }

  /**
   * Retrieves all eligible active doctors from PostgreSQL for a target department
   * and calculates their live active workloads.
   */
  public static async getEligibleDoctorsWithWorkload(
    targetDepartment: string
  ): Promise<DoctorCandidate[]> {
    const isDbUp = await checkDatabaseHealth();
    if (!isDbUp) {
      return [];
    }

    // 1. Fetch active doctors from staff_users
    const activeDoctors = await prisma.staffUser.findMany({
      where: {
        role: 'DOCTOR',
        status: 'ACTIVE',
      },
      select: {
        id: true,
        full_name: true,
        email: true,
        hospital_department: true,
      },
    });

    if (activeDoctors.length === 0) {
      return [];
    }

    // 2. Filter by department compatibility
    const compatibleDoctors = activeDoctors.filter((doc) =>
      this.isDepartmentCompatible(doc.hospital_department, targetDepartment)
    );

    if (compatibleDoctors.length === 0) {
      logger.info(`No active physician available in department '${targetDepartment}'. Marking case as unassigned for manual triage.`);
      return [];
    }

    // 3. Count active queue entries (WAITING, READY_FOR_REVIEW, IN_CONSULTATION) for each doctor
    const doctorIds = compatibleDoctors.map((d) => d.id);
    const activeEntries = await prisma.visitQueueEntry.groupBy({
      by: ['assigned_doctor_id'],
      where: {
        assigned_doctor_id: { in: doctorIds },
        queue_status: {
          in: [QueueStatuses.WAITING, QueueStatuses.READY_FOR_REVIEW, QueueStatuses.IN_CONSULTATION],
        },
      },
      _count: {
        _all: true,
      },
    });

    const workloadMap = new Map<string, number>();
    for (const item of activeEntries) {
      if (item.assigned_doctor_id) {
        workloadMap.set(item.assigned_doctor_id, item._count._all);
      }
    }

    return compatibleDoctors.map((doc) => ({
      id: doc.id,
      fullName: doc.full_name,
      email: doc.email,
      hospitalDepartment: doc.hospital_department,
      activeWorkload: workloadMap.get(doc.id) || 0,
    }));
  }

  /**
   * Deterministically selects the least-loaded doctor with fair tie-breaking.
   */
  public static selectBestDoctor(candidates: DoctorCandidate[]): DoctorCandidate | null {
    if (candidates.length === 0) return null;

    // Sort by activeWorkload ASC (least busy first)
    // Tie-breaker: deterministic alphabetical by ID
    const sorted = [...candidates].sort((a, b) => {
      if (a.activeWorkload !== b.activeWorkload) {
        return a.activeWorkload - b.activeWorkload;
      }
      return a.id.localeCompare(b.id);
    });

    return sorted[0] || null;
  }

  /**
   * Main assignment routine: takes visit and presenting problem, determines department,
   * assigns eligible doctor, updates database, and logs audit record.
   */
  public static async assignDoctorForVisit(params: {
    visitId: string;
    presentingProblem?: string | null;
    requestedDepartment?: string | null;
    actorId?: string;
    actorRole?: string;
  }): Promise<DoctorAssignmentResult> {
    const isDbUp = await checkDatabaseHealth();
    if (!isDbUp) {
      throw new Error('Database is currently unavailable for doctor assignment');
    }

    // 1. Determine specialty
    const specialty = this.matchSpecialty(params.presentingProblem, params.requestedDepartment);
    const targetDepartment = specialty.department;

    // 2. Find eligible doctors with workload
    const candidates = await this.getEligibleDoctorsWithWorkload(targetDepartment);
    const selectedDoctor = this.selectBestDoctor(candidates);

    const now = new Date();

    if (selectedDoctor) {
      // 3. Persist assignment in VisitQueueEntry
      await prisma.visitQueueEntry.upsert({
        where: { visit_id: params.visitId },
        create: {
          visit_id: params.visitId,
          department: targetDepartment,
          assigned_doctor_id: selectedDoctor.id,
          queue_status: QueueStatuses.WAITING,
          ready_at: now,
        },
        update: {
          department: targetDepartment,
          assigned_doctor_id: selectedDoctor.id,
          updated_at: now,
        },
      });

      // 4. Record audit event
      try {
        await prisma.auditLog.create({
          data: {
            actor_type: params.actorRole ? 'STAFF' : 'SYSTEM',
            actor_id: params.actorId || 'system_assignment_engine',
            actor_role: params.actorRole || 'SYSTEM',
            action: 'DOCTOR_ASSIGNED',
            entity_type: 'DOCTOR_ASSIGNMENT',
            entity_id: params.visitId,
            visit_ref: params.visitId,
            result: 'SUCCESS',
            reason_text: specialty.reason,
            metadata: {
              assignedDoctorId: selectedDoctor.id,
              doctorName: selectedDoctor.fullName,
              department: targetDepartment,
              activeWorkload: selectedDoctor.activeWorkload,
              candidateCount: candidates.length,
              method: 'AUTOMATIC',
            },
          },
        });
      } catch (auditErr) {
        logger.warn('Failed to record audit log for doctor assignment', { error: (auditErr as any)?.message });
      }

      logger.info('Doctor assigned successfully to visit', {
        visitId: params.visitId,
        doctorId: selectedDoctor.id,
        doctorName: selectedDoctor.fullName,
        department: targetDepartment,
      });

      return {
        assigned: true,
        visitId: params.visitId,
        department: targetDepartment,
        doctorId: selectedDoctor.id,
        doctorName: selectedDoctor.fullName,
        assignmentMethod: 'AUTOMATIC',
        matchingReason: specialty.reason,
        assignedAt: now,
      };
    } else {
      // 5. No eligible doctor available: leave unassigned for manual staff review
      await prisma.visitQueueEntry.upsert({
        where: { visit_id: params.visitId },
        create: {
          visit_id: params.visitId,
          department: targetDepartment,
          assigned_doctor_id: null,
          queue_status: QueueStatuses.WAITING,
          ready_at: now,
        },
        update: {
          department: targetDepartment,
          assigned_doctor_id: null,
          updated_at: now,
        },
      });

      try {
        await prisma.auditLog.create({
          data: {
            actor_type: params.actorRole ? 'STAFF' : 'SYSTEM',
            actor_id: params.actorId || 'system_assignment_engine',
            actor_role: params.actorRole || 'SYSTEM',
            action: 'DOCTOR_ASSIGNMENT_PENDING',
            entity_type: 'DOCTOR_ASSIGNMENT',
            entity_id: params.visitId,
            visit_ref: params.visitId,
            result: 'SUCCESS',
            reason_text: `No active physician currently registered for '${targetDepartment}'. Left in unassigned queue for manual triage.`,
            metadata: {
              department: targetDepartment,
              method: 'AUTOMATIC_UNASSIGNED',
            },
          },
        });
      } catch (auditErr) {
        logger.warn('Failed to record audit log for unassigned visit', { error: (auditErr as any)?.message });
      }

      return {
        assigned: false,
        visitId: params.visitId,
        department: targetDepartment,
        doctorId: null,
        doctorName: null,
        assignmentMethod: 'AUTOMATIC',
        matchingReason: `Pending manual physician triage. No active physician in ${targetDepartment}.`,
        assignedAt: now,
      };
    }
  }

  /**
   * Reassigns an existing visit to a new doctor with audit preservation.
   */
  public static async reassignDoctor(params: {
    visitId: string;
    newDoctorId: string;
    reason: string;
    actorId: string;
    actorRole: string;
  }): Promise<DoctorAssignmentResult> {
    const isDbUp = await checkDatabaseHealth();
    if (!isDbUp) {
      throw new Error('Database is currently unavailable for reassignment');
    }

    if (!params.reason || params.reason.trim().length < 3) {
      throw new ValidationError('A clinical justification reason is required for reassignment');
    }

    // Verify new doctor exists and is active
    const targetDoctor = await prisma.staffUser.findUnique({
      where: { id: params.newDoctorId },
    });

    if (!targetDoctor || targetDoctor.role !== 'DOCTOR' || targetDoctor.status !== 'ACTIVE') {
      throw new NotFoundError('Target physician was not found or is currently inactive');
    }

    // Fetch existing queue entry
    const existingEntry = await prisma.visitQueueEntry.findUnique({
      where: { visit_id: params.visitId },
    });

    if (!existingEntry) {
      throw new NotFoundError(`No queue entry found for visit ${params.visitId}`);
    }

    const previousDoctorId = existingEntry.assigned_doctor_id;
    const newDepartment = targetDoctor.hospital_department || existingEntry.department;
    const now = new Date();

    // Update queue entry
    await prisma.visitQueueEntry.update({
      where: { visit_id: params.visitId },
      data: {
        assigned_doctor_id: targetDoctor.id,
        department: newDepartment,
        updated_at: now,
      },
    });

    // Record audit event preserving full history
    await prisma.auditLog.create({
      data: {
        actor_type: 'STAFF',
        actor_id: params.actorId,
        actor_role: params.actorRole,
        action: 'DOCTOR_REASSIGNED',
        entity_type: 'DOCTOR_ASSIGNMENT',
        entity_id: params.visitId,
        visit_ref: params.visitId,
        result: 'SUCCESS',
        reason_text: params.reason.trim(),
        metadata: {
          previousDoctorId,
          newDoctorId: targetDoctor.id,
          newDoctorName: targetDoctor.full_name,
          department: newDepartment,
          reassignedBy: params.actorId,
        },
      },
    });

    logger.info('Doctor reassigned for visit', {
      visitId: params.visitId,
      previousDoctorId,
      newDoctorId: targetDoctor.id,
      reassignedBy: params.actorId,
    });

    return {
      assigned: true,
      visitId: params.visitId,
      department: newDepartment,
      doctorId: targetDoctor.id,
      doctorName: targetDoctor.full_name,
      assignmentMethod: 'MANUAL',
      matchingReason: params.reason.trim(),
      assignedAt: now,
    };
  }
}
