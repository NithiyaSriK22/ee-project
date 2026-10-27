const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanTestData() {
  console.log('--- Cleaning synthetic and test data from PostgreSQL database ---');

  // 1. Delete all red-flag alerts, evidence, events (reset alert triage queue to clean state)
  const delAlertEvidences = await prisma.redFlagAlertEvidence.deleteMany({});
  const delAlertEvents = await prisma.redFlagAlertEvent.deleteMany({});
  const delAlerts = await prisma.redFlagAlert.deleteMany({});
  console.log(`Deleted alerts: ${delAlerts.count}, evidences: ${delAlertEvidences.count}, events: ${delAlertEvents.count}`);

  // 2. Delete all clinical summaries, sections, statements, and reviews (reset pending reviews to 0)
  const delResolutions = await prisma.reviewItemResolution.deleteMany({});
  const delEdits = await prisma.statementEdit.deleteMany({});
  const delAdditions = await prisma.doctorAddedStatement.deleteMany({});
  const delClaims = await prisma.reviewClaim.deleteMany({});
  const delReviews = await prisma.doctorReview.deleteMany({});
  const delConfirmedStmts = await prisma.confirmedStatement.deleteMany({});
  const delConfirmedRecs = await prisma.confirmedRecord.deleteMany({});

  const delStmtSources = await prisma.summaryStatementSource.deleteMany({});
  const delStatements = await prisma.summaryStatement.deleteMany({});
  const delSections = await prisma.summarySection.deleteMany({});
  const delSummaries = await prisma.clinicalSummary.deleteMany({});
  console.log(`Deleted summaries: ${delSummaries.count}, sections: ${delSections.count}, statements: ${delStatements.count}`);

  // 3. Find test patients (names like 'Test Patient', 'Concurrent Patient', 'No Consent Patient', 'Interview Test Patient', 'Unrelated Patient B', 'Normal Registration Patient', 'Test Empty Upload', etc.)
  const testPatients = await prisma.patient.findMany({
    where: {
      OR: [
        { full_name: { contains: 'Test', mode: 'insensitive' } },
        { full_name: { contains: 'Concurrent', mode: 'insensitive' } },
        { full_name: { contains: 'No Consent', mode: 'insensitive' } },
        { full_name: { contains: 'Unrelated', mode: 'insensitive' } },
        { full_name: { contains: 'Normal Registration', mode: 'insensitive' } },
        { hospital_registration_number: { in: ['MK-2026-887655', 'MK-2026-935874', 'MK-2026-152970', 'MK-2026-822019', 'MK-2026-119128', 'MK-2026-534203', 'MK-2026-552808'] } },
      ],
    },
    select: { id: true, full_name: true, hospital_registration_number: true },
  });

  const testPatientIds = testPatients.map((p) => p.id);
  console.log(`Found ${testPatientIds.length} synthetic test patients to remove.`);

  // Find visit profiles for test patients
  const testProfiles = await prisma.patientVisitProfile.findMany({
    where: { patient_id: { in: testPatientIds } },
    select: { visit_id: true, id: true },
  });
  const testVisitIds = testProfiles.map((p) => p.visit_id);

  // Also include standalone test visit IDs (like 'visit-stage4-001', 'visit-p2-test-01', 'visit-stage3-001')
  const allTestVisitIds = [
    ...new Set([
      ...testVisitIds,
      'visit-stage4-001',
      'visit-p2-test-01',
      'visit-stage3-001',
      'visit-leak-check-01',
      'visit-emergency-test-02',
      'visit-journey-sih-001',
      'vis_unwell_001',
      'vis_disclosure_001',
    ]),
  ];

  // Delete queue entries for test visits
  const delQueue = await prisma.visitQueueEntry.deleteMany({
    where: { visit_id: { in: allTestVisitIds } },
  });
  console.log(`Deleted ${delQueue.count} test visit queue entries.`);

  // Delete test interview sessions, answers, documents, consents, kiosk sessions, profiles, patients
  await prisma.interviewAnswer.deleteMany({ where: { visit_id: { in: allTestVisitIds } } });
  await prisma.interviewSession.deleteMany({ where: { visit_id: { in: allTestVisitIds } } });
  await prisma.rawExtractedField.deleteMany({ where: { document: { visit_id: { in: allTestVisitIds } } } });
  await prisma.validatedField.deleteMany({ where: { document: { visit_id: { in: allTestVisitIds } } } });
  await prisma.uploadedDocument.deleteMany({ where: { visit_id: { in: allTestVisitIds } } });
  await prisma.consent.deleteMany({ where: { patient_id: { in: testPatientIds } } });
  await prisma.kioskSession.deleteMany({ where: { patient_id: { in: testPatientIds } } });
  await prisma.patientVisitProfile.deleteMany({ where: { patient_id: { in: testPatientIds } } });
  const delPatients = await prisma.patient.deleteMany({ where: { id: { in: testPatientIds } } });
  console.log(`Deleted ${delPatients.count} synthetic test patient records.`);

  // Clean duplicate queue entries for Ramkumar
  const ramkumar = await prisma.patient.findFirst({
    where: { full_name: 'Ramkumar' },
    select: { id: true, hospital_registration_number: true },
  });

  if (ramkumar) {
    const ramProfiles = await prisma.patientVisitProfile.findMany({
      where: { patient_id: ramkumar.id },
      orderBy: { created_at: 'desc' },
      select: { visit_id: true, created_at: true },
    });

    if (ramProfiles.length > 1) {
      // Keep only the newest visit, delete queue entries for older visits
      const [newest, ...older] = ramProfiles;
      const olderVisitIds = older.map((p) => p.visit_id);
      const delOlder = await prisma.visitQueueEntry.deleteMany({
        where: { visit_id: { in: olderVisitIds } },
      });
      console.log(`Cleaned ${delOlder.count} older duplicate queue entries for Ramkumar (retained newest visit: ${newest.visit_id}).`);
    }
  }

  // Also clean up any other test visits created by mock test suites (e.g. visit-s5-*, vis_179308334*)
  const remainingMockQueue = await prisma.visitQueueEntry.deleteMany({
    where: {
      OR: [
        { visit_id: { startsWith: 'visit-' } },
        { visit_id: { startsWith: 'vis_17930833' } },
        { visit_id: { startsWith: 'vis_17930729' } },
      ],
    },
  });
  console.log(`Cleaned ${remainingMockQueue.count} residual test queue entries from test runs.`);

  // Verify resulting clean state
  const remainingAlerts = await prisma.redFlagAlert.count();
  const remainingSummaries = await prisma.clinicalSummary.count();
  const remainingQueue = await prisma.visitQueueEntry.findMany({
    select: { id: true, visit_id: true, department: true, queue_status: true },
  });
  console.log('\n--- CLEAN STATE VERIFICATION ---');
  console.log(`Active Red-Flag Alerts: ${remainingAlerts}`);
  console.log(`Pending Summaries / Reviews: ${remainingSummaries}`);
  console.log(`Active Patients in Queue: ${remainingQueue.length}`);
  console.log('Remaining queue rows:', remainingQueue);
  console.log('--------------------------------');
}

cleanTestData()
  .catch((err) => {
    console.error('Cleanup error:', err);
  })
  .finally(() => {
    process.exit(0);
  });
