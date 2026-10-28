const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.staffUser.findMany({
    select: {
      id: true,
      email: true,
      full_name: true,
      role: true,
      status: true,
      hospital_department: true,
      medical_registration_number: true,
      clinic_name: true,
      qualification: true,
      experience_years: true,
      designation: true,
      created_at: true,
    },
    orderBy: { created_at: 'asc' },
  });

  console.log(`Total staff_users: ${users.length}`);
  for (const u of users) {
    console.log(`- ID: ${u.id} | Email: ${u.email} | Name: ${u.full_name} | Role: ${u.role} | Reg: ${u.medical_registration_number} | Clinic: ${u.clinic_name}`);
  }

  // Check Prisma model names
  const modelNames = Object.keys(prisma).filter(k => !k.startsWith('$') && !k.startsWith('_'));
  console.log('\nPrisma Models available:', modelNames.join(', '));
}

main().finally(() => prisma.$disconnect());
