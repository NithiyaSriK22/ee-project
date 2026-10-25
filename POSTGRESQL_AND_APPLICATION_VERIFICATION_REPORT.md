# POSTGRESQL & APPLICATION VERIFICATION REPORT: THUNAI / MEDIKIOSK

**Project Root:** `C:\Users\ELCOT\Desktop\ee project`  
**Date of Audit & Fix:** October 24, 2026  
**Auditor & Systems Engineer:** Senior Windows PostgreSQL & Full-Stack Systems Engineer  

---

## 1. EXECUTIVE SUMMARY & OBJECTIVE

The Thunai / MediKiosk platform was inspected and repaired to resolve recurring PostgreSQL connection failures, unhandled database lifecycle issues, and misleading health checks.

Following targeted fixes to the supervisor daemon, database client timeout configurations, and health check endpoints, the PostgreSQL database is **fully stable, active on port 5432, serving 67 public tables, and safely retaining all 25 patient records and 324 uploaded documents**. All database persistence tests, health API checks, OCR/document streaming tests, summarization pipeline tests, and doctor review workflows have passed.

---

## 2. CONFIRMED ROOT CAUSES OF POSTGRESQL FAILURES

Four distinct root causes were identified in the codebase:

### Root Cause 1: Supervisor Lifetime Tied to Terminal Process
The script `backend/scripts/postgres-daemon.cjs` used `embedded-postgres`. When launched in a foreground terminal, closing the console window sent a termination signal (`CTRL_CLOSE_EVENT` on Windows) to the parent Node.js process, terminating the child `postgres.exe` cluster. Subsequent backend requests resulted in `ECONNREFUSED` on port 5432.

### Root Cause 2: Crash on Initializing Existing Cluster (`initdb` Failure)
The existing data directory `backend/data/postgres/` contains a valid, pre-initialized PostgreSQL 18.4 database cluster with `PG_VERSION`. The supervisor script previously called `pg.initialise()` unconditionally. On an existing cluster directory, PostgreSQL's `initdb` command fails immediately with `Directory is not empty`. When this exception occurred or was handled improperly, the supervisor exited prematurely without launching the server.

### Root Cause 3: Duplicate Process Collision & `postmaster.pid` Conflicts
When PostgreSQL was already running on port 5432, running the supervisor again failed to pre-flight probe the database identity. It attempted to re-bind port 5432 or launch another cluster, causing process collisions, corrupted PID states, or spurious startup errors.

### Root Cause 4: Aggressive Health Check Timeout & Stale Failure Caching
In `backend/src/database/prisma.ts`, `testConnection()` used an aggressive 500 ms timeout. Under Windows disk I/O latency or during cold-start connection pooling, the `SELECT 1` query took longer than 500 ms. Once a check timed out, the script cached `result: false` for 5 seconds. Even after PostgreSQL recovered, subsequent requests to `/api/v1/health` continued to report `database: disconnected` for up to 5 seconds.

---

## 3. FILES MODIFIED & IMPLEMENTED FIXES

### 1. `backend/scripts/postgres-daemon.cjs`
* **Pre-flight Socket & Query Probe:** Added `testTcpPort()` and `queryDatabase()`. If port 5432 is already bound and responds to `SELECT 1` as `medikiosk_user`, the supervisor attaches a monitoring heartbeat without starting a duplicate cluster or killing the running instance.
* **Cluster Initialization Detection:** Checks for the presence of `backend/data/postgres/PG_VERSION`. If present, skips `initdb` entirely and directly launches the existing cluster.
* **Process Event Monitoring:** Attached listeners to `pg.process.on('exit')` and `pg.process.on('error')` to detect unexpected process termination and report real exit codes.
* **Query-Based Readiness Polling:** Replaced blind delays with `waitForReadiness()`, polling `SELECT 1 as connected, current_database() as db` up to 25 attempts before declaring readiness.
* **Keepalive Heartbeat:** Configured a 30-second interval query to prevent Node.js event-loop exhaustion and maintain active process monitoring.
* **Signal Handling:** Registered graceful shutdown handlers for `SIGINT` and `SIGTERM`.

