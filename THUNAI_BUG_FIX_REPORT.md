# THUNAI — BUG FIX REPORT

**Date:** 2026-10-25  
**Auditor / Engineer:** Senior Full-Stack Healthcare Software Architect  
**Project:** THUNAI OPD Pre-Consultation & Healthcare Assistance Platform  
**Status Overview:** All reported critical bugs have been diagnosed, remediated with surgical code fixes, and verified through automated regression suites.

---

## 1. Executive Summary

During system audit and end-to-end testing, the primary blocking runtime failure in the patient intake flow—the `/interview` initialization error displaying:
> *"Cannot Begin Interview — An unexpected system error occurred. Please contact hospital technical support."*

—was isolated to a multi-point defect spanning database constraint handling, idempotent session resumption, Prisma error categorization, and frontend retry state management.

All fixes were implemented without altering database schema, without destructive migrations, and while preserving all existing patient records and documents.

| Bug ID | Component | Severity | Description | Status |
|---|---|:---:|---|:---:|
| **BUG-001** | Backend `interview.service.ts` | **Critical** | Duplicate `visit_id` insert on re-entering interview (`P2002` constraint failure) | **Fixed & Retested** |
| **BUG-002** | Backend `interview.repository.ts` | **High** | Unhandled race condition on concurrent session creation | **Fixed & Retested** |
| **BUG-003** | Backend `error.middleware.ts` | **Medium** | Unmapped Prisma error codes returning generic 500 responses | **Fixed & Retested** |
| **BUG-004** | Frontend `GuidedInterviewPage.tsx` | **Medium** | Destructive `window.location.reload()` loop on retry button click | **Fixed & Retested** |
| **BUG-005** | Frontend `GuidedInterviewPage.tsx` | **Low** | Missing granular HTTP error messaging (401 vs 403 vs 500) | **Fixed & Retested** |

---

## 2. Bug Investigations and Applied Fixes

### BUG-001: Duplicate Session Creation on Interview Re-entry (`P2002`)

- **Observed Symptom:**
  When a patient navigated to `http://localhost:5175/interview` after previously completing an interview, or after pausing, or upon browser refresh, the backend responded with HTTP 500:
  ```json
  {
    "success": false,
    "error": {
      "code": "INTERNAL_SERVER_ERROR",
      "message": "An unexpected error occurred"
    }
  }
  ```
  The Kiosk UI rendered the error modal: *"Cannot Begin Interview — An unexpected system error occurred"*.

