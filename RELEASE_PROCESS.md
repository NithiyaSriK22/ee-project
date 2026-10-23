# MediKiosk — Release Process & Content Change Governance (Module 10)

> [!IMPORTANT]
> **SEPARATION OF CODE VS. CLINICAL CONTENT GOVERNANCE**
> In MediKiosk, deploying application code does NOT deploy or activate clinical decision rules, summary prompts, or medical translations. Code changes and clinical content changes follow strictly separated release pipelines with distinct authority structures.

---

## 1. Code & Infrastructure Release Pipeline

All source code and container infrastructure changes follow the automated GitHub Actions CI/CD pipeline (`.github/workflows/ci-cd.yml`):

```
Developer PR -> Lockfile Check -> ESLint / TS Check -> 157 Vitest Tests
  -> Security / Secret Scan -> Multi-Stage Container Build -> Deploy to Staging
  -> Automated Release Gates Evaluation -> Manual Approval Gate -> Production Deploy
```

---

## 2. Clinical Content Change Governance (No Code Deploy)

Clinical logic changes are versioned database assets that require medical sign-off via their respective module consoles:

| Content Item | Governing Module | Required Approver | Prerequisite Quality Gate | Rollback Path |
|---|---|---|---|---|
| **Red-Flag Triage Rules** | Module 6 | Emergency Clinical Lead | 100% pass on sensitivity test harness (critical symptoms never silent). | Activate previous approved rule set version via Module 6 console. |
| **Summary Prompts** | Module 5 | Clinical AI Safety Lead | Pass automated factual consistency evaluation suite ($>98\%$ grounding). | Activate previous prompt version via Module 5 prompt manager. |
| **Medical Translations** | Module 8 | Multi-lingual Clinical Committee | 100% human-approved translation coverage for active template strings. | Revert translation version; fall back to original language text. |
| **Drug Formulary Versions** | Module 4 | Hospital Chief Pharmacist | Pass exact/fuzzy deterministic match validation gate against standard NDC/WHO lists. | Roll back to prior active formulary release. |
| **Interview Templates** | Module 3 | OPD Medical Director | Multi-disciplinary clinical review; published lifecycle status. | Activate previous published template version. |
| **Review & Attestation Policy** | Module 7 | Medical Superintendent & Legal Lead | Legal compliance review of doctor signing attestation wording. | Revert to previous versioned legal policy string. |

### Operational Rule for Content Activation:
- Developers and deployment scripts **CANNOT activate clinical content**.
- Content activations are prohibited during peak OPD hours (08:00 AM – 01:00 PM).
- Any content version switch is logged as a `CONTENT_ACTIVATED` critical audit event with the clinician's ID, role, and justification.

---

## 3. Automated Release Gates (10 Clinical Safety Criteria)

Before any release artifact is deployed or kiosk fleet intake is activated, the automated release gate evaluator (`/api/v1/deployment/release-gates`) verifies:

1. **Gate 1 (Red-Flag Rules)**: At least one `ACTIVE`, clinically approved red-flag rule set exists (and zero draft/illustrative rules active).
2. **Gate 2 (Summary Prompts)**: An `ACTIVE`, evaluated summary prompt exists with a passing evaluation score.
3. **Gate 3 (Translation Coverage)**: Every enabled language has 100% approved human review coverage for the active template.
4. **Gate 4 (Drug Formulary)**: An `ACTIVE`, reviewed formulary version exists.
5. **Gate 5 (Interview Template)**: The active template is in `PUBLISHED` status with clinical review metadata.
6. **Gate 6 (Review Policy)**: Hospital-approved physician attestation text is configured (no placeholder text).
7. **Gate 7 (Audit Hash Chain)**: Tamper-evident cryptographic audit chain verifies up to the head sequence without breakage.
8. **Gate 8 (Restore Drill Currency)**: Last successful isolated database restore drill executed within $\le 30$ days.
9. **Gate 9 (Alert Pipeline Canary)**: Alert delivery latency verified within target ($\le 2000$ ms).
10. **Gate 10 (Security Scans)**: Zero open critical or high vulnerability findings in container images and dependencies.

### Emergency Override Protocol:
If a critical operational blocker requires releasing a patch while a non-safety gate is failing, the Chief Medical Officer may authorize an **Audited Release Gate Override** via:
`POST /api/v1/deployment/release-gates/override`.
This records the CMO's name, role, mandatory written justification, and timestamp in the cryptographic audit chain.