### 2. `backend/scripts/check-db-ready.cjs` (New File)
* Created a lightweight standalone readiness CLI script for developers and scripts (`npm run db:ready`).
* Connects via PostgreSQL driver, verifies server version, current database, active user, and public table counts, exiting with code 0 on success or code 1 on failure.

### 3. `backend/src/database/prisma.ts`
* **Increased Query Timeout:** Raised the `SELECT 1` timeout threshold from 500 ms to 3,000 ms to account for Windows system scheduling and pooling delays.
* **Error Classification:** Differentiated query timeouts (`isTimeout = true`) from connection refusal errors, outputting clear contextual log warnings.
* **Asymmetric Status Caching:** Positive connection status (`result: true`) is cached for 3,000 ms to prevent connection thrashing. Negative connection status (`result: false`) is only cached for 1,000 ms, ensuring immediate detection of database recovery.
* **Cache Bypass Parameter:** Added `forceRefresh = false` parameter to `checkDatabaseHealth(forceRefresh)` allowing health endpoints to request an immediate, uncached database probe.

### 4. `backend/src/modules/health/` (`health.service.ts`, `health.controller.ts`, `health.routes.ts`)
* Added dedicated endpoint: `GET /api/v1/health/db`.
* Endpoint executes `checkDatabaseHealth(true)` (forced fresh query), returning:
  * `200 OK` with `{ database: 'connected', connected: true, service: 'postgresql', port: 5432 }` when operational.
  * `503 Service Unavailable` with `{ database: 'disconnected', connected: false }` when down.
* Updated `HealthService.getDetailedHealth()` and `HealthService.getReadiness()` to refresh status dynamically.

### 5. `backend/package.json` & Root `package.json`
* Added scripts:
  * `npm run db:ready` -> `node scripts/check-db-ready.cjs`
  * `npm run db:status` -> `node scripts/check-db-ready.cjs`
  * `npm run db:start` -> `node scripts/postgres-daemon.cjs`

---

## 4. VERIFICATION COMMANDS & ACTUAL RESULTS

### Test 1: Standalone Database Readiness Probe
* **Command:** `node scripts/check-db-ready.cjs`
* **Result:** **PASSED**
```
[DB-READY] Checking PostgreSQL database readiness...
[DB-READY] Target: localhost:5432 | Database: medikiosk_db | User: medikiosk_user
[DB-READY] Server: PostgreSQL 18.4
[DB-READY] Active Database: medikiosk_db
[DB-READY] Active User: medikiosk_user
[DB-READY] Public Tables Count: 67
[DB-READY] STATUS: SUCCESS (Database is fully active and ready for application traffic)
```

### Test 2: Live Database & Prisma Safe Read Verification
* **Command:** `node scripts/verify-prisma-read.cjs`
* **Result:** **PASSED**
```
[PRISMA-TEST] SELECT 1 raw query: [ { result: 1, db: 'medikiosk_db', usr: 'medikiosk_user' } ]
[PRISMA-TEST] Total Patient records: 25
[PRISMA-TEST] Sample patient records (IDs only): [
  '04653afc-492d-4bcf-b36d-96a017c62f1a',
  '1a110e44-601a-4516-b8f5-903829ecb45b',
  '1c888271-e5b3-4314-9f46-5f7a8006df3e'
]
[PRISMA-TEST] Total PatientVisitProfile records: 31
[PRISMA-TEST] Total UploadedDocument records: 324
[PRISMA-TEST] Total ClinicalSummary records: 27
[PRISMA-TEST] Total ConfirmedRecord records: 0
[PRISMA-TEST] ALL PRISMA CHECKS PASSED
```

### Test 3: Prisma Schema Validation
* **Command:** `npx prisma validate`
* **Result:** **PASSED**
```
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
The schema at prisma\schema.prisma is valid 🚀
```

### Test 4: Database Persistence Test Suite
* **Command:** `npx vitest run tests/database-persistence.test.ts`
* **Result:** **PASSED (5/5 tests passed in 5.20s)**
  * `✓ 1. Should report database as connected and status as healthy on /api/v1/health`
  * `✓ 2. Should report database as OPERATIONAL on /status board`
  * `✓ 3. Durable database persistence of records`
  * `✓ 4. Should ensure persistent record survives a controlled application disconnection/restart`
  * `✓ 5. Safe verification`