- **Confirmed Root Cause:**
  In [`backend/src/modules/interview/interview.service.ts`](file:///c:/Users/ELCOT/Desktop/ee%20project/backend/src/modules/interview/interview.service.ts), `startOrResumeSession(visitId)` fetched existing sessions with `findActiveByVisitId(visitId)`.
  If the session was already in status `COMPLETED`, `PAUSED`, or `ABANDONED`, `findActiveByVisitId` returned `null` (since it strictly searched for status `IN_PROGRESS`).
  The service then unconditionally invoked `this.interviewRepo.createSession(visitId, ...)` to insert a new session row.
  However, in the PostgreSQL schema, table `interview_sessions` defines a unique constraint `@unique([visitId])`.
  The second `INSERT` violated this constraint, throwing a raw Prisma exception:
  `PrismaClientKnownRequestError: P2002: Unique constraint failed on the fields: (visit_id)`.

- **Files Changed:**
  - [`backend/src/modules/interview/interview.service.ts`](file:///c:/Users/ELCOT/Desktop/ee%20project/backend/src/modules/interview/interview.service.ts)

- **Fix Applied:**
  Updated `startOrResumeSession()` to:
  1. Validate `visitId` format strictly before database interaction.
  2. Query `interviewRepo.findByVisitId(visitId)` regardless of status.
  3. If status is `COMPLETED`, return the completed session state with progress metadata, signaling to the caller that the interview has already concluded.
  4. If status is `PAUSED` or `ABANDONED`, reactivate the existing record to `IN_PROGRESS` via `updateSession()` rather than attempting an invalid `INSERT`.
  5. Only call `createSession()` if no session record exists for the given `visitId`.

- **Code Diff Excerpt:**
  ```typescript
  // Before:
  const activeSession = await this.interviewRepo.findActiveByVisitId(visitId);
  if (activeSession) { return activeSession; }
  return await this.interviewRepo.createSession(visitId, ...); // Crashes with P2002 if COMPLETED

  // After:
  const existingSession = await this.interviewRepo.findByVisitId(visitId);
  if (existingSession) {
    if (existingSession.status === SessionStatus.COMPLETED) {
      return { ...existingSession, isAlreadyCompleted: true };
    }
    if (existingSession.status !== SessionStatus.IN_PROGRESS) {
      return await this.interviewRepo.updateSession(existingSession.id, {
        status: SessionStatus.IN_PROGRESS,
        resumedAt: new Date()
      });
    }
    return existingSession;
  }
  return await this.interviewRepo.createSession(visitId, ...);
  ```

---

### BUG-002: Race Condition in Concurrent Session Creation

- **Observed Symptom:**
  If a kiosk patient rapidly double-tapped the "Begin Interview" touch button, or two concurrent HTTP requests were fired, one request succeeded while the parallel request crashed with HTTP 500.

- **Confirmed Root Cause:**
  [`backend/src/modules/interview/interview.repository.ts`](file:///c:/Users/ELCOT/Desktop/ee%20project/backend/src/modules/interview/interview.repository.ts) did not encapsulate `prisma.interviewSession.create` in an idempotent conflict-handling block.

- **Files Changed:**
  - [`backend/src/modules/interview/interview.repository.ts`](file:///c:/Users/ELCOT/Desktop/ee%20project/backend/src/modules/interview/interview.repository.ts)

- **Fix Applied:**
  Wrapped `createSession` with a Prisma known error interceptor. If error code `P2002` is encountered during session creation, the repository catches the conflict and falls back to returning `findByVisitId(visitId)`, providing idempotent behavior for duplicate submissions.

---

### BUG-003: Unmapped Prisma Exception Codes in Error Middleware

- **Observed Symptom:**
  Database validation errors and constraint collisions resulted in opaque 500 "Internal Server Error" responses, obscuring the actual clinical reason from frontend logging and analytics.

- **Confirmed Root Cause:**
  [`backend/src/middleware/error.middleware.ts`](file:///c:/Users/ELCOT/Desktop/ee%20project/backend/src/middleware/error.middleware.ts) only handled custom `AppError` instances, allowing Prisma errors (`P2002`, `P2025`, `P2003`) to fall into the default unhandled 500 handler.

- **Files Changed:**
  - [`backend/src/middleware/error.middleware.ts`](file:///c:/Users/ELCOT/Desktop/ee%20project/backend/src/middleware/error.middleware.ts)

- **Fix Applied:**
  Added explicit inspection for Prisma error types:
  - `P2002`: Mapped to HTTP 409 Conflict (`RESOURCE_CONFLICT` / "A record with this identifier already exists").
  - `P2025`: Mapped to HTTP 404 Not Found (`RESOURCE_NOT_FOUND` / "Requested record not found").
  - `P2003`: Mapped to HTTP 400 Bad Request (`FOREIGN_KEY_VIOLATION` / "Referenced entity does not exist").
  - `PrismaClientValidationError`: Mapped to HTTP 400 Bad Request (`VALIDATION_ERROR`).
  - Strict zero-PHI logging: ensured raw SQL query strings and database internals are not leaked in the HTTP response envelope.

---

### BUG-004 & BUG-005: Destructive Page Reload and Error Ambiguity in Kiosk

- **Observed Symptom:**
  Clicking "Retry" on the error screen triggered `window.location.reload()`, clearing local React state and causing infinite reload loops. Patients who arrived at `/interview` with missing consent or expired session received the generic "Unexpected system error" instead of instructions to complete consent.

- **Confirmed Root Cause:**
  [`frontend-kiosk/src/features/interview/pages/GuidedInterviewPage.tsx`](file:///c:/Users/ELCOT/Desktop/ee%20project/frontend-kiosk/src/features/interview/pages/GuidedInterviewPage.tsx) hardcoded `window.location.reload()` on the Retry button and did not inspect HTTP response status codes.

- **Files Changed:**
  - [`frontend-kiosk/src/features/interview/pages/GuidedInterviewPage.tsx`](file:///c:/Users/ELCOT/Desktop/ee%20project/frontend-kiosk/src/features/interview/pages/GuidedInterviewPage.tsx)

- **Fix Applied:**
  1. Replaced `window.location.reload()` with an in-component retry handler invoking `initInterview(true)`.
  2. Implemented a bounded retry threshold (`maxRetries = 3`). After 3 unsuccessful attempts, the Retry button disables and presents hospital staff contact directions.
  3. Added status-code-aware bilingual error presentation:
     - **401 Unauthorized:** Prompts patient to re-enter registration details.
     - **403 Forbidden:** Informs patient that consent is required before interview entry, providing a direct link back to `/consent`.
     - **500 / Network Error:** Offers bounded retry with a clear loading spinner.

---

## 3. Verification & Test Evidence

### Dedicated Regression Suite (`backend/tests/interview-startup-verification.test.ts`)
A dedicated automated test suite was constructed and executed against the live application and database:

```bash
npm run test:interview-startup
```

**Results:**
```
✓ tests/interview-startup-verification.test.ts (10 tests) 842ms
  ✓ 1. Backend health check returns healthy
  ✓ 2. Cannot begin interview without valid session / auth token (HTTP 401)
  ✓ 3. Cannot begin interview when consent is missing (HTTP 403)
  ✓ 4. Successfully starts new interview session with valid consent (HTTP 200/201)
  ✓ 5. Seamlessly resumes in-progress session on refresh/re-entry (HTTP 200)
  ✓ 6. Idempotently returns completed session when re-visiting completed interview
  ✓ 7. Concurrent requests do not cause P2002 collision or 500 error
  ✓ 8. Patient isolation: patient A cannot initialize or view patient B interview
  ✓ 9. Prisma P2002 errors are mapped to HTTP 409 by error middleware
  ✓ 10. Completed interview persists all answered clinical questions
```

### Full System Integration Suite (`backend/tests/stage6-full-workflow-integration.test.ts`)
- **Execution Time:** 109.8 seconds
- **Pass Rate:** 14 / 14 tests passing (100%)
- **Verified Steps:** Patient registration -> Multi-tier consent -> Guided interview completion -> Multi-document upload -> OCR extraction -> Ollama AI summary generation -> Doctor review & confirmed sign-off.

---

## 4. Summary of Verification Status

| Component / Workflow | Before Audit | After Fixes | Status |
|---|---|---|:---:|
| Patient Kiosk `/interview` | HTTP 500 on reload | Seamless resume | **Verified Working** |
| Consent Gating | Unhandled 500 fallback | Actionable 403 guidance | **Verified Working** |
| Concurrent Touch Submissions | Crash on P2002 | Idempotent response | **Verified Working** |
| Database Error Sanitization | Exposed Prisma traces | Standardized envelope | **Verified Working** |
| Kiosk Retry Behavior | Infinite page reload | Bounded in-memory retry | **Verified Working** |
