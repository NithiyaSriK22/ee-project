const { PrismaClient } = require('@prisma/client');

async function testPrisma() {
  const prisma = new PrismaClient();
  try {
    const rawResult = await prisma.$queryRaw`SELECT 1 as result, current_database() as db, current_user as usr`;
    console.log('[PRISMA-TEST] SELECT 1 raw query:', rawResult);

    const patientCount = await prisma.patient.count();
    console.log('[PRISMA-TEST] Total Patient records:', patientCount);

    const patients = await prisma.patient.findMany({
      take: 3,
      select: {
        id: true,
        created_at: true,
        updated_at: true,
      }
    });
    console.log('[PRISMA-TEST] Sample patient records (IDs only):', patients.map(p => p.id));

    const visitCount = await prisma.patientVisitProfile.count();
    console.log('[PRISMA-TEST] Total PatientVisitProfile records:', visitCount);

    const documentCount = await prisma.uploadedDocument.count();
    console.log('[PRISMA-TEST] Total UploadedDocument records:', documentCount);

    const summaryCount = await prisma.clinicalSummary.count();
    console.log('[PRISMA-TEST] Total ClinicalSummary records:', summaryCount);

    const confirmedCount = await prisma.confirmedRecord.count();
    console.log('[PRISMA-TEST] Total ConfirmedRecord records:', confirmedCount);

    console.log('[PRISMA-TEST] ALL PRISMA CHECKS PASSED');
  } catch (err) {
    console.error('[PRISMA-TEST] Error:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testPrisma();
