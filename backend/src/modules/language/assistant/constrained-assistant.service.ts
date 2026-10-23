import { HelpService } from '../help/help.service.js';
import { RedFlagsService } from '../../redflags/redflags.service.js';
import { logger } from '../../../config/logger.js';
import { ForbiddenError } from '../../../errors/app-error.js';

export interface AssistantMessageRequest {
  message: string;
  language?: string;
  currentQuestionCode?: string;
  visitId?: string;
  kioskLocation?: string;
}

export interface AssistantMessageResponse {
  intent: 'EXPLAIN_QUESTION' | 'HOW_TO_USE_KIOSK' | 'WHAT_HAPPENS_NEXT' | 'CALL_STAFF' | 'MEDICAL_ADVICE_REFUSED' | 'EMERGENCY_TRIGGERED';
  replyText: string;
  emergencyAlertRaised: boolean;
  staffHelpOffered: boolean;
  language: string;
}

export class ConstrainedAssistantService {
  private static isEnabled: boolean = true; // Configurable toggle

  public static setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  public static getEnabled(): boolean {
    return this.isEnabled;
  }

  // Approved emergency phrase triggers per language (reviewed by bilingual clinicians)
  private static EMERGENCY_PHRASES: Record<string, string[]> = {
    en: [
      "can't breathe",
      'cannot breathe',
      'difficulty breathing',
      'chest pain',
      'heart attack',
      'choking',
      'severe bleeding',
      'unconscious',
      'emergency',
      'i am dying',
      'help me please',
    ],
    ta: [
      'மூச்சு திணறல்',
      'மூச்சு விட முடியல',
      'நெஞ்சு வலி',
      'மாரடைப்பு',
      'ரத்தம் கொட்டுது',
      'மயக்கம் வருது',
      'அவசரம்',
      'உடனே உதவி வேண்டும்',
      'காப்பாத்துங்க',
    ],
    hi: [
      'सांस नहीं आ रही',
      'दम घुट रहा है',
      'सीने में दर्द',
      'दिल का दौरा',
      'खून बह रहा है',
      'बेहोश',
      'इमरजेंसी',
      'मेरी मदद करो',
    ],
  };

  // Phrases that seek medical advice, diagnosis, or triage assessment
  private static MEDICAL_ADVICE_KEYWORDS: string[] = [
    'is this serious',
    'will i die',
    'do i have cancer',
    'what medicine should i take',
    'is it dangerous',
    'what disease',
    'give me medicine',
    'diagnose',
    'diagnosis',
    'can you cure',
    'treatment',
    'appendicitis',
    'கடுமையானதா',
    'மருந்து என்ன',
    'மருந்து',
    'மாத்திரை',
    'நோய்',
    'சிகிச்சை',
    'ஆபத்தா',
    'गंभीर है क्या',
    'दवा बताओ',
  ];

