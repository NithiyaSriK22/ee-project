
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
- [ ] **MODULE 4**: OCR, Validation Gate & Document Digitization
- [ ] **MODULE 5**: AI Clinical Summarization Engine
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

## 7. Regulatory & Clinical Safety Notice
> **Notice**: MediKiosk is a clinical decision-support tool. Emergency red-flag screening falls under Software as a Medical Device (SaMD) principles under CDSCO guidance. The platform assists physician workflow and never acts as an autonomous diagnostic authority.

