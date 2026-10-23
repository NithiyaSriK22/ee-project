import { createApp } from './app';
import { ENV } from './config/env';
import { getDatabase } from './db/database';

const app = createApp();

// Warm up database connection and verify schema
const db = getDatabase();
db.prepare('SELECT 1').get();

app.listen(ENV.PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Thunai API Service is running on http://localhost:${ENV.PORT}`);
  console.log(`🏥 Theme: White, Cream, and Red (Tamil: துணை)`);
  console.log(`🔒 Non-negotiable: Pure validation gate, zero clinical content in logs`);
  console.log(`🛡️ Immutable confirmed records, server-enforced must-resolve gate`);
  console.log(`======================================================\n`);
});
