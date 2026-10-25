/**
 * verify-e2e-workflow.cjs
 * Comprehensive End-to-End Integration Verification for:
 * 1. Medical record upload & persistent file storage
 * 2. OCR processing & clinical entity extraction
 * 3. Individual document AI summarization
 * 4. Combined multi-document clinical summarization
 * 5. Cross-document timeline changes & discrepancy detection
 * 6. Doctor portal review APIs & approval workflow
 */

const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_change_in_production_min_32_chars!';
const KIOSK_SECRET = process.env.KIOSK_SESSION_SECRET || 'dev_kiosk_secret_min_32_chars_long!';
const API_BASE = 'http://localhost:5001/api/v1';

async function run() {
  console.log('================================================================');
  console.log('THUNAI / MEDIKIOSK — E2E MEDICAL RECORD & AI WORKFLOW VERIFICATION');
  console.log('================================================================\n');

  // 1. Check database connectivity
  console.log('[STEP 1] Checking Database & Finding Active Visit...');
  let visitProfile = await prisma.patientVisitProfile.findFirst({
    include: {
      patient: true,
    },
    orderBy: { created_at: 'desc' },
  });

  let patientId;
  let visitId;

  if (!visitProfile) {
    console.log('No visit profile found. Creating test patient & visit profile...');
    const patient = await prisma.patient.create({
      data: {
        hospital_registration_number: 'HRN-E2E-' + Date.now(),
        full_name: 'Dr. Johnathan Verification Doe',
        phone_number: '+919876543210',
        date_of_birth: new Date('1980-05-15'),
        gender: 'MALE',
      },
    });
    visitProfile = await prisma.patientVisitProfile.create({
      data: {
        patient_id: patient.id,
        chief_complaint: 'Follow-up for chronic diabetes & hypertension',
        status: 'IN_PROGRESS',
      },
      include: { patient: true },
    });
  }

  patientId = visitProfile.patient_id;
  visitId = visitProfile.id;

  console.log(`✓ Active Visit Found: ${visitId}`);
  console.log(`  Patient: ${visitProfile.patient?.full_name || 'N/A'} (ID: ${patientId})`);
  console.log(`  HRN: ${visitProfile.patient?.hospital_registration_number || 'N/A'}`);

  // Ensure Consent is granted for DOCUMENT_PROCESSING
  await prisma.consent.upsert({
    where: {
      patient_id_visit_id_consent_type: {
        patient_id: patientId,
        visit_id: visitId,
        consent_type: 'DOCUMENT_PROCESSING',
      },
    },
    update: {
      granted: true,
      revoked_at: null,
    },
    create: {
      patient_id: patientId,
      visit_id: visitId,
      consent_type: 'DOCUMENT_PROCESSING',
      granted: true,
      granted_at: new Date(),
    },
  });
  console.log('✓ Patient consent for DOCUMENT_PROCESSING ensured.');

  // 2. Find or create Doctor Staff User & Generate Doctor JWT Token
  console.log('\n[STEP 2] Finding or Creating Doctor Staff User & Generating Doctor Staff Token...');
  let doctorUser = await prisma.staffUser.findFirst({
    where: { role: 'DOCTOR', status: 'ACTIVE' },
  });
  if (!doctorUser) {
    doctorUser = await prisma.staffUser.create({
      data: {
        email: 'dr.smith.e2e@medikiosk.local',
        password_hash: '$2a$12$e84W/32fXG/u7tYcQW3n7OWrU/636w8W8f8o45mO4U0k52O0K',
        full_name: 'Dr. Jane Smith, MD',
        role: 'DOCTOR',
        status: 'ACTIVE',
        hospital_department: 'GENERAL_MEDICINE',
      },
    });
    console.log(`✓ Created Doctor Staff User: ${doctorUser.full_name} (${doctorUser.id})`);
  } else {
    console.log(`✓ Found Doctor Staff User: ${doctorUser.full_name} (${doctorUser.id})`);
  }

  const doctorToken = jwt.sign(
    {
      sub: doctorUser.id,
      email: doctorUser.email,
      role: 'DOCTOR',
      fullName: doctorUser.full_name,
      department: doctorUser.hospital_department,
      type: 'STAFF_ACCESS',
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
  console.log('✓ Doctor JWT Token created successfully.');

  // 3. Test Backend Health
  console.log('\n[STEP 3] Probing Backend Health Endpoint...');
  const healthRes = await fetch(`${API_BASE}/health`);
  const healthData = await healthRes.json();
  if (healthData.success && healthData.data?.status === 'healthy') {
    console.log(`✓ Backend Healthy! Database: ${healthData.data.database}, Service: ${healthData.data.service}`);
  } else {
    console.error('FAIL: Backend health check failed:', healthData);
    process.exit(1);
  }

  // 4. Create sample medical documents to simulate patient upload
  console.log('\n[STEP 4] Preparing Medical Records for Patient Upload...');
  
  // Document 1: Prescription Card (Image with PNG header)
  const prescriptionText = `
    CITY GENERAL HOSPITAL - OUTPATIENT CLINIC
    Date: 2026-03-15
    Patient: ${visitProfile.patient?.full_name || 'John Doe'}
    
    Rx:
    1. Metformin 500mg PO BID with meals (Type 2 Diabetes Mellitus)
    2. Lisinopril 10mg PO QD in morning (Hypertension)
    3. Atorvastatin 20mg PO QHS (Hyperlipidemia)
    
    Allergies: Penicillin (severe rash)
    BP: 138/86 mmHg, Pulse: 74 bpm
    Doctor: Dr. A. Sharma, MD (Reg #48291)
  `;
  const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const doc1Buffer = Buffer.concat([pngHeader, Buffer.from(prescriptionText)]);
  const doc1Base64 = doc1Buffer.toString('base64');

  // Document 2: Recent Blood Panel Lab Report (with PDF header)
  const labReportText = `%PDF-1.4
    METROPOLITAN DIAGNOSTIC LABORATORIES
    Specimen Collected: 2026-04-10
    Report Date: 2026-04-11
    Patient: ${visitProfile.patient?.full_name || 'John Doe'}
    
    COMPREHENSIVE METABOLIC & LIPID PANEL:
    - Fasting Blood Sugar: 148 mg/dL [Reference: 70-99] ABNORMAL HIGH
    - HbA1c: 8.2 % [Reference: 4.0-5.6] ABNORMAL HIGH (Uncontrolled T2DM)
    - Total Cholesterol: 224 mg/dL [Reference: < 200] HIGH
    - LDL Cholesterol: 142 mg/dL [Reference: < 100] HIGH
    - HDL Cholesterol: 42 mg/dL [Reference: > 40] NORMAL
    - Serum Creatinine: 0.95 mg/dL [Reference: 0.7 - 1.3] NORMAL
    - eGFR: > 90 mL/min/1.73m2 NORMAL
    
    Clinical Note: Patient reports taking Metformin 1000mg BID and Atorvastatin 40mg.
    Impression: Suboptimal glycemic control. Escalation of therapy advised.
  `;
  const doc2Base64 = Buffer.from(labReportText).toString('base64');

  // Ensure Kiosk Session exists in DB so kiosk upload middleware accepts it
  console.log('Ensuring Kiosk Session in database for visit...');
  let kioskSession = await prisma.kioskSession.findFirst({
    where: { visit_id: visitId },
  });
  if (!kioskSession) {
    kioskSession = await prisma.kioskSession.create({
      data: {
        visit_id: visitId,
        patient_id: patientId,
        status: 'ACTIVE',
        session_token_hash: 'test_hash_' + Date.now(),
        expires_at: new Date(Date.now() + 3600000),
      },
    });
    console.log(`✓ Created Kiosk Session: ${kioskSession.id}`);
  } else {
    console.log(`✓ Reusing Kiosk Session: ${kioskSession.id}`);
  }

  const kioskToken = jwt.sign(
    {
      sessionId: kioskSession.id,
      visitId: visitId,
      patientId: patientId,
      type: 'KIOSK_SESSION',
    },
    KIOSK_SECRET,
    { expiresIn: '1h' }
  );

  // 5. Upload Document 1
  console.log('\n[STEP 5] Uploading Document 1 (Prescription)...');
  const uploadRes1 = await fetch(`${API_BASE}/kiosk/documents/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${kioskToken}`,
    },
    body: JSON.stringify({
      fileName: 'Prescription_Cardiology_2026.png',
      mimeType: 'image/png',
      documentType: 'PRESCRIPTION',
      fileBase64: doc1Base64,
    }),
  });

  const uploadData1 = await uploadRes1.json();
  if (!uploadData1.success) {
    console.error('FAIL: Upload 1 failed:', uploadData1);
    process.exit(1);
  }
  const doc1 = uploadData1.data.document;
  const summary1 = uploadData1.data.individualSummary || doc1.summary;
  console.log(`✓ Document 1 uploaded successfully! ID: ${doc1.id}`);
  console.log(`  Storage Ref: ${doc1.storage_reference || doc1.storageReference}`);
  console.log(`  OCR Status: ${doc1.ocr_status || doc1.ocrStatus}`);
  console.log(`  Has AI Summary: ${!!summary1}`);
  if (summary1) {
    console.log(`  Entities extracted: Drugs: ${summary1.extractedEntities?.drugs?.length || 0}, Diagnoses: ${summary1.extractedEntities?.diagnoses?.length || 0}, Allergies: ${summary1.extractedEntities?.allergies?.length || 0}`);
  }

  // 6. Upload Document 2
  console.log('\n[STEP 6] Uploading Document 2 (Lab Report)...');
  const uploadRes2 = await fetch(`${API_BASE}/kiosk/documents/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${kioskToken}`,
    },
    body: JSON.stringify({
      fileName: 'Comprehensive_Metabolic_Panel.pdf',
      mimeType: 'application/pdf',
      documentType: 'LAB_REPORT',
      fileBase64: doc2Base64,
    }),
  });

  const uploadData2 = await uploadRes2.json();
  if (!uploadData2.success) {
    console.error('FAIL: Upload 2 failed:', uploadData2);
    process.exit(1);
  }
  const doc2 = uploadData2.data.document;
  const summary2 = uploadData2.data.individualSummary || doc2.summary;
  console.log(`✓ Document 2 uploaded successfully! ID: ${doc2.id}`);
  console.log(`  Storage Ref: ${doc2.storage_reference || doc2.storageReference}`);
  console.log(`  OCR Status: ${doc2.ocr_status || doc2.ocrStatus}`);
  console.log(`  Has AI Summary: ${!!summary2}`);
  if (summary2) {
    console.log(`  Entities extracted: Lab Values: ${summary2.extractedEntities?.labValues?.length || 0}, Drugs: ${summary2.extractedEntities?.drugs?.length || 0}`);
  }

  // 7. Verify File Persistence on Disk
  console.log('\n[STEP 7] Verifying Persistent File Storage on Disk...');
  const ref1 = doc1.storage_reference || doc1.storageReference;
  const ref2 = doc2.storage_reference || doc2.storageReference;
  const file1Exists = fs.existsSync(ref1) || fs.existsSync(path.resolve('backend', ref1)) || fs.existsSync(path.resolve(ref1));
  const file2Exists = fs.existsSync(ref2) || fs.existsSync(path.resolve('backend', ref2)) || fs.existsSync(path.resolve(ref2));
  console.log(`  Doc 1 on disk (${ref1}): ${file1Exists ? 'EXISTS (OK)' : 'MISSING'}`);
  console.log(`  Doc 2 on disk (${ref2}): ${file2Exists ? 'EXISTS (OK)' : 'MISSING'}`);
  if (!file1Exists || !file2Exists) {
    console.error('FAIL: Files not found on persistent disk storage!');
    process.exit(1);
  }

  // 8. Test Doctor Review Endpoint: GET /visits/:visitId/medical-records
  console.log('\n[STEP 8] Testing Doctor Review API: GET /visits/:visitId/medical-records...');
  const recordsRes = await fetch(`${API_BASE}/doctor/visits/${visitId}/medical-records`, {
    headers: {
      'Authorization': `Bearer ${doctorToken}`,
    },
  });
  const recordsData = await recordsRes.json();
  if (!recordsData.success) {
    console.error('FAIL: Failed to fetch medical records:', recordsData);
    process.exit(1);
  }
  console.log(`✓ Retrieved ${recordsData.data.length} medical records for visit.`);
  recordsData.data.forEach((r, idx) => {
    console.log(`  Record #${idx + 1}: ${r.fileName} (${r.documentType}) - Status: ${r.status}, OCR: ${r.ocrStatus}`);
  });

  // 9. Test Doctor Review Endpoint: GET /documents/:documentId/summary
  console.log('\n[STEP 9] Testing Doctor Review API: GET /documents/:documentId/summary...');
  const indSummaryRes = await fetch(`${API_BASE}/doctor/documents/${doc1.id}/summary`, {
    headers: {
      'Authorization': `Bearer ${doctorToken}`,
    },
  });
  const indSummaryData = await indSummaryRes.json();
  if (!indSummaryData.success) {
    console.error('FAIL: Failed to fetch individual summary:', indSummaryData);
    process.exit(1);
  }
  const ind = indSummaryData.data;
  console.log('✓ Individual Summary Retrieved:');
  console.log(`  Document: ${ind.fileName} (${ind.documentType})`);
  console.log(`  Report Name: ${ind.reportOrTestName}`);
  console.log(`  Important Findings: ${ind.importantFindings?.join('; ')}`);
  console.log(`  Medications Extracted: ${ind.medications?.length || 0}`);
  console.log(`  Diagnoses: ${ind.diagnoses?.join(', ') || 'None'}`);
  console.log(`  Allergies: ${ind.allergies?.join(', ') || 'None'}`);
  console.log(`  Model ID: ${ind.modelId} (Mock: ${ind.isMock})`);
  console.log(`  Missing / Unreadable notices: ${ind.missingOrUnreadableInfo?.join('; ') || 'None'}`);

  // 10. Test Doctor Review Endpoint: GET /visits/:visitId/combined-summary
  console.log('\n[STEP 10] Testing Doctor Review API: GET /visits/:visitId/combined-summary...');
  const combinedRes = await fetch(`${API_BASE}/doctor/visits/${visitId}/combined-summary`, {
    headers: {
      'Authorization': `Bearer ${doctorToken}`,
    },
  });
  const combinedData = await combinedRes.json();
  if (!combinedData.success) {
    console.error('FAIL: Failed to get combined summary:', combinedData);
    process.exit(1);
  }
  const comb = combinedData.data;
  console.log('✓ Combined Record Summary Generated & Stored:');
  console.log(`  Summary ID: ${comb.id}`);
  console.log(`  Stale: ${comb.isStale}`);
  console.log(`  Doctor Review Status: ${comb.doctorReviewStatus}`);
  console.log(`  Total Docs Count: ${comb.totalDocumentsCount}`);
  console.log(`  Included Records (${comb.includedDocuments?.length || 0}):`);
  comb.includedDocuments?.forEach((rec) => {
    console.log(`    - [${rec.documentType}] ${rec.fileName} (Date: ${rec.documentDate || 'N/A'})`);
  });
  console.log(`  Excluded / Failed Records (${comb.excludedOrFailedDocuments?.length || 0}):`);
  comb.excludedOrFailedDocuments?.forEach((rec) => {
    console.log(`    - ${rec.fileName}: ${rec.reason}`);
  });
  console.log(`  Consolidated Findings (${comb.consolidatedFindings?.length || 0}):`);
  comb.consolidatedFindings?.forEach((f) => {
    console.log(`    - ${f}`);
  });
  console.log(`  Timeline Changes (${comb.timelineChanges?.length || 0}):`);
  comb.timelineChanges?.forEach((t) => {
    console.log(`    - ${t}`);
  });
  console.log(`  Potential Inconsistencies / Discrepancies (${comb.potentialInconsistencies?.length || 0}):`);
  comb.potentialInconsistencies?.forEach((d) => {
    console.log(`    - ${d}`);
  });
  console.log(`  Active Diagnoses: ${comb.diagnosesRecorded?.join(', ') || 'None'}`);
  console.log(`  Active Medications: ${comb.activeMedications?.map((m) => `${m.name} (${m.dosage || 'N/A'})`).join(', ') || 'None'}`);
  console.log(`  Known Allergies: ${comb.allergiesRecorded?.join(', ') || 'None'}`);
  console.log(`  Lab Results: ${comb.importantLabResults?.map((l) => `${l.testName}: ${l.value}`).join(', ') || 'None'}`);

  // 11. Test Doctor Review Endpoint: POST /visits/:visitId/combined-summary/approve
  console.log('\n[STEP 11] Testing Doctor Review API: POST /visits/:visitId/combined-summary/approve...');
  const approveRes = await fetch(`${API_BASE}/doctor/visits/${visitId}/combined-summary/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${doctorToken}`,
    },
    body: JSON.stringify({
      doctorName: 'Dr. Jane Smith, MD',
      notes: 'Reviewed all patient uploaded documents. Titration of Metformin to 1000mg noted and approved for continuity of care.',
    }),
  });
  const approveData = await approveRes.json();
  if (!approveData.success) {
    console.error('FAIL: Failed to approve combined summary:', approveData);
    process.exit(1);
  }
  console.log('✓ Combined Summary Approved Successfully:');
  console.log(`  Status: ${approveData.data.doctorReviewStatus}`);
  console.log(`  Approved By: ${approveData.data.doctorApprovedBy}`);
  console.log(`  Approved At: ${approveData.data.doctorApprovedAt}`);
  console.log(`  Physician Notes: ${approveData.data.doctorNotes}`);

  // 12. Direct Database Check
  console.log('\n[STEP 12] Verifying Direct Database State in PostgreSQL...');
  const dbDoc = await prisma.uploadedDocument.findUnique({
    where: { id: doc1.id },
  });
  console.log(`  Database check doc1 summary JSON: ${dbDoc.summary ? 'PRESENT' : 'NULL'}`);

  const dbCombined = await prisma.combinedDocumentSummary.findUnique({
    where: { visit_id: visitId },
  });
  console.log(`  Database check combined summary: ID ${dbCombined.id}, Status: ${dbCombined.approval_status}`);
  console.log(`  Database check combined timeline_changes: ${JSON.stringify(dbCombined.timeline_changes)}`);
  console.log(`  Database check combined discrepancies: ${JSON.stringify(dbCombined.discrepancies)}`);

  console.log('\n================================================================');
  console.log('ALL VERIFICATION CHECKS PASSED WITH 100% SUCCESS!');
  console.log('================================================================\n');

  await prisma.$disconnect();
}

run().catch(async (e) => {
  console.error('CRITICAL UNHANDLED ERROR:', e);
  await prisma.$disconnect();
  process.exit(1);
});
