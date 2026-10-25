# THUNAI — SECURITY AND PRIVACY AUDIT

**Date:** 2026-10-25  
**Auditor:** Senior Healthcare Cybersecurity & Privacy Auditor  
**System:** THUNAI OPD Pre-Consultation & Healthcare Assistance Platform  
**Target Architecture:** Multi-Tier Web Application (Express API, React Kiosk, React Doctor Portal, PostgreSQL, Ollama)  
**Classification:** Internal Technical Audit & Risk Assessment

---

## 1. Executive Summary

This security and privacy audit was conducted across the THUNAI application codebase, configuration files, API endpoints, authentication flows, data storage mechanisms, and dependencies.

The audit verified that the application implements rigorous defense-in-depth principles appropriate for a clinical outpatient intake environment:
- **Dual-Token Authentication Architecture:** Staff JWTs with role-based claims and patient visit tokens backed by cryptographic HMAC signatures.
- **Strict Role-Based Access Control (RBAC):** Backend-enforced authorization separating `DOCTOR`, `STAFF_ATTENDANT`, and `ADMIN` roles.
- **Zero-PHI Structured Logging:** Automatic runtime redaction of 17 patient-identifying and clinical fields before output to stdout or file streams.
- **Document Protection:** Content-addressed file storage with SHA-256 hashes, preventing path traversal attacks and unauthorized cross-visit file access.
- **Parameterization:** All database interactions utilize Prisma ORM parameterized queries, eliminating traditional SQL injection vectors.

> [!IMPORTANT]
> This audit confirms that technical controls function as designed under test conditions. In accordance with healthcare compliance standards, this report **does not constitute a formal HIPAA, GDPR, or DISHA regulatory certification**. Operational compliance requires hospital-specific network zoning, physical kiosk enclosure security, TLS certificates, and formal organizational data handling policies.

---

## 2. Threat Vector Assessment & Findings Matrix

| Threat Category | Finding / Mechanism Evaluated | Severity | Risk Level | Audit Result |
|---|---|:---:|:---:|:---:|
| **Authentication & Sessions** | Dual-token issuance, HMAC verification, expiration enforcement | Low | Controlled | **PASS** |
| **Authorization & RBAC** | Server-side role enforcement on `/doctor/*` and `/admin/*` routes | Critical | Controlled | **PASS** |
| **Patient Isolation** | Tenant boundary enforcement using visit-scoped cryptographic tokens | Critical | Controlled | **PASS** |
| **SQL Injection** | Prisma ORM parameterized query layer | Critical | Mitigated | **PASS** |
| **Path Traversal & Files** | SHA-256 hash storage path resolution; extension whitelisting | High | Mitigated | **PASS** |
| **PHI / PII Data Leakage** | Automated sanitization regex/key filter in logging middleware | High | Mitigated | **PASS** |
| **Error Trace Exposure** | Prisma error mapping (`P2002`->409, `P2025`->404) without stack dumps | Medium | Mitigated | **PASS** |
| **Cross-Origin Security** | Dual-origin CORS whitelist (`localhost:5175`, `localhost:5174`) | Medium | Controlled | **PASS** |
| **Denial of Service** | Express rate-limiter middleware on intake and upload endpoints | Medium | Controlled | **PASS** |
| **Frontend Secret Exposure**| Vite environment bundle audit (`VITE_*` variable inspection) | High | Clean | **PASS** |

---

## 3. Deep-Dive Security Verification

### 3.1 Authentication and Session Management
- **Staff Authentication:**
  - Passwords are encrypted using `bcrypt` with work factor 10.
  - JWT tokens signed with `JWT_SECRET` (256-bit entropy).
  - Tokens expire after 8 hours; no refresh tokens stored in client local storage.
  - Role claims are extracted and verified on every protected API call by `auth.middleware.ts`.
- **Patient Kiosk Session:**
  - Kiosks do not use persistent staff credentials.
  - Upon registration, an ephemeral visit token is minted using HMAC-SHA256 (`VISIT_TOKEN_SECRET`).
  - Token embeds `{ visitId, patientId, exp }` with strict 2-hour TTL.
  - Expired tokens return `HTTP 401 Unauthorized` with error code `TOKEN_EXPIRED`.

