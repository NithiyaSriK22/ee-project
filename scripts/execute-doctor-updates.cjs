const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function executeUpdates() {
  console.log('=== EXECUTING TEST DOCTOR CREDENTIALS & EMAIL UPDATE ===\n');

  // Compute password hash with 12 salt rounds using bcryptjs (application standard)
  const passwordHash = await bcrypt.hash('doctor123', 12);

  const allUsers = await prisma.staffUser.findMany({
    orderBy: { created_at: 'asc' }
  });

  let updatedCount = 0;
  const updatedRecords = [];

  for (const user of allUsers) {
    const email = user.email.toLowerCase();
    // Safety check: NEVER touch genuine user accounts or core mock anchors
    if (email === 'nithiya0sy@gmail.com' || email === 'dr.ananya@hospital.org') {
      console.log(`[PROTECTED] Skipping genuine/core account: ${user.full_name} (${user.email})`);
      continue;
    }

    const isTestDoctor = email.endsWith('@thunai.test') || email.endsWith('@medikiosk.local');
    if (!isTestDoctor) {
      console.log(`[SKIPPED] Non-test account: ${user.full_name} (${user.email})`);
      continue;
    }

    let newEmail = email;
    if (email.endsWith('@thunai.test')) {
      newEmail = email.replace('@thunai.test', '@medbrief.test');
    } else if (email.endsWith('@medikiosk.local')) {
      newEmail = email.replace('@medikiosk.local', '@medbrief.test');
    }

    // Update clinic_name if it contains THUNAI
    let updatedClinic = user.clinic_name;
    if (updatedClinic && updatedClinic.includes('THUNAI')) {
      updatedClinic = updatedClinic.replace(/THUNAI/g, 'MEDBRIEF');
    }

    const updated = await prisma.staffUser.update({
      where: { id: user.id },
      data: {
        email: newEmail,
        password_hash: passwordHash,
        clinic_name: updatedClinic,
      }
    });

    updatedCount++;
    updatedRecords.push({
      id: updated.id,
      name: updated.full_name,
      oldEmail: user.email,
      newEmail: updated.email,
      specialization: updated.hospital_department,
      regNo: updated.medical_registration_number,
      clinic: updated.clinic_name,
    });
    console.log(`[UPDATED] ${updated.full_name}: ${user.email} -> ${updated.email}`);
  }

  console.log(`\nSuccessfully updated ${updatedCount} test doctor accounts.`);
  console.table(updatedRecords);

  // Verification step 1: Verify all updated accounts authenticate with 'doctor123'
  console.log('\n--- VERIFYING PASSWORD AUTHENTICATION ---');
  for (const rec of updatedRecords) {
    const u = await prisma.staffUser.findUnique({ where: { id: rec.id } });
    const isMatch = await bcrypt.compare('doctor123', u.password_hash);
    const isWrongRejected = !(await bcrypt.compare('wrongpassword', u.password_hash));
    if (!isMatch || !isWrongRejected) {
      throw new Error(`Authentication verification failed for account ${rec.newEmail}`);
    }
  }
  console.log('✓ All updated accounts successfully verified against password "doctor123" and rejected bad passwords.');

  // Verification step 2: Verify genuine account was not modified
  const genuineUser = await prisma.staffUser.findUnique({ where: { email: 'nithiya0sy@gmail.com' } });
  if (!genuineUser) {
    throw new Error('Critical: Genuine account missing!');
  }
  console.log(`✓ Genuine user account preserved: ${genuineUser.full_name} (${genuineUser.email})`);
}

executeUpdates()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