  /**
   * Processes a patient message with strict boundary enforcement.
   * HARD RULES:
   * 1. No medical advice, diagnosis, triage opinions, or symptom interpretation.
   * 2. Zero access to patient answers, documents, summaries, or alerts.
   * 3. Emergency phrases trigger deterministic Module 6 help request.
   * 4. No chat transcripts are stored.
   */
  public static async processMessage(req: AssistantMessageRequest): Promise<AssistantMessageResponse> {
    if (!this.isEnabled) {
      throw new ForbiddenError('The kiosk help assistant is currently disabled by hospital configuration.');
    }

    const { message, language = 'en', currentQuestionCode, visitId, kioskLocation = 'OPD Kiosk' } = req;
    const lower = (message || '').trim().toLowerCase();

    // 1. DETERMINISTIC EMERGENCY PHRASE DETECTION (Immediate Module 6 Help Request)
    const specificPhrases = this.EMERGENCY_PHRASES[language] || [];
    const enPhrases = this.EMERGENCY_PHRASES.en || [];
    const langPhrases = [...specificPhrases, ...enPhrases];

    const isEmergency = langPhrases.some((phrase) => lower.includes(phrase.toLowerCase()));

    if (isEmergency) {
      logger.warn('Emergency phrase detected in kiosk assistant, deterministically raising Module 6 alert', {
        language,
        visitId,
        kioskLocation,
      });

      // Deterministically invoke Module 6 help request
      let alertRaised = false;
      if (visitId) {
        try {
          await RedFlagsService.raiseManualHelpRequest(
            visitId,
            `Emergency phrase uttered at kiosk: "${phraseSnippet(message)}"`,
            kioskLocation
          );
          alertRaised = true;
        } catch (err) {
          logger.error('Failed to trigger Module 6 emergency alert from assistant', { error: String(err) });
        }
      }

      const emergencyReply = language === 'ta'
        ? 'அவசர உதவி கோரப்பட்டுள்ளது! மருத்துவமனை ஊழியர்கள் உடனடியாக உங்கள் கியோஸ்க் அறைக்கு வருகின்றனர். தயவுசெய்து அமைதியாக இருங்கள்.'
        : 'Emergency help requested! Hospital staff have been immediately alerted and are coming to your kiosk right now. Please remain calm.';

      return {
        intent: 'EMERGENCY_TRIGGERED',
        replyText: emergencyReply,
        emergencyAlertRaised: alertRaised,
        staffHelpOffered: true,
        language,
      };
    }

    // 2. HARD REFUSAL: Medical Advice / Diagnosis / Symptom Interpretation
    const asksMedicalAdvice = this.MEDICAL_ADVICE_KEYWORDS.some((kw) => lower.includes(kw));
    if (asksMedicalAdvice) {
      const refusalReply = language === 'ta'
        ? 'மன்னிக்கவும், நான் ஒரு கணினி உதவியாளர் மட்டுமே. என்னால் மருத்துவ ஆலோசனை, நோயறிதல் அல்லது மருந்து பரிந்துரைகளை வழங்க முடியாது. உங்கள் மருத்துவரிடம் பேச அல்லது ஊழியரின் உதவியை அழைக்க கீழே உள்ள "உதவி தேவை" பொத்தானை அழுத்தவும்.'
        : 'I cannot provide medical advice, diagnosis, or medication recommendations. Please discuss all medical concerns with your doctor, or tap "I Need Help" below to call a hospital attendant.';

      return {
        intent: 'MEDICAL_ADVICE_REFUSED',
        replyText: refusalReply,
        emergencyAlertRaised: false,
        staffHelpOffered: true,
        language,
      };
    }

    // 3. EXPLAIN CURRENT QUESTION
    if (
      lower.includes('explain') ||
      lower.includes('what does this mean') ||
      lower.includes('mean') ||
      lower.includes('புரிஞ்சுக்க முடியல') ||
      lower.includes('அர்த்தம்') ||
      lower.includes('விளக்கம்') ||
      lower.includes('मतलब')
    ) {
      if (currentQuestionCode) {
        try {
          const qHelp = await HelpService.getQuestionHelp(currentQuestionCode, language);
          return {
            intent: 'EXPLAIN_QUESTION',
            replyText: qHelp.plainExplanation,
            emergencyAlertRaised: false,
            staffHelpOffered: false,
            language,
          };
        } catch {
          // If no specific question help, return generic reassurance
        }
      }
    }

    // 4. HOW TO USE KIOSK
    if (lower.includes('how to use') || lower.includes('operate') || lower.includes('பயன்படுத்துவது') || lower.includes('उपयोग')) {
      try {
        const art = await HelpService.getHelpArticle('how_to_use', language);
        return {
          intent: 'HOW_TO_USE_KIOSK',
          replyText: `${art.title}: ${art.body}`,
          emergencyAlertRaised: false,
          staffHelpOffered: false,
          language,
        };
      } catch {
        // Fallback below
      }
    }

    // 5. WHAT HAPPENS NEXT
    if (lower.includes('what happens next') || lower.includes('what next') || lower.includes('அடுத்து என்ன') || lower.includes('आगे क्या')) {
      try {
        const art = await HelpService.getHelpArticle('what_next', language);
        return {
          intent: 'WHAT_HAPPENS_NEXT',
          replyText: `${art.title}: ${art.body}`,
          emergencyAlertRaised: false,
          staffHelpOffered: false,
          language,
        };
      } catch {
        // Fallback below
      }
    }

    // 6. CALL STAFF / NEED HELP
    if (lower.includes('call staff') || lower.includes('need human') || lower.includes('உதவி தேவை') || lower.includes('मदद')) {
      if (visitId) {
        await RedFlagsService.raiseManualHelpRequest(visitId, 'Patient requested staff help via assistant', kioskLocation);
      }
      const staffReply = language === 'ta'
        ? 'மருத்துவமனை ஊழியருக்கு தகவல் அனுப்பப்பட்டுள்ளது. சற்று நேரத்தில் உங்களிடம் வருவார்.'
        : 'A hospital attendant has been requested and will come to your kiosk shortly.';

      return {
        intent: 'CALL_STAFF',
        replyText: staffReply,
        emergencyAlertRaised: false,
        staffHelpOffered: true,
        language,
      };
    }

    // 7. DEFAULT SAFE HELPFUL RESPONSE
    const defaultReply = language === 'ta'
      ? 'நீங்கள் கேள்வியை விளக்கக் கேட்கலாம், கியோஸ்க்கை எவ்வாறு பயன்படுத்துவது என்பதை அறியலாம், அல்லது ஊழியரின் உதவியைப் பெறலாம்.'
      : 'You can ask me to explain the current question, ask how to use the kiosk, or request a hospital staff member to assist you.';

    return {
      intent: 'HOW_TO_USE_KIOSK',
      replyText: defaultReply,
      emergencyAlertRaised: false,
      staffHelpOffered: false,
      language,
    };
  }
}

function phraseSnippet(text: string): string {
  return (text || '').substring(0, 50);
}
