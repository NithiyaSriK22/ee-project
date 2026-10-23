import { PrismaClient } from '@prisma/client';

// Connect to postgres database to execute database-level administrative commands
const adminUrl = 'postgresql://medikiosk_user:medikiosk_password@localhost:5432/postgres?schema=public';
const prismaAdmin = new PrismaClient({
  datasources: { db: { url: adminUrl } },
});

async function main() {
  console.log('Terminating existing connections to medikiosk_db...');
  await prismaAdmin.$executeRawUnsafe(`
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname = 'medikiosk_db' AND pid <> pg_backend_pid();
  `);

  console.log('Renaming medikiosk_db to medikiosk_db_old...');
  await prismaAdmin.$executeRawUnsafe(`ALTER DATABASE medikiosk_db RENAME TO medikiosk_db_old;`);

  console.log('Creating medikiosk_db with UTF8 encoding...');
  await prismaAdmin.$executeRawUnsafe(`
    CREATE DATABASE medikiosk_db WITH ENCODING 'UTF8' LC_COLLATE='C' LC_CTYPE='C' TEMPLATE template0;
  `);

  console.log('Verifying encoding of new medikiosk_db:');
  const dbs = await prismaAdmin.$queryRawUnsafe(`
    SELECT datname, pg_encoding_to_char(encoding) as enc FROM pg_database WHERE datname IN ('medikiosk_db', 'medikiosk_db_old');
  `);
  console.log('Databases:', dbs);

  await prismaAdmin.$disconnect();
}

main().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
