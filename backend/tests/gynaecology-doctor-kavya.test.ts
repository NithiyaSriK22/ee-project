import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/database/prisma.js';
import { seedDoctors } from '../prisma/seed-doctors.js';
import { MasterDataService } from '../src/modules/visit-lifecycle/master-data.service.js';
import { DoctorAssignmentService } from '../src/modules/doctor-review/assignment/doctor-assignment.service.js';
import { EmailChannel } from '../src/modules/notifications/channels/email.channel.js';
import { NotificationService } from '../src/modules/notifications/notification.service.js';
import { NotificationChannels, NotificationTypes } from '../src/modules/notifications/notification.types.js';

describe('MEDBRIEF: Dr. Kavya Raman (Gynaecology) End-to-End Integration', () => {
  const app = createApp();
  let kavyaDoctorId: string;
  let authToken: string;

  beforeAll(async () => {
    // Ensure doctors are seeded
    await seedDoctors();

    // Verify Dr. Kavya exists in staff_users
    const doc = await prisma.staffUser.findUnique({
      where: { email: 'kavya@medbrief.test' },
    });
    expect(doc).toBeDefined();
    expect(doc!.email).toBe('kavya@medbrief.test');
    kavyaDoctorId = doc!.id;

    // Login as Dr. Kavya to acquire authenticated JWT token
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'kavya@medbrief.test',
        password: 'doctor123',
      });

    expect(loginRes.status).toBe(200);
    authToken = loginRes.body.data.tokens.accessToken;
  });

  // 1. Database Model & Field Verification
  it('1. Should persist Dr. Kavya Raman in staff_users with exact profile fields', async () => {
    const doc = await prisma.staffUser.findUnique({
      where: { id: kavyaDoctorId },
    });

    expect(doc).toBeDefined();
    expect(doc!.full_name).toBe('Dr. Kavya Raman');
    expect(doc!.email).toBe('kavya@medbrief.test');
    expect(doc!.role).toBe('DOCTOR');
    expect(doc!.status).toBe('ACTIVE');
    expect(doc!.hospital_department).toBe('Gynaecology');
    expect(doc!.clinic_name).toBe("MEDBRIEF Women's Health Centre");
    expect(doc!.qualification).toBe('MBBS, MS (Obstetrics and Gynaecology)');
    expect(doc!.experience_years).toBe(8);
    expect(doc!.designation).toBe('Consultant Gynaecologist');
    expect(doc!.medical_registration_number).toBeNull();
    expect(doc!.phone_number).toBeNull();
  });

  // 2. Idempotency Verification
  it('2. Running seed operation twice must be idempotent and not create duplicate doctors', async () => {
    await seedDoctors();
    const count = await prisma.staffUser.count({
      where: { email: 'kavya@medbrief.test' },
    });
    expect(count).toBe(1);
  });

  // 3. Email Retrieval by Doctor ID
  it('3. Should retrieve correct email for Dr. Kavya Raman using her doctor ID', async () => {
    const profile = await MasterDataService.getDoctorByIdAsync(kavyaDoctorId);
    expect(profile).toBeDefined();
    expect(profile.id).toBe(kavyaDoctorId);
    expect(profile.email).toBe('kavya@medbrief.test');
    expect(profile.fullName).toBe('Dr. Kavya Raman');
    expect(profile.specialization).toBe('Gynaecology');
    expect(profile.clinicName).toBe("MEDBRIEF Women's Health Centre");
    expect(profile.qualification).toBe('MBBS, MS (Obstetrics and Gynaecology)');
    expect(profile.experienceYears).toBe(8);
    expect(profile.designation).toBe('Consultant Gynaecologist');
    expect(profile.medicalRegistrationNumber).toBeNull();
    expect(profile.phoneNumber).toBeNull();
  });

  // 4. Specialization Representation & Department Compatibility
  it('4. Gynaecology should be consistently recognized across specialty matching and aliases', () => {
    // Complaint text matching
    const match1 = DoctorAssignmentService.matchSpecialty('Persistent menstrual cramps and pelvic pain');
    expect(match1.department).toBe('Gynaecology');
    expect(match1.confidence).toBe('HIGH');

    const match2 = DoctorAssignmentService.matchSpecialty('Pregnancy consultation antenatal check');
    expect(match2.department).toBe('Gynaecology');

    // Direct request matching
    const match3 = DoctorAssignmentService.matchSpecialty(null, 'Gynaecology');
    expect(match3.department).toBe('Gynaecology');

    // Compatibility check
    expect(DoctorAssignmentService.isDepartmentCompatible('Gynaecology', 'Gynaecology')).toBe(true);
    expect(DoctorAssignmentService.isDepartmentCompatible('Gynaecology', 'Gynecology')).toBe(true);
    expect(DoctorAssignmentService.isDepartmentCompatible('Gynaecology', 'Obstetrics and Gynaecology')).toBe(true);
    expect(DoctorAssignmentService.isDepartmentCompatible('Gynaecology', 'Cardiology')).toBe(false);
  });

  // 5. Real Doctor API Endpoints
  it('5. Should return Dr. Kavya Raman in real doctor list API endpoints', async () => {
    // Master data doctor list
    const res = await request(app)
      .get('/api/v1/doctor/doctors')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const doctors = res.body.data;
    const kavya = doctors.find((d: any) => d.email === 'kavya@medbrief.test');
    expect(kavya).toBeDefined();
    expect(kavya.id).toBe(kavyaDoctorId);
    expect(kavya.fullName || kavya.doctor_name).toBe('Dr. Kavya Raman');
    expect(kavya.department || kavya.specialization).toBe('Gynaecology');
  });

  it('5b. Should return Dr. Kavya Raman from GET /api/v1/auth/doctors', async () => {
    const res = await request(app)
      .get('/api/v1/auth/doctors')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const doctors = res.body.data;
    const kavya = doctors.find((d: any) => d.email === 'kavya@medbrief.test');
    expect(kavya).toBeDefined();
    expect(kavya.id).toBe(kavyaDoctorId);
    expect(kavya.email).toBe('kavya@medbrief.test');
    expect(kavya.fullName).toBe('Dr. Kavya Raman');
    expect(kavya.qualification).toBe('MBBS, MS (Obstetrics and Gynaecology)');
    expect(kavya.experienceYears).toBe(8);
  });

  // 6. Gynaecology Visit Assignment Workflow
  it('6. Should assign Dr. Kavya Raman to a Gynaecology visit and persist her doctor ID', async () => {
    const testVisitId = `vis_gyn_test_${Date.now()}`;

    const assignment = await DoctorAssignmentService.assignDoctorForVisit({
      visitId: testVisitId,
      presentingProblem: 'Patient reporting severe pelvic pain and irregular menstrual cycle',
      actorRole: 'SYSTEM',
    });

    expect(assignment.assigned).toBe(true);
    expect(assignment.department).toBe('Gynaecology');
    expect(assignment.doctorId).toBe(kavyaDoctorId);
    expect(assignment.doctorName).toBe('Dr. Kavya Raman');

    // Verify persistence in PostgreSQL visit_queue_entries
    const queueEntry = await prisma.visitQueueEntry.findUnique({
      where: { visit_id: testVisitId },
    });
    expect(queueEntry).toBeDefined();
    expect(queueEntry!.assigned_doctor_id).toBe(kavyaDoctorId);
    expect(queueEntry!.department).toBe('Gynaecology');

    // Clean up test queue entry
    await prisma.visitQueueEntry.deleteMany({
      where: { visit_id: testVisitId },
    });
  });

  // 7. Email Notification Workflow
  it('7. Should resolve Dr. Kavya Raman’s database email when dispatching notification', async () => {
    EmailChannel.clearSentEmails();

    const notif = await NotificationService.createNotification({
      type: NotificationTypes.DOCTOR_ASSIGNED,
      recipientId: kavyaDoctorId,
      recipientRole: 'DOCTOR',
      title: 'New Gynaecology Case Assigned',
      message: 'A new patient case has been assigned to your outpatient queue.',
      channel: NotificationChannels.EMAIL,
      visitId: 'vis_test_email_gyn',
      deduplicationKey: `test_kavya_notif_${Date.now()}`,
    });

    expect(notif).toBeDefined();
    const sent = EmailChannel.getSentEmails();
    const delivered = sent.find((e) => e.to === 'kavya@medbrief.test');
    expect(delivered).toBeDefined();
    expect(delivered!.to).toBe('kavya@medbrief.test');
    expect(delivered!.subject).toContain('New Gynaecology Case Assigned');
    expect(delivered!.text).toContain('Dr. Kavya Raman');
  });

  // 8. Authentication & Security Intact
  it('8. Should authenticate Dr. Kavya Raman with doctor123 and doctor6 alias, rejecting wrong password', async () => {
    // Primary email
    const okRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'kavya@medbrief.test', password: 'doctor123' });
    expect(okRes.status).toBe(200);

    // Alias
    const aliasRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'doctor6@medbrief.test', password: 'doctor123' });
    expect(aliasRes.status).toBe(200);
    expect(aliasRes.body.data.user.email).toBe('kavya@medbrief.test');

    // Bad password
    const badRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'kavya@medbrief.test', password: 'wrongpassword' });
    expect(badRes.status).toBe(401);
  });

  // 9. Existing Doctors Unaffected
  it('9. Existing seeded doctors should remain intact and unaffected', async () => {
    const arun = await prisma.staffUser.findUnique({
      where: { email: 'arun@medbrief.test' },
    });
    expect(arun).toBeDefined();
    expect(arun!.full_name).toBe('Dr. Arun Kumar');
    expect(arun!.hospital_department).toBe('General Medicine');

    const priya = await prisma.staffUser.findUnique({
      where: { email: 'priya@medbrief.test' },
    });
    expect(priya).toBeDefined();
    expect(priya!.full_name).toBe('Dr. Priya Sharma');
    expect(priya!.hospital_department).toBe('Cardiology');
  });
});
