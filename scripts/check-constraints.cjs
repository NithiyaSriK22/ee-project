const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const constraints = await p.$queryRawUnsafe(`
    SELECT conname, contype, pg_get_constraintdef(oid) as def 
    FROM pg_constraint 
    WHERE conrelid = 'staff_users'::regclass;
  `);
  console.log('Constraints on staff_users:', constraints);
}

main().finally(() => p.$disconnect());
