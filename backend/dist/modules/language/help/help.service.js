"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HelpService = void 0;
const dev_fallback_language_store_js_1 = require("../dev-fallback-language-store.js");
const language_types_js_1 = require("../language.types.js");
const app_error_js_1 = require("../../../errors/app-error.js");
class HelpService {
    /**
     * Returns pre-authored, clinician-approved explanation for a question in the patient's language.
     * STRICT: Plain words and examples only; never hints at the answer or what patient "should" say.
     */
    static async getQuestionHelp(questionCode, language = 'en') {
        for (const [, qh] of dev_fallback_language_store_js_1.devFallbackLanguageStore.questionHelpTexts.entries()) {
            if (qh.questionCode === questionCode && qh.language === language && qh.status === language_types_js_1.ContentStatuses.APPROVED) {
                return qh;
            }
        }
        // Fallback to English approved help if available
        if (language !== 'en') {
            for (const [, qh] of dev_fallback_language_store_js_1.devFallbackLanguageStore.questionHelpTexts.entries()) {
                if (qh.questionCode === questionCode && qh.language === 'en' && qh.status === language_types_js_1.ContentStatuses.APPROVED) {
                    return qh;
                }
            }
        }
        throw new app_error_js_1.NotFoundError(`Approved help text not found for question ${questionCode} in language ${language}`);
    }
    /**
     * Returns approved kiosk help article on usage, scanning, queue, or staff assistance.
     */
    static async getHelpArticle(topic, language = 'en') {
        for (const [, art] of dev_fallback_language_store_js_1.devFallbackLanguageStore.helpArticles.entries()) {
            if (art.topic === topic && art.language === language && art.status === language_types_js_1.ContentStatuses.APPROVED) {
                return art;
            }
        }
        // Fallback to English approved article if available
        if (language !== 'en') {
            for (const [, art] of dev_fallback_language_store_js_1.devFallbackLanguageStore.helpArticles.entries()) {
                if (art.topic === topic && art.language === 'en' && art.status === language_types_js_1.ContentStatuses.APPROVED) {
                    return art;
                }
            }
        }
        throw new app_error_js_1.NotFoundError(`Approved help article not found for topic ${topic} in language ${language}`);
    }
    /**
     * Lists all approved help topics for the patient's language.
     */
    static async listHelpArticles(language = 'en') {
        const list = [];
        for (const [, art] of dev_fallback_language_store_js_1.devFallbackLanguageStore.helpArticles.entries()) {
            if (art.language === language && art.status === language_types_js_1.ContentStatuses.APPROVED) {
                list.push(art);
            }
        }
        return list;
    }
}
exports.HelpService = HelpService;
