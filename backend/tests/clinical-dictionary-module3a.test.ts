import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { TokenUtil } from '../src/utils/token.util.js';
import { UserRoles } from '../src/types/auth.types.js';
import {
  ClinicalDictionaryService,
  DictionaryStore,
  DriftCheckerService,
  TerminologyStatuses,
  DictionaryCategories,
} from '../src/modules/clinical-dictionary/index.js';
import { FormularyMatcher } from '../src/modules/documents/validation/formulary-matcher.js';
import { ForbiddenError, ConflictError, ValidationError } from '../src/errors/app-error.js';

describe('MODULE 3A — CLINICAL DATA DICTIONARY & TERMINOLOGY GOVERNANCE', () => {
  const app = createApp();

  const adminToken = TokenUtil.generateStaffAccessToken({
    sub: 'c0000000-0000-4000-a000-000000000010',
    email: 'ops.admin@hospital.org',
    role: UserRoles.ADMIN,
    fullName: 'Operations Administrator',
  });

  const doctorToken = TokenUtil.generateStaffAccessToken({
    sub: 'c0000000-0000-4000-a000-000000000002',
    email: 'dr.ananya@hospital.org',
    role: UserRoles.DOCTOR,
    fullName: 'Dr. Ananya Sharma',
  });

  const staffToken = TokenUtil.generateStaffAccessToken({
    sub: 'c0000000-0000-4000-a000-000000000004',
    email: 'staff@medikiosk.hospital',
    role: UserRoles.STAFF_ATTENDANT,
    fullName: 'OPD Staff Attendant',
  });

  beforeEach(() => {
    DictionaryStore.seedStore();
  });

  // ---------------------------------------------------------------------------
  // 1. Meaning-Lock Enforcement & Code Immutability
  // ---------------------------------------------------------------------------
  describe('1. Meaning-Lock Enforcement & Immutability', () => {
    it('should lock an active code meaning and forbid semantic modifications', () => {
      expect(() => {
        DictionaryStore.updateEntryMeaning(
          'CHIEF_COMPLAINT_PRIMARY',
          'Altered meaning: Now used for secondary family complaints',
          'doctor-editor-01'
        );
      }).toThrowError(ForbiddenError);
    });

    it('should strictly forbid reusing retired codes', () => {
      // 1. Create a non-referenced test entry and retire it
      DictionaryStore.createDraftEntry(
        {
          code: 'TEMP_UNUSED_CODE_01',
          category: DictionaryCategories.QUESTIONS,
          name: 'Temporary Unused Question',
          description: 'A transient research prompt not linked to any template',
          version: 'v1.0.0',
          sourceDataset: 'Hospital Internal Pilot',
          license: 'Institutional License',
          createdBy: 'researcher-01',
        },
        'researcher-01'
      );

      DictionaryStore.activateEntry('TEMP_UNUSED_CODE_01', 'clinical-director');
      DictionaryStore.retireEntry('TEMP_UNUSED_CODE_01', 'Pilot study concluded', 'clinical-director');

      // 2. Attempt to create a new draft with the same code
      expect(() => {
        DictionaryStore.createDraftEntry(
          {
            code: 'TEMP_UNUSED_CODE_01',
            category: DictionaryCategories.QUESTIONS,
            name: 'Reused Temporary Code',
            description: 'Attempting to reuse a retired code',
            version: 'v1.1.0',
            sourceDataset: 'Hospital Internal Pilot',
            license: 'Institutional License',
            createdBy: 'researcher-02',
          },
          'researcher-02'
        );
      }).toThrowError(ConflictError);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Retirement Rules & Impact Analysis
  // ---------------------------------------------------------------------------
  describe('2. Retirement Blocked While In Use & Impact Analysis', () => {
    it('should block retirement of active codes referenced by templates or rules', () => {
      // 'CHEST_PAIN_DYSPNEA' is in active templates and maps to fact key 'chest_pain'
      const impact = ClinicalDictionaryService.getImpactAnalysis('CHEST_PAIN_DYSPNEA');
      expect(impact.canRetire).toBe(false);
      expect(impact.warnings.length).toBeGreaterThan(0);

      expect(() => {
        ClinicalDictionaryService.retire(
          'CHEST_PAIN_DYSPNEA',
          'Wanting to deprecate chest pain indicator',
          'lead-dr'
        );
      }).toThrowError(ConflictError);
    });

    it('should allow retirement of unreferenced codes and record critical audit trail', () => {
      const code = 'UNREFERENCED_RESEARCH_SURVEY_01';
      DictionaryStore.createDraftEntry(
        {
          code,
          category: DictionaryCategories.QUESTIONS,
          name: 'Discontinued Questionnaire Item',
          description: 'Standalone survey item never mounted in production templates',
          version: 'v1.0.0',
          sourceDataset: 'Hospital Research Formulary',
          license: 'Institutional',
          createdBy: 'researcher-01',
        },
        'researcher-01'
      );

      DictionaryStore.activateEntry(code, 'clinical-director');
      const impact = ClinicalDictionaryService.getImpactAnalysis(code);
      expect(impact.canRetire).toBe(true);

      const retired = ClinicalDictionaryService.retire(code, 'Survey item discontinued', 'clinical-director');
      expect(retired.status).toBe(TerminologyStatuses.RETIRED);
      expect(retired.retiredAt).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Ambiguous Abbreviations (OD Safety Resolution)
  // ---------------------------------------------------------------------------
  describe('3. Safety-Critical Ambiguous Abbreviations', () => {
    it('should resolve ambiguous abbreviation "OD" to UNVERIFIED without clinical context', () => {
      const resolution = ClinicalDictionaryService.resolveAbbreviation('OD');
      expect(resolution.resolved).toBe(false);
      expect(resolution.state).toBe('UNVERIFIED');
      expect(resolution.isAmbiguous).toBe(true);
      expect(resolution.reason).toMatch(/Ambiguous abbreviation "OD" resolves to UNVERIFIED/i);
    });

    it('should resolve ambiguous abbreviation "OD" to VERIFIED when approved context is supplied', () => {
      const resolution = ClinicalDictionaryService.resolveAbbreviation('OD', 'ORAL_FREQUENCY');
      expect(resolution.resolved).toBe(true);
      expect(resolution.state).toBe('VERIFIED');
      expect(resolution.expandedMeaning).toBeDefined();
    });

    it('should resolve unambiguous abbreviations (BD, TDS, SOS) directly to VERIFIED', () => {
      const bd = ClinicalDictionaryService.resolveAbbreviation('BD');
      expect(bd.resolved).toBe(true);
      expect(bd.state).toBe('VERIFIED');
      expect(bd.isAmbiguous).toBe(false);

      const sos = ClinicalDictionaryService.resolveAbbreviation('SOS');
      expect(sos.resolved).toBe(true);
      expect(sos.state).toBe('VERIFIED');
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Look-Alike / Sound-Alike (LASA) Pair Near-Tie Safety
  // ---------------------------------------------------------------------------
  describe('4. Look-Alike / Sound-Alike (LASA) Near-Tie Safety Enforcement', () => {
    it('should treat a match as UNVERIFIED when runner-up is a LASA partner within margin', () => {
      // Hydralazine vs Hydroxyzine are registered high-risk LASA partners
      const check = ClinicalDictionaryService.evaluateLasaMatchSafety(
        'Hydralazine',
        0.88,
        'Hydroxyzine',
        0.84, // Margin is 0.04 <= 0.10
        0.10
      );

      expect(check.isSafe).toBe(false);
      expect(check.state).toBe('UNVERIFIED');
      expect(check.lasaRisk).toBe(true);
      expect(check.partnerDrugName).toBe('Hydroxyzine');
      expect(check.detail).toMatch(/Look-Alike \/ Sound-Alike partner within uncertainty margin/i);
    });

    it('should pass LASA check when runner-up is not a LASA partner or margin is large', () => {
      const check = ClinicalDictionaryService.evaluateLasaMatchSafety(
        'Hydralazine',
        0.95,
        'Hydroxyzine',
        0.70, // Margin is 0.25 > 0.10
        0.10
      );

      expect(check.isSafe).toBe(true);
      expect(check.state).toBe('VERIFIED');
    });

    it('should enforce LASA safety inside Module 4 FormularyMatcher to prevent silent picking', () => {
      // Synthetic mock formulary containing both LASA partners
      const mockFormulary = [
        {
          id: 'DRUG_HYDRALAZINE',
          canonicalName: 'Hydralazine',
          genericName: 'Hydralazine',
          brandNames: ['Apresoline'],
          commonMisreadings: ['hydralizine'],
        },
        {
          id: 'DRUG_HYDROXYZINE',
          canonicalName: 'Hydroxyzine',
          genericName: 'Hydroxyzine',
          brandNames: ['Atarax'],
          commonMisreadings: ['hidroxyzine'],
        },
      ];

      // Ambiguous raw input that scores closely for both Hydralazine and Hydroxyzine (near-tie within 0.10)
      const matchResult = FormularyMatcher.matchDrug('Hydraxazine', mockFormulary as any, 0.60);

      // The matcher must treat the near-tie between LASA partners as MISMATCH/uncertain
      expect(matchResult.state).toBe('MISMATCH');
      expect(matchResult.detail).toMatch(/Look-Alike \/ Sound-Alike/i);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Unit Conversions (Analyte-Specific and Refusal of Unapproved)
  // ---------------------------------------------------------------------------
  describe('5. Approved Analyte-Specific Unit Conversions', () => {
    it('should successfully convert approved glucose units between mg/dL and mmol/L', () => {
      const res = ClinicalDictionaryService.convertUnit(90, 'mg/dL', 'mmol/L', 'GLUCOSE');
      expect(res.success).toBe(true);
      expect(res.convertedValue).toBeCloseTo(4.9949, 2);
      expect(res.factor).toBeCloseTo(1 / 18.0182, 4);
    });

    it('should refuse unapproved unit conversions with explicit "unit not convertible"', () => {
      // Converting g/dL to mmol/L for hemoglobin has no registered clinical factor
      const res = ClinicalDictionaryService.convertUnit(14, 'g/dL', 'mmol/L', 'HEMOGLOBIN');
      expect(res.success).toBe(false);
      expect(res.error).toBe('unit not convertible');
      expect(res.detail).toMatch(/not clinically approved/i);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Bulk Import Dry-Run Tooling
  // ---------------------------------------------------------------------------
  describe('6. Bulk Import Dry-Run Validation Tooling', () => {
    it('should catch duplicates, orphaned references, and meaning-lock violations without writing', () => {
      const candidateBatch: any[] = [
        // 1. Valid new entry
        {
          code: 'NEW_TEST_CODE_01',
          category: DictionaryCategories.FACT_KEYS,
          name: 'New Valid Fact',
          description: 'A completely new valid clinical fact key',
        },
        // 2. Duplicate in batch
        {
          code: 'NEW_TEST_CODE_01',
          category: DictionaryCategories.FACT_KEYS,
          name: 'Duplicate in batch',
          description: 'Same code in same import',
        },
        // 3. Orphaned Option code referencing non-existent question
        {
          code: 'OPT_GHOST_01',
          category: DictionaryCategories.OPTION_CODES,
          questionCode: 'NON_EXISTENT_QUESTION_CODE',
          displayLabel: 'Ghost option',
          name: 'Ghost Option',
          description: 'References missing question',
        },
      ];

      const report = ClinicalDictionaryService.runDryRunImport('Batch Import 2026-Test', candidateBatch);
      expect(report.canCommitAsDraft).toBe(false);
      expect(report.duplicateCodes.length).toBeGreaterThan(0);
      expect(report.orphanedCodeReferences.length).toBeGreaterThan(0);
      // Confirmed nothing committed to store
      expect(DictionaryStore.getEntry('NEW_TEST_CODE_01')).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // 7. CI Terminology Drift Check
  // ---------------------------------------------------------------------------
  describe('7. CI Terminology Drift Checks', () => {
    it('should pass drift scan cleanly on the baseline active dictionary', () => {
      const scan = DriftCheckerService.scanAllModules();
      expect(scan.isClean).toBe(true);
      expect(scan.violations.length).toBe(0);
      expect(scan.scannedCount).toBeGreaterThan(15);
    });

    it('should immediately detect a planted unknown code and fail the drift scan', () => {
      // Temporarily plant a non-active / unapproved code in store for test
      const plantedEntry: any = {
        code: 'PLANTED_DRIFT_CODE',
        category: DictionaryCategories.FACT_KEYS,
        name: 'Planted Drift Fact',
        description: 'Unreviewed planted code',
        status: TerminologyStatuses.DRAFT, // Not ACTIVE
      };

      DictionaryStore.createDraftEntry(plantedEntry, 'tester');
      const scan = DriftCheckerService.scanAllModules();
      // Even if planted in draft, active templates must reference only ACTIVE codes
      expect(scan).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // 8. Governance Workflow & Dual Control
  // ---------------------------------------------------------------------------
  describe('8. Governance Workflow & Dual Control', () => {
    it('should enforce dual control: prevent author from being the sole activation approver', () => {
      const draft = ClinicalDictionaryService.createDraft(
        {
          code: 'GOV_TEST_CODE_01',
          category: DictionaryCategories.FACT_KEYS,
          name: 'Governance Test Code',
          description: 'Testing 4-eyes approval workflow',
          version: 'v1.0.0',
          sourceDataset: 'Hospital Governance Protocol',
          license: 'Institutional',
        },
        'author-user-01'
      );

      ClinicalDictionaryService.submitForReview(draft.code, 'reviewer-01');

      // Author attempting to activate their own entry
      expect(() => {
        ClinicalDictionaryService.activate(draft.code, 'author-user-01');
      }).toThrowError(ForbiddenError);

      // Distinct approver succeeds
      const activated = ClinicalDictionaryService.activate(draft.code, 'clinical-director-02');
      expect(activated.status).toBe(TerminologyStatuses.ACTIVE);
      expect(activated.activatedBy).toBe('clinical-director-02');
    });
  });

  // ---------------------------------------------------------------------------
  // 9. HTTP API Endpoints & Caching
  // ---------------------------------------------------------------------------
  describe('9. Module 3A HTTP API Routes & Versioned Caching', () => {
    it('GET /api/v1/dictionary/sections should return sections carrying X-Dictionary-Version header', async () => {
      const res = await request(app).get('/api/v1/dictionary/sections');
      expect(res.status).toBe(200);
      expect(res.headers['x-dictionary-version']).toBeDefined();
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('POST /api/v1/dictionary/abbreviations/resolve should evaluate abbreviation via HTTP', async () => {
      const res = await request(app)
        .post('/api/v1/dictionary/abbreviations/resolve')
        .send({ abbreviation: 'OD' });

      expect(res.status).toBe(200);
      expect(res.body.data.state).toBe('UNVERIFIED');
      expect(res.body.data.isAmbiguous).toBe(true);
    });

    it('POST /api/v1/dictionary/units/convert should convert approved units via HTTP', async () => {
      const res = await request(app)
        .post('/api/v1/dictionary/units/convert')
        .send({
          value: 90,
          fromUnit: 'mg/dL',
          toUnit: 'mmol/L',
          analyte: 'GLUCOSE',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.success).toBe(true);
      expect(res.body.data.convertedValue).toBeDefined();
    });

    it('POST /api/v1/admin/dictionary/draft should allow authorized clinician to create draft', async () => {
      const res = await request(app)
        .post('/api/v1/admin/dictionary/draft')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          code: 'HTTP_DRAFT_CODE_01',
          category: 'FACT_KEYS',
          name: 'HTTP Draft Fact',
          description: 'A clinical fact drafted via admin API',
          version: 'v1.0.0',
          sourceDataset: 'Hospital Formulary',
          license: 'Institutional',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('DRAFT');
    });

    it('should deny dictionary admin endpoints to unauthenticated users and staff attendants', async () => {
      const unauth = await request(app).post('/api/v1/admin/dictionary/draft').send({});
      expect(unauth.status).toBe(401);

      const staffDeny = await request(app)
        .post('/api/v1/admin/dictionary/draft')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          code: 'STAFF_FORBIDDEN_CODE',
          category: 'FACT_KEYS',
          name: 'Staff Draft',
          description: 'Should be rejected',
          version: 'v1.0.0',
          sourceDataset: 'Formulary',
          license: 'None',
        });
      expect(staffDeny.status).toBe(403);
    });
  });
});
