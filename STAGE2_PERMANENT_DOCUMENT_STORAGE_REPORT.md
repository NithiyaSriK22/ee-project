# THUNAI — Stage 2 Final Engineering Report: Permanent Document Storage

## 1. Executive Summary & Prerequisite Verification

**Stage:** 2 of 8 — Permanent Document Storage  
**Objective:** Implement reliable, durable, and private storage for original patient-uploaded medical documents (PDFs, PNG, JPEG, WEBP) without breaking existing OCR and clinical review workflows.

### Prerequisite Check: Stage 1 Database Persistence
- **PostgreSQL Connectivity:** Online and healthy on `localhost:5432` (`medikiosk_db`, PostgreSQL 18.4 UTF-8).
- **Health Endpoints:**
  - `GET /api/v1/health` $\rightarrow$ `status: "healthy", database: "connected"` (HTTP 200).
  - `GET /status` $\rightarrow$ `overallStatus: "OPERATIONAL", database: "OPERATIONAL"` (HTTP 200).
- **Persistence Verification:** Data writes survive client disconnects, restarts, and server reboots.
- **Legacy SQLite File:** `thunai/apps/api/data/thunai.db` remains untouched and verified read-only.
- **Stage 1 Verification:** **PASSED & VERIFIED**.

---

## 2. Step 1 — Inspection Findings

Prior to Stage 2 implementation, the document capture and digitization path was inspected:
1. **Discarded File Buffers:**
   In early development mocks, uploaded file buffers were kept in memory only for the duration of the OCR execution and then garbage-collected without a permanent, durable on-disk copy.
2. **Missing Multipart Middleware:**
   `kioskDocumentsRouter.post('/upload')` had no multipart parsing middleware. Although the controller checked `(req as any).file`, standard `multipart/form-data` uploads were not parsed.
3. **Payload Limit Bottleneck:**
   `app.use(express.json({ limit: '1mb' }))` in `app.ts` prevented clients from uploading base64-encoded clinical documents larger than ~750KB, despite the 15MB business limit.
4. **Silent Database Failures Masking Cleanup:**
   `DocumentsRepository.createDocument` caught Prisma errors silently with an empty `catch {}` block. If a database insert failed after writing the physical file to disk, the error was concealed, preventing the cleanup routine (`DocumentStorageService.removeFileSafe`) from being invoked.
5. **Lack of Magic Bytes Verification:**
   Uploaded files were validated solely by client-supplied MIME strings (`file.mimetype`), allowing spoofed or malformed payloads to bypass preliminary validation.

---

## 3. Step 2 — Storage Architecture Implementation

### 3.1 Persistent Storage Directory & Organization
- **Storage Root:** Configured at `backend/storage/documents/` (resolved canonically via `DocumentStorageService.getStorageBaseDir()`).
- **Organization by Visit:** Files are organized into per-visit directories (`backend/storage/documents/<visitId>/`).
- **Private & Protected:** The storage directory is **never** mounted via `express.static`. Direct HTTP access to storage files is impossible. Documents are only streamable via authenticated endpoints (`/api/v1/kiosk/documents/:id/file` and `/api/v1/doctor/documents/:id/image`) protected by session validation and RBAC.

### 3.2 Collision-Resistant Filenames & Boundary Confinement
- Untrusted client filenames are never used as filesystem paths.
- Filename generation format:
  ```
  ${uniquePrefix}_${timestamp}_${sanitizedBase}${ext}
  ```
  - `uniquePrefix`: RFC 4122 v4 UUID (`crypto.randomUUID()`).
  - `timestamp`: Unix epoch milliseconds (`Date.now()`).
  - `sanitizedBase`: Stripped to `[a-zA-Z0-9_-]`, truncated to 50 characters max.
  - `ext`: Sanitized lowercase extension (`.pdf`, `.png`, `.jpg`, `.webp`).
- **Path Confinement:** `DocumentStorageService.validateIdentifier` validates `visitId` and `documentId` against `^[a-zA-Z0-9_-]+$` and rejects `..` or null bytes. `resolveDocumentFile` enforces that resolved paths reside strictly within the storage base directory.

