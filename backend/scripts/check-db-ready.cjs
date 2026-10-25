const path = require('node:path');
const dotenv = require('dotenv');
const { Client } = require('pg');

// Load environment variables from backend .env
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const connectionString = process.env.DATABASE_URL || 'postgresql://medikiosk_user:medikiosk_password@localhost:5432/medikiosk_db?schema=public';

async function checkDatabase() {
  console.log('[DB-READY] Checking PostgreSQL database readiness...');

  // Parse connection info safely without exposing passwords
  const parsedUrl = new URL(connectionString);
  const host = parsedUrl.hostname;
  const port = parsedUrl.port || '5432';
  const database = parsedUrl.pathname.replace(/^\//, '');
  const user = parsedUrl.username;

  console.log(`[DB-READY] Target: ${host}:${port} | Database: ${database} | User: ${user}`);

  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 3000,
  });

  try {
    await client.connect();

    // 1. Basic query check
    const infoRes = await client.query('SELECT current_database(), current_user, version()');
    const { current_database, current_user, version } = infoRes.rows[0];

    // 2. Table inventory check
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    const tableCount = tablesRes.rows.length;

    console.log(`[DB-READY] Server: ${version.split(' on ')[0]}`);
    console.log(`[DB-READY] Active Database: ${current_database}`);
    console.log(`[DB-READY] Active User: ${current_user}`);
    console.log(`[DB-READY] Public Tables Count: ${tableCount}`);

    await client.end();

    console.log(`[DB-READY] STATUS: SUCCESS (Database is fully active and ready for application traffic)`);
    process.exit(0);
  } catch (err) {
    try {
      await client.end();
    } catch {}

    console.error(`[DB-READY] STATUS: FAILED (${err.message || err.code || String(err)})`);
    console.error(`[DB-READY] Guidance: Ensure the database daemon is running via:`);
    console.error(`          npm run db:start`);
    console.error(`          or in background via:`);
    console.error(`          Start-Process node -ArgumentList scripts/postgres-daemon.cjs -WorkingDirectory "${path.resolve(__dirname, '..')}" -WindowStyle Hidden`);
    process.exit(1);
  }
}

checkDatabase();
