# MediKiosk — Downtime & Degraded Mode Procedures (Module 10)

> [!CAUTION]
> **HOSPITAL RESILIENCE MANDATE**
> Patient care must never halt due to computer or network failure. When MediKiosk experiences an outage or severe degradation, hospital staff must immediately initiate the **Manual Paper Intake SOP**.

---

## 1. System Degradation Matrix & Fallback Behaviors

| Component Failure | Automatic Platform Behavior | Clinical Impact | Required Staff Action |
|---|---|---|---|
| **PostgreSQL Database Down** | Kiosks show static outage screen; API returns 503; `/status` board displays read-only downtime guidance. | New intake halted; electronic review unavailable. | **Switch immediately to paper triage forms.** Attending doctors take clinical histories manually. |
| **LLM Inference Engine Down / Slow** | `AI_SUMMARIZATION_ENABLED` fails over to deterministic structured template summary (Module 5). | Zero delay in triage. Summary is based purely on structured answers without generative prose. | Doctors review structured clinical fields in Doctor Portal. No change to workflow. |
| **OCR Document Pipeline Down** | Captured document images are stored securely; text extraction fields marked `EXTRACTION_UNAVAILABLE`. | Automated lab/prescription parsing skipped. | Doctors view original high-resolution document images directly in workspace and transcribe values. |
| **STT / TTS Voice Services Down** | Platform automatically hides voice input buttons; switches kiosk interface to touch-only mode. | Patients tap on-screen options; audio playback disabled. | Kiosk attendants assist illiterate or visually impaired patients with touch navigation. |
| **Translation Service Down** | Platform reverts to showing original source clinical answers and transcripts. | Cross-language machine translation unavailable. | Bilingual staff assist with interpretation if required. |
| **SMS / Email Provider Down** | Out-of-band notifications fail; internal real-time WebSocket alerts and database queues continue unaffected. | Patient SMS appointment reminders delayed. | Triage alerts monitored on hospital dashboard. |
| **Audit Log Storage Failure** | Tamper-evident audit chain write failure triggers safe rejection of clinical confirmations. | Prevents un-audited legal medical record modifications. | Staff alerted to resolve storage fault; critical actions fail safely with clear error. |
| **Kiosk Local Network Drop** | Kiosk caches interview responses locally in encrypted IndexedDB; Help Request button retries exponentially. | Interview continues smoothly offline; sync commits on reconnection. | Orderly monitors physical kiosk; if disconnected >5 mins, redirects patient to physical desk. |

---

## 2. Recognizing Downtime & Public Status Board

Staff can verify system health at any time on the unauthenticated internal network status board:
- **Status Board URL**: `https://medikiosk.hospital.internal/status`
- **Triage Queue Disconnect Indicator**: If the Doctor Portal loses WebSocket connection for >15 seconds, a bright yellow banner appears: **"CONNECTION LOST TO ALERT STREAM — RECONNECTING..."**. If reconnection fails for >60 seconds, it changes to red: **"ALERT PIPELINE OFFLINE — RESUME MANUAL CALLS"**.

---

## 3. Immediate Downtime Action Checklist (Phase 1)

1. **Orderly / Kiosk Attendant**:
   - Check kiosk screen. Verify kiosk displays the static downtime banner:
     > *"MediKiosk is currently undergoing maintenance. Please proceed directly to the Reception Desk for manual registration. If you feel very unwell or have chest pain, tell a staff member immediately."*
   - Guide waiting patients from kiosk queue to the manual registration counter.
2. **OPD Triage Nurse**:
   - Distribute physical Paper Intake Slips (Form MK-PAPER-01) to incoming patients.
   - Perform physical vital checks (Blood Pressure, SpO2, Pulse) and prioritize acute patients manually.
3. **Attending Doctors**:
   - If electronic review portal is inaccessible, open physical outpatient register.
   - Continue patient consultations using physical documentation.
4. **Duty IT Administrator**:
   - Inspect `/status` and backend container logs (`docker logs medikiosk-prod-api`).
   - If database or network fault is identified, follow Runbook Section in `OPERATIONS.md`.

---

## 4. Post-Incident Reconciliation Checklist (Phase 2)

Once primary services are restored and `/health` returns `200 OK`:

- [ ] **1. Kiosk Session Audit**: Verify no orphan kiosk sessions remain in memory. Wiped sessions must be confirmed clear.
- [ ] **2. Offline Answer Sync**: Review `OfflineSyncQueue` for any pending client payloads. Verify zero duplicates or corrupt hashes.
- [ ] **3. Undelivered Alert Catch-Up**: Query undelivered alerts table in PostgreSQL. Trigger immediate delivery retry for any pending alerts generated during the blip:
  ```bash
  curl -X POST https://medikiosk.hospital.internal/api/v1/deployment/alerts/catch-up \
    -H "Authorization: Bearer $ADMIN_JWT"
  ```
- [ ] **4. Unreviewed Patient Reconciliation**: Attending doctors cross-check the Doctor Review workspace to confirm any electronic records that were in-progress when the outage occurred.
- [ ] **5. Paper Record Non-Duplication**: Paper triage forms filled during downtime are stamped **"MANUAL DOWNTIME INTAKE"** and filed in the physical medical record. **Do NOT re-enter paper data into the kiosk**.
- [ ] **6. Post-Mortem Documentation**: File a blameless incident report within 24 hours documenting root cause, downtime duration, affected patient count, and remediation actions.