### Test 5: Health Module Test Suite
* **Command:** `npx vitest run tests/health.test.ts`
* **Result:** **PASSED (4/4 tests passed in 5.29s)**
  * `✓ GET /api/v1 should return API info discovery payload`
  * `✓ GET /api/v1/health should return standard 200 health response envelope`
  * `✓ GET /api/v1/health/live should return alive status`
  * `✓ GET /api/v1/health/ready should return readiness evaluation`

### Test 6: Live HTTP Backend Health Endpoints
* **Command:** HTTP GET requests to `http://localhost:5001/api/v1/health*`
* **Result:** **PASSED**
```json
// GET /api/v1/health (Status 200)
{
  "success": true,
  "data": {
    "status": "healthy",
    "service": "thunai-backend",
    "version": "1.0.0",
    "database": "connected",
    "memory": { "rssMb": 106.64, "heapUsedMb": 27.76 }
  }
}

// GET /api/v1/health/live (Status 200)
{
  "success": true,
  "data": { "status": "alive" }
}

// GET /api/v1/health/ready (Status 200)
{
  "success": true,
  "data": { "ready": true, "database": "connected" }
}

// GET /api/v1/health/db (Status 200)
{
  "success": true,
  "data": {
    "database": "connected",
    "connected": true,
    "service": "postgresql",
    "port": 5432
  }
}
```

### Test 7: Document Storage, OCR & Streaming Verification
* **Command:** `npx vitest run tests/document-storage-streaming.test.ts`
* **Result:** **PASSED (17/17 tests passed in 7.37s)**
  * Validated atomic binary write to disk, MIME/magic byte verification, collision-resistant naming, electronic PDF stream extraction, signed HMAC token image retrieval.
* **Command:** `npx vitest run tests/stage4-ocr-manual-review.test.ts`
* **Result:** **PASSED (12/12 tests passed in 5.49s)**
  * Validated low-legibility fallback to `EXTRACTION_FAILED`, doctor alert generation, and original scan viewing.

### Test 8: AI Summary Reliability & Safety Controls
* **Command:** `npx vitest run tests/stage5-summary-reliability.test.ts`
* **Result:** **PASSED (14/14 tests passed in 3.18s)**
  * Validated grounded citation checking, prompt retry on hallucination, and graceful fallback to `TEMPLATE_FALLBACK` on provider timeout or schema malformation.

### Test 9: Complete Full-Workflow Integration
* **Command:** `npx vitest run tests/stage6-full-workflow-integration.test.ts`
* **Result:** **PASSED (14/14 tests passed in 7.06s)**
  * Verified end-to-end kiosk intake, consent gating, file upload, OCR, draft summarization, and doctor portal review.

### Test 10: Doctor Review & Confirmation Journey
* **Command:** `npx vitest run tests/doctor-review.test.ts`
* **Result:** **PASSED (15/15 tests passed in 6.48s)**
  * Verified statement edits, physician additions, resolution of red-flag alerts, and immutable confirmation to `confirmed_records`.

### Test 11: Frontend Test Suites
* **Frontend Kiosk (`frontend-kiosk`):**
  * `npm test` -> **PASSED (4/4 tests passed in 5.04s)**
* **Doctor Review Portal (`frontend-doctor-portal`):**
  * `npm test` -> **PASSED (11/11 tests passed in 5.54s)**

---

## 5. FULL WORKFLOW STATUS: UPLOAD → AI → DOCTOR REVIEW

| Stage | Component | Verified Flow | Status |
| :--- | :--- | :--- | :---: |
| **1. Patient Upload** | Kiosk UI (`DocumentScanPage.tsx`) | Sends base64 or multipart to `POST /api/v1/kiosk/documents/upload`. Validates session, consent (`DOCUMENT_PROCESSING`), magic bytes, 15MB limit. | **VERIFIED** |
| **2. Storage** | `DocumentStorageService.ts` | Writes atomically to `backend/storage/documents/${visitId}/${diskFileName}`. Stores metadata in `uploaded_documents`. | **VERIFIED** |
| **3. Content Extraction** | `ocr.service.ts` & `validation-gate.service.ts` | Extracts text via PDF parser/OCR. Validates clinical entities against formulary. Saves to `validated_fields`. | **VERIFIED** |
| **4. Summary Assembly** | `input-assembler.ts` | Merges validated document fields (`sourceType: 'DOCUMENT'`) and interview answers into prompt XML `<clinical_data>`. | **VERIFIED** |
| **5. AI Summarization** | `generation-orchestrator.ts` | Routes prompt to summarizer provider. Validates schema and grounding. Persists versioned draft to `clinical_summaries`. | **VERIFIED (Mock Active / LLM Ready)** |
| **6. Doctor Review** | Doctor Portal (`ReviewWorkspacePage.tsx`) | Displays draft summary with mock/template warning badges. Streams original record scan via HMAC token. Doctor reviews, edits, and confirms. | **VERIFIED** |

