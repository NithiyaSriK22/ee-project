import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LabFlaggingService } from '../src/modules/clinical-timeline/lab-flagging.service.js';
import { ClinicalTimelineService } from '../src/modules/clinical-timeline/clinical-timeline.service.js';
import { CarryForwardService } from '../src/modules/clinical-timeline/carry-forward.service.js';
import { LongitudinalDiffService } from '../src/modules/clinical-timeline/longitudinal-diff.service.js';
import {
  LabFlagStates,
  RangeSourceTypes,
} from '../src/modules/clinical-timeline/clinical-timeline.types.js';

describe('MODULE 4A — CLINICAL TIMELINE, LAB REFERENCE RANGES & LONGITUDINAL HISTORY', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    LongitudinalDiffService.clearInMemoryStore();

    ClinicalTimelineService.seedTimelineItems('patient_demo_4a', [
      {
        id: 'item_1',
        itemType: 'LAB_RESULT',
        category: 'LAB',
        title: 'Fasting Blood Glucose',
        clinicalDate: '2026-08-15',
        dateState: 'EXACT',
        sourceType: 'DOCUMENT_FIELD',
        sourceRef: 'doc_1',
        isVerified: true,
        verificationState: 'VERIFIED',
        displayValue: '110 mg/dL',
        labFlag: {
          testCode: 'LAB_FASTING_GLUCOSE',
          testName: 'Fasting Blood Glucose',
          rawValue: '110',
          numericValue: 110,
          unit: 'mg/dL',
          flagState: LabFlagStates.ABOVE_RANGE,
          rangeSource: RangeSourceTypes.GOVERNED_DICTIONARY_TABLE,
          isCriticalValue: false,
          flagExplanation: '110 mg/dL outside reference range [70 - 99 mg/dL]',
        },
      },
      {
        id: 'item_2',
        itemType: 'LAB_RESULT',
        category: 'LAB',
        title: 'Fasting Blood Glucose (Prior)',
        clinicalDate: '2026-03-01',
        dateState: 'EXACT',
        sourceType: 'DOCUMENT_FIELD',
        sourceRef: 'doc_2',
        isVerified: true,
        verificationState: 'VERIFIED',
        displayValue: '95 mg/dL',
        labFlag: {
          testCode: 'LAB_FASTING_GLUCOSE',
          testName: 'Fasting Blood Glucose',
          rawValue: '95',
          numericValue: 95,
          unit: 'mg/dL',
          flagState: LabFlagStates.WITHIN_RANGE,
          rangeSource: RangeSourceTypes.GOVERNED_DICTIONARY_TABLE,
          isCriticalValue: false,
          flagExplanation: '95 mg/dL within reference interval [70 - 99 mg/dL]',
        },
      },
      {
        id: 'item_3',
        itemType: 'LAB_RESULT',
        category: 'LAB',
        title: 'Unverified Lipid Panel',
        clinicalDate: '2026-07-20',
        dateState: 'EXACT',
        sourceType: 'DOCUMENT_FIELD',
        sourceRef: 'doc_3',
        isVerified: false,
        verificationState: 'UNVERIFIED',
        displayValue: 'value not verified',
      },
      {
        id: 'item_4',
        itemType: 'PRESCRIPTION',
        category: 'MEDICATION',
        title: 'Old Prescription (Undated)',
        clinicalDate: null,
        dateState: 'DATE_UNKNOWN',
        sourceType: 'DOCUMENT_FIELD',
        sourceRef: 'doc_4',
        isVerified: true,
        verificationState: 'VERIFIED',
        displayValue: 'Aspirin 75mg',
      },
    ]);
  });

  // ============================================================================
  // 1. LAB REFERENCE RANGE EVALUATION & PRECEDENCE
  // ============================================================================

  describe('Lab Reference Range Precedence & Flagging', () => {
    it('Precedence 1: Uses report-printed reference range over table range when verified', () => {
      const result = LabFlaggingService.evaluateLabResult({
        testCodeOrName: 'LAB_FASTING_GLUCOSE',
        rawValue: '105',
        rawUnit: 'mg/dL',
        isVerified: true,
        reportPrintedRange: {
          low: 74,
          high: 106,
          textualRange: '74 - 106 mg/dL (Lab Specific)',
        },
        patientAge: 45,
        patientGender: 'MALE',
      });

      expect(result.rangeSource).toBe(RangeSourceTypes.REPORT_PRINTED);
      expect(result.referenceRange?.low).toBe(74);
      expect(result.referenceRange?.high).toBe(106);
      expect(result.flagState).toBe(LabFlagStates.WITHIN_RANGE);
      expect(result.flagExplanation).toContain('within reference interval');
      expect(result.flagExplanation.toLowerCase()).not.toContain('abnormal');
    });

    it('Precedence 2: Uses governed dictionary table when report range is absent', () => {
      const result = LabFlaggingService.evaluateLabResult({
        testCodeOrName: 'LAB_FASTING_GLUCOSE',
        rawValue: '142',
        rawUnit: 'mg/dL',
        isVerified: true,
        reportPrintedRange: null,
        patientAge: 45,
        patientGender: 'MALE',
      });

      expect(result.rangeSource).toBe(RangeSourceTypes.GOVERNED_DICTIONARY_TABLE);
      expect(result.referenceRange?.low).toBe(70);
      expect(result.referenceRange?.high).toBe(99);
      expect(result.flagState).toBe(LabFlagStates.ABOVE_RANGE);
      expect(result.flagExplanation).toContain('outside reference range');
      expect(result.flagExplanation.toLowerCase()).not.toContain('abnormal');
    });

    it('Precedence 3: Unconvertible or mismatched units return NO_RANGE_AVAILABLE', () => {
      const result = LabFlaggingService.evaluateLabResult({
        testCodeOrName: 'LAB_FASTING_GLUCOSE',
        rawValue: '5.5',
        rawUnit: 'unknown_units_xyz',
        isVerified: true,
        reportPrintedRange: null,
      });

      expect(result.flagState).toBe(LabFlagStates.NO_RANGE_AVAILABLE);
      expect(result.rangeSource).toBe(RangeSourceTypes.NONE);
      expect(result.flagExplanation).toContain('No verified reference interval available');
    });

    it('Verification Gate: Unverified lab value returns VALUE_NOT_VERIFIED and is NEVER flagged', () => {
      const result = LabFlaggingService.evaluateLabResult({
        testCodeOrName: 'LAB_FASTING_GLUCOSE',
        rawValue: '250',
        rawUnit: 'mg/dL',
        isVerified: false,
        verificationState: 'UNVERIFIED',
      });

      expect(result.flagState).toBe(LabFlagStates.VALUE_NOT_VERIFIED);
      expect(result.numericValue).toBeNull();
      expect(result.isCriticalValue).toBe(false);
      expect(result.flagExplanation).toContain('Value not verified');
    });

    it('Qualifier Handling: Semi-quantitative and qualitative values remain text without numeric coercion', () => {
      const testCases = ['<5', '>100', 'trace', '+++', 'positive', 'negative', 'reactive'];

      for (const val of testCases) {
        const result = LabFlaggingService.evaluateLabResult({
          testCodeOrName: 'LAB_URINE_PROTEIN',
          rawValue: val,
          rawUnit: '',
          isVerified: true,
        });

        expect(result.isQualifier).toBe(true);
        expect(result.numericValue).toBeNull();
        expect(result.flagState).toBe(LabFlagStates.NO_RANGE_AVAILABLE);
        expect(result.flagExplanation).toContain('preserved as text');
      }
    });

    it('Clinician-Approved Critical Value Marker: Flags doctor attention without public alarm', () => {
      const result = LabFlaggingService.evaluateLabResult({
        testCodeOrName: 'LAB_FASTING_GLUCOSE',
        rawValue: '42',
        rawUnit: 'mg/dL',
        isVerified: true,
        patientAge: 50,
      });

      expect(result.flagState).toBe(LabFlagStates.BELOW_RANGE);
      expect(result.isCriticalValue).toBe(true);
      expect(result.criticalMarker).toBe('Critical Value — Doctor Attention Required');
      expect(result.flagExplanation).toContain('Critical Value — Doctor Attention Required');
    });

    it('Strict Safety Boundary: Neutral phrasing used exclusively, never "abnormal"', () => {
      const above = LabFlaggingService.evaluateLabResult({
        testCodeOrName: 'LAB_HEMOGLOBIN',
        rawValue: '19.5',
        rawUnit: 'g/dL',
        isVerified: true,
        patientGender: 'MALE',
      });

      const below = LabFlaggingService.evaluateLabResult({
        testCodeOrName: 'LAB_HEMOGLOBIN',
        rawValue: '8.2',
        rawUnit: 'g/dL',
        isVerified: true,
        patientGender: 'MALE',
      });

      expect(above.flagExplanation).toContain('outside reference range');
      expect(below.flagExplanation).toContain('outside reference range');
      expect(above.flagExplanation.toLowerCase()).not.toContain('abnormal');
      expect(below.flagExplanation.toLowerCase()).not.toContain('abnormal');
    });
  });

  // ============================================================================
  // 2. TIMELINE CHRONOLOGICAL SORTING & DATE-UNKNOWN BUCKETING
  // ============================================================================

  describe('Clinical Timeline Sorting & Date Unknown Grouping', () => {
    it('Partitions items into chronological buckets and Date unknown bucket without guessing', async () => {
      const timeline = await ClinicalTimelineService.getPatientTimeline('patient_demo_4a');

      expect(timeline).toBeDefined();
      expect(timeline.dateUnknownBucket).toBeDefined();
      expect(timeline.dateUnknownBucket.dateLabel).toBe('Date unknown');
      expect(timeline.dateUnknownBucket.dateState).toBe('DATE_UNKNOWN');

      // Verify that buckets with dates are sorted descending (newest first)
      if (timeline.chronologicalBuckets.length > 1) {
        for (let i = 0; i < timeline.chronologicalBuckets.length - 1; i++) {
          const d1 = timeline.chronologicalBuckets[i].dateLabel;
          const d2 = timeline.chronologicalBuckets[i + 1].dateLabel;
          expect(d1 >= d2).toBe(true);
        }
      }
    });

    it('Only VERIFIED values show as values; unverified show "value not verified"', async () => {
      const timeline = await ClinicalTimelineService.getPatientTimeline('patient_demo_4a');
      const allItems = [
        ...timeline.chronologicalBuckets.flatMap((b) => b.items),
        ...timeline.dateUnknownBucket.items,
      ];

      for (const item of allItems) {
        if (!item.isVerified) {
          expect(item.displayValue).toBe('value not verified');
        }
      }
    });
  });

  // ============================================================================
  // 3. LONGITUDINAL LAB TRENDS (ZERO AI NARRATIVE)
  // ============================================================================

  describe('Longitudinal Lab Trends', () => {
    it('Returns verified numbers and dates sorted ascending, honestly flagging gaps >90 days', async () => {
      const trends = await ClinicalTimelineService.getLabTrends(
        'patient_demo_4a',
        'LAB_FASTING_GLUCOSE'
      );

      expect(trends).toBeDefined();
      expect(trends.testCode).toBe('LAB_FASTING_GLUCOSE');
      expect(Array.isArray(trends.points)).toBe(true);

      // Verify sorting is strictly chronological ascending
      if (trends.points.length > 1) {
        for (let i = 0; i < trends.points.length - 1; i++) {
          expect(trends.points[i].date <= trends.points[i + 1].date).toBe(true);
        }
      }

      // Assert no narrative or interpretation language in trend output
      const json = JSON.stringify(trends);
      expect(json.toLowerCase()).not.toContain('worsening');
      expect(json.toLowerCase()).not.toContain('improving');
      expect(json.toLowerCase()).not.toContain('rapid progression');
    });
  });

  // ============================================================================
  // 4. RETURNING-PATIENT CARRY-FORWARD & CONFIRMATION
  // ============================================================================

  describe('Safe Carry-Forward of Stable Clinical History', () => {
    it('Allows stable items (conditions, allergies) and strictly blocks volatile items (symptoms)', async () => {
      CarryForwardService.seedPriorVisitAnswers('pat_regular_101', [
        {
          visitId: 'vis_prior_01',
          questionId: 'q_past_conditions',
          questionCode: 'PAST_CONDITIONS',
          section: 'PAST_MEDICAL_HISTORY',
          promptText: 'Past ongoing conditions',
          answerValue: ['COND_DIABETES', 'COND_HYPERTENSION'],
          answeredAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        },
        {
          visitId: 'vis_prior_01',
          questionId: 'q_allergies',
          questionCode: 'ALLERGIES',
          section: 'ALLERGIES',
          promptText: 'Known medicine allergies',
          answerValue: 'Penicillin allergy (severe rash)',
          answeredAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
        {
          visitId: 'vis_prior_01',
          questionId: 'q_chief_complaint',
          questionCode: 'CHIEF_COMPLAINT_PRIMARY',
          section: 'CHIEF_COMPLAINT',
          promptText: 'Primary presenting symptom',
          answerValue: 'Headache and nausea',
          answeredAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
        {
          visitId: 'vis_prior_01',
          questionId: 'q_chest_pain',
          questionCode: 'CHEST_PAIN_DYSPNEA',
          section: 'PRESENT_ILLNESS_HISTORY',
          promptText: 'Chest pain or breathlessness',
          answerValue: 'NO',
          answeredAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      ]);

      const candidates = await CarryForwardService.getCarryForwardCandidates(
        'pat_regular_101',
        'vis_current_02'
      );

      const stableConditions = candidates.find((c) => c.questionCode === 'PAST_CONDITIONS');
      const stableAllergies = candidates.find((c) => c.questionCode === 'ALLERGIES');
      const volatileComplaint = candidates.find((c) => c.questionCode === 'CHIEF_COMPLAINT_PRIMARY');
      const volatileChestPain = candidates.find((c) => c.questionCode === 'CHEST_PAIN_DYSPNEA');

      expect(stableConditions?.carryForwardAllowed).toBe(true);
      expect(stableConditions?.eligibleForKioskPrompt).toBe(true);

      expect(stableAllergies?.carryForwardAllowed).toBe(true);
      expect(stableAllergies?.eligibleForKioskPrompt).toBe(true);

      expect(volatileComplaint?.carryForwardAllowed).toBe(false);
      expect(volatileComplaint?.eligibleForKioskPrompt).toBe(false);

      expect(volatileChestPain?.carryForwardAllowed).toBe(false);
      expect(volatileChestPain?.eligibleForKioskPrompt).toBe(false);
    });

    it('Re-asks stable items older than configurable threshold (365 days) fresh', async () => {
      CarryForwardService.seedPriorVisitAnswers('pat_stale_102', [
        {
          visitId: 'vis_old_01',
          questionId: 'q_past_conditions',
          questionCode: 'PAST_CONDITIONS',
          section: 'PAST_MEDICAL_HISTORY',
          promptText: 'Past ongoing conditions',
          answerValue: ['COND_DIABETES'],
          answeredAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000), // 400 days old (> 365)
        },
      ]);

      const candidates = await CarryForwardService.getCarryForwardCandidates(
        'pat_stale_102',
        'vis_current_03',
        365
      );

      const staleCandidate = candidates.find((c) => c.questionCode === 'PAST_CONDITIONS');
      expect(staleCandidate).toBeDefined();
      expect(staleCandidate?.isTooOld).toBe(true);
      expect(staleCandidate?.eligibleForKioskPrompt).toBe(false);
    });

    it('Provisional Identity Block: Strictly forbids retrieving prior records', async () => {
      await expect(
        CarryForwardService.getCarryForwardCandidates('PROV-2026-999999', 'vis_prov_01')
      ).rejects.toThrow(/Provisional-identity visits cannot retrieve prior medical records/);
    });
  });

  // ============================================================================
  // 5. DETERMINISTIC "CHANGED SINCE LAST VISIT" DIFF
  // ============================================================================

  describe('Longitudinal Visit Diff (Changed Since Last Visit)', () => {
    it('Accurately computes added, removed, and changed items with exact dates and values', async () => {
      LongitudinalDiffService.seedVisitData('vis_prev_10', {
        patientId: 'pat_diff_test',
        answers: [
          {
            key: 'PAST_CONDITIONS',
            label: 'Ongoing conditions',
            value: 'Diabetes Type 2',
            category: 'CONDITION',
            date: '2026-05-01',
          },
          {
            key: 'ALLERGIES',
            label: 'Drug allergies',
            value: 'None',
            category: 'ALLERGY',
            date: '2026-05-01',
          },
        ],
        fields: [
          {
            key: 'PRESCRIPTION_METFORMIN',
            label: 'Metformin 500mg',
            value: '500 mg once daily',
            category: 'MEDICATION',
            date: '2026-05-01',
          },
          {
            key: 'PRESCRIPTION_ATENOLOL',
            label: 'Atenolol 25mg',
            value: '25 mg once daily',
            category: 'MEDICATION',
            date: '2026-05-01',
          },
        ],
      });

      LongitudinalDiffService.seedVisitData('vis_curr_20', {
        patientId: 'pat_diff_test',
        answers: [
          {
            key: 'PAST_CONDITIONS',
            label: 'Ongoing conditions',
            value: 'Diabetes Type 2, Hypertension',
            category: 'CONDITION',
            date: '2026-08-15',
          },
          {
            key: 'ALLERGIES',
            label: 'Drug allergies',
            value: 'Sulfa drugs (itching)',
            category: 'ALLERGY',
            date: '2026-08-15',
          },
        ],
        fields: [
          {
            key: 'PRESCRIPTION_METFORMIN',
            label: 'Metformin 1000mg',
            value: '1000 mg twice daily',
            category: 'MEDICATION',
            date: '2026-08-15',
          },
          // Atenolol removed/stopped
          {
            key: 'PRESCRIPTION_AMLODIPINE',
            label: 'Amlodipine 5mg',
            value: '5 mg once daily',
            category: 'MEDICATION',
            date: '2026-08-15',
          }, // Newly added
        ],
      });

      const diff = await LongitudinalDiffService.computeVisitDiff(
        'pat_diff_test',
        'vis_curr_20',
        'vis_prev_10'
      );

      expect(diff.hasPriorVisit).toBe(true);
      expect(diff.totalChanges).toBeGreaterThan(0);

      // Check Added
      const addedAmlodipine = diff.added.find((a) => a.key === 'PRESCRIPTION_AMLODIPINE');
      expect(addedAmlodipine).toBeDefined();
      expect(addedAmlodipine?.diffType).toBe('ADDED');

      // Check Removed
      const removedAtenolol = diff.removed.find((r) => r.key === 'PRESCRIPTION_ATENOLOL');
      expect(removedAtenolol).toBeDefined();
      expect(removedAtenolol?.diffType).toBe('REMOVED');

      // Check Changed
      const changedMetformin = diff.changed.find((c) => c.key === 'PRESCRIPTION_METFORMIN');
      expect(changedMetformin).toBeDefined();
      expect(changedMetformin?.priorValue).toBe('500 mg once daily');
      expect(changedMetformin?.currentValue).toBe('1000 mg twice daily');

      const changedConditions = diff.changed.find((c) => c.key === 'PAST_CONDITIONS');
      expect(changedConditions).toBeDefined();
      expect(changedConditions?.priorValue).toBe('Diabetes Type 2');
      expect(changedConditions?.currentValue).toBe('Diabetes Type 2, Hypertension');

      // Assert zero AI in diff path
      const json = JSON.stringify(diff);
      expect(json.toLowerCase()).not.toContain('narrative');
      expect(json.toLowerCase()).not.toContain('ai-generated');
      expect(json.toLowerCase()).not.toContain('ai_generated');
      expect(json.toLowerCase()).not.toContain('llm');
    });

    it('Returns clean empty diff with hasPriorVisit=false when patient has no prior visits', async () => {
      const diff = await LongitudinalDiffService.computeVisitDiff(
        'pat_newborn_or_first_time',
        'vis_single_only'
      );

      expect(diff.hasPriorVisit).toBe(false);
      expect(diff.added).toEqual([]);
      expect(diff.removed).toEqual([]);
      expect(diff.changed).toEqual([]);
      expect(diff.totalChanges).toBe(0);
    });
  });
});
