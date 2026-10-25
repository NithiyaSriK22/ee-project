# INTERVIEW STARTUP FIX REPORT

**Date:** 2026-10-25  
**Application:** THUNAI OPD Pre-Consultation & Healthcare Assistance Platform  
**Target Page:** `/interview` (`http://localhost:5175/interview`)  
**Backend:** `http://localhost:5001`  
**Database:** PostgreSQL 18.4 (`medikiosk_db`, embedded supervisor on port 5432)  

---

## 1. Executive Summary

This report documents the root-cause diagnosis, safe remediation, and end-to-end verification of the runtime error displayed on the patient kiosk at `/interview`:

> **"Cannot Begin Interview — An unexpected system error occurred. Please contact hospital technical support."**

The underlying issue has been identified and permanently resolved across the service, repository, error middleware, and frontend UI layers. All existing PostgreSQL patient data was strictly preserved (zero migrations, zero table resets, zero records dropped).

---

## 2. Confirmed Root Cause

### Primary Architectural Cause: Unique Constraint (`P2002`) Violation on Session Re-entry / Reload
1. **The Unique Key Constraint:**
   In `backend/prisma/schema.prisma`, the `InterviewSession` model defines:
   ```prisma
   model InterviewSession {
     id                  String            @id @default(uuid()) @db.Uuid
     visit_id            String            @unique @db.VarChar(100)
     ...
   ```
   Each clinical visit is strictly restricted to at most one `InterviewSession` record.

2. **The Flawed Session Resume Logic:**
   In `backend/src/modules/interview/interview.service.ts`:
   ```typescript
   // Original flawed check:
   const existingSession = await InterviewRepository.findSessionByVisitId(visitId);
   if (existingSession && existingSession.status === InterviewSessionStatus.IN_PROGRESS) {
     return this.formatSessionState(existingSession, patient);
   }
   // If status was COMPLETED, ABANDONED, or PAUSED, it fell through to:
   const session = await InterviewRepository.createSession({ visitId, ... });
   ```
   - When a patient reloaded the page, revisited `/interview` after completing an interview, or experienced a rapid double-click on interview start, `findSessionByVisitId` found an existing session whose status was not `IN_PROGRESS`.
   - The code bypassed the existing session and attempted to insert a brand new `interview_sessions` row with the same `visit_id`.
   - PostgreSQL immediately raised a `PrismaClientKnownRequestError` with code `P2002`: `Unique constraint failed on the fields: (visit_id)`.

3. **Unhandled Exception Masking in Global Error Handler:**
   In `backend/src/middleware/error.middleware.ts`, `PrismaClientKnownRequestError` is not an instance of `AppError`. It fell through all specific catches to the unhandled fallback:
   ```typescript
   // backend/src/middleware/error.middleware.ts line 60:
   ResponseUtil.error(
     res,
     500,
     ErrorCode.INTERNAL_ERROR,
     'An unexpected system error occurred. Please contact hospital technical support.'
   );
   ```
   The 500 response completely masked the root cause and presented the user with the generic failure banner.

### Secondary Frontend Causes:
1. **Destructive Reload on Retry:**
   In `frontend-kiosk/src/features/interview/pages/GuidedInterviewPage.tsx`, clicking `Retry` executed:
   ```typescript
   onClick={() => window.location.reload()}
   ```
   This triggered a full browser reload, repeating the exact failing request without retry state tracking, retry counts, backoff, or in-memory error recovery, creating potential infinite reload loops.

2. **Generic Error Presentation:**
   The frontend did not inspect HTTP status codes or error categories (e.g., 401 Session Expired vs. 403 Consent Required) and displayed the raw backend string without contextual guidance or Tamil translations.

---

## 3. Original Failing Request and Response

### Request
```http
POST /api/v1/kiosk/interview/start HTTP/1.1
Host: localhost:5001
Authorization: Bearer <kiosk_session_token>
X-Kiosk-Session-Token: <kiosk_session_token>
Content-Type: application/json

{}
```

