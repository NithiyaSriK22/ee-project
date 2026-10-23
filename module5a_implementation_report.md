# MODULE 5A — Evaluation, Calibration & Ground-Truth Program
## Implementation & Verification Report

### Executive Summary
**Module 5A** has been implemented for MediKiosk. This module transitions the system from speculative heuristics and assumptions to an evidence-based clinical evaluation program. It provides the tooling, protocols, datasets, statistical models, and release-gate integrations to honestly measure system safety and derive operational thresholds from data across all modalities:
1. Document extraction and deterministic validation.
2. Multilingual voice answer mapping per language and ambient noise level.
3. AI summarization grounding, omission rates, and clinician usefulness scores.
4. Clinician-authored red-flag scenario performance and alert burden.
5. Usability and human factors testing with vulnerable cohorts.
6. Time-and-motion clinical efficiency baseline studies.

---

### Architectural Boundaries & Clinical Invariants
- **Strict Logic Separation**: Evaluation tooling never alters production code directly. Findings can only adjust operational configuration values (thresholds) through governed approval channels.
- **Data Isolation**: Evaluation datasets never enter production databases or customer kiosks.
- **Locked Test Split Integrity**: The test set is cryptographically sealed and immutable. Attempting to access test split data during training or calibration tuning triggers an immediate `TestSetLeakageError`.
- **Pre-registered Sample Size**: Targets are calculated in advance using the **Rule of Three** ($n \ge \lceil 3 / \text{targetMaxRate} \rceil$) and the Wilson Score interval.
- **Safety Priority**: The system strictly favors escalating to the doctor over false verification whenever the two conflict.

---

### Core Specifications Implemented

#### 1. Dataset Registry & Stratification (Section 3)
- **Metadata Management**: Each dataset tracks `datasetCode`, `version`, `modality`, and `retentionExpiryDate`.
- **Prerequisites**: Mandates verified `ethicsApprovalNumber`, `irbApprovalDate`, `consentForSecondaryUse: true`, and `isEncryptedAtRest: true`.
- **Pre-determined Splits**: `DEVELOPMENT`, `CALIBRATION`, and `TEST`.
- **Stratification Dimensions**:
  - Documents: Render style (`HANDWRITTEN`, `PRINTED`, `MIXED`), language (`en`, `hi`, `ta`), image quality (`HIGH`, `MEDIUM`, `DEGRADED`, `BLURRED`, `LOW_LIGHT`), source (`FLATBED_SCANNER`, `MOBILE_CAM`, `KIOSK_CAM`), and LASA (Look-Alike Sound-Alike) near-misses.
  - Voice: Language and ambient noise levels (`QUIET`, `MODERATE_AMBIENT`, `LOUD_PUBLIC_CLINIC`).
  - Scenarios: Clinician-authored emergency triggers (`TRIGGERED`, `INDETERMINATE`, `NOT_TRIGGERED`).
  - Usability: Participant cohorts (`ELDERLY`, `LOW_LITERACY`, `MULTILINGUAL`, `DOCTORS`, `CLINICAL_STAFF`).

#### 2. Double-Blind Annotation & Adjudication (Section 4)
- **Versioned Guidelines**: Enforces `guidelineVersion` on all annotation submissions.
- **Field-Level Granularity**: Records field name, bounding box coordinates, extracted raw text, canonical value, and legibility rating (`CLEAR`, `MARGINAL`, `UNREADABLE`).
- **Truly Illegible Enforcement**: If legibility is `UNREADABLE`, ground truth canonical value is strictly forced to `UNREADABLE`.
- **Double-Blind Agreement**: Annotator 1 and Annotator 2 annotate independently without mutual visibility.
- **Role-Gated Adjudication**:
  - Conflicting drug fields strictly mandate adjudication by a licensed **Pharmacist**.
  - Conflicting clinical/diagnosis fields strictly mandate a **Clinician**.
- **Agreement Metrics**: Automatically calculates raw percentage agreement and Cohen's Kappa ($\kappa$).

#### 3. Mathematical & Statistical Calculator (Section 5)
- **Wilson Score 95% Confidence Interval**: Exact binomial proportion confidence bounds for small sample sizes and proportions near 0 or 1.
- **Rule of Three**: Conservative upper bound ($3/n$) applied when zero failures are observed in independent trials.
- **Sample Size Calculator**: Pre-determines required clinical cohort size $n$ from human-specified safety targets (e.g., target false-verified rate $\le 1\%$ requires $n \ge 300$).
- **Coverage-vs-Error Curve**: Plots verified share vs false-verified rate and escalation rate across candidate threshold increments ($0.40$ to $0.95$).

