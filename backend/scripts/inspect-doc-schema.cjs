const { Client } = require('pg');
async function run() {
  const c = new Client({
    host: 'localhost',
    port: 5432,
    user: 'medikiosk_user',
    password: 'medikiosk_password',
    database: 'medikiosk_db'
  });
  await c.connect();
  const res = await c.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'uploaded_documents';");
  console.log(res.rows);
  await c.end();
}
run().catch(console.error);
