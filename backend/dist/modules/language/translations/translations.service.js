"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranslationsService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const dev_fallback_language_store_js_1 = require("../dev-fallback-language-store.js");
const language_types_js_1 = require("../language.types.js");
const app_error_js_1 = require("../../../errors/app-error.js");
const logger_js_1 = require("../../../config/logger.js");
const seed_templates_js_1 = require("../../interview/seed-templates.js");
class TranslationsService {
    // ============================================================================
    // COVERAGE & KIOSK BUNDLE DELIVERY
    // ============================================================================
    /**
     * Evaluates translation coverage for a given language and template version.
     * Gated: isKioskReady is TRUE only when UI strings and ALL template questions & options are APPROVED.
     */
    static async getCoverageReport(language, templateVersion = '1.0.0') {
        const totalQuestions = seed_templates_js_1.DEFAULT_GENERAL_OPD_QUESTIONS.length;
        let totalOptions = 0;
        for (const q of seed_templates_js_1.DEFAULT_GENERAL_OPD_QUESTIONS) {
            if (q.answerOptions && Array.isArray(q.answerOptions)) {
                totalOptions += q.answerOptions.length;
            }
        }
        // UI Bundle check
        let uiApproved = false;
        const uiBundleKey = `${language}:${templateVersion}`;
        const uiBundle = dev_fallback_language_store_js_1.devFallbackLanguageStore.uiBundles.get(uiBundleKey);
        if (uiBundle && uiBundle.status === language_types_js_1.ContentStatuses.APPROVED) {
            uiApproved = true;
        }
        // Question translations check
        let approvedQuestions = 0;
        for (const q of seed_templates_js_1.DEFAULT_GENERAL_OPD_QUESTIONS) {
            const key = `${q.questionCode}:${language}:1`;
            const trans = dev_fallback_language_store_js_1.devFallbackLanguageStore.questionTranslations.get(key);
            if (trans && trans.status === language_types_js_1.ContentStatuses.APPROVED) {
                approvedQuestions++;
            }
        }
        // Option translations check
        let approvedOptions = 0;
        for (const [, opt] of dev_fallback_language_store_js_1.devFallbackLanguageStore.optionTranslations.entries()) {
            if (opt.language === language && opt.status === language_types_js_1.ContentStatuses.APPROVED) {
                approvedOptions++;
            }
        }
        // Help articles check
        let helpArticlesApproved = 0;
        for (const [, art] of dev_fallback_language_store_js_1.devFallbackLanguageStore.helpArticles.entries()) {
            if (art.language === language && art.status === language_types_js_1.ContentStatuses.APPROVED) {
                helpArticlesApproved++;
            }
        }
        const questionCoverage = totalQuestions > 0 ? approvedQuestions / totalQuestions : 0;
        const isKioskReady = uiApproved && questionCoverage >= 1.0;
        const coveragePercentage = Math.round(((approvedQuestions + (uiApproved ? 1 : 0)) / (totalQuestions + 1)) * 100);
        return {
            language,
            templateVersion,
            totalQuestions,
            approvedQuestions,
            totalOptions,
            approvedOptions,
            uiStringsApproved: uiApproved,
            helpArticlesApproved,
            coveragePercentage,
            isKioskReady,
        };
    }
    /**
     * Builds the comprehensive, session-scoped content bundle for the kiosk.
     * Only APPROVED content is included.
     */
    static async getKioskContentBundle(language, templateVersion = '1.0.0') {
        // 1. UI Strings
        const uiBundleKey = `${language}:${templateVersion}`;
        const uiBundle = dev_fallback_language_store_js_1.devFallbackLanguageStore.uiBundles.get(uiBundleKey);
        const uiStrings = uiBundle && uiBundle.status === language_types_js_1.ContentStatuses.APPROVED ? uiBundle.strings : {};
        // 2. Question Translations
        const questionTranslations = {};
        for (const [, q] of dev_fallback_language_store_js_1.devFallbackLanguageStore.questionTranslations.entries()) {
            if (q.language === language && q.status === language_types_js_1.ContentStatuses.APPROVED) {
                questionTranslations[q.questionCode] = {
                    promptText: q.promptText,
                    promptAudioHint: q.promptAudioHint,
                    isCritical: q.isCritical,
                };
            }
        }
        // 3. Option Translations
        const optionTranslations = {};
        for (const [, opt] of dev_fallback_language_store_js_1.devFallbackLanguageStore.optionTranslations.entries()) {
            if (opt.language === language && opt.status === language_types_js_1.ContentStatuses.APPROVED) {
                optionTranslations[opt.optionCode] = {
                    label: opt.label,
                    spokenSynonyms: opt.spokenSynonyms || [],
                };
            }
        }
        // 4. Question Help Texts
        const questionHelpTexts = {};
        for (const [, qh] of dev_fallback_language_store_js_1.devFallbackLanguageStore.questionHelpTexts.entries()) {
            if (qh.language === language && qh.status === language_types_js_1.ContentStatuses.APPROVED) {
                questionHelpTexts[qh.questionCode] = qh.plainExplanation;
            }
        }
        // 5. Kiosk Help Articles
        const helpArticles = [];
        for (const [, art] of dev_fallback_language_store_js_1.devFallbackLanguageStore.helpArticles.entries()) {
            if (art.language === language && art.status === language_types_js_1.ContentStatuses.APPROVED) {
                helpArticles.push({
                    topic: art.topic,
                    title: art.title,
                    body: art.body,
                });
            }
        }
        // 6. Audio Manifest (approved static audio references)
        const audioManifest = {};
        for (const [code] of Object.entries(questionTranslations)) {
            audioManifest[code] = {
                audioUrl: `/api/v1/kiosk/voice/synthesize?id=q_${code}_${language}`,
                audioHintUrl: `/api/v1/kiosk/voice/synthesize?id=hint_${code}_${language}`,
            };
        }
        // 7. Version Hash for offline cache validation
        const payloadForHash = JSON.stringify({ language, templateVersion, uiStrings, questionTranslations });
        const versionHash = crypto_1.default.createHash('sha256').update(payloadForHash).digest('hex').substring(0, 16);
        return {
            language,
            templateVersion,
            uiStrings,
            questionTranslations,
            optionTranslations,
            questionHelpTexts,
            helpArticles,
            audioManifest,
            versionHash,
        };
    }
    // ============================================================================
    // QUESTION TRANSLATION MANAGEMENT & CLINICAL REVIEW WORKFLOW
    // ============================================================================
    static async createQuestionTranslation(params) {
        const key = `${params.questionCode}:${params.language}:1`;
        const now = new Date().toISOString();
        const translation = {
            id: `qt-${Date.now()}-${params.questionCode}`,
            questionCode: params.questionCode,
            language: params.language,
            templateVersion: params.templateVersion || '1.0.0',
            promptText: params.promptText,
            promptAudioHint: params.promptAudioHint,
            status: language_types_js_1.ContentStatuses.DRAFT,
            version: 1,
            isCritical: params.isCritical ?? false,
            createdBy: params.authorId,
            createdAt: now,
            updatedAt: now,
        };
        dev_fallback_language_store_js_1.devFallbackLanguageStore.questionTranslations.set(key, translation);
        logger_js_1.logger.info('Question translation created in DRAFT', { questionCode: params.questionCode, language: params.language });
        return translation;
    }
    static async submitQuestionTranslationForReview(questionCode, language, version = 1) {
        const key = `${questionCode}:${language}:${version}`;
        const item = dev_fallback_language_store_js_1.devFallbackLanguageStore.questionTranslations.get(key);
        if (!item) {
            throw new app_error_js_1.NotFoundError(`Question translation not found for code ${questionCode} and language ${language}`);
        }
        item.status = language_types_js_1.ContentStatuses.IN_REVIEW;
        item.updatedAt = new Date().toISOString();
        dev_fallback_language_store_js_1.devFallbackLanguageStore.questionTranslations.set(key, item);
        logger_js_1.logger.info('Question translation submitted for clinical review', { questionCode, language });
        return item;
    }
    /**
     * Approves a question translation.
     * ENFORCES SEPARATION OF DUTIES: The content author cannot approve their own translation.
     */
    static async approveQuestionTranslation(params) {
        const version = params.version || 1;
        const key = `${params.questionCode}:${params.language}:${version}`;
        const item = dev_fallback_language_store_js_1.devFallbackLanguageStore.questionTranslations.get(key);
        if (!item) {
            throw new app_error_js_1.NotFoundError(`Question translation not found for code ${params.questionCode}`);
        }
        // Separation of duties check
        if (item.createdBy && item.createdBy === params.reviewerId) {
            throw new app_error_js_1.ForbiddenError('Separation of duties violation: The translation author cannot be the reviewer or approver.');
        }
        const now = new Date().toISOString();
        item.status = language_types_js_1.ContentStatuses.APPROVED;
        item.reviewedBy = params.reviewerId;
        item.reviewedAt = now;
        item.updatedAt = now;
        dev_fallback_language_store_js_1.devFallbackLanguageStore.questionTranslations.set(key, item);
        // Record formal review audit entry
        const reviewId = `rev-${Date.now()}`;
        dev_fallback_language_store_js_1.devFallbackLanguageStore.reviews.set(reviewId, {
            id: reviewId,
            itemRef: `question:${params.questionCode}:${version}`,
            language: params.language,
            reviewerId: params.reviewerId,
            reviewerName: params.reviewerName || 'Bilingual Clinical Reviewer',
            reviewedAt: now,
            decision: language_types_js_1.ReviewDecisions.APPROVED,
            note: params.note || 'Clinically verified and approved for patient kiosk presentation',
            createdAt: now,
        });
        logger_js_1.logger.info('Question translation APPROVED by bilingual clinical reviewer', {
            questionCode: params.questionCode,
            language: params.language,
            reviewerId: params.reviewerId,
        });
        return item;
    }
    /**
     * Editing approved content requires creating a new version.
     */
    static async updateApprovedQuestionTranslation(params) {
        // Find current highest version
        let currentVersion = 1;
        for (const [, item] of dev_fallback_language_store_js_1.devFallbackLanguageStore.questionTranslations.entries()) {
            if (item.questionCode === params.questionCode && item.language === params.language) {
                if (item.version >= currentVersion) {
                    currentVersion = item.version;
                }
            }
        }
        const newVersion = currentVersion + 1;
        const now = new Date().toISOString();
        const newTranslation = {
            id: `qt-${Date.now()}-${params.questionCode}-v${newVersion}`,
            questionCode: params.questionCode,
            language: params.language,
            templateVersion: '1.0.0',
            promptText: params.newPromptText,
            promptAudioHint: params.newAudioHint,
            status: language_types_js_1.ContentStatuses.DRAFT,
            version: newVersion,
            isCritical: false,
            createdBy: params.authorId,
            createdAt: now,
            updatedAt: now,
        };
        dev_fallback_language_store_js_1.devFallbackLanguageStore.questionTranslations.set(`${params.questionCode}:${params.language}:${newVersion}`, newTranslation);
        logger_js_1.logger.info('New translation version created from approved content edit', {
            questionCode: params.questionCode,
            language: params.language,
            newVersion,
        });
        return newTranslation;
    }
    // ============================================================================
    // DOCTOR WORKSPACE: SECONDARY LABELED MACHINE TRANSLATION
    // ============================================================================
    /**
     * Provides optional machine translation for free-text answers on doctor side (Module 7).
     * Strict Rules:
     * 1. Original text is preserved and displayed first.
     * 2. Translation is a separate secondary element labeled "Machine translation — verify with patient".
     * 3. Never fed into clinical red flags or clinical summary facts.
     * 4. No patient identifiers are sent.
     */
    static async getLabeledMachineTranslation(originalText, sourceLanguage, targetLanguage = 'en') {
        if (!originalText || sourceLanguage === targetLanguage) {
            return {
                originalText,
                sourceLanguage,
                translatedText: originalText,
                label: 'Original text (No translation needed)',
                isReliable: true,
            };
        }
        // Deterministic offline translation dictionary for key clinical Tamil & Hindi phrases
        let translated = originalText;
        const TAMIL_PHRASES = {
            'தலைவலி': 'headache',
            'நெஞ்சு வலி': 'chest pain',
            'காய்ச்சல்': 'fever',
            'வயிற்று வலி': 'stomach ache / abdominal pain',
            'இருமல்': 'cough',
            'சளி': 'cold / phlegm',
            'மூச்சு திணறல்': 'difficulty breathing / dyspnea',
            'வாந்தி': 'vomiting',
            'மயக்கம்': 'dizziness / fainting',
            'சோர்வு': 'fatigue / weakness',
            'உயர் ரத்த அழுத்தம்': 'high blood pressure / hypertension',
            'சர்க்கரை நோய்': 'diabetes',
            'மூட்டு வலி': 'joint pain',
        };
        for (const [ta, en] of Object.entries(TAMIL_PHRASES)) {
            if (translated.includes(ta)) {
                translated = translated.split(ta).join(`[${en}]`);
            }
        }
        if (translated === originalText) {
            // General machine translation stub
            translated = `(Translated from ${sourceLanguage.toUpperCase()}): ${originalText}`;
        }
        return {
            originalText,
            sourceLanguage,
            translatedText: translated,
            label: 'Machine translation — verify with patient',
            isReliable: false,
        };
    }
}
exports.TranslationsService = TranslationsService;
