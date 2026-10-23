# MediKiosk — Clinical Safety & Governance Pack (Module 10)

> [!WARNING]
> **LEGAL & REGULATORY NOTICE**
> MediKiosk is strictly an assistive administrative and case-taking workflow platform. It **does not provide autonomous medical diagnosis, clinical judgment, or treatment recommendations**. All patient-entered information, AI drafts, and red-flag alerts are preliminary and **require mandatory review and confirmation by a registered medical practitioner**.

---

## 1. Intended Use Statement

### 1.1 What MediKiosk IS:
- An AI-assisted and guided patient intake kiosk for high-volume outpatient departments (OPDs).
- A multilingual voice- and touch-guided questionnaire to gather patient-reported history of present illness, past medical history, medications, and allergies.
- A document capture tool that extracts prescription labels and lab values through deterministic validation gates.
- A preliminary drafting tool for clinical summaries and deterministic red-flag triage alerts to assist triage staff and attending physicians.

### 1.2 What MediKiosk IS NOT:
- **Not a Diagnostic Device**: The platform does not synthesize diagnoses, disease probabilities, or differential diagnoses.
- **Not a Treatment Recommender**: The system never suggests medications, dosages, or therapeutic pathways.
- **Not an Unsupervised Emergency Triager**: "No alert" from MediKiosk does NOT mean the patient is stable or safe. Prominent signage directs patients who feel acutely unwell to inform hospital staff immediately.
- **Not a Replacement for Medical Practitioners**: Attending physicians remain fully responsible for clinical assessments, patient histories, and treatment plans.

---

## 2. Regulatory Classification & Pathway (CDSCO India)

Under the **Indian Medical Device Rules (MDR) 2017** and CDSCO guidance on Software as a Medical Device (SaMD):
1. **Current Classification**: Currently positioned as **Class A/B Assistive Health IT** software under Section 3(b) exemption for administrative intake systems that do not direct clinical management without human intervention.
2. **Planned Pathway**: Subject to formal clinical evaluation and Institutional Ethics Committee (IEC) review before seeking formal CDSCO registration if triage alert algorithms are deployed as medical decision support.
3. **Regulatory Status**: Currently under **Investigational Pilot Status** with synthetic data verification and supervised clinical evaluation only.

---

## 3. Clinical Hazard Log & Mitigation Matrix

Every identified clinical hazard is mapped to concrete code-level controls and verified automated tests.

| Hazard ID | Clinical Hazard | Potential Root Cause | Clinical Effect | Severity | Engineering & Clinical Controls | Verification Test Suite | Residual Risk | Owner |
|---|---|---|---|---|---|---|---|---|
| **HAZ-01** | **Missed Red-Flag Alert** | Incomplete patient intake or network delay in alert pipeline. | Critical condition (e.g. chest pain, anaphylaxis) unescalated. | **CATASTROPHIC** | 1. Deterministic 3-state rule engine (Module 6).<br>2. Unknown critical answer triggers fallback `STAFF_CHECK` alert.<br>3. Alert state stored in PostgreSQL, not memory.<br>4. Persistent retry queue with canary synthetic checks. | `tests/redflag-engine.test.ts`<br>`tests/deployment-module10.test.ts` (Test 6) | LOW (Staff manual triage always active) | Triage Lead Clinician |
| **HAZ-02** | **False Reassurance from "No Alert"** | Patient with atypical acute presentation reports mild symptoms. | Patient assumes low risk and delays seeking immediate attention. | **CRITICAL** | 1. Persistent on-screen banner: *"If you feel acutely unwell, inform staff immediately."*<br>2. Staff trained that absence of alert is not proof of clinical stability. | Physical signage SOP & `frontend-kiosk/src/components/Header.tsx` | LOW | OPD In-Charge Nurse |
| **HAZ-03** | **Hallucinated or Fabricated AI Summary Content** | LLM temperature drift or ungrounded generative inference. | Doctor receives inaccurate clinical history, risking incorrect diagnosis. | **CRITICAL** | 1. Zero-shot grounded summarization with sentence-level citations (Module 5).<br>2. Automated factual consistency evaluation harness.<br>3. Deterministic template fallback on token discrepancy or confidence drop.<br>4. `AI_SUMMARIZATION_ENABLED` kill switch degrades to template mode. | `tests/summarization-guardrails.test.ts`<br>`tests/deployment-module10.test.ts` (Test 2) | VERY LOW | Lead AI Safety Engineer |
| **HAZ-04** | **Unreadable Allergy Field Overlooked** | Damaged paper prescription or blurry camera capture. | Doctor administers contraindicated medication causing adverse drug reaction. | **CATASTROPHIC** | 1. Deterministic OCR validation gate (Module 4).<br>2. Unreadable allergy or medication field MUST be marked `REQUIRES_CLINICAL_RESOLUTION`.<br>3. Doctor workspace enforces **Must-Resolve** barrier before confirmation is permitted. | `tests/doctor-review.test.ts`<br>`tests/validation-gate.test.ts` | VERY LOW | Medical Director |
| **HAZ-05** | **Cross-Patient Data Mixing / Leakage** | Concurrent kiosk sessions, token reuse, or database query leakage. | Patient A's symptoms or allergies attached to Patient B's clinical record. | **CATASTROPHIC** | 1. Strict server-side visit scoping and cryptographic session tokens.<br>2. Consecutive session wipe: cache, audio, and tokens destroyed on session end.<br>3. 401 Unauthorized enforced on wiped session tokens. | `tests/cross-patient-isolation.test.ts`<br>`tests/deployment-module10.test.ts` (Test 5) | VERY LOW | Platform Security Architect |
| **HAZ-06** | **Misrecognized Speech Accepted** | Ambient hospital noise or accent mismatch during voice intake. | Incorrect symptom duration or severity recorded. | **MODERATE** | 1. Transcribed speech displayed on touch screen for patient confirmation.<br>2. Language-specific audio playback for verification.<br>3. `VOICE_ENABLED` per-language kill switch allows immediate fallback to touch-only. | `tests/multilingual-voice.test.ts`<br>`tests/deployment-module10.test.ts` (Test 2) | LOW | Clinical Informatics Lead |
| **HAZ-07** | **Alert Flooding & Alarm Fatigue** | Overly sensitive triage rules generating excessive low-risk alerts. | Duty staff ignore alerts due to high false-positive fatigue. | **HIGH** | 1. 3-tier triage severity model (Red = Immediate, Amber = Urgently review, Yellow = Routine).<br>2. Separate escalation channels and auditable dismissal reasons.<br>3. Rule tuning governed by Release Gate 1. | `tests/redflags.test.ts`<br>`tests/deployment-module10.test.ts` (Test 1) | LOW | Nursing Supervisor |
| **HAZ-08** | **Translation Distorting Medical Meaning** | Machine translation ambiguity changing clinical intent across languages. | Doctor misunderstands patient complaints due to faulty translation. | **CRITICAL** | 1. Release Gate 3: 100% human-approved translation coverage required for active languages.<br>2. Doctor view always provides one-click access to original verbatim patient transcript. | `tests/translation-coverage.test.ts`<br>`tests/deployment-module10.test.ts` (Test 1) | VERY LOW | Multilingual Review Board |
| **HAZ-09** | **Offline Data Loss / De-synchronization** | Hospital Wi-Fi loss mid-interview followed by kiosk restart. | Patient intake lost or partially synced without doctor knowledge. | **HIGH** | 1. Encrypted IndexedDB local cache on kiosk.<br>2. Automatic retry with idempotent session commit.<br>3. If sync fails, kiosk displays redirection to manual desk; audit logs `SESSION_RECOVERY_ATTEMPT`. | `tests/kiosk-offline-sync.test.ts` | LOW | Hospital IT Lead |
| **HAZ-10** | **Kiosk Residual Exposure (Shoulder Surfing & History)** | Previous patient's data remaining on screen or browser history. | Privacy breach and unauthorized disclosure of health data. | **CRITICAL** | 1. Anti-glare privacy filter screens on kiosk hardware.<br>2. 60-second idle timeout with auto-wipe.<br>3. Complete DOM, local store, and memory purge upon session finish. | `tests/deployment-module10.test.ts` (Test 5) | VERY LOW | Data Protection Officer |

