# MediKiosk — Comprehensive API Specification (Modules 1–10)

This reference documents the real endpoints implemented and mounted in MediKiosk.

---

## 1. Public & Operational Endpoints

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `GET` | `/health` | None | Process liveness probe (`{"status": "UP"}`). |
| `GET` | `/api/v1/health/ready` | None | Readiness probe evaluating database, storage, and worker health. |
| `GET` | `/status` | None | Public Downtime Status Board with calm patient guidance and staff instructions. |

---

## 2. Module 10: Production Deployment, Release Gates & Safety Endpoints

All endpoints mounted under `/api/v1/deployment`:

| Method | Endpoint | Allowed Roles | Description |
|---|---|---|---|
| `GET` | `/flags` | `ADMIN`, `DOCTOR` | Retrieve all 8 server-controlled kill switches and their statuses. |
| `POST` | `/flags/:key/toggle` | `ADMIN` | Toggle a kill switch with mandatory justification logged in audit chain. |
| `GET` | `/intake/status` | `ADMIN`, `DOCTOR` | Check Global Intake Pause status and active patient guidance. |
| `POST` | `/intake/toggle-pause` | `ADMIN` | Emergency Pause or Resume of all kiosk intake sessions. |
| `GET` | `/release-gates` | `ADMIN`, `DOCTOR` | Automated evaluation of all 10 clinical safety release gate criteria. |
| `POST` | `/release-gates/override` | `ADMIN` | Emergency Release Gate override authorized by Chief Medical Officer. |
| `GET` | `/restore-drills` | `ADMIN` | Retrieve history of isolated database restore drills and currency indicator. |
| `POST` | `/restore-drills` | `ADMIN` | Record a verified isolated database restore drill. |
| `GET` | `/kiosks` | `ADMIN` | List all enrolled kiosk hardware terminals and their statuses. |
| `POST` | `/kiosks/enroll` | `ADMIN` | Cryptographically register a new physical kiosk terminal. |
| `POST` | `/kiosks/:code/revoke` | `ADMIN` | Immediately revoke a kiosk terminal's access credentials. |
| `POST` | `/kiosks/wipe-session` | None (Token) | Trigger immediate multi-layer wipe of consecutive session data. |
| `GET` | `/alert-pipeline/health` | `ADMIN`, `DOCTOR` | Latency canary verifying sub-second alert pipeline delivery health. |

---

## 3. Core Clinical & Intake Endpoints (Summary of Modules 1–9)

- `/api/v1/auth/*`: Staff authentication, token refresh, and logout.
- `/api/v1/kiosk/session/*`: Kiosk check-in, registration, consent recording, session termination.
- `/api/v1/kiosk/interview/*`: Guided interview questions, structured answers, and draft state.
- `/api/v1/kiosk/documents/*`: Document capture, OCR text extraction, and deterministic validation.
- `/api/v1/kiosk/help-request`: Emergency patient help button (exempt from strict rate limits).
- `/api/v1/doctor/reviews/*`: Doctor review workspace, item resolutions, draft amendments, and confirmations.
- `/api/v1/doctor/confirmed-records/*`: Versioned legal confirmed clinical records and amendments.
- `/api/v1/admin/analytics/*`: Aggregated operational metrics (intake, language, documents, alerts).
- `/api/v1/admin/audit-logs/*`: Cryptographic tamper-evident audit logs and hash chain verification.
