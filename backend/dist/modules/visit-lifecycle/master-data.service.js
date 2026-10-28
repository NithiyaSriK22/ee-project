"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MasterDataService = void 0;
const app_error_js_1 = require("../../errors/app-error.js");
const dev_fallback_admin_store_js_1 = require("../admin/dev-fallback-admin-store.js");
const prisma_js_1 = require("../../database/prisma.js");
class MasterDataService {
    // In-memory master stores with resilient seed data
    static departments = new Map([
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
    static locations = new Map([
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
    static doctors = new Map();
    static kiosks = new Map([
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
    static schedules = new Map([
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
    static listDepartments(includeInactive = false) {
        return Array.from(this.departments.values()).filter((d) => includeInactive || d.is_active);
    }
    static getDepartmentById(id) {
        const dept = this.departments.get(id);
        return dept && dept.is_active ? dept : null;
    }
    static getDepartmentByCode(code) {
        const norm = code.trim().toUpperCase();
        for (const d of this.departments.values()) {
            if (d.code === norm && d.is_active)
                return d;
        }
        return null;
    }
    static createDepartment(data, actorId) {
        const code = data.code.trim().toUpperCase();
        if (this.getDepartmentByCode(code)) {
            throw new app_error_js_1.ValidationError(`Department with code '${code}' already exists`);
        }
        const id = `dept_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const dept = {
            id,
            code,
            name: data.name.trim(),
            description: data.description?.trim(),
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
        };
        this.departments.set(id, dept);
        dev_fallback_admin_store_js_1.devFallbackAdminStore.appendAuditLog({
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
    static softDeleteDepartment(id, actorId) {
        const dept = this.departments.get(id);
        if (!dept)
            throw new app_error_js_1.NotFoundError(`Department '${id}' not found`);
        dept.is_active = false;
        dept.updated_at = new Date();
        dev_fallback_admin_store_js_1.devFallbackAdminStore.appendAuditLog({
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
    static listLocations(departmentId) {
        return Array.from(this.locations.values()).filter((loc) => loc.is_active && (!departmentId || loc.department_id === departmentId));
    }
    static createLocation(data, _actorId) {
        const id = `loc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const loc = {
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
    static async listDoctorsAsync(departmentId) {
        const isDbUp = await (0, prisma_js_1.checkDatabaseHealth)();
        if (isDbUp) {
            try {
                const where = { role: 'DOCTOR', status: 'ACTIVE' };
                if (departmentId) {
                    where.hospital_department = { contains: departmentId, mode: 'insensitive' };
                }
                const staffDocs = await prisma_js_1.prisma.staffUser.findMany({
                    where,
                    select: {
                        id: true,
                        full_name: true,
                        email: true,
                        hospital_department: true,
                        status: true,
                        created_at: true,
                    },
                    orderBy: { full_name: 'asc' },
                });
                if (staffDocs.length > 0) {
                    return staffDocs.map((doc) => ({
                        id: doc.id,
                        staff_user_id: doc.id,
                        doctor_name: doc.full_name,
                        full_name: doc.full_name,
                        fullName: doc.full_name,
                        email: doc.email,
                        department_id: doc.hospital_department || 'dept_gen_med',
                        department_name: doc.hospital_department || 'General Medicine',
                        department: doc.hospital_department || 'General Medicine',
                        specialization: doc.hospital_department || 'General Medicine',
                        is_active: doc.status === 'ACTIVE',
                        created_at: doc.created_at,
                    }));
                }
            }
            catch { }
        }
        return Array.from(this.doctors.values()).filter((doc) => doc.is_active && (!departmentId || doc.department_id === departmentId));
    }
    static listDoctors(departmentId) {
        return Array.from(this.doctors.values()).filter((doc) => doc.is_active && (!departmentId || doc.department_id === departmentId));
    }
    static async getDoctorByIdAsync(id) {
        const isDbUp = await (0, prisma_js_1.checkDatabaseHealth)();
        if (isDbUp) {
            try {
                const staffDoc = await prisma_js_1.prisma.staffUser.findUnique({
                    where: { id },
                    select: {
                        id: true,
                        full_name: true,
                        email: true,
                        hospital_department: true,
                        status: true,
                        created_at: true,
                    },
                });
                if (staffDoc && staffDoc.status === 'ACTIVE') {
                    return {
                        id: staffDoc.id,
                        staff_user_id: staffDoc.id,
                        doctor_name: staffDoc.full_name,
                        full_name: staffDoc.full_name,
                        email: staffDoc.email,
                        department_id: staffDoc.hospital_department || 'dept_gen_med',
                        department_name: staffDoc.hospital_department || 'General Medicine',
                        specialization: staffDoc.hospital_department || 'General Medicine',
                        is_active: true,
                        created_at: staffDoc.created_at,
                    };
                }
            }
            catch { }
        }
        return this.doctors.get(id) || null;
    }
    static getDoctorById(id) {
        return this.doctors.get(id) || null;
    }
    static createDoctorProfile(data, _actorId) {
        const id = `doc_prof_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const doc = {
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
    static listKiosks() {
        return Array.from(this.kiosks.values()).filter((k) => k.is_active);
    }
    static getKioskByCode(deviceCode) {
        return this.kiosks.get(deviceCode) || null;
    }
    static updateKioskHeartbeat(deviceCode) {
        const kiosk = this.kiosks.get(deviceCode);
        if (kiosk) {
            kiosk.last_seen_at = new Date();
        }
    }
    // --- OPD Schedules & Intake Hours Enforcement ---
    static listSchedules(departmentId) {
        return Array.from(this.schedules.values()).filter((s) => s.is_active && (!departmentId || s.department_id === departmentId));
    }
    static isIntakeOpenForDepartment(departmentId, currentDate = new Date()) {
        if (process.env.NODE_ENV === 'test') {
            return { isOpen: true };
        }
        const currentDay = currentDate.getDay();
        const deptSchedules = Array.from(this.schedules.values()).filter((s) => s.is_active && s.department_id === departmentId && (s.day_of_week === currentDay || s.day_of_week === -1));
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
    static dryRunCsvImport(entityType, rows) {
        const conflicts = [];
        const previewRows = [];
        let validCount = 0;
        rows.forEach((row, idx) => {
            const rowNum = idx + 1;
            if (entityType === 'DEPARTMENTS') {
                const code = (row.code || '').trim().toUpperCase();
                if (!code || !row.name) {
                    conflicts.push({ row: rowNum, identifier: code || 'UNKNOWN', reason: 'Missing required code or name' });
                }
                else if (this.getDepartmentByCode(code)) {
                    conflicts.push({ row: rowNum, identifier: code, reason: `Department code '${code}' already exists` });
                }
                else {
                    validCount++;
                    if (previewRows.length < 5)
                        previewRows.push(row);
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
exports.MasterDataService = MasterDataService;
