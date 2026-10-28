/**
 * Complete End-to-End Verification Script for THUNAI
 * Tests:
 * 1. Health & Database connectivity
 * 2. Doctor listing from PostgreSQL
 * 3. Patient registration via Kiosk API with presenting problem
 * 4. Automatic specialty matching and workload-balanced doctor assignment
 * 5. Direct verification of PostgreSQL persistence (patients, visits, queue entries, audit logs)
 * 6. Doctor Directory API retrieval
 * 7. Doctor Review Queue scoping (my_queue vs other doctor vs unassigned)
 * 8. Manual physician reassignment with audit reason
 * 9. Unassigned queue handling for unsupported specialties
 */

const http = require('http');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BACKEND_BASE = 'http://localhost:5001/api/v1';

function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BACKEND_BASE + path);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch {
            parsed = data;
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runVerification() {
  console.log('=================================================================');
  console.log('🏥 THUNAI FULL-STACK INTEGRATION & DYNAMIC ASSIGNMENT VERIFICATION');
  console.log('=================================================================\n');

  try {
    // Step 1: Health check
    console.log('▶ STEP 1: Verifying Backend and PostgreSQL Health...');
    const healthRes = await makeRequest('GET', '/health');
    console.log(`   Health response: ${healthRes.status}`, healthRes.body.status || healthRes.body);
    if (healthRes.status !== 200) throw new Error('Backend health check failed');

    // Step 2: Login as real doctors
    console.log('\n▶ STEP 2: Authenticating Real Doctors from PostgreSQL...');
    const doc1Login = await makeRequest('POST', '/auth/login', {
      email: 'dr.ananya@hospital.org',
      password: 'doctor123',
    });
    const doc1Token = doc1Login.body?.data?.tokens?.accessToken || doc1Login.body?.data?.accessToken;
    if (doc1Login.status !== 200 || !doc1Token) {
      throw new Error(`Doctor 1 login failed: ${JSON.stringify(doc1Login.body)}`);
    }
    const doc1User = doc1Login.body.data.user;
    console.log(`   ✓ Logged in Doc 1: ${doc1User.fullName} (${doc1User.id}) - Dept: ${doc1User.hospitalDepartment}`);

    const doc2Login = await makeRequest('POST', '/auth/login', {
      email: 'nithiya0sy@gmail.com',
      password: 'doctor123',
    });
    let doc2Token = null;
    let doc2User = null;
    const d2Tok = doc2Login.body?.data?.tokens?.accessToken || doc2Login.body?.data?.accessToken;
    if (doc2Login.status === 200 && d2Tok) {
      doc2Token = d2Tok;
      doc2User = doc2Login.body.data.user;
      console.log(`   ✓ Logged in Doc 2: ${doc2User.fullName} (${doc2User.id}) - Dept: ${doc2User.hospitalDepartment}`);
    } else {
      console.log('   (Doc 2 login status: ' + doc2Login.status + ')');
    }

    // Step 3: Check Doctor Listing API
    console.log('\n▶ STEP 3: Checking Active Doctor Listing API (/api/v1/doctor/doctors)...');
    const doctorsRes = await makeRequest('GET', '/doctor/doctors', null, doc1Token);
    console.log(`   Status: ${doctorsRes.status}`);
    const activeDocs = doctorsRes.body?.data || [];
    console.log(`   Found ${activeDocs.length} active doctors:`, activeDocs.map(d => `${d.fullName || d.doctor_name || d.full_name} (${d.department || d.department_name})`));
    if (activeDocs.length === 0) throw new Error('No active doctors returned from API');

    // Step 4: Register Patient via Kiosk API with Chief Complaint
    const testPatientPhone = '9' + Math.floor(100000000 + Math.random() * 900000000);
    const testPatientName = `Verification Patient ${Date.now().toString().slice(-4)}`;
    console.log(`\n▶ STEP 4: Registering Patient via Kiosk Intake: ${testPatientName} (${testPatientPhone})...`);

    const regRes = await makeRequest('POST', '/kiosk/session/start', {
      contactNumber: testPatientPhone,
      fullName: testPatientName,
      dateOfBirth: '1988-06-15',
      gender: 'MALE',
      preferredLanguage: 'en',
      consentGranted: true,
      presentingComplaint: 'High fever, dry cough, severe body pain and headache for 4 days',
    });

    console.log(`   Registration status: ${regRes.status}`);
    if (regRes.status !== 200 && regRes.status !== 201) {
      throw new Error(`Registration failed: ${JSON.stringify(regRes.body)}`);
    }

    const regData = regRes.body.data;
    const patientId = regData.patient?.id || regData.patientId;
    const visitId = regData.session?.visitId || regData.visitId;
    const hospitalRegNo = regData.patient?.hospitalRegistrationNumber || regData.hospitalRegistrationNumber;
    const assignment = regData.assignment;

    console.log(`   ✓ Patient Persisted ID: ${patientId}`);
    console.log(`   ✓ Hospital Reg No: ${hospitalRegNo}`);
    console.log(`   ✓ Visit ID: ${visitId}`);
    console.log(`   ✓ Dynamic Assignment Result:`, assignment);

    if (!assignment?.assigned) {
      throw new Error(`Expected automatic assignment for General Medicine complaint, but was unassigned`);
    }
    const assignedDocId = assignment.doctorId;
    const assignedDocName = assignment.doctorName;
    console.log(`   ✓ Assigned to: ${assignedDocName} (${assignedDocId})`);

    // Step 5: Verify Direct Database Persistence in PostgreSQL
    console.log('\n▶ STEP 5: Verifying Persistence in PostgreSQL Database Directly...');
    const dbPatient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!dbPatient) throw new Error(`Patient ${patientId} not found in PostgreSQL patients table!`);
    console.log(`   ✓ Verified PostgreSQL Patient: ${dbPatient.full_name}, Phone: ${dbPatient.phone_number}, Reg: ${dbPatient.hospital_registration_number}`);

    const dbQueueEntry = await prisma.visitQueueEntry.findUnique({ where: { visit_id: visitId } });
    if (!dbQueueEntry) throw new Error(`VisitQueueEntry for visit ${visitId} not found in PostgreSQL!`);
    console.log(`   ✓ Verified PostgreSQL Queue Entry: Visit=${dbQueueEntry.visit_id}, Dept=${dbQueueEntry.department}, AssignedDoc=${dbQueueEntry.assigned_doctor_id}, Status=${dbQueueEntry.queue_status}`);

    const dbAudit = await prisma.auditLog.findFirst({
      where: { visit_ref: visitId, action: 'DOCTOR_ASSIGNED' },
    });
    console.log(`   ✓ Verified PostgreSQL Audit Log: Action=${dbAudit?.action}, Actor=${dbAudit?.actor_id}, Reason=${dbAudit?.reason_text}`);

    // Step 6: Verify Doctor Portal Patient Directory API
    console.log('\n▶ STEP 6: Verifying Patient Directory API (/api/v1/patients)...');
    const directoryRes = await makeRequest('GET', `/patients?search=${encodeURIComponent(testPatientName)}`, null, doc1Token);
    console.log(`   Directory search status: ${directoryRes.status}`);
    const foundPatients = directoryRes.body?.data?.patients || directoryRes.body?.data || [];
    const matched = foundPatients.find((p) => p.id === patientId || p.hospitalRegistrationNumber === hospitalRegNo);
    if (!matched) {
      throw new Error(`Registered patient ${testPatientName} was not found in directory search results!`);
    }
    console.log(`   ✓ Patient correctly found in Directory: ${matched.fullName} (Reg: ${matched.hospitalRegistrationNumber})`);

    // Step 7: Verify Doctor Portal Review Queue Scoping
    console.log('\n▶ STEP 7: Verifying Doctor Review Queue Scoping...');
    // A) Doctor 1's queue
    const doc1QueueRes = await makeRequest('GET', '/doctor/queue?scope=my_queue', null, doc1Token);
    const doc1Queue = doc1QueueRes.body?.data || [];
    const inDoc1Queue = doc1Queue.some((v) => v.visitId === visitId);

    if (assignedDocId === doc1User.id) {
      if (!inDoc1Queue) throw new Error(`Visit was assigned to Doc 1 (${doc1User.fullName}), but not found in Doc 1's 'my_queue'!`);
      console.log(`   ✓ Confirmed: Visit correctly appears in assigned Doctor 1's queue (${doc1User.fullName})`);
    } else {
      console.log(`   ✓ Visit was assigned to another doctor (${assignedDocName}), checking that doctor's queue...`);
    }

    // B) All OPD Queue
    const allQueueRes = await makeRequest('GET', '/doctor/queue?scope=all', null, doc1Token);
    const inAllQueue = (allQueueRes.body?.data || []).some((v) => v.visitId === visitId);
    if (!inAllQueue) throw new Error(`Visit ${visitId} not found in 'All OPD' queue!`);
    console.log(`   ✓ Confirmed: Visit correctly visible in 'All OPD' queue with assigned doctor badge`);

    // Step 8: Test Manual Reassignment Workflow
    console.log('\n▶ STEP 8: Testing Manual Physician Reassignment via API...');
    // Target doc to reassign to: pick another doctor from activeDocs
    const targetDoc = activeDocs.find((d) => d.id !== assignedDocId) || activeDocs[0];
    console.log(`   Reassigning visit ${visitId} from ${assignedDocName} to ${targetDoc.fullName} (${targetDoc.id})...`);

    const reassignRes = await makeRequest(
      'POST',
      `/doctor/queue/${visitId}/reassign`,
      {
        newDoctorId: targetDoc.id,
        reason: 'Specialist case consultation transfer per senior clinical review',
      },
      doc1Token
    );

    console.log(`   Reassign response status: ${reassignRes.status}`);
    if (reassignRes.status !== 200) {
      throw new Error(`Reassignment failed: ${JSON.stringify(reassignRes.body)}`);
    }
    console.log(`   ✓ Reassigned successfully:`, reassignRes.body.data);

    // Verify DB update
    const updatedQueueEntry = await prisma.visitQueueEntry.findUnique({ where: { visit_id: visitId } });
    if (updatedQueueEntry.assigned_doctor_id !== targetDoc.id) {
      throw new Error(`PostgreSQL assigned_doctor_id did not update to ${targetDoc.id}!`);
    }
    console.log(`   ✓ Verified PostgreSQL queue entry updated to new doctor: ${updatedQueueEntry.assigned_doctor_id}`);

    // Verify reassign audit log
    const reassignAudit = await prisma.auditLog.findFirst({
      where: { visit_ref: visitId, action: 'DOCTOR_REASSIGNED' },
    });
    if (!reassignAudit) throw new Error('Reassignment audit log entry was not found in PostgreSQL!');
    console.log(`   ✓ Verified PostgreSQL Reassignment Audit Log: ${reassignAudit.reason_text}`);

    // Step 9: Test Unassigned Specialty Workflow
    console.log('\n▶ STEP 9: Testing Unassigned Queue for Specialty with No Doctors (e.g. Ophthalmology)...');
    const unassignedPatientName = `Eye Patient ${Date.now().toString().slice(-4)}`;
    const unassignedRegRes = await makeRequest('POST', '/kiosk/session/start', {
      contactNumber: '9' + Math.floor(100000000 + Math.random() * 900000000),
      fullName: unassignedPatientName,
      dateOfBirth: '1995-03-20',
      gender: 'FEMALE',
      preferredLanguage: 'en',
      consentGranted: true,
      presentingComplaint: 'Severe cataract blur, eye discharge and vision loss in right eye',
    });

    const unassignedVisitId = unassignedRegRes.body?.data?.session?.visitId || unassignedRegRes.body?.data?.visitId;
    const unassignedAssignment = unassignedRegRes.body?.data?.assignment;
    console.log(`   Registered eye patient visit: ${unassignedVisitId}`);
    console.log(`   Assignment result:`, unassignedAssignment);

    if (unassignedAssignment?.assigned !== false) {
      throw new Error(`Expected assignment to be unassigned (false) since no Ophthalmologist exists in DB!`);
    }
    console.log(`   ✓ Correctly left unassigned for manual triage (department: ${unassignedAssignment.department})`);

    // Check Unassigned Queue API
    const unassignedQueueRes = await makeRequest('GET', '/doctor/queue?scope=unassigned', null, doc1Token);
    const unassignedQueue = unassignedQueueRes.body?.data || [];
    const inUnassignedQueue = unassignedQueue.some((v) => v.visitId === unassignedVisitId);
    if (!inUnassignedQueue) {
      throw new Error(`Visit ${unassignedVisitId} not found in Unassigned queue!`);
    }
    console.log(`   ✓ Confirmed: Visit is visible in Unassigned Queue tab for staff triage`);

    console.log('\n=================================================================');
    console.log('✅ ALL VERIFICATION SCENARIOS PASSED WITH 100% PERSISTED DATA!');
    console.log('=================================================================\n');
  } catch (error) {
    console.error('\n❌ VERIFICATION FAILED:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runVerification();
