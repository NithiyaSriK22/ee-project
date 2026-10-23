# MediKiosk — Privacy Impact Assessment & Data Governance (Module 10)

> [!IMPORTANT]
> **INDIA DIGITAL PERSONAL DATA PROTECTION (DPDP) ACT 2023 COMPLIANCE**
> MediKiosk processes sensitive health data and personal identifiers. This document establishes data categories, retention schedules, data subject rights handling, and third-party provider boundaries.

---

## 1. Data Classification & Privacy Lifecycle Matrix

| Data Category | Specific Fields | Clinical Purpose | Storage Location | Retention Period | Access Control (RBAC) | Third-Party Provider Boundary |
|---|---|---|---|---|---|---|
| **Patient Demographics** | Full name, Hospital Reg No, Age, Gender, Contact number. | Patient identification and queue matching. | PostgreSQL `patients` table (Encrypted at rest). | Standard Hospital Medical Record Retention (e.g. 7 years). | Attending doctors, triage orderlies. **Admins have masked access.** | **NEVER leaves hospital control.** |
| **Guided Interview Answers** | Chief complaints, symptom duration, past medical history, family history. | Case-taking input for clinical history drafting. | PostgreSQL `interview_answers` table. | Duration of clinical record retention. | Attending doctors only. | Processed by LLM summarizer if enabled (identifiers stripped). |
| **Prescription & Lab Images** | Camera capture of paper prescriptions, discharge summaries, lab slips. | Document verification and formulary reconciliation. | Encrypted Object Storage / Private S3 bucket. | Duration of clinical record retention. | Attending doctors via short-lived signed URLs (15 min expiry). | Processed by OCR pipeline (sanitized bounding boxes). |
| **Deterministic Validated Fields** | Medication name, dosage, frequency, lab values. | Formulary and allergy cross-referencing. | PostgreSQL `validated_fields` table. | Same as clinical record. | Attending doctors. | Internal deterministic validation gate only. |
| **AI Draft Summaries** | Sentence-by-sentence clinical summary with citations. | Preliminary draft to reduce physician typing burden. | PostgreSQL `clinical_summaries` table. | Retained as draft history until confirmed or amended. | Attending doctors. | LLM inference engine (zero training, zero persistence). |
| **Red-Flag Triage Alerts** | Tier 1/2/3 severity, triggered clinical rule, timestamp. | Patient safety escalation for acute conditions. | PostgreSQL `triage_alerts` table. | 3 years for clinical quality auditing. | Triage nurses, attending doctors, clinical safety leads. | Internal deterministic rule engine only. |
| **Confirmed Clinical Records** | Physician-signed medical case note, amendments, attestation statement. | Official legal hospital medical record. | PostgreSQL `confirmed_records` (Immutable, versioned). | Permanent medical archive (7–10 years per NMC). | Attending doctors, medical legal records. | **Never leaves hospital control.** |
| **Cryptographic Audit Logs** | Sequence #, Actor ID, Actor Role, Action, SHA-256 hash. | Accountability, legal compliance, tamper detection. | PostgreSQL `audit_logs` + daily signed checkpoints. | 7 years minimum. | Auditors, Compliance Officers. **Admins cannot delete.** | **Never leaves hospital control.** |
| **Aggregated Analytics** | Visit counts, completion rates, language distribution, alert counts. | Operational hospital resource planning. | In-memory / aggregated reporting tables. | Indefinite (anonymized aggregates). | Operations analysts, medical directors. | **Zero individual patient data.** |

---

## 2. Third-Party Data Processing Agreements (DPA Standards)

Prior to routing data to external AI or OCR providers, Hospital Legal Counsel must verify that vendor agreements mandate:
1. **Zero Retention**: Provider discards prompts and outputs immediately after token stream completion.
2. **Zero Model Training**: Explicit contractual guarantee that patient inputs are never used to train or fine-tune public foundation models.
3. **India Data Residency**: Computation and transit confined to MeitY-approved Indian data centers.
4. **Self-Hosted Fallback**: In facilities where external cloud transmission is prohibited by institutional policy, MediKiosk supports local open-source weights (e.g., Llama 3 / Mistral / Tesseract OCR) running entirely on hospital GPU servers.

---

## 3. Patient Data Subject Rights Procedure (Access, Correction, Deletion)

### 3.1 Right to Access:
Patients may request a copy of their MediKiosk intake data. Attending medical staff can export the confirmed clinical record in human-readable PDF format from the Doctor Review Workspace.

### 3.2 Right to Correction:
Patients cannot directly alter historical kiosk submissions after session completion. If a patient identifies an error (e.g., misstated symptom duration), the attending physician executes a formal **Clinical Record Amendment** in the Doctor Workspace with a mandatory reason code (`RECORD_AMENDED` logged in audit chain).

### 3.3 Right to Erasure vs. Legal Retention:
Under Section 8(7) of the DPDP Act 2023, data erasure requests must be balanced against statutory healthcare obligations:
- **Clinical Records**: Cannot be deleted on patient demand if required by the National Medical Commission (NMC) regulations or ongoing clinical care.
- **Audit Logs**: Tamper-evident audit records cannot be pruned or modified on demand to maintain medico-legal integrity.
- **Unconfirmed Incomplete Intakes**: If an intake session was abandoned or cancelled prior to clinical review, a formal erasure request purges draft responses after a 48-hour clinical reconciliation hold.
