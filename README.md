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

## 3. Technology Stack

| Layer | Technologies |
|---|---|
| **Kiosk Frontend** | React 18, TypeScript, Vite, Tailwind CSS, TanStack Query, Lucide Icons |
| **Doctor Portal** | React 18, TypeScript, Vite, Tailwind CSS, TanStack Query, Lucide Icons |
| **Backend API** | Node.js, Express, TypeScript, Zod, Helmet, Express-Rate-Limit, CORS |
| **Database** | PostgreSQL 16, Prisma ORM |
| **Security & Privacy** | PHI-Safe Redacting Structured Logger, Dual-Origin CORS, Request Correlation ID (`X-Request-ID`), Non-leaking Global Error Handler |
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

### 3. Start Development Servers
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

- [x] **MODULE 1**: Foundation & System Architecture (Current Module)
- [ ] **MODULE 2**: Patient Registration, Authentication & Profile
- [ ] **MODULE 3**: Guided Interview & Kiosk Intake
- [ ] **MODULE 4**: OCR, Validation Gate & Document Digitization
- [ ] **MODULE 5**: AI Clinical Summarization Engine
- [ ] **MODULE 6**: Red-Flag Detection & Emergency Triage Alerts
- [ ] **MODULE 7**: Doctor Review & Summary Dashboard
- [ ] **MODULE 8**: Notifications, Multilingual & Accessibility Layer
- [ ] **MODULE 9**: Administration, Verification, Analytics & Audit
- [ ] **MODULE 10**: Production Deployment, Security, Testing & Scalability

---

## 6. Regulatory & Clinical Safety Notice
> **Notice**: MediKiosk is a clinical decision-support tool. Emergency red-flag screening falls under Software as a Medical Device (SaMD) principles under CDSCO guidance. The platform assists physician workflow and never acts as an autonomous diagnostic authority.
