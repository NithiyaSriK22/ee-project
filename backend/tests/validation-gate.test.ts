import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { FieldCheckEvaluator } from '../src/modules/documents/validation/field-check-evaluator.js';
import { FormularyMatcher } from '../src/modules/documents/validation/formulary-matcher.js';
import { PatternMatcher } from '../src/modules/documents/validation/pattern-matcher.js';
import { ValueNormalizer } from '../src/modules/documents/validation/value-normalizer.js';
import {
  EvaluationStates,
  FieldVerificationResults,
  DocumentOverallStatuses,
  FieldTypes,
} from '../src/modules/documents/documents.types.js';
import { FormularyDataset } from '../src/modules/documents/validation/types.js';
import { DocumentsService } from '../src/modules/documents/documents.service.js';
import { authorizeRoles } from '../src/middleware/auth.middleware.js';
import { globalErrorHandler } from '../src/middleware/error.middleware.js';
import { AppRequest } from '../src/types/api.types.js';

// Mock National Formulary reference dataset
const mockFormularyDataset: FormularyDataset = {
  versionId: 'ver-nfi-2026',
  versionCode: 'NFI-EML-2026.1',
  drugs: [
    {
      id: 'd-amox-500',
      genericName: 'Amoxicillin',
      canonicalName: 'Amoxicillin 500mg',
      brandNames: ['Amoxil', 'Mox', 'Novamox'],
      dosageForms: ['Capsule', 'Tablet'],
      commonMisreadings: ['Amoxi 500', 'Amox 500', 'Amoxi-500'],
      scheduleType: 'SCHEDULE_H',
    },
    {
      id: 'd-dolo-650',
      genericName: 'Paracetamol',
      canonicalName: 'Paracetamol 650mg',
      brandNames: ['Dolo 650', 'Crocin', 'Calpol'],
      dosageForms: ['Tablet'],
      commonMisreadings: ['Dolo 650', 'PCM 650'],
      scheduleType: 'OTC',
    },
    {
      id: 'd-metformin-500',
      genericName: 'Metformin',
      canonicalName: 'Metformin Hydrochloride 500mg',
      brandNames: ['Glycomet', 'Glucophage'],
      dosageForms: ['Tablet'],
      commonMisreadings: ['Glycomet 500', 'Metformin 500'],
      scheduleType: 'SCHEDULE_H',
    },
  ],
};

