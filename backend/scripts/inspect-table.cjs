const { Client } = require('pg');
const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'medikiosk_user',
  password: 'medikiosk_password',
  database: 'medikiosk_db',
});
async function inspect() {
  await client.connect();
  const res = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'combined_document_summaries'");
  console.log('Columns in combined_document_summaries:');
  res.rows.forEach(r => console.log(`  - ${r.column_name} (${r.data_type})`));
  
  // Test insert
  try {
    const insertRes = await client.query(
      `INSERT INTO combined_document_summaries 
       (visit_id, patient_id, summary_payload, total_documents_count, included_document_ids, excluded_document_ids, status, is_stale, generated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING id`,
      [
        'b38cf81b-1197-4e04-8b6e-8a8dd05ee39c',
        '7b363aa3-9285-4975-bfe2-a0fabdb9c2e6',
        JSON.stringify({ overview: 'Test payload' }),
        1,
        JSON.stringify(['doc-1']),
        JSON.stringify([]),
        'PENDING_REVIEW',
        false
      ]
    );
    console.log('SUCCESSFUL INSERT! ID:', insertRes.rows[0].id);
  } catch (err) {
    console.error('INSERT ERROR:', err.message);
  }
  
  await client.end();
}
inspect().catch(e => { console.error(e); process.exit(1); });