#### 4. The 5-Step Calibration Protocol (Section 6)
1. **Target Setting**: A human clinician sets the maximum acceptable false-VERIFIED rate (e.g., $\le 0.02$).
2. **Calibration Tuning**: Evaluates threshold grid triplets (`minOcr`, `formularySimilarity`, `highOcr`) on the `CALIBRATION` split to find the candidate meeting the safety constraint while minimizing escalation rate.
3. **Single-Shot Confirmation**: Evaluates candidate threshold once on the locked `TEST` split.
4. **Governed Configuration Export**: Generates calibrated parameters for Module 4 (`updateGovernedValidationThresholds`) and Module 8 (`updateGovernedConfidenceThreshold`).
5. **Recalibration Mandate**: Recalibration is automatically scheduled upon formulary updates, model upgrades, or pilot distribution drift.

#### 5. Evaluation Runner & Immutable Reports (Section 7)
- **Full Multi-Modality Runner**: Executes evaluations across documents, voice, AI summarization, red flags, usability, and time-and-motion studies.
- **Cryptographic Immutability**: Every generated report is stamped with an immutable SHA-256 hash calculated over its contents.
- **Version-to-Version Comparison**: Diffs candidate report against baseline report, calculating changes in error rates, escalation burden, and latency.

#### 6. Governance, Human Sign-Off & Release Gates (Section 8 & 10)
- **Named Human Sign-Off**: Reports must be reviewed and signed by a `CLINICAL_SAFETY_OFFICER` and a `LEAD_PHARMACIST`.
- **Non-Suppression Rule**: Signer must explicitly acknowledge negative results and submit a clinical limitations statement ($\ge 20$ characters).
- **Cryptographic Signature**: SHA-256 HMAC generated using report hash, signer identity, and hospital governance keys.
- **Release-Gate Integration**: Module 10 `ReleaseGatesService` reads approved report IDs and verifies:
  1. Signed evaluation report exists.
  2. Document False-VERIFIED upper 95% bound $\le 0.02$.
  3. AI Summarization unsupported claims $= 0$.
  4. Red-flag emergency sensitivity $= 100\%$.
  5. Zero unmeasured languages or document types enabled.

#### 7. CI Integration & Pilot Drift Monitoring (Section 7)
- **CI Test Runner**: Executes synthetic and development splits in CI pipelines, verifying test split leakage protections.
- **Pilot Drift Monitor**: Evaluates random audit samples of doctor-confirmed records from Module 7, detecting distribution drift and alerting when empirical error rates exceed baseline.

---

### Verification & Test Suite Results

#### Test Suite: `backend/tests/evaluation-module5a.test.ts`
All 21 comprehensive tests passed:
- `Statistical Metric Calculations`: Verified Wilson score intervals, Rule of Three ($3/n$), sample size derivation ($n \ge 300$ for $1\%$), Cohen's Kappa, and coverage-error curve.
- `Dataset Registry & Split Integrity`: Verified ethics approval requirement, secondary consent enforcement, and `TestSetLeakageError` blocking unauthorized test split access.
- `Double-Blind Annotation & Adjudication`: Verified `UNREADABLE` ground truth enforcement, consensus detection, and pharmacist-only adjudication of drug conflicts.
- `Calibration Protocol`: Verified 5-step protocol, safety-first threshold selection, single-shot test confirmation, and rejection when thresholds exceed safety targets.
- `Full Multi-Modality Evaluation Runner`: Verified SHA-256 report hashing, document/voice/summary/red-flag/usability/time-motion metrics, and report comparison.
- `Human Clinician Sign-Off & Release Gates`: Verified negative result acknowledgment, limitations statement validation, Gate 2 pass with approved report, and blocker on unsafe reports.
- `CI Evaluation Runner`: Verified synthetic/dev execution and test split isolation.
- `Drift Monitoring`: Verified normal operations and detection of elevated doctor correction rates.

#### Full Regression Suite & Production Build
- **Total Backend Test Suites**: **19 passed, 19 total**
- **Total Tests**: **253 passed, 253 total (0 failed)**
- **TypeScript Production Compilation (`npm run build`)**: Zero errors.