describe('Module 4 — OCR & Deterministic Validation Gate', () => {
  describe('Formulary Fuzzy Matching', () => {
    it('Should match exact canonical drug name with 100% score', () => {
      const match = FormularyMatcher.matchDrug('Amoxicillin 500mg', mockFormularyDataset.drugs);
      expect(match.state).toBe(EvaluationStates.MATCH);
      expect(match.matchedValue).toBe('Amoxicillin 500mg');
      expect(match.score).toBeGreaterThanOrEqual(0.95);
    });

    it('Should fuzzy match common OCR misreading (Amoxi 500) above threshold (80%)', () => {
      const match = FormularyMatcher.matchDrug('Amoxi 500', mockFormularyDataset.drugs);
      expect(match.state).toBe(EvaluationStates.MATCH);
      expect(match.matchedValue).toBe('Amoxicillin 500mg');
      expect(match.score).toBeGreaterThanOrEqual(0.80);
    });

    it('Should reject unknown/hallucinated drug name (Xyzolex 900) as MISMATCH', () => {
      const match = FormularyMatcher.matchDrug('Xyzolex 900', mockFormularyDataset.drugs);
      expect(match.state).toBe(EvaluationStates.MISMATCH);
      expect(match.score).toBeLessThan(0.80);
    });

    it('Should return UNKNOWN for empty or garbled drug input', () => {
      const match = FormularyMatcher.matchDrug('', mockFormularyDataset.drugs);
      expect(match.state).toBe(EvaluationStates.UNKNOWN);
    });
  });

  describe('Pattern & Format Matchers', () => {
    it('Should validate standard numeric dosage frequencies (1-0-1, 1-1-1)', () => {
      const check1 = PatternMatcher.matchDosagePattern('1 - 0 - 1');
      expect(check1.state).toBe(EvaluationStates.MATCH);
      expect(check1.matchedValue).toBe('1-0-1');

      const check2 = PatternMatcher.matchDosagePattern('TID');
      expect(check2.state).toBe(EvaluationStates.MATCH);
      expect(check2.matchedValue).toContain('Thrice Daily');
    });

    it('Should flag garbled dosage notation as MISMATCH', () => {
      const check = PatternMatcher.matchDosagePattern('asdfghjk');
      expect(check.state).toBe(EvaluationStates.MISMATCH);
    });

    it('Should parse valid dates and reject invalid calendar days', () => {
      const validCheck = PatternMatcher.matchDateFormat('14/05/2026');
      expect(validCheck.state).toBe(EvaluationStates.MATCH);
      expect(validCheck.matchedValue).toBe('14/05/2026');

      // Impossible date (32nd day or 13th month)
      const invalidCheck = PatternMatcher.matchDateFormat('32/13/2026');
      expect(invalidCheck.state).toBe(EvaluationStates.MISMATCH);
    });

    it('Should recognize explicit "No known allergies" text and NEVER infer from absence', () => {
      const explicitCheck = PatternMatcher.matchExplicitNone('No known drug allergies (NKDA)');
      expect(explicitCheck.state).toBe(EvaluationStates.MATCH);
      expect(explicitCheck.matchedValue).toContain('NKDA');

      // Empty allergy section must stay UNKNOWN
      const emptyCheck = PatternMatcher.matchExplicitNone('');
      expect(emptyCheck.state).toBe(EvaluationStates.UNKNOWN);
    });

    it('Should validate plausible lab values and catch implausible OCR misreads', () => {
      const validLab = PatternMatcher.matchNumericLabValue('140 mg/dL', 'Fasting Blood Glucose');
      expect(validLab.state).toBe(EvaluationStates.MATCH);

      const misreadLab = PatternMatcher.matchNumericLabValue('9841.2', 'Fasting Blood Glucose');
      expect(misreadLab.state).toBe(EvaluationStates.MISMATCH);
    });
  });

  describe('Three-State Logic Truth Table', () => {
    it('Should strictly adhere to three-state logic rules', () => {
      // TRUE AND TRUE = TRUE
      expect(
        FieldCheckEvaluator.combineThreeStateLogic([EvaluationStates.MATCH, EvaluationStates.MATCH])
      ).toBe(EvaluationStates.MATCH);

      // TRUE AND FALSE = FALSE
      expect(
        FieldCheckEvaluator.combineThreeStateLogic([EvaluationStates.MATCH, EvaluationStates.MISMATCH])
      ).toBe(EvaluationStates.MISMATCH);

      // TRUE AND UNKNOWN = UNKNOWN
      expect(
        FieldCheckEvaluator.combineThreeStateLogic([EvaluationStates.MATCH, EvaluationStates.UNKNOWN])
      ).toBe(EvaluationStates.UNKNOWN);

      // FALSE AND UNKNOWN = FALSE
      expect(
        FieldCheckEvaluator.combineThreeStateLogic([EvaluationStates.MISMATCH, EvaluationStates.UNKNOWN])
      ).toBe(EvaluationStates.MISMATCH);
    });
  });

  describe('Mandatory Verification Scenarios & Matrix (Section 77)', () => {
    it('Scenario A: Drug "Amoxi 500" with high confidence (0.85) -> VERIFIED', () => {
      const result = FieldCheckEvaluator.evaluateField(
        {
          fieldType: FieldTypes.DRUG_NAME,
          rawText: 'Amoxi 500',
          ocrConfidence: 0.85,
        },
        mockFormularyDataset
      );

      expect(result.result).toBe(FieldVerificationResults.VERIFIED);
      expect(result.matchedReferenceValue).toBe('Amoxicillin 500mg');
      expect(result.isCritical).toBe(true);
    });

    it('Scenario B: Drug "Xyzolex 900" (0.80) -> MISMATCH_FLAGGED and document NEEDS_PHYSICIAN_REVIEW', () => {
      const docSummary = FieldCheckEvaluator.evaluateDocument(
        'doc-1',
        'PRESCRIPTION',
        [
          { fieldType: FieldTypes.DRUG_NAME, rawText: 'Xyzolex 900', ocrConfidence: 0.8 },
          { fieldType: FieldTypes.DOSAGE, rawText: '1-0-1', ocrConfidence: 0.85 },
        ],
        mockFormularyDataset
      );

      expect(docSummary.fields[0].result).toBe(FieldVerificationResults.MISMATCH_FLAGGED);
      expect(docSummary.overallStatus).toBe(DocumentOverallStatuses.NEEDS_PHYSICIAN_REVIEW);
      expect(docSummary.criticalFlaggedCount).toBe(1);
    });

    it('Scenario C: Allergy "[blank]" (0.10) -> UNREADABLE and document NEEDS_PHYSICIAN_REVIEW', () => {
      const docSummary = FieldCheckEvaluator.evaluateDocument(
        'doc-2',
        'PRESCRIPTION',
        [
          { fieldType: FieldTypes.DRUG_NAME, rawText: 'Amoxi 500', ocrConfidence: 0.88 },
          { fieldType: FieldTypes.ALLERGY, rawText: '', ocrConfidence: 0.1 },
        ],
        mockFormularyDataset
      );

      const allergyField = docSummary.fields.find((f) => f.fieldType === 'allergy');
      expect(allergyField?.result).toBe(FieldVerificationResults.UNREADABLE);
      expect(docSummary.overallStatus).toBe(DocumentOverallStatuses.NEEDS_PHYSICIAN_REVIEW);
    });

    it('Scenario D: Institution name "Gnrl Hosp" (non-critical, conf 0.60) -> UNVERIFIED, document PARTIALLY_VERIFIED (not escalated to needs review)', () => {
      const docSummary = FieldCheckEvaluator.evaluateDocument(
        'doc-3',
        'PRESCRIPTION',
        [
          { fieldType: FieldTypes.DRUG_NAME, rawText: 'Amoxi 500', ocrConfidence: 0.88 },
          { fieldType: FieldTypes.DOSAGE, rawText: '1-0-1', ocrConfidence: 0.85 },
          { fieldType: FieldTypes.INSTITUTION_NAME, rawText: 'Gnrl Hosp', ocrConfidence: 0.6 },
        ],
        mockFormularyDataset
      );

      const instField = docSummary.fields.find((f) => f.fieldType === 'institution_name');
      expect(instField?.result).toBe(FieldVerificationResults.UNVERIFIED);
      expect(instField?.isCritical).toBe(false);
      // Non-critical uncertainty does NOT escalate to NEEDS_PHYSICIAN_REVIEW
      expect(docSummary.overallStatus).toBe(DocumentOverallStatuses.PARTIALLY_VERIFIED);
    });
  });

  describe('Adversarial Hallucination-Resistance Tests', () => {
    it('MUST NEVER mark low confidence critical field as VERIFIED even if text matches formulary', () => {
      // High match text ("Amoxicillin 500mg"), but low OCR confidence (0.35)
      const result = FieldCheckEvaluator.evaluateField(
        {
          fieldType: FieldTypes.DRUG_NAME,
          rawText: 'Amoxicillin 500mg',
          ocrConfidence: 0.35,
        },
        mockFormularyDataset
      );

      expect(result.result).not.toBe(FieldVerificationResults.VERIFIED);
      expect(result.result).toBe(FieldVerificationResults.UNREADABLE);
    });

    it('MUST NEVER mark high confidence unrecognized drug as VERIFIED', () => {
      // 99% OCR confidence on completely fake medication name
      const result = FieldCheckEvaluator.evaluateField(
        {
          fieldType: FieldTypes.DRUG_NAME,
          rawText: 'NonExistentMedicationX77',
          ocrConfidence: 0.99,
        },
        mockFormularyDataset
      );

      expect(result.result).not.toBe(FieldVerificationResults.VERIFIED);
      expect(result.result).toBe(FieldVerificationResults.MISMATCH_FLAGGED);
    });
  });

  describe('Downstream Module 5 Integration Contract', () => {
    it('Should expose clean getValidatedDocumentFieldsForVisit interface', () => {
      expect(typeof DocumentsService.getValidatedDocumentFieldsForVisit).toBe('function');
    });
  });

  describe('Admin Reference Data Management RBAC Isolation', () => {
    const app = express();
    app.use(express.json());

    app.post(
      '/api/v1/test/admin-formulary-mgmt',
      (req: AppRequest, _res, next) => {
        req.user = req.body.user;
        next();
      },
      authorizeRoles('ADMIN', 'SUPER_ADMIN'),
      (_req, res) => {
        res.json({ success: true, message: 'Formulary modification authorized' });
      }
    );

    app.use(globalErrorHandler);

    it('Should reject unauthenticated requests to formulary management route', async () => {
      const res = await request(app).post('/api/v1/test/admin-formulary-mgmt').send({});
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('Should forbid DOCTOR and STAFF_ATTENDANT roles from managing formulary dataset', async () => {
      const res = await request(app)
        .post('/api/v1/test/admin-formulary-mgmt')
        .send({
          user: {
            id: 'doc-1',
            email: 'doctor@hospital.org',
            role: 'DOCTOR',
            fullName: 'Dr. Suresh',
            status: 'ACTIVE',
          },
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('Should allow ADMIN and SUPER_ADMIN roles to manage formulary datasets', async () => {
      const res = await request(app)
        .post('/api/v1/test/admin-formulary-mgmt')
        .send({
          user: {
            id: 'admin-1',
            email: 'admin@hospital.org',
            role: 'ADMIN',
            fullName: 'System Admin',
            status: 'ACTIVE',
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
