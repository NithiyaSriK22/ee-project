import fs from 'fs';
import { ENV } from '../config/env';
import { closeDatabase } from './database';
import { runSeed } from './seed';

export function runReset(): void {
  console.log('--- Resetting Thunai Database ---');
  closeDatabase();

  if (fs.existsSync(ENV.DB_PATH)) {
    fs.unlinkSync(ENV.DB_PATH);
    console.log(`✓ Deleted existing database at ${ENV.DB_PATH}`);
  }

  // Also remove WAL / SHM files if present
  const walPath = `${ENV.DB_PATH}-wal`;
  const shmPath = `${ENV.DB_PATH}-shm`;
  if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
  if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);

  runSeed();
  console.log('✓ Database successfully reset and re-seeded with demo slice data.');
}

if (require.main === module) {
  runReset();
}
