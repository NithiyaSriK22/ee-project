const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function planUpdates() {
  const allUsers = await prisma.staffUser.findMany({
    orderBy: { created_at: 'asc' }
  });

  console.log('=== TEST ACCOUNT MIGRATION PLAN ===\n');
  const planned = [];
  const untouched = [];

  for (const user of allUsers) {
    const email = user.email.toLowerCase();
    const isGenuineOrExcluded = email === 'nithiya0sy@gmail.com' || email === 'dr.ananya@hospital.org';
    const isTestDoctor = (email.endsWith('@thunai.test') || email.endsWith('@medikiosk.local')) && !isGenuineOrExcluded;

    if (isTestDoctor) {
      let newEmail = email;
      if (email.endsWith('@thunai.test')) {
        newEmail = email.replace('@thunai.test', '@medbrief.test');
      } else if (email.endsWith('@medikiosk.local')) {
        newEmail = email.replace('@medikiosk.local', '@medbrief.test');
      }

      planned.push({
        id: user.id,
        name: user.full_name,
        oldEmail: user.email,
        newEmail: newEmail,
        regNo: user.medical_registration_number,
        specialization: user.hospital_department,
        clinic: user.clinic_name,
      });
    } else {
      untouched.push({
        id: user.id,
        name: user.full_name,
        email: user.email,
        role: user.role,
        reason: isGenuineOrExcluded ? 'Genuine user account / Core test anchor - PRESERVED' : 'Non-test/unmatched account - PRESERVED'
      });
    }
  }

  console.log(`Accounts to be updated: ${planned.length}`);
  console.table(planned);

  console.log(`\nAccounts to remain UNTOUCHED: ${untouched.length}`);
  console.table(untouched);
}

planUpdates()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
