import { Department, OpdLocation, DoctorProfile, KioskDevice, OpdSchedule } from './visit.types.js';
import { NotFoundError, ValidationError } from '../../errors/app-error.js';
import { devFallbackAdminStore } from '../admin/dev-fallback-admin-store.js';

export class MasterDataService {
  // In-memory master stores with resilient seed data
  private static departments = new Map<string, Department>([
    [
      'dept_gen_med',
      {
        id: 'dept_gen_med',
        code: 'GENMED',
        name: 'General Medicine',
        description: 'Adult primary outpatient consultations and acute assessments',
        is_active: true,
        created_at: new Date('2026-01-01'),
        updated_at: new Date('2026-01-01'),
      },
    ],
    [
      'dept_cardio',
      {
        id: 'dept_cardio',
        code: 'CARDIO',
        name: 'Cardiology',
        description: 'Cardiovascular care and outpatient chest symptom triage',
        is_active: true,
        created_at: new Date('2026-01-01'),
        updated_at: new Date('2026-01-01'),
      },
    ],
    [
      'dept_peds',
      {
        id: 'dept_peds',
        code: 'PEDS',
        name: 'Pediatrics',
        description: 'Child outpatient clinic and developmental screening',
        is_active: true,
        created_at: new Date('2026-01-01'),
        updated_at: new Date('2026-01-01'),
      },
    ],
  ]);

  private static locations = new Map<string, OpdLocation>([
    [
      'loc_b101',
      {
        id: 'loc_b101',
        department_id: 'dept_gen_med',
        building: 'Block B',
        floor: 'Ground Floor',
        room_number: 'Room 101',
        name: 'General Medicine OPD Wing B',
        is_active: true,
        created_at: new Date('2026-01-01'),
        updated_at: new Date('2026-01-01'),
      },
    ],
    [
      'loc_c205',
      {
        id: 'loc_c205',
        department_id: 'dept_cardio',
        building: 'Block C',
        floor: '2nd Floor',
        room_number: 'Room 205',
        name: 'Cardiac Care Outpatient Clinic',
        is_active: true,
        created_at: new Date('2026-01-01'),
        updated_at: new Date('2026-01-01'),
      },
    ],
  ]);

  private static doctors = new Map<string, DoctorProfile>([
    [
      'doc_prof_001',
      {
        id: 'doc_prof_001',
        staff_user_id: 'c0000000-0000-4000-a000-000000000002',
        department_id: 'dept_gen_med',
        license_number: 'MCI-2015-88491',
        specialization: 'Internal Medicine',
        consultation_room: 'Room 101-A',
        is_active: true,
        created_at: new Date('2026-01-01'),
        updated_at: new Date('2026-01-01'),
      },
    ],
  ]);

  private static kiosks = new Map<string, KioskDevice>([
    [
      'KIOSK-OPD-B1',
      {
        id: 'kiosk_hw_01',
        device_code: 'KIOSK-OPD-B1',
        location_id: 'loc_b101',
        default_department_id: 'dept_gen_med',
        status: 'ACTIVE',
        last_seen_at: new Date(),
        is_active: true,
        created_at: new Date('2026-01-01'),
        updated_at: new Date('2026-01-01'),
      },
    ],
  ]);

  private static schedules = new Map<string, OpdSchedule>([
    [
      'sched_gen_med_weekday',
      {
        id: 'sched_gen_med_weekday',
        department_id: 'dept_gen_med',
        day_of_week: 1, // Monday
        start_time: '08:00',
        end_time: '14:00',
        intake_cutoff_time: '13:30',
        is_active: true,
        created_at: new Date('2026-01-01'),
        updated_at: new Date('2026-01-01'),
      },
    ],
  ]);

  // --- Department Operations ---
  public static listDepartments(includeInactive: boolean = false): Department[] {
    return Array.from(this.departments.values()).filter((d) => includeInactive || d.is_active);
  }

  public static getDepartmentById(id: string): Department | null {
    const dept = this.departments.get(id);
    return dept && dept.is_active ? dept : null;
  }

  public static getDepartmentByCode(code: string): Department | null {
    const norm = code.trim().toUpperCase();
    for (const d of this.departments.values()) {
      if (d.code === norm && d.is_active) return d;
    }
    return null;
  }

