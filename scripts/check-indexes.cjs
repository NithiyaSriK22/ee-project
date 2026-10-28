const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const indexes = await p.$queryRawUnsafe(`
    SELECT indexname, indexdef 
    FROM pg_indexes 
    WHERE tablename = 'staff_users';
  `);
  console.log('Indexes on staff_users:', indexes);
}

main().finally(() => p.$disconnect());
