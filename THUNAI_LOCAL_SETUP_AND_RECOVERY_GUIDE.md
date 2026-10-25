# THUNAI — LOCAL SETUP AND RECOVERY GUIDE

**Date:** 2026-10-25  
**Version:** 1.0.0  
**Target Environment:** Local Workstation / Embedded Hospital Simulation (Windows x64 / Linux)  
**Maintained By:** THUNAI Engineering Team  

---

## 1. System Prerequisites

Before running the THUNAI application stack, verify that the following runtime dependencies are installed and available on your system path:

| Dependency | Minimum Version | Verified Version | Purpose |
|---|---|---|---|
| **Node.js** | `>= 18.18.0` | `v20.x` or `v22.x` | Runtime for backend API and frontend Vite servers |
| **npm** | `>= 9.0.0` | `10.x` | Package manager |
| **PostgreSQL** | `>= 15.0` | `18.4` (or embedded) | Primary clinical relational database (`medikiosk_db`) |
| **Ollama** | `>= 0.1.30` | `0.1.x` | Local LLM inference server (Port 11434) |
| **LLM Model** | - | `llama3.2:1b` (1.32 GB) | Clinical summarization and discrepancy detection |
| **Tesseract OCR**| `>= 5.0.0` | Local binary or node-tesseract | Prescription and lab report text digitization |

---

## 2. Environment Configuration

The backend reads configuration from `backend/.env`. A sanitized reference template is provided below.

> [!WARNING]
> Never commit active credentials, session secrets, or database passwords to version control. Replace all placeholders with secure random strings.

```env
# ==============================================================================
# SERVER & NETWORK
# ==============================================================================
NODE_ENV=development
PORT=5001
API_PREFIX=/api/v1
CORS_ORIGIN=http://localhost:5175,http://localhost:5174

# ==============================================================================
# DATABASE (PostgreSQL)
# ==============================================================================
# Format: postgresql://<USER>:<PASSWORD>@<HOST>:<PORT>/<DATABASE>?schema=public
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/medikiosk_db?schema=public"

# ==============================================================================
# CRYPTOGRAPHY & AUTHENTICATION SECRETS
# ==============================================================================
JWT_SECRET="<GENERATE_SECURE_256_BIT_SECRET_FOR_STAFF_AUTH>"
JWT_EXPIRY="8h"
VISIT_TOKEN_SECRET="<GENERATE_SECURE_256_BIT_SECRET_FOR_KIOSK_HMAC>"
VISIT_TOKEN_EXPIRY="2h"

# ==============================================================================
# LOCAL AI INFERENCE (OLLAMA)
# ==============================================================================
SUMMARY_PROVIDER="local-llm"
LOCAL_LLM_BASE_URL="http://127.0.0.1:11434"
LOCAL_LLM_MODEL="llama3.2:1b"
LOCAL_LLM_TIMEOUT_MS=30000

# ==============================================================================
# STORAGE & LOGGING
# ==============================================================================
STORAGE_LOCAL_PATH="./storage/documents"
MAX_UPLOAD_SIZE_MB=15
LOG_LEVEL="info"
```

---

## 3. Step-by-Step Verification & Startup Procedure

Always launch the THUNAI application stack in the exact sequence outlined below:

### Step 1: Start PostgreSQL Database
If using local PostgreSQL service or the embedded daemon:
```powershell
# Verify port 5432 is listening:
Test-NetConnection -ComputerName 127.0.0.1 -Port 5432

# Read-only verification query:
node -e "const { Client } = require('pg'); const c = new Client({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:5432/medikiosk_db' }); c.connect().then(() => c.query('SELECT current_database(), count(*) FROM information_schema.tables WHERE table_schema=\'public\'')).then(r => { console.log('DB OK:', r.rows[0]); return c.end(); }).catch(e => console.error('DB ERR:', e.message));"
```

### Step 2: Start Ollama AI Inference Engine
Start the Ollama daemon and verify model availability:
```powershell
# Start Ollama daemon (in background terminal):
ollama serve

# Verify reachability and model list:
node -e "fetch('http://127.0.0.1:11434/api/tags').then(r=>r.json()).then(d=>console.log('MODELS:', d.models.map(m=>m.name))).catch(e=>console.error('OLLAMA ERR:', e.message));"
```
*Expected Output:* `MODELS: [ 'llama3.2:1b' ]`

