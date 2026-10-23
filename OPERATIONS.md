# MediKiosk — Operations & Incident Runbooks (Module 10)

This document provides step-by-step procedures for hospital IT engineers, clinical administrators, and duty support staff.

---

## 1. Quick Operations Reference

| Operation | Trigger Condition | Primary Action | Target Time |
|---|---|---|---|
| **Pause Kiosk Intake** | Overcrowding, safety review, staff handover. | Toggle in Admin Console or run `POST /api/v1/deployment/intake/toggle-pause`. | $< 10$ seconds |
| **Kill Switch: AI Summarization** | Hallucinations detected or provider outage. | Disable `AI_SUMMARIZATION_ENABLED` flag in Admin Console. | $< 15$ seconds |
| **Kill Switch: Voice Services** | Extreme ambient noise or speech errors. | Disable `VOICE_ENABLED` for the affected language. | $< 15$ seconds |
| **Restart Backend API** | High memory usage or unexpected deadlock. | `docker compose -f docker-compose.prod.yml restart backend` | $< 30$ seconds |
| **Roll Back Application Release** | Production regression discovered. | Deploy previous release tag: `git checkout vX.Y.Z && docker compose up -d` | $< 3$ minutes |
| **Roll Back Clinical Content** | Red-flag or summary prompt error. | Re-activate previous approved version in Module 5/6 console. | $< 1$ minute |

---

## 2. Standard Operating Runbooks

### Runbook 1: Investigating High Alert Latency (> 2000ms Target)
1. **Check Real-Time Alert Telemetry**:
   ```bash
   curl -s http://localhost:5000/api/v1/deployment/alert-pipeline/health | jq .
   ```
2. **Inspect PostgreSQL Alert Queue**:
   Check if database connection pool is saturated:
   ```sql
   SELECT count(*), state FROM pg_stat_activity WHERE datname = 'medikiosk_production' GROUP BY state;
   ```
3. **Isolate Worker Load**:
   If background OCR or summarization jobs are starving alert evaluation workers, toggle `OCR_ENABLED` to `false` temporarily to prioritize CPU and database bandwidth for triage alerts.

---

### Runbook 2: Credential & Secret Rotation Procedure
When a credential compromise is suspected or scheduled 90-day rotation is due:
1. **JWT & Session Secrets**:
   - Update `JWT_SECRET_PREVIOUS` to current key, generate new 64-character random hex string for `JWT_SECRET`.
   - Backend accepts signatures from previous key during a 2-hour grace period while signing new tokens with current key.
2. **Kiosk Device Credentials**:
   - Navigate to **Admin Console -> Kiosk Fleet**. Click **Revoke Terminal** for compromised hardware.
   - Run `POST /api/v1/deployment/kiosks/enroll` with new hardware serial to issue fresh TLS client certificate.
3. **Database Credentials**:
   - Create new PostgreSQL user role:
     ```sql
     CREATE USER medikiosk_app_v2 WITH PASSWORD 'new_hardened_secret_32char';
     GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO medikiosk_app_v2;
     ```
   - Update `.env.prod` with `DATABASE_URL` pointing to `medikiosk_app_v2`.
   - Perform rolling restart of backend containers:
     ```bash
     docker compose -f docker-compose.prod.yml up -d --no-deps backend
     ```
   - Drop old user after all connection pools cycle.

---

### Runbook 3: Handling a Defective or Tampered Kiosk Terminal
If a kiosk device experiences hardware malfunction, physical lock tampering, or unauthorized peripheral insertion:
1. **Immediate Revocation**:
   ```bash
   curl -X POST https://medikiosk.hospital.internal/api/v1/deployment/kiosks/KIOSK-OPD-01/revoke \
     -H "Authorization: Bearer $ADMIN_JWT" \
     -d '{"reason": "Physical tampering alert or hardware malfunction"}'
   ```
2. **Remote Wipe Verification**:
   Trigger an explicit session wipe:
   ```bash
   curl -X POST https://medikiosk.hospital.internal/api/v1/deployment/kiosks/wipe-session \
     -H "Content-Type: application/json" \
     -d '{"deviceCode": "KIOSK-OPD-01", "wipeTrigger": "TAMPER_DETECTED"}'
   ```
3. **Physical Action**: Unplug power and network cable. Post physical sign: *"Terminal Under Maintenance — Please see Desk"*.

---

## 3. Staff-Facing Quick Reference Guides

### Guide A: Reading the Doctor Review Triage Queue
- **Red Alert Badge (Tier 1)**: Immediate physician evaluation required (e.g. chest pain, active bleeding, severe respiratory distress). Highlighted at top of queue regardless of waiting time.
- **Amber Alert Badge (Tier 2)**: Priority clinical review (e.g. high fever in diabetic patient, medication contraindication).
- **Yellow Alert Badge (Tier 3)**: Routine advisory flag (e.g. overdue screening, unverified allergy notation).
- **Green Checkmark**: No automated flags detected. **Reminder: Absense of an alert is NOT proof of clinical stability.**

### Guide B: What to Do If Staff Queue Disconnects
1. **Yellow Banner ("Reconnecting...")**: Wait 30 seconds while WebSocket auto-reconnects.
2. **Red Banner ("Disconnected")**:
   - Click **Refresh Stream** button in top-right corner.
   - If red banner persists, call Internal IT Support Ext. 4401.
   - Have triage nurse physically monitor kiosk area and switch to verbal notifications for urgent arrivals.

### Guide C: Reporting Problems & Feedback
- Non-critical software bugs, translation awkwardness, or UI feedback: Click **Feedback** icon in Doctor Portal footer or email `medikiosk.feedback@hospital.gov.in`.
- Urgent Patient Safety Concerns: Call Hospital Clinical Lead directly at Ext. 2200.
