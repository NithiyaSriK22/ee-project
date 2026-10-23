import { ForbiddenError } from '../../../errors/app-error.js';
import { devFallbackLanguageStore } from '../dev-fallback-language-store.js';
import { ContentStatuses } from '../language.types.js';
import { logger } from '../../../config/logger.js';

export interface TTSRequest {
  contentId: string; // approved content identifier, e.g. q_CHEST_PAIN_DYSPNEA_ta
  speed?: number; // 0.75, 1.0, 1.25
  language: string;
}

export interface TTSResponse {
  approvedText: string;
  language: string;
  speed: number;
  audioBase64: string;
  mimeType: string;
  isPreGenerated: boolean;
}

export class TTSAdapter {
  /**
   * Synthesizes audio ONLY for clinician-approved static content.
   * HARD RULE: Model-generated clinical text is NEVER read by this TTS adapter.
   */
  public static async synthesizeApprovedContent(req: TTSRequest): Promise<TTSResponse> {
    const { contentId, language, speed = 1.0 } = req;

    // Validate that speed is within patient-safe adjustable range
    const safeSpeed = Math.min(Math.max(speed, 0.7), 1.5);

    // Resolve approved text from verified stores only
    const approvedText = this.resolveApprovedText(contentId, language);
    if (!approvedText) {
      throw new ForbiddenError(
        'TTS Synthesis Denied: Only clinician-approved questions and static help content may be vocalized. Model-generated clinical text cannot be read by voice.'
      );
    }

    // In a live hospital deployment, this adapter connects to a self-hosted Piper/Coqui TTS or cloud TTS.
    // For local dev/test/pilot, we generate a synthetic wave audio chunk or base64 token.
    const audioPayload = Buffer.from(`TTS_AUDIO_APPROVED:[${language}][speed=${safeSpeed}]:${approvedText}`).toString('base64');

    logger.info('TTS synthesized for approved content', {
      contentId,
      language,
      speed: safeSpeed,
      textLength: approvedText.length,
    });

    return {
      approvedText,
      language,
      speed: safeSpeed,
      audioBase64: audioPayload,
      mimeType: 'audio/wav',
      isPreGenerated: true,
    };
  }

  private static resolveApprovedText(contentId: string, language: string): string | null {
    // 1. Check Question Translations
    for (const [, q] of devFallbackLanguageStore.questionTranslations.entries()) {
      if (q.language === language && q.status === ContentStatuses.APPROVED) {
        if (contentId === `q_${q.questionCode}_${language}`) {
          return q.promptText;
        }
        if (contentId === `hint_${q.questionCode}_${language}` && q.promptAudioHint) {
          return q.promptAudioHint;
        }
      }
    }

    // 2. Check Question Help Texts
    for (const [, qh] of devFallbackLanguageStore.questionHelpTexts.entries()) {
      if (qh.language === language && qh.status === ContentStatuses.APPROVED) {
        if (contentId === `help_${qh.questionCode}_${language}`) {
          return qh.plainExplanation;
        }
      }
    }

    // 3. Check Kiosk Help Articles
    for (const [, art] of devFallbackLanguageStore.helpArticles.entries()) {
      if (art.language === language && art.status === ContentStatuses.APPROVED) {
        if (contentId === `art_${art.topic}_${language}`) {
          return `${art.title}. ${art.body}`;
        }
      }
    }

    // 4. Check UI Strings
    for (const [, bundle] of devFallbackLanguageStore.uiBundles.entries()) {
      if (bundle.language === language && bundle.status === ContentStatuses.APPROVED) {
        if (bundle.strings[contentId]) {
          return bundle.strings[contentId];
        }
      }
    }

    return null;
  }
}
