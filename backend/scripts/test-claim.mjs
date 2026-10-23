import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  try {
    const res = await prisma.reviewClaim.upsert({
      where: { visit_id: 'visit-concurrency-test' },
      create: {
        visit_id: 'visit-concurrency-test',
        claimed_by_doctor_id: 'c0000000-0000-4000-a000-000000000002',
        claimed_by_doctor_name: 'Dr. Ananya Sharma',
        claimed_at: new Date(),
        expires_at: new Date(Date.now() + 15 * 60 * 1000),
      },
      update: {
        claimed_by_doctor_id: 'c0000000-0000-4000-a000-000000000002',
        claimed_by_doctor_name: 'Dr. Ananya Sharma',
        claimed_at: new Date(),
        expires_at: new Date(Date.now() + 15 * 60 * 1000),
      },
    });
    console.log('Upsert succeeded:', res);
  } catch (err) {
    console.error('Upsert failed with error:', err);
  }
  await prisma.$disconnect();
}
main();
