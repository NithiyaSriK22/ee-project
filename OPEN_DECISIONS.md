# MediKiosk — Module 10: Open Governance & Human Decisions Log

> [!IMPORTANT]
> **MANDATORY CLINICAL SAFETY & GOVERNANCE NOTICE**
> MediKiosk is an **assistive patient intake and documentation platform**. It is **NOT CLEARED FOR UNSUPERVISED CLINICAL USE** and **DOES NOT MAKE DIAGNOSTIC OR THERAPEUTIC DECISIONS**.
> 
> Code and deployment automation cannot make hospital policy, regulatory, or clinical liability decisions. The items below must be formally decided, documented, and signed off by the Hospital Clinical Director, Chief Information Security Officer (CISO), Medical Superintendent, and Legal Counsel prior to clinical pilot activation.

---

## Explicit Human Decisions Register

| ID | Decision Area | Description & Options | Proposed Owner | Current Status | Required Sign-Off |
|---|---|---|---|---|---|
| **DEC-01** | **Hosting Infrastructure Location** | Hospital On-Premise Data Centre vs. MeitY-empaneled Indian Cloud (e.g. NIC Cloud, AWS India - ap-south-1) vs. Hybrid model. | Hospital IT Director & CISO | **OPEN (Pending)** | Signed Architecture Decision Record |
| **DEC-02** | **Data Residency & Provider Processing Terms** | BAA / Data Processing Agreements ensuring zero training on patient data, zero persistent caching, and strict India data residency for AI/OCR providers. | Hospital Legal Counsel & Data Protection Officer | **OPEN (Pending)** | Signed Vendor DPA Addenda |
| **DEC-03** | **Clinical & Audit Retention Periods** | Mandatory retention period for confirmed clinical records (e.g., 3 to 10 years per Indian NMC guidelines) and tamper-evident audit hash logs (e.g., 7 years). | Medical Records Department & Legal Lead | **OPEN (Pending)** | Approved Institutional Retention Policy |
| **DEC-04** | **Authorized Languages for Go-Live** | Explicit approval of translated medical terminology, audio prompts, and companion scripts for English, Hindi, Tamil, and Bengali. | Multi-Lingual Clinical Review Board | **OPEN (Pending)** | Translation Accuracy Certification |
| **DEC-05** | **Active Red-Flag Clinical Rules** | Formal medical approval of active deterministic triage thresholds (Tier 1 Red, Tier 2 Amber, Tier 3 Yellow) and deactivation of draft rules. | Emergency & Triage Lead Clinician | **OPEN (Pending)** | Clinical Safety Sign-Off Form |
| **DEC-06** | **Alert Tier Timeouts & Escalation Contacts** | Exact timeout limits (e.g., Tier 1: 300s, Tier 2: 900s, Tier 3: 1800s) and duty staff phone/ward escalation contacts. | Nursing Superintendent & OPD In-Charge | **OPEN (Pending)** | Duty Roster & Escalation Matrix |
| **DEC-07** | **Downtime Procedure & Incident Leadership** | Designation of nursing and reception leads responsible for transitioning patients to paper intake during platform outages. | OPD Administrative Officer | **OPEN (Pending)** | Standard Operating Procedure (SOP) |
| **DEC-08** | **Pilot Deployment Scope** | Designated OPD department (e.g., General Medicine vs. Orthopedics), number of active kiosks (1–3), and daily operating hours (e.g. 08:00–13:00). | Hospital Medical Superintendent | **OPEN (Pending)** | Pilot Operational Charter |
| **DEC-09** | **Pilot Go / No-Go Criteria & Stop Authority** | Quantitative safety thresholds (e.g., 0 patient safety breaches, <2s alert delivery, 100% doctor review rate) and designated authority to pause pilot. | Chief Medical Officer (CMO) | **OPEN (Pending)** | Signed Go/No-Go Protocol |
| **DEC-10** | **CDSCO Regulatory Classification Pathway** | Determination of Software as a Medical Device (SaMD) status under CDSCO Medical Device Rules 2017 (Class A/B Software). | Regulatory Affairs & Institutional Ethics Committee (IEC) | **OPEN (Pending)** | Regulatory Exemption / Clearance Docket |
| **DEC-11** | **Patient Consent Wording & Physical Signage** | Multilingual signage displayed at kiosks explaining AI assistance, doctor review requirement, voluntary usage, and companion assistance. | Institutional Ethics Committee (IEC) & Patient Relations | **OPEN (Pending)** | Approved Patient Information Leaflet |

---

## Governance Protocol for Activating Decisions

1. **No Silent Defaults**: Production systems must refuse startup if required policy configurations (e.g., alert escalation endpoints, retention periods) are missing.
2. **Audited Activation**: Any change to these decisions is recorded in the platform's cryptographic audit hash chain with the name, role, timestamp, and signed justification.
3. **Emergency Override**: In the event of a clinical emergency requiring immediate operational variance, the Chief Medical Officer may authorize an audited override via `/api/v1/deployment/release-gates/override`.
