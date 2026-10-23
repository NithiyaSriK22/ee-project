const path = require('node:path');
const fs = require('node:fs');
const { default: EmbeddedPostgres } = require('embedded-postgres');

const databaseDir = path.resolve(__dirname, '..', 'data', 'postgres');

// Ensure parent data directory exists
if (!fs.existsSync(path.dirname(databaseDir))) {
  fs.mkdirSync(path.dirname(databaseDir), { recursive: true });
}

const pg = new EmbeddedPostgres({
  databaseDir,
  port: 5432,
  user: 'medikiosk_user',
  password: 'medikiosk_password',
  initialDatabase: 'medikiosk_db',
  persistent: true,
  initdbFlags: ['-E', 'UTF8', '--locale=C'],
});

async function main() {
  console.log('[POSTGRES-DAEMON] Initializing PostgreSQL service at localhost:5432...');
  try {
    await pg.initialise();
  } catch (err) {
    // If already initialized, initialise() may throw; this is safe to proceed
    console.log('[POSTGRES-DAEMON] Data directory ready.');
  }

  console.log('[POSTGRES-DAEMON] Starting PostgreSQL server on port 5432...');
  await pg.start();
  console.log('[POSTGRES-DAEMON] PostgreSQL is active and accepting connections on port 5432.');
  console.log('[POSTGRES-DAEMON] Target database: medikiosk_db | User: medikiosk_user');

  const shutdown = async () => {
    console.log('[POSTGRES-DAEMON] Gracefully stopping PostgreSQL server...');
    try {
      await pg.stop();
      console.log('[POSTGRES-DAEMON] PostgreSQL stopped cleanly.');
    } catch (e) {
      console.error('[POSTGRES-DAEMON] Error during shutdown:', e);
    }
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[POSTGRES-DAEMON] Failed to start PostgreSQL:', err);
  process.exit(1);
});