---

## 4. Clinical Safety Case Argument (GSN Summary)

```
[Goal: MediKiosk is acceptably safe for supervised hospital outpatient intake]
  │
  ├── [Strategy 1: All clinical content changes require human medical approval]
  │     ├── Evidence: Release Gate 1 (Active Clinically Approved Rules)
  │     ├── Evidence: Release Gate 2 (Evaluated Summarization Prompts)
  │     └── Evidence: Release Gate 3 (100% Approved Language Translations)
  │
  ├── [Strategy 2: Failsafe Architecture & Graceful Degradation]
  │     ├── Evidence: 8 Server-Controlled Kill Switches
  │     ├── Evidence: Global Intake Pause blocking intake in <10ms
  │     └── Evidence: Rehearsed Downtime Paper Intake Procedure
  │
  └── [Strategy 3: Mandatory Physician Confirmation Barrier]
        ├── Evidence: Must-Resolve Gate blocks record signing until ambiguities cleared
        ├── Evidence: Immutable, versioned confirmed clinical record
        └── Evidence: Cryptographic, tamper-evident audit hash chain
```

---

## 5. Doctor & Staff Training Syllabus

Before any pilot launch:
1. **Attending Doctors (30-Minute Module)**:
   - Navigating the prioritized triage queue (open alerts first, then waiting duration).
   - Resolving **Must-Resolve** unreadable documents and allergy conflicts.
   - Accessing original patient verbatim voice transcripts and raw questionnaire data.
   - Record confirmation and legal attestation requirements.
2. **OPD Staff & Kiosk Attendants (45-Minute Module)**:
   - Assisting elderly, illiterate, or companion-assisted patients at the kiosk.
   - Operating the emergency Help Request button.
   - Identifying Kiosk Offline and Intake Paused states.
   - Transitioning to paper intake during platform downtime.
3. **Hospital Administrators & IT (30-Minute Module)**:
   - Monitoring the public Downtime Status Board (`/status`).
   - Operating server-controlled kill switches and global intake pause.
   - Verifying cryptographic audit hash chain integrity.
   - Executing scheduled isolated database restore drills.

---

## 6. Document Sign-Off (Draft Pending Hospital Signatures)

| Role | Name | Signature | Date |
|---|---|---|---|
| **Chief Medical Officer (CMO)** | ___________________________ | ___________________________ | ____________ |
| **Head of Emergency & Triage** | ___________________________ | ___________________________ | ____________ |
| **Chief Information Security Officer (CISO)** | ___________________________ | ___________________________ | ____________ |
| **Data Protection Officer (DPO)** | ___________________________ | ___________________________ | ____________ |
| **Hospital IT Director** | ___________________________ | ___________________________ | ____________ |
