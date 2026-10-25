const { Client } = require('pg');

async function addSummaryColumn() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'medikiosk_user',
    password: 'medikiosk_password',
    database: 'medikiosk_db',
  });

  try {
    await client.connect();
    console.log('[DB-MIGRATE] Connected to medikiosk_db.');
    
    // Add non-destructive summary column to uploaded_documents if not present
    await client.query(`
      ALTER TABLE uploaded_documents 
      ADD COLUMN IF NOT EXISTS summary JSONB;
    `);
    console.log('[DB-MIGRATE] Verified/added summary JSONB column in uploaded_documents table.');

    // Also add a table for combined_document_summaries if not present, completely safe & additive
    await client.query(`
      CREATE TABLE IF NOT EXISTS combined_document_summaries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        visit_id VARCHAR(100) NOT NULL,
        patient_id UUID,
        summary_payload JSONB NOT NULL,
        total_documents_count INT DEFAULT 0,
        included_document_ids JSONB DEFAULT '[]'::jsonb,
        excluded_document_ids JSONB DEFAULT '[]'::jsonb,
        status VARCHAR(50) DEFAULT 'PENDING_REVIEW',
        is_stale BOOLEAN DEFAULT FALSE,
        doctor_notes TEXT,
        doctor_approved_at TIMESTAMPTZ,
        doctor_approved_by VARCHAR(100),
        generated_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_combined_summaries_visit ON combined_document_summaries(visit_id);
    `);
    console.log('[DB-MIGRATE] Verified/created combined_document_summaries table.');

    await client.end();
    console.log('[DB-MIGRATE] Success: Database schema updated safely and non-destructively.');
  } catch (err) {
    console.error('[DB-MIGRATE] Error:', err.message);
    process.exit(1);
  }
}

addSummaryColumn();
