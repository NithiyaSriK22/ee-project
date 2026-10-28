const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://medikiosk_user:medikiosk_password@localhost:5432/medikiosk_db?schema=public';

async function main() {
  const client = new Client({ connectionString });
  await client.connect();

  // Find all columns named like 'email' or with text type
  const res = await client.query(`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND (column_name ILIKE '%email%' OR column_name ILIKE '%doctor%')
    ORDER BY table_name, column_name;
  `);

  console.log('Columns with email or doctor:', res.rows);

  // Check if any other table contains '%thunai.test%'
  const tablesRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
  `);

  for (const row of tablesRes.rows) {
    const tbl = row.table_name;
    // Find text columns in this table
    const colRes = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = $1 AND data_type IN ('character varying', 'text', 'character');
    `, [tbl]);

    for (const c of colRes.rows) {
      try {
        const matchRes = await client.query(`
          SELECT COUNT(*) as cnt FROM "${tbl}" WHERE "${c.column_name}"::text ILIKE '%thunai.test%';
        `);
        const cnt = parseInt(matchRes.rows[0].cnt, 10);
        if (cnt > 0) {
          console.log(`Found ${cnt} matches in ${tbl}.${c.column_name}`);
        }
      } catch (e) {
        // ignore
      }
    }
  }

  await client.end();
}

main().catch(console.error);