  public static createDepartment(data: { code: string; name: string; description?: string }, actorId: string): Department {
    const code = data.code.trim().toUpperCase();
    if (this.getDepartmentByCode(code)) {
      throw new ValidationError(`Department with code '${code}' already exists`);
    }
    const id = `dept_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const dept: Department = {
      id,
      code,
      name: data.name.trim(),
      description: data.description?.trim(),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.departments.set(id, dept);

    devFallbackAdminStore.appendAuditLog({
      actorType: 'STAFF',
      actorId,
      actorRole: 'ADMIN',
      action: 'DEPARTMENT_CREATED',
      entityType: 'DEPARTMENT',
      entityId: id,
      result: 'SUCCESS',
      metadata: { code, name: dept.name },
    });

    return dept;
  }

  public static softDeleteDepartment(id: string, actorId: string): Department {
    const dept = this.departments.get(id);
    if (!dept) throw new NotFoundError(`Department '${id}' not found`);
    dept.is_active = false;
    dept.updated_at = new Date();

    devFallbackAdminStore.appendAuditLog({
      actorType: 'STAFF',
      actorId,
      actorRole: 'ADMIN',
      action: 'DEPARTMENT_SOFT_DELETED',
      entityType: 'DEPARTMENT',
      entityId: id,
      result: 'SUCCESS',
      metadata: { code: dept.code },
    });

    return dept;
  }

  // --- Location Operations ---
  public static listLocations(departmentId?: string): OpdLocation[] {
    return Array.from(this.locations.values()).filter(
      (loc) => loc.is_active && (!departmentId || loc.department_id === departmentId)
    );
  }

  public static createLocation(
    data: { departmentId: string; building: string; floor: string; roomNumber: string; name: string },
    _actorId?: string
  ): OpdLocation {
    const id = `loc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const loc: OpdLocation = {
      id,
      department_id: data.departmentId,
      building: data.building.trim(),
      floor: data.floor.trim(),
      room_number: data.roomNumber.trim(),
      name: data.name.trim(),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.locations.set(id, loc);
    return loc;
  }

  // --- Doctor Profiles ---
  public static listDoctors(departmentId?: string): DoctorProfile[] {
    return Array.from(this.doctors.values()).filter(
      (doc) => doc.is_active && (!departmentId || doc.department_id === departmentId)
    );
  }

  public static getDoctorById(id: string): DoctorProfile | null {
    return this.doctors.get(id) || null;
  }

  public static createDoctorProfile(
    data: { staffUserId: string; departmentId: string; licenseNumber: string; specialization: string; consultationRoom: string },
    _actorId?: string
  ): DoctorProfile {
    const id = `doc_prof_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const doc: DoctorProfile = {
      id,
      staff_user_id: data.staffUserId,
      department_id: data.departmentId,
      license_number: data.licenseNumber.trim(),
      specialization: data.specialization.trim(),
      consultation_room: data.consultationRoom.trim(),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.doctors.set(id, doc);
    return doc;
  }

  // --- Kiosk Devices ---
  public static listKiosks(): KioskDevice[] {
    return Array.from(this.kiosks.values()).filter((k) => k.is_active);
  }

  public static getKioskByCode(deviceCode: string): KioskDevice | null {
    return this.kiosks.get(deviceCode) || null;
  }

  public static updateKioskHeartbeat(deviceCode: string): void {
    const kiosk = this.kiosks.get(deviceCode);
    if (kiosk) {
      kiosk.last_seen_at = new Date();
    }
  }

  // --- OPD Schedules & Intake Hours Enforcement ---
  public static listSchedules(departmentId?: string): OpdSchedule[] {
    return Array.from(this.schedules.values()).filter(
      (s) => s.is_active && (!departmentId || s.department_id === departmentId)
    );
  }

  public static isIntakeOpenForDepartment(
    departmentId: string,
    currentDate: Date = new Date()
  ): { isOpen: boolean; message?: string } {
    const currentDay = currentDate.getDay();
    const deptSchedules = Array.from(this.schedules.values()).filter(
      (s) => s.is_active && s.department_id === departmentId && (s.day_of_week === currentDay || s.day_of_week === -1)
    );

    // If no schedule configured, default to open with daytime guard
    if (deptSchedules.length === 0) {
      return { isOpen: true };
    }

    const currentHours = String(currentDate.getHours()).padStart(2, '0');
    const currentMinutes = String(currentDate.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMinutes}`;

    for (const sched of deptSchedules) {
      if (currentTimeStr >= sched.start_time && currentTimeStr <= sched.intake_cutoff_time) {
        return { isOpen: true };
      }
    }

    const firstSched = deptSchedules[0];
    const guidance = firstSched
      ? `Outpatient registration for this department is currently closed. Intake hours are ${firstSched.start_time} to ${firstSched.intake_cutoff_time}. Please see the outpatient help desk for assistance.`
      : 'Outpatient registration is currently closed. Please see the outpatient help desk for assistance.';
    return {
      isOpen: false,
      message: guidance,
    };
  }

  // --- CSV Import with Dry-Run Report ---
  public static dryRunCsvImport(
    entityType: 'DEPARTMENTS' | 'DOCTORS' | 'LOCATIONS',
    rows: Array<Record<string, string>>
  ): {
    validCount: number;
    conflictCount: number;
    conflicts: Array<{ row: number; identifier: string; reason: string }>;
    previewRows: Array<Record<string, string>>;
  } {
    const conflicts: Array<{ row: number; identifier: string; reason: string }> = [];
    const previewRows: Array<Record<string, string>> = [];
    let validCount = 0;

    rows.forEach((row, idx) => {
      const rowNum = idx + 1;
      if (entityType === 'DEPARTMENTS') {
        const code = (row.code || '').trim().toUpperCase();
        if (!code || !row.name) {
          conflicts.push({ row: rowNum, identifier: code || 'UNKNOWN', reason: 'Missing required code or name' });
        } else if (this.getDepartmentByCode(code)) {
          conflicts.push({ row: rowNum, identifier: code, reason: `Department code '${code}' already exists` });
        } else {
          validCount++;
          if (previewRows.length < 5) previewRows.push(row);
        }
      }
    });

    return {
      validCount,
      conflictCount: conflicts.length,
      conflicts,
      previewRows,
    };
  }
}
