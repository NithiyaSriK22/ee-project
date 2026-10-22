import { CreateRuleSchema } from '../redflags.schemas.js';
import { z } from 'zod';

export type SeedRule = z.infer<typeof CreateRuleSchema>;

export const ILLUSTRATIVE_SEED_RULES: SeedRule[] = [
  {
    ruleCode: 'RF-ILLUSTRATIVE-001',
    name: '[ILLUSTRATIVE] Acute Chest Pain with Dyspnea',
    description:
      'ILLUSTRATIVE DEMO RULE ONLY — NOT CLINICALLY VALIDATED: Flags acute co-occurrence of chest pain and breathing difficulty for immediate triage assessment.',
    severityTier: 'IMMEDIATE',
    conditionTree: {
      operator: 'AND',
      conditions: [
        { fact: 'chest_pain', operator: 'EQUALS', value: true },
        { fact: 'breathing_difficulty', operator: 'EQUALS', value: true },
      ],
    },
    raiseOnIndeterminate: true,
    recommendedStaffAction:
      'Immediate triage nurse assessment, vital signs capture (SpO2, BP), and urgent medical officer review.',
    isIllustrative: true,
    testCases: [
      {
        name: 'Both symptoms present -> TRIGGERED',
        facts: {
          chest_pain: { state: 'KNOWN', value: true },
          breathing_difficulty: { state: 'KNOWN', value: true },
        },
        expectedOutcome: 'TRIGGERED',
      },
      {
        name: 'Chest pain present but dyspnea absent -> NOT_TRIGGERED',
        facts: {
          chest_pain: { state: 'KNOWN', value: true },
          breathing_difficulty: { state: 'KNOWN', value: false },
        },
        expectedOutcome: 'NOT_TRIGGERED',
      },
      {
        name: 'Chest pain present, dyspnea skipped (UNKNOWN) -> INDETERMINATE',
        facts: {
          chest_pain: { state: 'KNOWN', value: true },
          breathing_difficulty: { state: 'UNKNOWN' },
        },
        expectedOutcome: 'INDETERMINATE',
      },
      {
        name: 'Both symptoms absent -> NOT_TRIGGERED',
        facts: {
          chest_pain: { state: 'KNOWN', value: false },
          breathing_difficulty: { state: 'KNOWN', value: false },
        },
        expectedOutcome: 'NOT_TRIGGERED',
      },
    ],
  },
  {
    ruleCode: 'RF-ILLUSTRATIVE-002',
    name: '[ILLUSTRATIVE] Syncope with Severe Headache',
    description:
      'ILLUSTRATIVE DEMO RULE ONLY — NOT CLINICALLY VALIDATED: Flags loss of consciousness accompanied by thunderclap headache.',
    severityTier: 'IMMEDIATE',
    conditionTree: {
      operator: 'AND',
      conditions: [
        { fact: 'loss_of_consciousness', operator: 'EQUALS', value: true },
        { fact: 'severe_headache', operator: 'EQUALS', value: true },
      ],
    },
    raiseOnIndeterminate: true,
    recommendedStaffAction:
      'Immediate physician triage, check pupil reactivity & GCS, alert duty doctor.',
    isIllustrative: true,
    testCases: [
      {
        name: 'Both syncope and headache present -> TRIGGERED',
        facts: {
          loss_of_consciousness: { state: 'KNOWN', value: true },
          severe_headache: { state: 'KNOWN', value: true },
        },
        expectedOutcome: 'TRIGGERED',
      },
      {
        name: 'Syncope present, headache unanswered -> INDETERMINATE',
        facts: {
          loss_of_consciousness: { state: 'KNOWN', value: true },
          severe_headache: { state: 'UNKNOWN' },
        },
        expectedOutcome: 'INDETERMINATE',
      },
    ],
  },
];
