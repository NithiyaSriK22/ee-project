-- ==============================================================================
-- THUNAI (துணை) SQLITE CORE SCHEMA
-- Assistive Patient Case-Taking Platform
-- ==============================================================================

PRAGMA foreign_keys = ON;

-- 1. Patients Table
CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY,
  mrn TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL,
  phone TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. Visits Table
CREATE TABLE IF NOT EXISTS visits (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id),
  status TEXT NOT NULL DEFAULT 'CREATED', -- CREATED, INTAKE_IN_PROGRESS, INTAKE_COMPLETE, IN_REVIEW, CONFIRMED
  token_number TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 3. Answers Table (Interview Question Responses)
CREATE TABLE IF NOT EXISTS answers (
  id TEXT PRIMARY KEY,
  visit_id TEXT NOT NULL REFERENCES visits(id),
  question_code TEXT NOT NULL,
  option_code TEXT,
  value_text TEXT,
  state TEXT NOT NULL CHECK(state IN ('ANSWERED', 'SKIPPED', 'DECLINED')),
  answered_via TEXT NOT NULL DEFAULT 'KIOSK',
  is_critical INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 4. Documents Table (Uploaded/Scanned Prescriptions)
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  visit_id TEXT NOT NULL REFERENCES visits(id),
  file_path TEXT NOT NULL,
  doc_type TEXT NOT NULL DEFAULT 'PRESCRIPTION',
  mime_type TEXT NOT NULL DEFAULT 'image/png',
  file_size INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING_OCR',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 5. Raw OCR Fields Table
CREATE TABLE IF NOT EXISTS raw_fields (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id),
  field_type TEXT NOT NULL, -- drug_name, dosage, allergy, etc.
  raw_text TEXT NOT NULL,
  ocr_confidence REAL NOT NULL,
  bbox_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 6. Validated Fields Table (Deterministic Validation Gate Outputs)
CREATE TABLE IF NOT EXISTS validated_fields (
  id TEXT PRIMARY KEY,
  raw_field_id TEXT NOT NULL REFERENCES raw_fields(id),
  field_type TEXT NOT NULL,
  is_critical INTEGER NOT NULL DEFAULT 0,
  result TEXT NOT NULL CHECK(result IN ('VERIFIED', 'UNVERIFIED', 'UNREADABLE', 'MISMATCH_FLAGGED')),
  matched_value TEXT,
  match_score REAL NOT NULL DEFAULT 0.0,
  reason_code TEXT,
  formulary_version TEXT NOT NULL DEFAULT 'v1.0-demo',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 7. Summaries Table
CREATE TABLE IF NOT EXISTS summaries (
  id TEXT PRIMARY KEY,
  visit_id TEXT NOT NULL REFERENCES visits(id),
  version INTEGER NOT NULL DEFAULT 1,
  mode TEXT NOT NULL CHECK(mode IN ('template', 'llm')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 8. Summary Statements Table
CREATE TABLE IF NOT EXISTS summary_statements (
  id TEXT PRIMARY KEY,
  summary_id TEXT NOT NULL REFERENCES summaries(id),
  section TEXT NOT NULL, -- CHIEF_COMPLAINT, HISTORY, MEDICATIONS, ALLERGIES, PAST_HISTORY, FAMILY_HISTORY
  text TEXT NOT NULL,
  origin TEXT NOT NULL CHECK(origin IN ('AUTO-INSERTED', 'AI-PHRASED', 'PATIENT QUOTE', 'DOCTOR-EDITED')),
  source_refs_json TEXT NOT NULL DEFAULT '[]',
  flags_json TEXT NOT NULL DEFAULT '[]',
  ord INTEGER NOT NULL DEFAULT 0
);

-- 9. Doctor Reviews Table
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  visit_id TEXT NOT NULL REFERENCES visits(id),
  doctor_id TEXT NOT NULL,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

-- 10. Doctor Resolutions Table (Must-Resolve Decisions)
CREATE TABLE IF NOT EXISTS resolutions (
  id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL REFERENCES reviews(id),
  item_ref TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('VERIFIED_AGAINST_SOURCE', 'CORRECTED', 'MARKED_NOT_AVAILABLE', 'DEFER_TO_CONSULTATION')),
  corrected_value TEXT,
  viewed_source INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 11. Confirmed Records Table (IMMUTABLE Record Output)
CREATE TABLE IF NOT EXISTS confirmed_records (
  id TEXT PRIMARY KEY,
  visit_id TEXT UNIQUE NOT NULL REFERENCES visits(id),
  version INTEGER NOT NULL DEFAULT 1,
  doctor_id TEXT NOT NULL,
  confirmed_at TEXT NOT NULL DEFAULT (datetime('now')),
  content_json TEXT NOT NULL
);

-- SQLite Trigger enforcing immutability of confirmed_records
CREATE TRIGGER IF NOT EXISTS prevent_confirmed_record_update
BEFORE UPDATE ON confirmed_records
BEGIN
  SELECT RAISE(ABORT, 'IMMUTABLE_RECORD: Confirmed medical intake records cannot be modified.');
END;

CREATE TRIGGER IF NOT EXISTS prevent_confirmed_record_delete
BEFORE DELETE ON confirmed_records
BEGIN
  SELECT RAISE(ABORT, 'IMMUTABLE_RECORD: Confirmed medical intake records cannot be deleted.');
END;

-- 12. Alerts Table (Red-Flag and Safety Triage Alerts)
CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  visit_id TEXT NOT NULL REFERENCES visits(id),
  rule_code TEXT NOT NULL,
  tier TEXT NOT NULL CHECK(tier IN ('IMMEDIATE', 'STAFF_CHECK', 'MANUAL')),
  trigger_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED')),
  raised_at TEXT NOT NULL DEFAULT (datetime('now')),
  ack_at TEXT,
  kiosk_label TEXT
);

-- 13. Audit Log Table (No Clinical Data Stored)
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  ts TEXT NOT NULL DEFAULT (datetime('now')),
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details_json TEXT NOT NULL DEFAULT '{}'
);

-- 14. Formulary Table (Demo Dataset)
CREATE TABLE IF NOT EXISTS formulary (
  id TEXT PRIMARY KEY,
  generic TEXT UNIQUE NOT NULL,
  brands_json TEXT NOT NULL DEFAULT '[]',
  lasa_partners_json TEXT NOT NULL DEFAULT '[]'
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_visits_patient ON visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_answers_visit ON answers(visit_id);
CREATE INDEX IF NOT EXISTS idx_documents_visit ON documents(visit_id);
CREATE INDEX IF NOT EXISTS idx_raw_fields_doc ON raw_fields(document_id);
CREATE INDEX IF NOT EXISTS idx_val_fields_raw ON validated_fields(raw_field_id);
CREATE INDEX IF NOT EXISTS idx_statements_summary ON summary_statements(summary_id);
CREATE INDEX IF NOT EXISTS idx_alerts_visit ON alerts(visit_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity, entity_id);
