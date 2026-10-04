# MediKiosk — System Architecture (SIH26047)

## 1. System Mission & Core Principle
MediKiosk is an AI-assisted patient case-taking and clinical intake platform designed for government hospital Outpatient Departments (OPDs). 

> **Golden Rule**: The system extracts and organizes based on structured, verifiable data. AI assists the physician by structuring interview responses and digitized document records, but **never replaces clinical judgment and never invents clinical facts**.

---

## 2. High-Level Architecture Diagram

```
Patients (Shared Kiosk/Tablet)
        │
        ▼
Kiosk Frontend (PWA) — Voice + Touch, Multilingual
        │
   HTTPS / REST API (Port 5000)
        │
        ▼
   API Gateway / Modular Monolith Backend (Node.js + Express)
        │
┌───────┼────────────────────────────────────────┐
▼       ▼                                        ▼
Patient/  Document/OCR     Red-Flag Triage      Audit & Log
Service   Service          Service              Service
   │        │                    │                 │
   │        ▼                    │                 │
   │   Validation Gate           │                 │
   │   (Formulary Match,         │                 │
   │    Pattern Check)           │                 │
   │        │                    │                 │
   └───────►Constrained AI Engine◄┘                │
            (Summarization Only)                   │
                    │                              │
                    ▼                              │
         Doctor Review Portal                      │
         (Edit / Confirm / Reject)                 │
                    │                              │
                    ▼                              ▼
     Physician-Confirmed Clinical Record ──► Audit Trail
                    │
                    ▼
     PostgreSQL Relational Storage
```

---

## 3. Ten-Module Dependency Pipeline

```
MODULE 1  Foundation & System Architecture  (Completed)
   ↓
MODULE 2  Patient Registration, Authentication & Profile
   ↓
MODULE 3  Guided Interview & Kiosk Intake
   ↓
MODULE 4  OCR, Validation Gate & Document Digitization
   ↓
MODULE 5  AI Clinical Summarization Engine
   ↓
MODULE 6  Red-Flag Detection & Emergency Triage Alerts
   ↓
MODULE 7  Doctor Review & Summary Dashboard
   ↓
MODULE 8  Notifications, Multilingual & Accessibility
   ↓
MODULE 9  Admin, Verification, Analytics & Audit
   ↓
MODULE 10 Production Deployment, Security & Testing
```

---

## 4. Architectural Boundaries
1. **Frontend Kiosk (`frontend-kiosk`)**: Tablet-first, high contrast, large text, elderly/low-literacy accessible, voice-first with touch fallback.
2. **Doctor Portal (`frontend-doctor-portal`)**: Desktop/tablet clinical cockpit, dense information architecture, visual provenance badges, mandatory critical-field confirmation.
3. **Backend Modular Monolith (`backend`)**: Strict layer separation: `Controller` → `Service` → `Repository` → `Database (Prisma)`.
4. **Validation Gate Before AI**: Deterministic validation layer (drug formulary matching, dosage pattern matching, date checks) always runs **before** any AI summarization. A field never becomes "VERIFIED" simply because an LLM produced fluent text.
5. **PHI-Safe Observability**: Structured JSON logging explicitly redacts protected health information (PHI), passwords, and tokens.
