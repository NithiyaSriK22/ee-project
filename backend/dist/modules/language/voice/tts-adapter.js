"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TTSAdapter = void 0;
const app_error_js_1 = require("../../../errors/app-error.js");
const dev_fallback_language_store_js_1 = require("../dev-fallback-language-store.js");
const language_types_js_1 = require("../language.types.js");
const logger_js_1 = require("../../../config/logger.js");
class TTSAdapter {
    /**
     * Synthesizes audio ONLY for clinician-approved static content.
     * HARD RULE: Model-generated clinical text is NEVER read by this TTS adapter.
     */
    static async synthesizeApprovedContent(req) {
        const { contentId, language, speed = 1.0 } = req;
        // Validate that speed is within patient-safe adjustable range
        const safeSpeed = Math.min(Math.max(speed, 0.7), 1.5);
        // Resolve approved text from verified stores only
        const approvedText = this.resolveApprovedText(contentId, language);
        if (!approvedText) {
            throw new app_error_js_1.ForbiddenError('TTS Synthesis Denied: Only clinician-approved questions and static help content may be vocalized. Model-generated clinical text cannot be read by voice.');
        }
        // In a live hospital deployment, this adapter connects to a self-hosted Piper/Coqui TTS or cloud TTS.
        // For local dev/test/pilot, we generate a synthetic wave audio chunk or base64 token.
        const audioPayload = Buffer.from(`TTS_AUDIO_APPROVED:[${language}][speed=${safeSpeed}]:${approvedText}`).toString('base64');
        logger_js_1.logger.info('TTS synthesized for approved content', {
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
    static resolveApprovedText(contentId, language) {
        // 1. Check Question Translations
        for (const [, q] of dev_fallback_language_store_js_1.devFallbackLanguageStore.questionTranslations.entries()) {
            if (q.language === language && q.status === language_types_js_1.ContentStatuses.APPROVED) {
                if (contentId === `q_${q.questionCode}_${language}`) {
                    return q.promptText;
                }
                if (contentId === `hint_${q.questionCode}_${language}` && q.promptAudioHint) {
                    return q.promptAudioHint;
                }
            }
        }
        // 2. Check Question Help Texts
        for (const [, qh] of dev_fallback_language_store_js_1.devFallbackLanguageStore.questionHelpTexts.entries()) {
            if (qh.language === language && qh.status === language_types_js_1.ContentStatuses.APPROVED) {
                if (contentId === `help_${qh.questionCode}_${language}`) {
                    return qh.plainExplanation;
                }
            }
        }
        // 3. Check Kiosk Help Articles
        for (const [, art] of dev_fallback_language_store_js_1.devFallbackLanguageStore.helpArticles.entries()) {
            if (art.language === language && art.status === language_types_js_1.ContentStatuses.APPROVED) {
                if (contentId === `art_${art.topic}_${language}`) {
                    return `${art.title}. ${art.body}`;
                }
            }
        }
        // 4. Check UI Strings
        for (const [, bundle] of dev_fallback_language_store_js_1.devFallbackLanguageStore.uiBundles.entries()) {
            if (bundle.language === language && bundle.status === language_types_js_1.ContentStatuses.APPROVED) {
                if (bundle.strings[contentId]) {
                    return bundle.strings[contentId];
                }
            }
        }
        return null;
    }
}
exports.TTSAdapter = TTSAdapter;