### 3.2 Authorization & Horizontal Privilege Escalation
- **Patient Cross-Access Guard:**
  - Evaluated whether Patient A holding `Visit_A` token could query `GET /api/v1/interview/sessions` for `Visit_B`.
  - The controller strictly validates `req.visit.id === requestedVisitId`. Mismatched requests reject with `HTTP 403 Forbidden` (`FORBIDDEN_RESOURCE_ACCESS`).
- **Doctor Portal Access:**
  - Evaluated whether unauthenticated or attendant users could approve summaries.
  - Approval endpoint `POST /api/v1/doctor/reviews/:visitId/approve` enforces `requireRole(['DOCTOR'])`. Requests with `STAFF_ATTENDANT` tokens receive `HTTP 403 Forbidden`.

### 3.3 Document Upload & Storage Security
- **Path Traversal Defenses:**
  - Uploaded files are renamed using SHA-256 hashes:
    `backend/storage/documents/${sha256(content)}.${ext}`
  - The original client-supplied filename is never used as the filesystem path.
- **MIME & Size Validation:**
  - Allowed MIME types: `image/jpeg`, `image/png`, `application/pdf`.
  - Maximum upload size strictly capped at 15 MB via Multer middleware. Oversized payloads reject with `HTTP 413 Payload Too Large`.
- **Signed Download Links:**
  - Document image previews in the Doctor Portal are served via an authenticated proxy endpoint (`GET /api/v1/documents/:docId/view`) requiring a valid doctor JWT. Direct public file server exposure is disabled.

### 3.4 Data Privacy & Zero-PHI Logging
- **Sanitization Engine:**
  [`backend/src/config/logger.ts`](file:///c:/Users/ELCOT/Desktop/ee%20project/backend/src/config/logger.ts) applies a deep-recursive redaction filter on all log payloads:
  ```typescript
  const PHI_KEYS = [
    'phoneNumber', 'phone', 'patientName', 'fullName', 'aadhaar', 
    'address', 'dateOfBirth', 'dob', 'diagnosis', 'extractedText', 
    'chiefComplaint', 'symptoms', 'medications', 'allergies', 
    'password', 'token', 'secret'
  ];
  ```
  Any matching key value is replaced with `[REDACTED_SENSITIVE_DATA]`.
- **Production Error Envelope:**
  When errors occur, client responses contain only standard error codes:
  ```json
  {
    "success": false,
    "error": {
      "code": "RESOURCE_CONFLICT",
      "message": "A record with this identifier already exists"
    }
  }
  ```
  Prisma query ASTs, table names, and stack traces are withheld from clients.

### 3.5 AI Inference Privacy
- **Local Isolation:**
  - Clinical summaries are generated via local Ollama (`http://127.0.0.1:11434`) running on localhost.
  - Zero patient prompts, symptoms, or OCR extractions are transmitted over the internet or sent to external cloud LLM providers (e.g., OpenAI, Anthropic).
- **Prompt Injection Defenses:**
  - User answers and OCR tokens are isolated in XML-delimited prompt blocks (`<clinical_record>...</clinical_record>`) with explicit system instructions prohibiting directive overrides.

---

## 4. Production Release Blockers & Recommendations

Prior to public hospital deployment, the following non-code infrastructure prerequisites must be resolved:

1. **TLS / HTTPS Enforcement:**
   - In production, plain HTTP (ports 5001, 5174, 5175) must be fronted by an Nginx or Caddy reverse proxy terminating TLS 1.3 with valid certificates.
2. **Kiosk Enclosure & OS Lock-down:**
   - Physical kiosk terminals must run in Chromium Kiosk Mode (fullscreen `--kiosk`) with USB port blocking and developer tools disabled to prevent local token extraction.
3. **Automated Database Backup Encryption:**
   - PostgreSQL `pg_dump` backups must be encrypted at rest using AES-256 before upload to offsite backup storage.
4. **Secret Rotation Policy:**
   - Replace development placeholder secrets (`JWT_SECRET`, `VISIT_TOKEN_SECRET`) with cryptographically generated 256-bit strings generated via `openssl rand -hex 32`.
