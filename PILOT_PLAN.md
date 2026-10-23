# MediKiosk — Staged Clinical Pilot Deployment Plan (Module 10)

> [!IMPORTANT]
> **PILOT READINESS & SAFETY DIRECTIVE**
> MediKiosk must be introduced to a clinical environment gradually through 5 distinct operational stages. A real red-flag alert must **NEVER be ignored or dismissed simply because the platform is operating in pilot mode**. The manual paper intake and triage process remains active at all times.

---

## 1. Pilot Rollout Stages

```
┌────────────────────────────────────────────────────────────────────────┐
│ STAGE 0: Isolated Staging Environment (100% Synthetic Data Only)       │
│  - Automated release gates evaluated (all 10 criteria PASS)             │
│  - Adversarial injection, upload tampering, and privacy scans pass     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Clinical Lead Approval
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ STAGE 1: Hospital-Network Dry Run (Staff Patient Simulation)           │
│  - Hospital staff play simulated patients (NO real patient data)       │
│  - Full rehearsal of Downtime Procedure and Emergency Kill Switches    │
│  - Verification of physical kiosk privacy filters & noise resilience   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Medical Superintendent Sign-off
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ STAGE 2: Supervised Clinical Pilot (Limited OPD Scope)                 │
│  - Scope: 1 designated OPD (e.g. General Medicine), 2 kiosks, 3 hrs/day│
│  - Dedicated trained kiosk attendant present at all times              │
│  - Doctors review 100% of summaries; unreviewed summaries never used   │
│  - Red-flag alerts live on staff dashboard with real-time escalation   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Daily Clinical Review
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ STAGE 3: Operational Monitoring & Feedback Loops                       │
│  - Daily morning standup reviewing alert latency and fallback rates    │
│  - Weekly audit hash chain verification and restore drill logging      │
│  - Content adjustments routed through clinical review workflows only   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Formal Go / No-Go Review
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ STAGE 4: Gradual Expansion to Adjacent OPDs                            │
│  - Expansion to 5–10 kiosks only after passing all quantitative gates  │
│  - Hospital leadership and ethics committee expansion authorization   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Quantitative Go / No-Go Gate Criteria

Progression from Stage 2 to Stage 4 is strictly prohibited unless the following quantitative criteria are met over a minimum 14-day continuous evaluation period:

| Criterion | Target Metric | Measurement Method | Stop Threshold (Triggers Immediate Pause) |
|---|---|---|---|
| **Patient Safety Breaches** | **0 incidents** | Clinical Incident Review Log | $\ge 1$ unresolved patient harm or missed critical condition |
| **Cross-Patient Data Leakage** | **0 incidents** | Session wipe tests & audit logs | $\ge 1$ instance of cross-patient record contamination |
| **Alert Delivery Latency** | **p95 < 2.0s** | System Telemetry & Alert Canary | p95 > 5.0s over any 15-minute window |
| **Doctor Review Rate** | **100%** | Admin analytics (`confirmed_records` / `completed_interviews`) | Doctor confirmation rate drops below 95% |
| **AI Summary Hallucination Rate** | **< 1.0%** | Adversarial sampling & doctor edit logs | Summary grounding failure rate exceeds 3.0% |
| **Staff Queue Connection Uptime** | **> 99.9%** | WebSocket reconnection telemetry | Disconnect duration > 60s during OPD hours |

---

## 3. Stop Authority & Emergency Kill Switch Protocol

### 3.1 Designated Stop Authorities
The following named hospital roles possess absolute, unilateral authority to halt the pilot immediately:
1. **Chief Medical Officer (CMO)** / Medical Superintendent
2. **Head of Emergency & Triage**
3. **Chief Information Security Officer (CISO)**
4. **On-Duty Triage Lead Clinician**

### 3.2 Instant Halt Procedure (Global Intake Pause)
Any authorized officer can trigger an immediate pause in <10 seconds without code deployment or service restart:
1. Navigate to the **Doctor Portal -> Admin Console -> Release Gates & Safety** tab.
2. Click **Emergency Pause Intake**.
3. Enter the clinical justification and confirm.
4. **Instant Effect**: All enrolled kiosks immediately stop accepting new patients, display a calm redirection message directing patients to the physical triage desk, while attending doctors continue reviewing in-progress records without data loss.
5. In case of portal disconnection, executing the API call via authenticated cURL:
   ```bash
   curl -X POST https://medikiosk.hospital.internal/api/v1/deployment/intake/toggle-pause \
     -H "Authorization: Bearer $STAFF_JWT" \
     -H "Content-Type: application/json" \
     -d '{"paused": true, "reason": "Immediate clinical safety pause by CMO"}'
   ```

---

## 4. Operational Schedule & Pilot Scope

- **Department**: OPD Block B, General Medicine Outpatient Clinic.
- **Hardware Fleet**: 2 Managed MediKiosk Terminals (Device Codes: `KIOSK-OPD-B1`, `KIOSK-OPD-B2`).
- **Operating Hours**: Monday through Friday, 08:30 AM to 12:30 PM (excluding emergency shifts).
- **Attendant Coverage**: 1 trained nursing orderly stationed adjacent to kiosks for physical and language assistance.
- **Doctor Stations**: 4 consulting doctor terminals running the Doctor Review Portal.