### Response
```http
HTTP/1.1 500 Internal Server Error
Content-Type: application/json; charset=utf-8

{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected system error occurred. Please contact hospital technical support.",
    "details": []
  }
}
```

---

## 4. Relevant Backend Error and Log Evidence

```text
{"timestamp":"2026-10-25T04:14:34.239Z","level":"ERROR","message":"Prisma Error occurred","context":{"error":"[object Object]"}}
Caught error name: PrismaClientKnownRequestError
Caught error code: P2002
Caught error message: 
Invalid `prisma.interviewSession.create()` invocation in
C:\Users\ELCOT\Desktop\ee project\backend\src\modules\interview\interview.repository.ts:253:36

  250   templateVersion: string;
  251   currentQuestionId?: string;
  252 }) {
→ 253   return prisma.interviewSession.create(
Unique constraint failed on the fields: (`visit_id`)
```

---

## 5. Files Changed

| File | Change Description |
|---|---|
| [`backend/src/modules/interview/interview.service.ts`](file:///c:/Users/ELCOT/Desktop/ee%20project/backend/src/modules/interview/interview.service.ts) | Added identifier validation (`visitId`, `patientId`), resilient database health checks, safe consent & patient retrieval with fallback store support, and multi-state session resumption (`IN_PROGRESS`, `COMPLETED`, `ABANDONED`). |
| [`backend/src/modules/interview/interview.repository.ts`](file:///c:/Users/ELCOT/Desktop/ee%20project/backend/src/modules/interview/interview.repository.ts) | Wrapped `createSession` in try/catch to gracefully handle `P2002` unique constraint collisions and return existing sessions idempotently. |
| [`backend/src/middleware/error.middleware.ts`](file:///c:/Users/ELCOT/Desktop/ee%20project/backend/src/middleware/error.middleware.ts) | Added safe Prisma error mapping (`P2002` -> 409 Conflict, `P2025` -> 404 Not Found, `P2003` -> 400 Bad Request, `PrismaClientValidationError` -> 400 Validation) without exposing internal schema or PHI. |
| [`frontend-kiosk/src/features/interview/pages/GuidedInterviewPage.tsx`](file:///c:/Users/ELCOT/Desktop/ee%20project/frontend-kiosk/src/features/interview/pages/GuidedInterviewPage.tsx) | Refactored `initInterview` into an in-component callback with retry count tracking, maximum 3-attempt limit, spinner loading state, and bilingual error guidance. |
| [`backend/tests/interview-startup-verification.test.ts`](file:///c:/Users/ELCOT/Desktop/ee%20project/backend/tests/interview-startup-verification.test.ts) | New comprehensive verification test suite covering all 10 requirements from Step 5. |

---

## 6. Explanation of the Fix

### A. Resilient Multi-State Session Handling (`interview.service.ts`)
Instead of assuming only `IN_PROGRESS` sessions can be returned:
- **`IN_PROGRESS`:** Resumes the active session at the current question.
- **`COMPLETED`:** Returns the completed session with full answer history so the patient kiosk can display the review/confirmation screen without crashing.
- **`ABANDONED` / `PAUSED`:** Reactivates the existing session to `IN_PROGRESS` and returns it, rather than attempting an illegal second insert on the unique `visit_id`.

### B. Idempotency & Concurrency Protection (`interview.repository.ts`)
In `InterviewRepository.createSession`:
- If concurrent requests or double-clicks arrive at the exact same millisecond, the database unique index catches the second insert.
- The repository intercepts `P2002`, logs a warning without sensitive data, queries `findSessionByVisitId(data.visitId)`, and returns the existing session. No exception is surfaced to the client.

### C. Safe Prisma Error Mapping (`error.middleware.ts`)
Uncaught database errors are translated into standard HTTP envelopes:
- `P2002` -> HTTP 409 `CONFLICT`: `"A conflicting clinical record or session already exists for this visit."`
- `P2025` -> HTTP 404 `NOT_FOUND`: `"The requested clinical resource was not found."`
- `P2003` -> HTTP 400 `VALIDATION_ERROR`: `"Referenced clinical record does not exist."`
- `PrismaClientValidationError` -> HTTP 400 `VALIDATION_ERROR`: `"Invalid record format or identifier provided."`

### D. Safe In-App Retry & User Guidance (`GuidedInterviewPage.tsx`)
- Eliminated `window.location.reload()`.
- Implemented `initInterview(isRetryAction)` with a 3-attempt maximum (`maxRetries = 3`).
- If `retryCount >= maxRetries`, the retry button is disabled with bilingual guidance directing the patient to registration or hospital assistance.
- Errors specifically identify whether the issue is an expired token (401) or missing consent (403), guiding the patient directly to the appropriate action.

---

## 7. Tests Executed and Actual Results

| # | Test Case Description | Target Component | Status | Actual Result / Verification |
|---|---|---|:---:|---|
| 1 | Backend health check | `GET /api/v1/health` | **PASS** | Status 200, returns `{"status":"healthy","database":"connected"}` |
| 2 | Database health check | `GET /api/v1/health` | **PASS** | Status 200, PostgreSQL connection latency verified under 10ms |
| 3 | Valid patient interview startup | `POST /api/v1/kiosk/interview/start` | **PASS** | Status 200, session started, all 11 questions loaded, progress initialized |
| 4 | Missing consent gate check | `POST /api/v1/kiosk/interview/start` | **PASS** | Status 403 Forbidden, `error.code: FORBIDDEN`, consent strictly mandatory |
| 5 | Missing session token | `POST /api/v1/kiosk/interview/start` | **PASS** | Status 401 Unauthorized, `Kiosk session token required` |
| 6 | Invalid / forged session token | `POST /api/v1/kiosk/interview/start` | **PASS** | Status 401 Unauthorized, `Invalid or expired kiosk session token` |
| 7 | In-progress session resumption | `POST /api/v1/kiosk/interview/start` | **PASS** | Status 200, resumes existing session, exactly 1 session record in DB |
| 8 | Completed session reload resilience | `POST /api/v1/kiosk/interview/start` | **PASS** | Status 200, returns completed session for review, zero P2002 errors |
| 9 | Duplicate concurrent submission | `POST /api/v1/kiosk/interview/start` | **PASS** | Status 200 on all 3 parallel requests, exactly 1 session in DB |
| 10 | Patient & visit isolation | `InterviewRepository` / DB | **PASS** | Foreign keys and visit association strictly validated against DB |
| 11 | Special populations & guardian mode | `backend/tests/special-populations-module3b.test.ts` | **PASS** | 18 tests passed (165ms) |
| 12 | Interview questions & branching logic | `backend/tests/interview.test.ts` | **PASS** | 7 tests passed (91ms) |
| 13 | Global error handling envelopes | `backend/tests/error-handling.test.ts` | **PASS** | 2 tests passed (95ms) |
| 14 | Kiosk frontend unit & UI tests | `frontend-kiosk/src/tests/KioskApp.test.tsx` | **PASS** | 4 tests passed (384ms) |
| 15 | Full workflow integration (Stage 6) | `backend/tests/stage6-full-workflow-integration.test.ts` | **PASS** | 14 tests passed (109.8s across full OCR and AI pipeline) |

---

## 8. End-to-End Verification Status

- **Browser-to-Backend Flow:** **VERIFIED**
  - Kiosk frontend running at `http://localhost:5175`.
  - Backend API running at `http://localhost:5001`.
  - Registration -> Consent -> Guided Interview -> Review -> Complete verified with zero uncaught 500 errors.
  - Page reload and retry at `/interview` safely handled without crashing.

---

## 9. Remaining Blockers

- **None.** All prerequisites, gates, tests, and safety boundaries are operational.
- No migrations were run, no data was lost, and no code was deployed or pushed to remote repositories.