### Step 3: Start the Backend API Server
Navigate to the `backend` directory and launch the TypeScript server:
```powershell
cd backend
npm run dev
# Or directly via tsx:
npx tsx src/server.ts
```
*Port:* `5001`  
*API Health Endpoint:* `http://localhost:5001/api/v1/health`

### Step 4: Start the Patient Kiosk Frontend
Open a new terminal window:
```powershell
cd frontend-kiosk
npm run dev
```
*Port:* `5175`  
*URL:* `http://localhost:5175/`

### Step 5: Start the Doctor Review Portal Frontend
Open a new terminal window:
```powershell
cd frontend-doctor-portal
npm run dev
```
*Port:* `5174`  
*URL:* `http://localhost:5174/`

---

## 4. Verified Application URLs & Endpoints

| Component | Target URL | Expected Response / Landing Screen |
|---|---|---|
| **Patient Kiosk** | `http://localhost:5175/` | Welcome touch screen (Language selection: English / தமிழ்) |
| **Patient Interview** | `http://localhost:5175/interview` | Active symptom questionnaire or guided intake screen |
| **Doctor Review Portal** | `http://localhost:5174/` | Secure clinician login / Triage queue screen |
| **Backend API Gateway** | `http://localhost:5001/api/v1` | Express API prefix |
| **System Health Check** | `http://localhost:5001/api/v1/health` | `{"success": true, "data": {"status": "healthy", "database": "connected"}}` |
| **Service Status Probe**| `http://localhost:5001/api/v1/status` | Detailed subsystem status & uptime telemetry |
| **Local LLM API** | `http://127.0.0.1:11434/api/tags` | Ollama model directory JSON |

---

## 5. Troubleshooting & Recovery Procedures

### Problem 1: Patient Kiosk Shows "Cannot Begin Interview"
- **Symptom:** Error modal displays upon visiting `/interview`.
- **Cause A:** Patient bypassed consent screen.  
  *Recovery:* Click "Go to Registration & Consent" and complete all required checkboxes.
- **Cause B:** Session expired (>2 hours).  
  *Recovery:* Register a new synthetic visit at `/register`.
- **Cause C:** Concurrent session insertion conflict (`P2002`).  
  *Recovery:* Covered by the fix in `interview.service.ts` and `interview.repository.ts`. Click "Retry" once to cleanly resume the existing session.

### Problem 2: Port Conflict (Port 5001, 5174, or 5175 in Use)
- **Symptom:** `EADDRINUSE: address already in use :::5001`.
- **Recovery:** Identify and terminate only the specific colliding process:
  ```powershell
  Get-NetTCPConnection -LocalPort 5001 -ErrorAction SilentlyContinue | Select-Object OwningProcess
  Stop-Process -Id <PID> -Force
  ```

### Problem 3: Ollama Unreachable or AI Summaries Fall Back to Template
- **Symptom:** Summaries display status `TEMPLATE_FALLBACK` instead of `LOCAL_OLLAMA`.
- **Diagnostics:**
  1. Check if Ollama is running: `curl http://127.0.0.1:11434/api/tags`
  2. If missing, launch Ollama: `ollama serve`
  3. Verify `llama3.2:1b` is present: `ollama list`
- **Graceful Behavior:** The THUNAI summary service will never crash when Ollama is offline; it will honestly label output as `TEMPLATE_FALLBACK` for clinician review.

### Problem 4: Safe Non-Destructive Database Verification
If Prisma throws connectivity errors:
```powershell
cd backend
# Safely validate connection and schema drift WITHOUT resetting data:
npx prisma db pull --dry-run
# Generate fresh Prisma client bindings:
npx prisma generate
```
> [!CAUTION]
> **NEVER** run `npx prisma migrate reset` or `npx prisma db push --force-reset`. These commands delete all existing patient records and tables.

---

## 6. Clean Service Termination Procedure

To stop the development environment cleanly without leaving orphaned port locks:

```powershell
# Stop Node development processes:
Get-Process -Name "node" | Where-Object { $_.Path -like "*ee project*" } | Stop-Process -Force

# Verify all ports are freed:
@(5001, 5174, 5175, 11434) | ForEach-Object {
    $conn = Get-NetTCPConnection -LocalPort $_ -ErrorAction SilentlyContinue
    [PSCustomObject]@{ Port = $_; Active = ($null -ne $conn) }
}
```