### 3.3 Atomic Writes & Partial Failure Cleanup
- **Two-Phase Atomic Write:** File buffers are written to `${targetFilePath}.tmp.${uuid}` and atomically renamed to `targetFilePath` using `fs.promises.rename`.
- **Safe Cleanup on Failure:** If `DocumentsRepository.createDocument` fails after the file is saved to disk, `DocumentsService.uploadAndProcessDocument` catches the error, calls `DocumentStorageService.removeFileSafe(stored.absoluteFilePath)` to remove the orphaned file, and rethrows the operational error honestly.

### 3.4 Dual-Modality Upload Middleware (`optionalUploadMiddleware`)
- Created [backend/src/middleware/upload.middleware.ts](file:///C:/Users/ELCOT/Desktop/ee%20project/backend/src/middleware/upload.middleware.ts) using `multer` with memory storage:
  - If `multipart/form-data`: parses `file` field into `req.file` with strict 15MB limit enforcement.
  - If `application/json`: passes through to `express.json({ limit: '20mb' })` for `fileBase64` uploads.
- Configured [backend/src/middleware/error.middleware.ts](file:///C:/Users/ELCOT/Desktop/ee%20project/backend/src/middleware/error.middleware.ts) to intercept `LIMIT_FILE_SIZE` and `entity.too.large`, returning a standard 400/413 `VALIDATION_ERROR` instead of a 500 error.

---

## 4. Step 3 — Validation & Integrity Rules

The upload pipeline validates:
1. **Supported Formats:** `image/jpeg`, `image/png`, `image/webp`, `image/jpg`, `application/pdf`. Unsupported types (e.g. `text/plain`, `video/mp4`, `application/zip`) are rejected with 400 `VALIDATION_ERROR`.
2. **File Size Limit:** Strict 15MB maximum (`15 * 1024 * 1024` bytes).
3. **Empty File Rejection:** Uploads with 0 bytes or empty base64 strings are rejected with 400 `VALIDATION_ERROR`.
4. **Magic Bytes Verification:**
   - **PDF:** Must contain `%PDF` in the header.
   - **PNG:** Must start with `0x89 0x50 0x4E 0x47` (`\x89PNG`).
   - **JPEG:** Must start with `0xFF 0xD8 0xFF`.
   - **WEBP:** Must contain `RIFF....WEBP`.
   Mismatched or spoofed content is rejected with 400 `VALIDATION_ERROR`.
5. **Mandatory Patient Consent:** Requires `DOCUMENT_PROCESSING` consent granted before accepting uploads (403 `FORBIDDEN` if missing).

---

## 5. Step 4 — Preservation of OCR Workflow

- Uploaded content is saved to permanent storage **before** invoking `OcrService.processDocument`.
- If OCR fails (e.g., illegible handwriting or low confidence):
  - The original PDF/image remains intact on disk.
  - The database record is updated to `ocr_status = 'FAILED'`, `overall_status = 'EXTRACTION_FAILED'`.
  - The response returns HTTP 201 with extraction failure details.
  - The doctor review workspace surfaces the document under `failedDocuments` with a mandatory review action.
  - The original image/PDF remains fully viewable and streamable.

---

## 6. Step 5 — Test Suite Execution & Verification

### Targeted Test Suite: `tests/document-storage-streaming.test.ts`
All 17 tests passed cleanly (10 existing + 7 new Stage 2 tests):
1. Should successfully upload document and permanently create file with collision-resistant naming (`.png`) — *Passed*
2. Should retrieve original uploaded file with exact byte integrity and secure headers — *Passed*
3. Should return honest 404 for missing document rather than fabricating clinical content — *Passed*
4. Should reject unauthorized document access without valid token or Bearer header — *Passed*
5. Should deny access when Patient B attempts to stream Patient A document — *Passed*
6. Should block path-traversal attempts and invalid identifiers — *Passed*
7. Should preserve original document and record FAILED status without fabricating data when OCR fails — *Passed*
8. Should allow doctor to stream document using valid HMAC signed token and Bearer JWT — *Passed*
9. Should report database connectivity honestly on /health and /status endpoints — *Passed*
10. Should reload document from persistent disk metadata if memory cache is cleared — *Passed*
11. **Should permanently save original PDF uploads with collision-resistant naming and allow streaming** — *Passed*
12. **Should permanently save original JPEG and WEBP image uploads** — *Passed*
13. **Should support multipart/form-data upload using optionalUploadMiddleware** — *Passed*
14. **Should reject empty payloads, unsupported formats, and corrupted signatures** — *Passed*
15. **Should enforce directory boundary confinement and resolve files safely** — *Passed*
16. **Should safely clean up the stored file if database write fails after file creation** — *Passed*
17. **COMPLETION GATE: Synthetic PDF and image remain intact on disk and survive backend restart** — *Passed (1157ms)*

### Full Backend Test Suite Execution (`npm test`):
```
Test Files  24 passed (24)
     Tests  316 passed (316)
  Duration  13.32s
```
Zero test regressions across all 24 backend test suites.

---

## 7. Files Changed in Stage 2

| File Path | Description of Changes |
| :--- | :--- |
| [backend/package.json](file:///C:/Users/ELCOT/Desktop/ee%20project/backend/package.json) | Added `multer` and `@types/multer` dependencies |
| [backend/src/middleware/upload.middleware.ts](file:///C:/Users/ELCOT/Desktop/ee%20project/backend/src/middleware/upload.middleware.ts) | Created `optionalUploadMiddleware` with memory storage and 15MB limit |
| [backend/src/app.ts](file:///C:/Users/ELCOT/Desktop/ee%20project/backend/src/app.ts) | Increased JSON and URL-encoded body limit to `20mb` to support base64 uploads |
| [backend/src/middleware/error.middleware.ts](file:///C:/Users/ELCOT/Desktop/ee%20project/backend/src/middleware/error.middleware.ts) | Added handlers for `entity.too.large` (413) and `MulterError` (400) |
| [backend/src/modules/documents/documents.routes.ts](file:///C:/Users/ELCOT/Desktop/ee%20project/backend/src/modules/documents/documents.routes.ts) | Mounted `optionalUploadMiddleware` on `POST /upload` |
| [backend/src/modules/documents/documents.controller.ts](file:///C:/Users/ELCOT/Desktop/ee%20project/backend/src/modules/documents/documents.controller.ts) | Added empty buffer checks and sanitized payload extraction for multipart & JSON |
| [backend/src/modules/documents/documents.service.ts](file:///C:/Users/ELCOT/Desktop/ee%20project/backend/src/modules/documents/documents.service.ts) | Enforced 15MB limit, empty check, MIME checks, and magic bytes verification |
| [backend/src/modules/documents/storage/document-storage.service.ts](file:///C:/Users/ELCOT/Desktop/ee%20project/backend/src/modules/documents/storage/document-storage.service.ts) | Hardened absolute path boundary checks in `resolveDocumentFile` |
| [backend/src/modules/documents/documents.repository.ts](file:///C:/Users/ELCOT/Desktop/ee%20project/backend/src/modules/documents/documents.repository.ts) | Re-thrown Prisma creation errors so partial failure cleanup is triggered |
| [backend/tests/document-storage-streaming.test.ts](file:///C:/Users/ELCOT/Desktop/ee%20project/backend/tests/document-storage-streaming.test.ts) | Added tests 11 to 17 covering PDF, JPEG, WEBP, multipart, validation, cleanup, and restart |

---

## 8. Stage 2 Completion Checklist

- [x] **Original PDFs are saved permanently:** Confirmed in Test 11 and Test 17.
- [x] **Original images are saved permanently:** Confirmed for PNG, JPEG, and WEBP in Tests 1, 12, and 17.
- [x] **Storage references point to actual files:** Verified on disk via `resolveDocumentFile` and direct `fs.readFile`.
- [x] **OCR failure does not delete original document:** Confirmed in Test 7 and Test P2.2.
- [x] **Files survive a backend restart:** Verified in Test 17 across Prisma disconnect/connect and app re-instantiation.
- [x] **Storage is private and protected:** Confirmed; no `express.static` mounted; access restricted to authenticated endpoints.
- [x] **Strict Scope Boundary Maintained:** Completed Stage 2 only; Stage 3 was not started.
