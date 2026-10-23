import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const tables = await prisma.$queryRawUnsafe(`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public';
  `);
  console.log('Tables in public schema:', tables.length);
  for (const t of tables) {
    const count = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as c FROM "${t.tablename}"`);
    if (count[0].c > 0n) {
      console.log(`Table ${t.tablename}: ${count[0].c} rows`);
    }
  }
  await prisma.$disconnect();
}
main();
