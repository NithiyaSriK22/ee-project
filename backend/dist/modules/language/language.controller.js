"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LanguageController = void 0;
const languages_service_js_1 = require("./languages/languages.service.js");
const translations_service_js_1 = require("./translations/translations.service.js");
const tts_adapter_js_1 = require("./voice/tts-adapter.js");
const stt_adapter_js_1 = require("./voice/stt-adapter.js");
const voice_answer_mapper_js_1 = require("./voice/voice-answer-mapper.js");
const help_service_js_1 = require("./help/help.service.js");
const constrained_assistant_service_js_1 = require("./assistant/constrained-assistant.service.js");
const sync_service_js_1 = require("./sync/sync.service.js");
class LanguageController {
    // ============================================================================
    // KIOSK ENDPOINTS
    // ============================================================================
    static async getKioskLanguages(_req, res, next) {
        try {
            const languages = await languages_service_js_1.LanguagesService.getKioskLanguages();
            res.status(200).json({
                success: true,
                data: languages,
                timestamp: new Date().toISOString(),
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async getKioskContentBundle(req, res, next) {
        try {
            const lang = req.query.lang || 'en';
            const version = req.query.version || '1.0.0';
            const bundle = await translations_service_js_1.TranslationsService.getKioskContentBundle(lang, version);
            res.status(200).json({
                success: true,
                data: bundle,
                timestamp: new Date().toISOString(),
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async transcribeVoice(req, res, next) {
        try {
            const { language = 'en', audioBase64, transcriptHint } = req.body;
            const transcription = await stt_adapter_js_1.STTAdapter.transcribeAudio({ language, audioBase64, transcriptHint });
            res.status(200).json({
                success: true,
                data: transcription,
                timestamp: new Date().toISOString(),
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async synthesizeVoice(req, res, next) {
        try {
            const contentId = req.query.id || (req.body && req.body.contentId);
            const language = req.query.lang || (req.body && req.body.language) || 'en';
            const speed = req.body?.speed ? Number(req.body.speed) : 1.0;
            const synthesis = await tts_adapter_js_1.TTSAdapter.synthesizeApprovedContent({ contentId, language, speed });
            res.status(200).json({
                success: true,
                data: synthesis,
                timestamp: new Date().toISOString(),
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async mapVoiceAnswer(req, res, next) {
        try {
            const mapping = voice_answer_mapper_js_1.VoiceAnswerMapper.mapSpokenAnswer(req.body);
            res.status(200).json({
                success: true,
                data: mapping,
                timestamp: new Date().toISOString(),
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async getHelpTopic(req, res, next) {
        try {
            const topic = req.params.topic || '';
            const lang = req.query.lang || 'en';
            const article = await help_service_js_1.HelpService.getHelpArticle(topic, lang);
            res.status(200).json({
                success: true,
                data: article,
                timestamp: new Date().toISOString(),
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async getQuestionHelp(req, res, next) {
        try {
            const questionCode = req.params.questionCode || '';
            const lang = req.query.lang || 'en';
            const help = await help_service_js_1.HelpService.getQuestionHelp(questionCode, lang);
            res.status(200).json({
                success: true,
                data: help,
                timestamp: new Date().toISOString(),
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async assistantMessage(req, res, next) {
        try {
            const { message, language = 'en', currentQuestionCode } = req.body;
            const visitId = req.kioskSession?.visitId || req.body.visitId;
            const response = await constrained_assistant_service_js_1.ConstrainedAssistantService.processMessage({
                message,
                language,
                currentQuestionCode,
                visitId,
            });
            res.status(200).json({
                success: true,
                data: response,
                timestamp: new Date().toISOString(),
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async syncAnswers(req, res, next) {
        try {
            const visitId = req.kioskSession?.visitId || req.body.visitId;
            const patientId = req.kioskSession?.patientId || req.body.patientId || 'patient-kiosk';
            const result = await sync_service_js_1.SyncService.syncOfflineAnswers(visitId, patientId, req.body);
            res.status(200).json({
                success: true,
                data: result,
                timestamp: new Date().toISOString(),
            });
        }
        catch (err) {
            next(err);
        }
    }
    // ============================================================================
    // ADMIN TRANSLATION MANAGEMENT
    // ============================================================================
    static async listAllLanguages(_req, res, next) {
        try {
            const languages = await languages_service_js_1.LanguagesService.listAllLanguages();
            res.status(200).json({
                success: true,
                data: languages,
                timestamp: new Date().toISOString(),
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async updateLanguage(req, res, next) {
        try {
            const code = req.params.code || '';
            const updated = await languages_service_js_1.LanguagesService.updateLanguage(code, req.body);
            res.status(200).json({
                success: true,
                data: updated,
                timestamp: new Date().toISOString(),
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async getCoverage(req, res, next) {
        try {
            const language = req.query.lang || 'ta';
            const version = req.query.version || '1.0.0';
            const coverage = await translations_service_js_1.TranslationsService.getCoverageReport(language, version);
            res.status(200).json({
                success: true,
                data: coverage,
                timestamp: new Date().toISOString(),
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async createTranslation(req, res, next) {
        try {
            const authorId = req.user?.id || 'admin-author-default';
            const created = await translations_service_js_1.TranslationsService.createQuestionTranslation({
                ...req.body,
                authorId,
            });
            res.status(201).json({
                success: true,
                data: created,
                timestamp: new Date().toISOString(),
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async submitReview(req, res, next) {
        try {
            const { questionCode, language, version = 1 } = req.body;
            const submitted = await translations_service_js_1.TranslationsService.submitQuestionTranslationForReview(questionCode, language, version);
            res.status(200).json({
                success: true,
                data: submitted,
                timestamp: new Date().toISOString(),
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async approveTranslation(req, res, next) {
        try {
            const reviewerId = req.user?.id || req.body.reviewerId || 'clinician-reviewer-tamil';
            const reviewerName = req.user?.fullName || req.body.reviewerName || 'Bilingual Clinical Reviewer';
            const approved = await translations_service_js_1.TranslationsService.approveQuestionTranslation({
                questionCode: req.body.questionCode,
                language: req.body.language,
                version: req.body.version,
                reviewerId,
                reviewerName,
                note: req.body.note,
            });
            res.status(200).json({
                success: true,
                data: approved,
                timestamp: new Date().toISOString(),
            });
        }
        catch (err) {
            next(err);
        }
    }
    // Doctor side labeled machine translation
    static async getMachineTranslation(req, res, next) {
        try {
            const { text, sourceLang, targetLang = 'en' } = req.body;
            const result = await translations_service_js_1.TranslationsService.getLabeledMachineTranslation(text, sourceLang, targetLang);
            res.status(200).json({
                success: true,
                data: result,
                timestamp: new Date().toISOString(),
            });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.LanguageController = LanguageController;
