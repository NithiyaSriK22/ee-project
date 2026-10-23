import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SpecialPopulationsService } from '../src/modules/special-populations/special-populations.service.js';
import { InterviewService } from '../src/modules/interview/interview.service.js';
import { RedFlagsService } from '../src/modules/redflags/redflags.service.js';
import { InputAssembler } from '../src/modules/summary/assembly/input-assembler.js';
import {
  SensitivityLevels,
  VisibilityScopes,
  SurrogateReasons,
  AnsweredVia,
  AnswerStatus,
} from '../src/types/interview.types.js';
import { SeverityTiers } from '../src/modules/redflags/redflags.types.js';

describe('MODULE 3B — SPECIAL POPULATIONS, SENSITIVE TOPICS & INTERVIEW PRIVACY', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // 1. NON-INFERENTIAL GATING WITHOUT ASSUMPTIONS (Section 6)
  // ============================================================================

  describe('Non-Inferential Question Gating', () => {
    const pregnancyQuestion = {
      questionCode: 'PREGNANCY_CURRENT_TRIMESTER',
      pregnancyGated: true,
      sexApplicability: 'FEMALE' as const,
      ageMin: 12,
      ageMax: 55,
      sensitivityLevel: SensitivityLevels.SENSITIVE,
    };

    const prostateQuestion = {
      questionCode: 'PROSTATE_SYMPTOMS',
      pregnancyGated: false,
      sexApplicability: 'MALE' as const,
      ageMin: 40,
    };

    it('Applies pregnancy question to stated female of childbearing age', () => {
      const evaluation = SpecialPopulationsService.isQuestionApplicable(pregnancyQuestion, {
        age: 28,
        gender: 'FEMALE',
      });
      expect(evaluation.applicable).toBe(true);
    });

    it('Strictly gates out pregnancy question for stated male patients', () => {
      const evaluation = SpecialPopulationsService.isQuestionApplicable(pregnancyQuestion, {
        age: 28,
        gender: 'MALE',
      });
      expect(evaluation.applicable).toBe(false);
      expect(evaluation.reason).toContain('requires stated FEMALE sex');
    });

    it('Never infers sex from name or context: unstated sex refuses affirmative match', () => {
      const evaluation = SpecialPopulationsService.isQuestionApplicable(pregnancyQuestion, {
        age: 28,
        gender: 'UNSTATED',
      });
      expect(evaluation.applicable).toBe(false);
      expect(evaluation.reason).toContain('patient stated sex is unrecorded');
    });

    it('Gates out pregnancy questions for females outside reproductive age without explicit pregnancy', () => {
      const seniorFemale = SpecialPopulationsService.isQuestionApplicable(pregnancyQuestion, {
        age: 68,
        gender: 'FEMALE',
      });
      expect(seniorFemale.applicable).toBe(false);
      expect(seniorFemale.reason).toBeDefined();

      // However, if pregnancy status is explicitly reported true, it allows
      const explicitPregnant = SpecialPopulationsService.isQuestionApplicable(pregnancyQuestion, {
        age: 68,
        gender: 'FEMALE',
        explicitPregnancyStatus: true,
      });
      expect(explicitPregnant.applicable).toBe(true);
    });

    it('Strictly gates male-specific questions for female patients and below age threshold', () => {
      const femaleEval = SpecialPopulationsService.isQuestionApplicable(prostateQuestion, {
        age: 55,
        gender: 'FEMALE',
      });
      expect(femaleEval.applicable).toBe(false);

      const youngMaleEval = SpecialPopulationsService.isQuestionApplicable(prostateQuestion, {
        age: 25,
        gender: 'MALE',
      });
      expect(youngMaleEval.applicable).toBe(false);
      expect(youngMaleEval.reason).toContain('below question minimum age');
    });
  });

  // ============================================================================
  // 2. MINORS & GUARDIANS (Section 4)
  // ============================================================================

  describe('Minors & Guardian Mode', () => {
    it('Accurately evaluates chronological age from DOB and flags minors (<18)', () => {
      // 10 years old
      const dob10 = new Date(Date.now() - 10 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const minorEval = SpecialPopulationsService.evaluatePatientAge(dob10, null, 18);
      expect(minorEval.isMinor).toBe(true);
      expect(minorEval.age).toBe(10);

      // 25 years old
      const dob25 = new Date(Date.now() - 25 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const adultEval = SpecialPopulationsService.evaluatePatientAge(dob25, null, 18);
      expect(adultEval.isMinor).toBe(false);
      expect(adultEval.age).toBe(25);
    });

    it('Requires verified guardian consent for minor intake before proceeding', () => {
      const visitId = 'vis_minor_001';
      const patient = { age: 12 };

      // Initial check without recorded guardian
      const reqCheck = SpecialPopulationsService.validateGuardianRequirement(patient, visitId);
      expect(reqCheck.required).toBe(true);
      expect(reqCheck.verified).toBe(false);
    });

    it('Records guardian provenance and tags answered_via=GUARDIAN with legal adviser notice', async () => {
      const visitId = 'vis_minor_002';
      const guardian = await SpecialPopulationsService.recordGuardianDetails(visitId, {
        guardianName: 'Jane Smith',
        guardianRelationship: 'PARENT',
        guardianPhone: '+91 9876543210',
        guardianConsentVerified: true,
        minorAssentObtained: true,
      });

      expect(guardian.guardianName).toBe('Jane Smith');
      expect(guardian.guardianConsentVerified).toBe(true);

      const patient = { age: 8 };
      const reqCheck = SpecialPopulationsService.validateGuardianRequirement(patient, visitId);
      expect(reqCheck.required).toBe(true);
      expect(reqCheck.verified).toBe(true);

      const provenance = SpecialPopulationsService.formatAnswerProvenance(
        AnsweredVia.GUARDIAN,
        guardian,
        null
      );
      expect(provenance).toBe('Reported by PARENT (Jane Smith)');
    });
  });

  // ============================================================================
  // 3. PATIENTS WHO CANNOT ANSWER — SURROGATE MODE & UNWELL ESCALATION (Section 5)
  // ============================================================================

  describe('Surrogate Mode & Patient Unwell Handling', () => {
    it('Records surrogate details and displays "Reported by Surrogate [relationship]"', async () => {
      const visitId = 'vis_surrogate_001';
      const result = await SpecialPopulationsService.recordSurrogateDetails(visitId, {
        surrogateName: 'Robert Johnson',
        surrogateRelationship: 'ADULT_SON',
        reason: SurrogateReasons.COGNITIVE_IMPAIRMENT,
        acuteDistressNoted: false,
      });

      expect(result.surrogate.surrogateName).toBe('Robert Johnson');
      expect(result.triageAlertRaised).toBe(false);

      const provenance = SpecialPopulationsService.formatAnswerProvenance(
        AnsweredVia.SURROGATE,
        null,
        result.surrogate
      );
      expect(provenance).toContain('Reported by Surrogate ADULT_SON (Robert Johnson)');
      expect(provenance).toContain('COGNITIVE_IMPAIRMENT');
    });

    it('Flags "patient unwell or unable" stops intake and routes straight to staff through Module 6 manual-alert path', async () => {
      const visitId = 'vis_unwell_001';
      const alert = await RedFlagsService.flagPatientUnwellOrUnable(
        visitId,
        'kiosk-dev-01',
        'Patient dizzy, unable to stand at kiosk'
      );

      expect(alert).toBeDefined();
      expect(alert.severityTier).toBe(SeverityTiers.MANUAL);
      expect(alert.triggerType).toBe('MANUAL');
      expect(alert.ruleDescription).toContain('Patient unwell or unable to continue intake');
      expect(alert.recommendedStaffAction).toContain('escort patient to clinical assessment area');
    });
  });

  // ============================================================================
  // 4. PRIVACY AT THE KIOSK: AUDIO ROUTING & READ-BACK MASKING (Section 7)
  // ============================================================================

  describe('Kiosk Audio Privacy & Read-Back Masking', () => {
    const sensitiveQ = {
      sensitivityLevel: SensitivityLevels.SENSITIVE,
      audioAllowedInPublic: false,
    };

    const normalQ = {
      sensitivityLevel: SensitivityLevels.NORMAL,
      audioAllowedInPublic: true,
    };

    it('Sensitive questions are never spoken in public mode without headset (MUTED)', () => {
      const publicRouting = SpecialPopulationsService.resolveAudioPrivacy(sensitiveQ, false);
      expect(publicRouting.audioPlaybackAllowed).toBe(false);
      expect(publicRouting.outputRoute).toBe('MUTED');
      expect(publicRouting.privacyNotice).toContain('Audio muted for privacy');
    });

    it('Sensitive questions route privately to headset when headset is connected', () => {
      const headsetRouting = SpecialPopulationsService.resolveAudioPrivacy(sensitiveQ, true);
      expect(headsetRouting.audioPlaybackAllowed).toBe(true);
      expect(headsetRouting.outputRoute).toBe('HEADSET');
      expect(headsetRouting.privacyNotice).toContain('Private audio active via headset');
    });

    it('Non-sensitive questions play normally through loudspeaker', () => {
      const normalRouting = SpecialPopulationsService.resolveAudioPrivacy(normalQ, false);
      expect(normalRouting.audioPlaybackAllowed).toBe(true);
      expect(normalRouting.outputRoute).toBe('LOUDSPEAKER');
    });

    it('Read-back masks sensitive answers on screen and audio preview', () => {
      const sensitiveAnswer = 'I have been feeling depressed and thinking about self-harm.';
      const masking = SpecialPopulationsService.maskSensitiveReadBack(sensitiveAnswer, {
        sensitivityLevel: SensitivityLevels.HIGHLY_SENSITIVE,
        visibilityScope: VisibilityScopes.DOCTOR_ONLY,
      });

      expect(masking.isMasked).toBe(true);
      expect(masking.displayText).toContain('●●●●●');
      expect(masking.displayText).toContain('Recorded confidentially for doctor review');
      expect(masking.audioConfirmation).toBe('Answer saved privately.');

      // Non-sensitive echoes normally
      const nonSensitiveMasking = SpecialPopulationsService.maskSensitiveReadBack('Mild fever for 2 days', {
        sensitivityLevel: SensitivityLevels.NORMAL,
        visibilityScope: VisibilityScopes.STAFF_VISIBLE,
      });
      expect(nonSensitiveMasking.isMasked).toBe(false);
      expect(nonSensitiveMasking.displayText).toBe('Mild fever for 2 days');
      expect(nonSensitiveMasking.audioConfirmation).toContain('Mild fever for 2 days');
    });
  });

  // ============================================================================
  // 5. DEFERRED VS DECLINED & COMPANION PRIVACY (Section 7)
  // ============================================================================

  describe('Deferred to Doctor vs Declined States & Companion Privacy', () => {
    it('Stores DEFERRED_TO_DOCTOR as a distinct clinical state', () => {
      const visitId = 'vis_defer_001';
      SpecialPopulationsService.deferQuestionToDoctor(visitId, 'q_mental_health_01');

      const state = SpecialPopulationsService.getVisitState(visitId);
      expect(state.deferredQuestionIds.has('q_mental_health_01')).toBe(true);

      expect(AnswerStatus.DEFERRED_TO_DOCTOR).toBe('DEFERRED_TO_DOCTOR');
      expect(AnswerStatus.SKIPPED).toBe('SKIPPED');
      expect(AnswerStatus.DEFERRED_TO_DOCTOR).not.toEqual(AnswerStatus.SKIPPED);
    });
  });

  // ============================================================================
  // 6. SENSITIVE DISCLOSURES (Section 8)
  // ============================================================================

  describe('Sensitive Disclosure Routing with Neutral Floor Alert', () => {
    it('Generates dedicated SENSITIVE_DISCLOSURE alert with strictly neutral text and no sensitive detail', async () => {
      const visitId = 'vis_disclosure_001';
      const result = await RedFlagsService.raiseSensitiveDisclosureAlert(
        visitId,
        'kiosk-dev-03',
        'Kiosk Station B'
      );

      expect(result.alert).toBeDefined();
      expect(result.alert.severityTier).toBe(SeverityTiers.SENSITIVE_DISCLOSURE);

      // Neutral wording required by Section 8: "Please assist the patient at kiosk X"
      expect(result.alert.ruleDescription).toBe('Please assist the patient at Kiosk Station B.');

      // Zero sensitive clinical details in the alert text
      const alertJson = JSON.stringify(result.alert).toLowerCase();
      expect(alertJson).not.toContain('abuse');
      expect(alertJson).not.toContain('suicide');
      expect(alertJson).not.toContain('depression');
      expect(alertJson).not.toContain('violence');

      // Generic supportive patient reassurance
      expect(result.supportiveMessage).toContain('trained staff member');
      expect(result.supportiveMessage).toContain('safe, confidential environment');
      expect(result.helplineDetails).toBeDefined();
    });
  });

  // ============================================================================
  // 7. VISIBILITY SCOPING & AI EXCLUSION (Section 9)
  // ============================================================================

  describe('Visibility Scoping & AI Summarization Exclusion', () => {
    it('Enforces DOCTOR_ONLY: scrubs sensitive answers for staff attendants', () => {
      const rawAnswers = [
        {
          id: 'ans_1',
          questionCode: 'FEVER_DURATION',
          visibilityScope: VisibilityScopes.STAFF_VISIBLE,
          sensitivityLevel: SensitivityLevels.NORMAL,
          answerValue: '3 days',
        },
        {
          id: 'ans_2',
          questionCode: 'SUBSTANCE_USE',
          visibilityScope: VisibilityScopes.DOCTOR_ONLY,
          sensitivityLevel: SensitivityLevels.SENSITIVE,
          answerValue: 'Heavy alcohol use weekends',
        },
        {
          id: 'ans_3',
          questionCode: 'DOMESTIC_SAFETY',
          visibilityScope: VisibilityScopes.DOCTOR_ONLY,
          sensitivityLevel: SensitivityLevels.HIGHLY_SENSITIVE,
          answerValue: 'Partner threatened physical violence',
        },
      ];

      const scrubbed = SpecialPopulationsService.scrubForStaffAttendants(rawAnswers);

      expect(scrubbed[0].answerValue).toBe('3 days');
      expect(scrubbed[1].answerValue).toBe('[Confidential — Doctor Review Only]');
      expect(scrubbed[2].answerValue).toBe('[Confidential — Doctor Review Only]');
    });

    it('Excludes sensitive and doctor-only items from AI Summarizer prompt input payload', () => {
      const assembled = InputAssembler.assemble({
        visitId: 'vis_ai_test_001',
        patient: { age: 35, gender: 'FEMALE' },
        interviewData: {
          status: 'COMPLETED',
          answers: [
            {
              id: 'ans_normal',
              questionId: 'q_cough',
              section: 'CHIEF_COMPLAINT',
              promptText: 'Do you have cough?',
              questionType: 'YES_NO',
              answerValue: 'YES',
              answeredVia: 'touch',
              languageUsed: 'en',
              isCritical: false,
              isSkipped: false,
              answeredAt: new Date(),
              // Default
            } as any,
            {
              id: 'ans_sensitive',
              questionId: 'q_sensitive_topic',
              section: 'LIFESTYLE',
              promptText: 'Sensitive history question',
              questionType: 'FREE_TEXT',
              answerValue: 'Private disclosure text',
              answeredVia: 'touch',
              languageUsed: 'en',
              isCritical: false,
              isSkipped: false,
              answeredAt: new Date(),
              aiSummarizationAllowed: false,
              visibilityScope: VisibilityScopes.DOCTOR_ONLY,
              sensitivityLevel: SensitivityLevels.HIGHLY_SENSITIVE,
            } as any,
          ],
        },
      });

      // The assembled items for LLM summarization MUST contain only non-sensitive items
      const hasSensitiveInPayload = assembled.items.some(
        (i) => (i.sourceRef && i.sourceRef.includes('sensitive')) || (i.value && i.value.includes('Private disclosure'))
      );
      expect(hasSensitiveInPayload).toBe(false);

      const coughItem = assembled.items.find((i) => i.sourceRef.includes('q_cough'));
      expect(coughItem).toBeDefined();
    });
  });
});
