
# MediKiosk — AI-Assisted Patient Case-Taking & Clinical Summary Platform
> **SIH26047** | Production-Grade Healthcare Case-Taking & Doctor Review System

[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%2016-blue.svg)](https://www.postgresql.org/)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-cyan.svg)](https://react.dev/)

---

## 1. Project Overview & Primary Objective
MediKiosk is designed to help government hospital Outpatient Departments (OPDs) capture patient medical history — through a guided kiosk interview (voice or touch) and digitized past paper prescriptions via OCR — before the doctor's consultation. 

The physician receives a structured, verified, doctor-ready clinical summary instead of starting from a blank page.

### Core Product Principle
> **The system extracts and organizes based on structured, verifiable data. AI assists the physician, not replaces physician judgment or invents clinical facts.**

- **Deterministic Validation Gate First**: Drug formulary matching, dosage pattern checks, and date verification run before any AI summarization.
- **Explainability & Provenance**: Every clinical field links directly back to its interview answer or document OCR snippet.
- **Physician Authority**: The treating physician reviews, edits, and confirms all records before they are saved to official medical history.

---

## 2. Platform Architecture

```
medikiosk/
├── backend/                  # Modular Node.js + TypeScript Express API
│   ├── prisma/               # PostgreSQL schema & migrations
│   ├── src/
│   │   ├── config/           # Zod validated env & PHI-safe logger
│   │   ├── database/         # Prisma client singleton & health check
│   │   ├── errors/           # Custom error classes & standard error codes
│   │   ├── middleware/       # Security (Helmet/CORS/RateLimit), request logging, validation
│   │   ├── modules/          # 10 modular boundaries (health, auth, patients, etc.)
│   │   ├── types/            # Discriminated unions & clinical domain types
│   │   ├── utils/            # Standard response envelope
│   │   ├── app.ts            # Express app factory
│   │   └── server.ts         # Graceful shutdown entrypoint
│   └── tests/                # Integration & unit test suites
│
├── frontend-kiosk/           # Patient-facing Kiosk / Tablet Web App (Port 5173)
│   ├── src/
│   │   ├── components/       # Accessibility-first UI (large touch, high contrast, voice indicator)
│   │   ├── layouts/          # Tablet-first KioskLayout
│   │   ├── pages/            # Accessible HomePage & ErrorBoundary
│   │   └── lib/              # Centralized Axios API client & TanStack Query
│
├── frontend-doctor-portal/   # Doctor-facing Clinical Review Cockpit (Port 5174)
│   ├── src/
│   │   ├── components/       # Clinical review UI (provenance tags, badges, modals)
│   │   ├── layouts/          # Clinical DoctorLayout (sidebar + topbar)
│   │   ├── pages/            # DoctorDashboardPage with live queue preview
│   │   └── lib/              # Centralized Axios API client & TanStack Query
│
└── docs/                     # Architecture, API & Database documentation
```

---

---

## 3. Technology Stack

| Layer | Technologies |
|---|---|
| **Kiosk Frontend** | React 18, TypeScript, Vite, Tailwind CSS, TanStack Query, Lucide Icons |
| **Doctor Portal** | React 18, TypeScript, Vite, Tailwind CSS, TanStack Query, Lucide Icons |
| **Backend API** | Node.js, Express, TypeScript, Zod, Helmet, Express-Rate-Limit, CORS, Bcryptjs, JsonWebToken |
| **Database** | PostgreSQL 16, Prisma ORM |
| **Security & Privacy** | PHI-Safe Redacting Structured Logger, Dual-Origin CORS, Request Correlation ID (`X-Request-ID`), Password Hashing (Bcrypt 12 rounds), Visit-Scoped Kiosk Tokens, SHA-256 Hashed Refresh Tokens, RBAC Middleware |
| **Testing** | Vitest, Supertest, Testing Library |

---

## 4. Quick Start & Local Development

### 1. Install dependencies
```bash
npm install
```

### 2. Generate Prisma Database Client
```bash
npm --workspace=backend run prisma:generate
```

### 3. Run Database Migrations (PostgreSQL)
```bash
npm --workspace=backend run prisma:migrate
```

### 4. Run Test Suites & Quality Checks
```bash
# Run all workspace unit & integration tests
npm run test

# Run TypeScript compilation checks across all workspaces
npm run lint

# Build all production bundles (backend + both frontends)
npm run build
```

### 5. Start Development Servers
```bash
# Terminal 1: Backend API (http://localhost:5000)
npm run dev:backend

# Terminal 2: Patient Kiosk App (http://localhost:5173)
npm run dev:kiosk

# Terminal 3: Doctor Review Portal (http://localhost:5174)
npm run dev:doctor
```

---

## 5. Ten-Module Roadmap

- [x] **MODULE 1**: Foundation & System Architecture
- [x] **MODULE 2**: Patient Registration, Authentication & Profile (Implemented)
- [x] **MODULE 3**: Guided Interview & Kiosk Intake (Implemented)
- [x] **MODULE 4**: OCR, Validation Gate & Document Digitization (Implemented)
- [x] **MODULE 5**: AI Clinical Summarization Engine (Implemented)
- [ ] **MODULE 6**: Red-Flag Detection & Emergency Triage Alerts
- [ ] **MODULE 7**: Doctor Review & Summary Dashboard
- [ ] **MODULE 8**: Notifications, Multilingual & Accessibility Layer
- [ ] **MODULE 9**: Administration, Verification, Analytics & Audit
- [ ] **MODULE 10**: Production Deployment, Security, Testing & Scalability

---

## 6. Module 3 Implementation Summary: Guided Interview & Kiosk Intake

### Architectural Boundaries & Data Integrity
- **Raw Answer Fidelity**: Module 3 records raw, timestamped answers with complete provenance (`answered_via`, `language_used`, `is_critical`). It does **not** implement clinical interpretation, diagnosis, scoring, or red-flag inference.
- **Controlled Question Types**: `YES_NO`, `YES_NO_WITH_DETAIL`, `FREE_TEXT`, `SINGLE_CHOICE`, `MULTI_CHOICE`, `NUMERIC`, `DATE`, `DURATION`.
- **Data-Only Branching Logic**: Conditional next-question selection (`{ trigger_condition: { answer }, next_question_id }`) without clinical diagnostic heuristics.
- **Clinical Content Lifecycle**: `DRAFT` -> `REVIEW` -> `PUBLISHED` -> `ACTIVE` -> `RETIRED` with data-quality validation before activation.
- **Preserved History**: Question archiving is soft-delete only (`is_archived: true`) so historical intake answers remain interpretable.
- **Downstream Contract**: Exposes `InterviewService.getCompletedAnswers(visitId)` for Modules 4, 5, and 6.

### Module 3 API Endpoints
#### Kiosk Patient Intake API (Session-Scoped)
- `POST /api/v1/kiosk/interview/start` — Start/resume interview session (gated by `VISIT_DATA_COLLECTION` consent)
- `GET  /api/v1/kiosk/interview/current-question` — Retrieve current interview state & progress
- `POST /api/v1/kiosk/interview/answer` — Record answer (touch/voice/companion/staff)
- `POST /api/v1/kiosk/interview/complete` — Mark interview complete
- `GET  /api/v1/kiosk/interview/progress` — Interview completion progress snapshot

#### Admin Question Bank & Template API (Role-Gated: ADMIN / SUPER_ADMIN)
- `GET    /api/v1/admin/interview-templates` — List all interview templates
- `GET    /api/v1/admin/interview-templates/:id` — Get template with questions
- `POST   /api/v1/admin/interview-templates` — Create DRAFT template
- `PATCH  /api/v1/admin/interview-templates/:id` — Update template
- `POST   /api/v1/admin/interview-templates/:id/review` — Submit for clinical review
- `POST   /api/v1/admin/interview-templates/:id/publish` — Validate & publish template as ACTIVE
- `POST   /api/v1/admin/interview-templates/:id/retire` — Retire template from live kiosk
- `POST   /api/v1/admin/interview-templates/:id/questions` — Add question to template
- `PATCH  /api/v1/admin/interview-questions/:id` — Update question
- `DELETE /api/v1/admin/interview-questions/:id` — Soft-delete / archive question

---

## 6. Module 4 Implementation Summary (OCR & Deterministic Validation Gate)

### Core Architectural Guarantees
1. **Zero LLM Verification Decision**: LLMs are never used to decide field correctness or verify OCR facts.
2. **Four Verification States**:
   - `VERIFIED` — Met canonical reference or deterministic regex pattern rule with confidence ≥ threshold.
   - `UNVERIFIED` — Extracted text did not match formulary or failed deterministic check.
   - `UNREADABLE` — OCR confidence below unreadable threshold (0.60).
   - `MISMATCH_FLAGGED` — Conflict between multiple OCR checks or explicit out-of-range value.
3. **Three-State Boolean Logic**: `TRUE AND UNKNOWN = UNKNOWN`, `FALSE AND UNKNOWN = FALSE`.
4. **Explainability & Provenance**: Every field includes normalized values, OCR confidence score, bounding box, matched canonical formulary record, check rule names, and human-readable explanation strings.
5. **Versioned National Formulary of India (NFI) Reference Dataset**: Managed exclusively by authenticated `ADMIN` / `SUPER_ADMIN` with database version tracking.

### Module 4 API Endpoints

#### Kiosk Document API (Patient Visit-Scoped)
- `POST /api/v1/kiosk/documents/upload` — Upload paper prescription or lab document, run OCR & deterministic validation
- `GET  /api/v1/kiosk/documents` — List uploaded documents for active visit
- `GET  /api/v1/kiosk/documents/:id` — Retrieve document with raw & validated fields

#### Admin Formulary Reference Data API (Role-Gated: ADMIN / SUPER_ADMIN)
- `GET  /api/v1/admin/formulary/versions` — List formulary versions
- `POST /api/v1/admin/formulary/versions` — Create a new formulary version
- `POST /api/v1/admin/formulary/versions/:id/activate` — Activate formulary version
- `GET  /api/v1/admin/formulary/drugs` — Search active formulary drugs & patterns
- `POST /api/v1/admin/formulary/drugs` — Create new formulary drug entry
- `POST /api/v1/admin/formulary/seed` — Seed National Formulary of India (NFI) essential dataset

---

## 7. Module 5 Implementation Summary: AI Clinical Summarization Engine

### Core Architectural Principle: The LLM Never Decides What Is True
Module 5 consumes completed interview answers (Module 3) and verified document extractions (Module 4) to generate structured, physician-ready draft summaries (`PENDING_DOCTOR_REVIEW`).

- **Truth is Upstream**: Established solely by the patient's own words and deterministic document validation gates. The model is constrained to reorder and phrase; it never diagnoses, prescribes, or resolves discrepancies.
- **Uncertain Value Withholding**: Fields with status `UNREADABLE`, `MISMATCH_FLAGGED`, `UNVERIFIED`, `DECLINED`, or `NOT_ANSWERED` are strictly **withheld** from the LLM prompt. Fixed code templates insert explicit placeholders (e.g., `[Illegible in original document — verify manually]`).
- **Absence is NOT a Negative**: Unanswered questions or empty sections render deterministic code notices (e.g., `[No information collected]`), never false negatives like "no allergies".
- **Deterministic Conflict Handling**: Central item key matching detects discrepancies across intake and documents, inserting visible warning tags (`⚠ Conflict: interview and document differ — verify`) without allowing the model to choose.
- **Deterministic Grounding Validator**: Evaluates every model statement with zero external/AI calls against a maintained deny-pattern list and exact normalized token matching for doses, numbers, dates, and drug names.
- **Safe Template Fallback**: In the event of provider errors or grounding failures, the system automatically falls back to deterministic code-generated drafts (`generation_mode = TEMPLATE_FALLBACK`).
- **Prompt Gating**: Prompt versions are immutable and cannot be activated until the automated adversarial evaluation suite passes with zero unsupported claims and zero diagnostic claims.

### Module 5 API Endpoints

#### Staff & Doctor Summary API (Role-Gated: DOCTOR, STAFF_ATTENDANT, ADMIN, SUPER_ADMIN)
- `GET  /api/v1/summary/visits/:visitId` — Retrieve latest summary draft and staleness status
- `GET  /api/v1/summary/visits/:visitId/versions` — Retrieve immutable version history
- `GET  /api/v1/summary/:summaryId` — Retrieve specific summary version by UUID
- `POST /api/v1/summary/visits/:visitId/regenerate` — Request on-demand re-assembly and generation (DOCTOR, ADMIN, SUPER_ADMIN)

#### Kiosk Visit API (Session-Scoped, Strict PHI Isolation)
- `GET  /api/v1/kiosk/summary/status` — Generic intake status (`READY`, `GENERATING`, `NOT_STARTED`); never exposes clinical statements or text to kiosk patients

#### Admin Prompt Lifecycle & Gating API (Role-Gated: ADMIN, SUPER_ADMIN)
- `GET  /api/v1/admin/summary-prompts` — List all prompt templates
- `POST /api/v1/admin/summary-prompts` — Create DRAFT prompt template
- `POST /api/v1/admin/summary-prompts/:id/submit-review` — Submit prompt for clinical review
- `POST /api/v1/admin/summary-prompts/:id/run-evaluation` — Run synthetic adversarial evaluation suite
- `POST /api/v1/admin/summary-prompts/:id/activate` — Activate prompt (GATED: Requires passing evaluation run)

---

## 8. Module 6 Implementation Summary: Red-Flag Detection & Emergency Triage Alerts

### Core Architectural Principle: AI Must Not Decide Emergencies
Module 6 implements an explainable, deterministic red-flag screening engine. It continuously evaluates interview answers (Module 3) and verified document extractions (Module 4) against clinician-approved rule definitions.

- **Zero AI / LLM**: Pure three-state boolean logic (`TRUE`, `FALSE`, `UNKNOWN`). No probability scores, embeddings, vector search, or learned classifiers.
- **Sensitivity Bias for UNKNOWN**: Skipped, declined, or unasked critical questions, as well as unreadable or unverified document fields, evaluate to `UNKNOWN`. When `raise_on_indeterminate: true`, this raises a `STAFF_CHECK` alert so staff manually verify the critical item.
- **Severity Tiers**: `IMMEDIATE` (assess right now), `URGENT` (ahead of queue), `STAFF_CHECK` (verify detail), `MANUAL` (patient/companion pressed help button).
- **Incremental & Asynchronous**: Evaluated when answers are recorded, when documents validate, and on completion. Never blocks the patient interview flow.
- **Deduplication**: Updates open alerts for a visit with additional evidence rather than spamming multiple alert cards.
- **Escalation**: Configurable timeouts per tier automatically escalate unacknowledged alerts to senior staff / duty doctors.
- **Always-Visible Help Button**: Patient kiosk features a prominent help control reachable by touch and voice that works without registration or consent steps.
- **Rule Governance**: Rules are versioned data, gated by automated test suites, and require clinical sign-off with enforced separation of duties (authors cannot approve their own rules).

### Module 6 API Endpoints

#### Kiosk API (Session-Scoped & Emergency Open Access)
- `POST /api/v1/kiosk/help-request` — Raise immediate `MANUAL` help alert with kiosk location
- `GET  /api/v1/kiosk/alerts/status` — Calm status indicator (`IMMEDIATE`, `STAFF_CHECK`, `null`); zero clinical details leaked

#### Staff Triage Queue API (Role-Gated: STAFF_ATTENDANT, DOCTOR, ADMIN, SUPER_ADMIN)
- `GET  /api/v1/triage/alerts` — List triage queue sorted by severity tier and time waiting
- `GET  /api/v1/triage/alerts/:id` — Inspect alert with triggering facts and audit events
- `POST /api/v1/triage/alerts/:id/acknowledge` — Acknowledge alert
- `POST /api/v1/triage/alerts/:id/start-assessment` — Mark alert as in active clinical assessment
- `POST /api/v1/triage/alerts/:id/resolve` — Resolve alert with controlled resolution type & note
- `POST /api/v1/triage/alerts/:id/escalate` — Escalate unacknowledged alert to duty doctor
- `POST /api/v1/triage/alerts/:id/dismiss` — Dismiss false positive (requires controlled reason from catalog)
- `GET  /api/v1/triage/alerts/stream` — Real-time Server-Sent Events (SSE) stream

#### Admin & Clinical Review API (Role-Gated: DOCTOR, ADMIN, SUPER_ADMIN)
- `GET   /api/v1/admin/redflag-rules` — List all rules and statuses
- `GET   /api/v1/admin/redflag-rules/:id` — Get rule details and test cases
- `POST  /api/v1/admin/redflag-rules` — Create DRAFT rule via structured builder
- `PATCH /api/v1/admin/redflag-rules/:id` — Update draft rule
- `POST  /api/v1/admin/redflag-rules/:id/run-tests` — Execute automated test harness
- `POST  /api/v1/admin/redflag-rules/:id/submit-review` — Submit rule for clinical review (Gated by test harness)
- `POST  /api/v1/admin/redflag-rules/:id/approve` — Clinician approval & activation (Enforces separation of duties)
- `POST  /api/v1/admin/redflag-rules/:id/retire` — Retire active rule

---

## 9. Modules 7–10 Implementation Overview

### Module 7: Doctor Review Workspace & Confirmed Records
- **Must-Resolve Clinical Gates**: Hard barrier preventing physician confirmation until unreadable prescription fields, allergy ambiguities, and triggered red flags are explicitly reviewed.
- **Explainability & Provenance**: Sentence-level grounding tags linking each clinical statement back to interview answer IDs or document OCR bounding boxes.
- **Versioned Confirmed Records**: Immutable physician-signed medical records with attestation tracking and auditable amendment trails.

### Module 8: Multilingual Layer, Accessibility & Offline Sync
- **Language Independence**: Seamless voice- and touch-guided interviews across English, Hindi, Tamil, and Bengali.
- **Offline Resilience**: Encrypted client-side IndexedDB caching allowing uninterrupted kiosk interviews during hospital Wi-Fi drops with automatic idempotent synchronization.

### Module 9: Administration Console, Analytics & Tamper-Evident Audit
- **Aggregated Operational Telemetry**: Real-time intake metrics, language distribution, OCR accuracy, and alert latency tracking without individual patient data exposure.
- **Cryptographic Audit Hash Chain**: Merkle-style SHA-256 chained audit logs ensuring forensic, tamper-evident recording of every clinical record interaction.
- **Pilot Evaluation Baselines**: Mandatory pre-intervention time-study baselines required before any "time-saved" efficiency claims can be published.

### Module 10: Production Deployment, Security, Clinical Safety Release & Pilot Readiness
- **Production Hardening**: Non-root minimal alpine containers, Content Security Policy, dual-origin CORS, HSTS, and rate-limiting with Emergency Help Request exemptions.
- **Automated Release Gates**: 10 automated clinical safety criteria evaluated before code release or kiosk activation, with an audited Emergency Override mechanism for the Chief Medical Officer.
- **Server-Controlled Kill Switches**: 8 independent flags (`AI_SUMMARIZATION_ENABLED`, `VOICE_ENABLED`, `ASSISTANT_ENABLED`, `OCR_ENABLED`, `MACHINE_TRANSLATION_ENABLED`, `SMS_ENABLED`, `SYNTHETIC_ALERT_CHECK_ENABLED`, `KIOSK_INTAKE_ENABLED`) enabling instant degradation without code deploys.
- **Global Intake Pause**: One-click administrative pause halting new patient intake across the kiosk fleet in $<10$ seconds while leaving doctor review workspaces fully operational.
- **Kiosk Fleet Hardening & Session Wipe**: Unique per-hardware enrollment, single-app locked appliance configuration, and cryptographically verified consecutive session data wipe.
- **Alert Reliability Canary & Downtime Status Board**: Continuous sub-second alert delivery monitoring and a public unauthenticated `/status` page with plain-language patient and staff guidance.
- **Disaster Recovery**: Tested isolated database restore drills verifying PITR currency, SHA-256 archive hashes, and cryptographic audit chain validity.

---

## 10. Clinical Safety & Governance Documentation Index

The following production documentation files describe the real implementation and provide sign-off templates for hospital leadership:

1. [OPEN_DECISIONS.md](file:///c:/Users/ELCOT/Desktop/ee%20project/OPEN_DECISIONS.md) — 11 explicit human decisions (hosting, data residency, retention, languages, rules, downtime, pilot scope, regulatory pathway).
2. [CLINICAL_SAFETY.md](file:///c:/Users/ELCOT/Desktop/ee%20project/CLINICAL_SAFETY.md) — Clinical safety case, hazard log (10 hazards mapped to tests), intended use statement, and training plans.
3. [PILOT_PLAN.md](file:///c:/Users/ELCOT/Desktop/ee%20project/PILOT_PLAN.md) — 5-stage pilot rollout plan, quantitative go/no-go gates, and stop authority protocols.
4. [DOWNTIME_PROCEDURE.md](file:///c:/Users/ELCOT/Desktop/ee%20project/DOWNTIME_PROCEDURE.md) — Downtime procedures, degradation matrix, and post-incident reconciliation checklist.
5. [DISASTER_RECOVERY.md](file:///c:/Users/ELCOT/Desktop/ee%20project/DISASTER_RECOVERY.md) — RPO/RTO objectives, PITR continuous archiving, and isolated restore drill runbooks.
6. [OPERATIONS.md](file:///c:/Users/ELCOT/Desktop/ee%20project/OPERATIONS.md) — Operations runbooks (kill switches, service restarts, secret rotation, kiosk tampering).
7. [KIOSK_DEPLOYMENT.md](file:///c:/Users/ELCOT/Desktop/ee%20project/KIOSK_DEPLOYMENT.md) — Kiosk hardware specifications, single-app OS lockdown, and session wipe verification.
8. [SECURITY.md](file:///c:/Users/ELCOT/Desktop/ee%20project/SECURITY.md) — Defense-in-depth security architecture, STRIDE threat model (11 vectors), and pentest criteria.
9. [ENVIRONMENT.md](file:///c:/Users/ELCOT/Desktop/ee%20project/ENVIRONMENT.md) — Catalog of environment variables, rotation schedules, and production secret validators.
10. [PRIVACY.md](file:///c:/Users/ELCOT/Desktop/ee%20project/PRIVACY.md) — Data classification matrix, DPDP Act 2023 compliance, and data subject rights procedures.
11. [RELEASE_PROCESS.md](file:///c:/Users/ELCOT/Desktop/ee%20project/RELEASE_PROCESS.md) — Separation of code releases from clinical content governance and release gates.
12. [ARCHITECTURE.md](file:///c:/Users/ELCOT/Desktop/ee%20project/ARCHITECTURE.md) — Complete target deployment architecture diagram and network segmentation.
13. [DATABASE.md](file:///c:/Users/ELCOT/Desktop/ee%20project/DATABASE.md) — PostgreSQL 16 database design, indexes, and zero-downtime migration standards.
14. [API.md](file:///c:/Users/ELCOT/Desktop/ee%20project/API.md) — Comprehensive API endpoint reference across Modules 1–10.
15. [DEPLOYMENT.md](file:///c:/Users/ELCOT/Desktop/ee%20project/DEPLOYMENT.md) — Step-by-step production deployment guide with Docker Compose.

---

## 11. Mandatory Regulatory Notice
> **Notice**: MediKiosk is an assistive clinical case-taking tool. It is **NOT CLEARED FOR UNSUPERVISED CLINICAL USE** and **DOES NOT MAKE DIAGNOSTIC OR THERAPEUTIC DECISIONS**. The platform is not ready for a real hospital until clinicians, privacy and legal advisers, hospital IT, and hospital leadership have completed and signed the open decisions and governance artifacts described above.


