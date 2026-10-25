const path = require('node:path');
const fs = require('node:fs');
const net = require('node:net');
const { default: EmbeddedPostgres } = require('embedded-postgres');
const { Client } = require('pg');

const databaseDir = path.resolve(__dirname, '..', 'data', 'postgres');
const port = Number(process.env.PGPORT || 5432);
const user = process.env.PGUSER || 'medikiosk_user';
const password = process.env.PGPASSWORD || 'medikiosk_password';
const initialDatabase = process.env.PGDATABASE || 'medikiosk_db';

// Ensure parent data directory exists
if (!fs.existsSync(path.dirname(databaseDir))) {
  fs.mkdirSync(path.dirname(databaseDir), { recursive: true });
}

/**
 * Probes whether a TCP port is open and accepting socket connections.
 */
function testTcpPort(host, targetPort, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);

    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });

    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });

    socket.once('error', () => {
      resolve(false);
    });

    socket.connect(targetPort, host);
  });
}

/**
 * Tests database connectivity using a live PostgreSQL query.
 */
async function queryDatabase(targetDb = initialDatabase) {
  const client = new Client({
    host: 'localhost',
    port,
    user,
    password,
    database: targetDb,
    connectionTimeoutMillis: 2500,
  });

  try {
    await client.connect();
    const result = await client.query('SELECT 1 as connected, current_database() as db');
    await client.end();
    return { success: true, database: result.rows[0]?.db };
  } catch (err) {
    try {
      await client.end();
    } catch {}
    return { success: false, error: err.message };
  }
}

/**
 * Polls the database until PostgreSQL is ready to accept queries.
 */
async function waitForReadiness(maxAttempts = 20, delayMs = 500) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const check = await queryDatabase(initialDatabase);
    if (check.success) {
      return true;
    }
    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return false;
}

const pg = new EmbeddedPostgres({
  databaseDir,
  port,
  user,
  password,
  initialDatabase,
  persistent: true,
  initdbFlags: ['-E', 'UTF8', '--locale=C'],
});

let isShuttingDown = false;
let heartbeatInterval = null;

async function main() {
  console.log(`[POSTGRES-DAEMON] Initializing PostgreSQL supervisor at localhost:${port}...`);

  // Step 1: Pre-flight check - check if PostgreSQL is already running
  const portListening = await testTcpPort('127.0.0.1', port);
  if (portListening) {
    console.log(`[POSTGRES-DAEMON] Port ${port} is currently bound. Testing database connectivity...`);
    const check = await queryDatabase(initialDatabase);
    if (check.success) {
      console.log(`[POSTGRES-DAEMON] PostgreSQL is already active and healthy on port ${port}.`);
      console.log(`[POSTGRES-DAEMON] Verified connection to database "${check.database}" as user "${user}".`);
      console.log(`[POSTGRES-DAEMON] Monitoring existing instance to prevent duplicate cluster launch.`);
      startHeartbeat(true);
      return;
    } else {
      console.warn(`[POSTGRES-DAEMON] Port ${port} is open, but query to "${initialDatabase}" failed (${check.error}).`);
      console.warn(`[POSTGRES-DAEMON] Please verify if another service or postgres instance is occupying port ${port}.`);
    }
  }

  // Step 2: Check if existing data cluster is initialized
  const pgVersionFile = path.join(databaseDir, 'PG_VERSION');
  const isClusterInitialized = fs.existsSync(pgVersionFile);

  if (isClusterInitialized) {
    const version = fs.readFileSync(pgVersionFile, 'utf8').trim();
    console.log(`[POSTGRES-DAEMON] Existing PostgreSQL cluster detected in "${databaseDir}" (PG_VERSION: ${version}).`);
    console.log(`[POSTGRES-DAEMON] Cluster already initialized. Skipping initdb.`);
  } else {
    console.log(`[POSTGRES-DAEMON] Cluster uninitialized. Initializing new PostgreSQL cluster...`);
    try {
      await pg.initialise();
      if (!fs.existsSync(pgVersionFile)) {
        throw new Error('PG_VERSION file not found after initialization.');
      }
      console.log(`[POSTGRES-DAEMON] New cluster initialized successfully.`);
    } catch (initErr) {
      console.error(`[POSTGRES-DAEMON] Failed to initialize cluster:`, initErr.message);
      process.exit(1);
    }
  }

  // Step 3: Start PostgreSQL server
  console.log(`[POSTGRES-DAEMON] Starting PostgreSQL server on port ${port}...`);
  try {
    await pg.start();
  } catch (startErr) {
    console.error(`[POSTGRES-DAEMON] Failed to launch PostgreSQL server:`, startErr ? startErr.message : 'Unknown error');
    process.exit(1);
  }

  // Step 4: Monitor child process if handle is available
  if (pg.process) {
    pg.process.on('exit', (code, signal) => {
      if (!isShuttingDown) {
        console.error(`[POSTGRES-DAEMON] CRITICAL: PostgreSQL process terminated unexpectedly (code: ${code}, signal: ${signal}).`);
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        process.exit(code !== null ? code : 1);
      }
    });

    pg.process.on('error', (err) => {
      console.error(`[POSTGRES-DAEMON] Child process error:`, err.message);
    });
  }

  // Step 5: Perform real query readiness check
  console.log(`[POSTGRES-DAEMON] Verifying database readiness on port ${port}...`);
  const ready = await waitForReadiness(25, 400);

  if (!ready) {
    console.error(`[POSTGRES-DAEMON] PostgreSQL failed readiness check: could not query "${initialDatabase}" as "${user}".`);
    await shutdown('READINESS_TIMEOUT');
    process.exit(1);
  }

  console.log(`[POSTGRES-DAEMON] PostgreSQL is active and accepting connections on port ${port}.`);
  console.log(`[POSTGRES-DAEMON] Target database: ${initialDatabase} | User: ${user}`);
  console.log(`[POSTGRES-DAEMON] Readiness check verified: live SELECT 1 succeeded.`);

  // Step 6: Start health heartbeat to keep Node.js event loop alive and monitor server
  startHeartbeat(false);
}

function startHeartbeat(externalInstance = false) {
  heartbeatInterval = setInterval(async () => {
    try {
      const check = await queryDatabase(initialDatabase);
      if (!check.success && !isShuttingDown) {
        console.warn(`[POSTGRES-DAEMON] Health heartbeat warning: database query failed (${check.error})`);
      }
    } catch {}
  }, 30000);
}

const shutdown = async (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }

  console.log(`[POSTGRES-DAEMON] Received ${signal}. Gracefully stopping PostgreSQL server...`);
  try {
    await pg.stop();
    console.log('[POSTGRES-DAEMON] PostgreSQL stopped cleanly.');
  } catch (e) {
    console.error('[POSTGRES-DAEMON] Error during shutdown:', e.message);
  }
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

main().catch((err) => {
  console.error('[POSTGRES-DAEMON] Startup failure:', err.message);
  process.exit(1);
});