---

## 6. REMAINING CONFIGURATION ITEMS & LIVE AI MODEL EXECUTION

1. **AI Provider Environment Flag:**
   * In `backend/.env`, `SUMMARY_PROVIDER` is currently unset. [summary.service.ts](file:///C:/Users/ELCOT/Desktop/ee project/backend/src/modules/summary/summary.service.ts#L43) defaults to `mock` (`medikiosk-constrained-summary-v1`).
   * The complete real AI adapter ([LocalLlmAdapter](file:///C:/Users/ELCOT/Desktop/ee project/backend/src/modules/summary/generation/provider-adapters/local-llm-adapter.ts#L29)) is fully implemented for OpenAI-compatible endpoints (`/chat/completions`), but port 11434 currently has no running model server.
   * To enable real AI inference, run Ollama (`ollama run llama3:8b-instruct`) and set:
     ```ini
     SUMMARY_PROVIDER=local
     LOCAL_LLM_BASE_URL=http://localhost:11434/v1
     LOCAL_LLM_MODEL=llama3-8b-instruct
     ```

2. **Database Migrations Strategy:**
   * The database currently contains 67 tables and existing patient records. No migrations exist under `prisma/migrations`.
   * **Rule:** Do NOT run `prisma migrate reset` or `prisma db push --force-reset` to avoid wiping patient records. Schema changes should be applied via `prisma db push` without destructive flags.

---

## 7. SAFE STARTUP INSTRUCTIONS

### Step 1: Start PostgreSQL Supervisor
Open a dedicated PowerShell window:
```powershell
cd "C:\Users\ELCOT\Desktop\ee project"
npm run db:start
```
*Note: Keep this window open if running in foreground mode, or run as a Windows background task.*

### Step 2: Verify Database Readiness
In any terminal:
```powershell
cd "C:\Users\ELCOT\Desktop\ee project"
npm run db:ready
```
Ensure it returns: `[DB-READY] STATUS: SUCCESS`.

### Step 3: Start Backend API
In a new terminal:
```powershell
cd "C:\Users\ELCOT\Desktop\ee project\backend"
npm run dev
```
Backend will start at: `http://localhost:5001`.

### Step 4: Start Frontend Applications
* **Patient Kiosk (`http://localhost:5175`):**
  ```powershell
  cd "C:\Users\ELCOT\Desktop\ee project\frontend-kiosk"
  npm run dev
  ```
* **Doctor Portal (`http://localhost:5174`):**
  ```powershell
  cd "C:\Users\ELCOT\Desktop\ee project\frontend-doctor-portal"
  npm run dev
  ```

---

## 8. GIT STATUS

* **Current Branch:** `main`
* **Latest Commit:** `18798da UPDATED`
* **Configured Remote:** `https://github.com/NithiyaSriK22/ee-project.git` (tracked as `origin`)
* **Tracking Status:** Up to date with `origin/main`
* **Modified Local Files:**
  * `backend/scripts/postgres-daemon.cjs`
  * `backend/src/database/prisma.ts`
  * `backend/src/modules/health/health.service.ts`
  * `backend/src/modules/health/health.controller.ts`
  * `backend/src/modules/health/health.routes.ts`
  * `backend/package.json`
  * `package.json`
* **New Verification Files:**
  * `backend/scripts/check-db-ready.cjs`
  * `backend/scripts/verify-prisma-read.cjs`
  * `POSTGRESQL_AND_APPLICATION_VERIFICATION_REPORT.md`
* **GitHub Remote Actions:** No commits, pushes, or resets were executed. All changes remain staged/unstaged locally.
