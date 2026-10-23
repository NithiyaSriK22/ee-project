import { Request, Response, NextFunction } from 'express';
import { LanguagesService } from './languages/languages.service.js';
import { TranslationsService } from './translations/translations.service.js';
import { TTSAdapter } from './voice/tts-adapter.js';
import { STTAdapter } from './voice/stt-adapter.js';
import { VoiceAnswerMapper } from './voice/voice-answer-mapper.js';
import { HelpService } from './help/help.service.js';
import { ConstrainedAssistantService } from './assistant/constrained-assistant.service.js';
import { SyncService } from './sync/sync.service.js';
import { AppRequest } from '../../types/api.types.js';

export class LanguageController {
  // ============================================================================
  // KIOSK ENDPOINTS
  // ============================================================================

  public static async getKioskLanguages(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const languages = await LanguagesService.getKioskLanguages();
      res.status(200).json({
        success: true,
        data: languages,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getKioskContentBundle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const lang = (req.query.lang as string) || 'en';
      const version = (req.query.version as string) || '1.0.0';
      const bundle = await TranslationsService.getKioskContentBundle(lang, version);
      res.status(200).json({
        success: true,
        data: bundle,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  public static async transcribeVoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { language = 'en', audioBase64, transcriptHint } = req.body;
      const transcription = await STTAdapter.transcribeAudio({ language, audioBase64, transcriptHint });
      res.status(200).json({
        success: true,
        data: transcription,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  public static async synthesizeVoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const contentId = (req.query.id as string) || (req.body && req.body.contentId);
      const language = (req.query.lang as string) || (req.body && req.body.language) || 'en';
      const speed = req.body?.speed ? Number(req.body.speed) : 1.0;

      const synthesis = await TTSAdapter.synthesizeApprovedContent({ contentId, language, speed });
      res.status(200).json({
        success: true,
        data: synthesis,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  public static async mapVoiceAnswer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const mapping = VoiceAnswerMapper.mapSpokenAnswer(req.body);
      res.status(200).json({
        success: true,
        data: mapping,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getHelpTopic(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const topic = (req.params.topic as string) || '';
      const lang = (req.query.lang as string) || 'en';
      const article = await HelpService.getHelpArticle(topic, lang);
      res.status(200).json({
        success: true,
        data: article,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getQuestionHelp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const questionCode = (req.params.questionCode as string) || '';
      const lang = (req.query.lang as string) || 'en';
      const help = await HelpService.getQuestionHelp(questionCode, lang);
      res.status(200).json({
        success: true,
        data: help,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  public static async assistantMessage(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { message, language = 'en', currentQuestionCode } = req.body;
      const visitId = req.kioskSession?.visitId || req.body.visitId;

      const response = await ConstrainedAssistantService.processMessage({
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
    } catch (err) {
      next(err);
    }
  }

  public static async syncAnswers(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const visitId = req.kioskSession?.visitId || req.body.visitId;
      const patientId = req.kioskSession?.patientId || req.body.patientId || 'patient-kiosk';

      const result = await SyncService.syncOfflineAnswers(visitId, patientId, req.body);
      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  // ============================================================================
  // ADMIN TRANSLATION MANAGEMENT
  // ============================================================================

  public static async listAllLanguages(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const languages = await LanguagesService.listAllLanguages();
      res.status(200).json({
        success: true,
        data: languages,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  public static async updateLanguage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const code = (req.params.code as string) || '';
      const updated = await LanguagesService.updateLanguage(code, req.body);
      res.status(200).json({
        success: true,
        data: updated,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getCoverage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const language = (req.query.lang as string) || 'ta';
      const version = (req.query.version as string) || '1.0.0';
      const coverage = await TranslationsService.getCoverageReport(language, version);
      res.status(200).json({
        success: true,
        data: coverage,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  public static async createTranslation(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const authorId = req.user?.id || 'admin-author-default';
      const created = await TranslationsService.createQuestionTranslation({
        ...req.body,
        authorId,
      });
      res.status(201).json({
        success: true,
        data: created,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  public static async submitReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { questionCode, language, version = 1 } = req.body;
      const submitted = await TranslationsService.submitQuestionTranslationForReview(questionCode, language, version);
      res.status(200).json({
        success: true,
        data: submitted,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  public static async approveTranslation(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const reviewerId = req.user?.id || req.body.reviewerId || 'clinician-reviewer-tamil';
      const reviewerName = req.user?.fullName || req.body.reviewerName || 'Bilingual Clinical Reviewer';

      const approved = await TranslationsService.approveQuestionTranslation({
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
    } catch (err) {
      next(err);
    }
  }

  // Doctor side labeled machine translation
  public static async getMachineTranslation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { text, sourceLang, targetLang = 'en' } = req.body;
      const result = await TranslationsService.getLabeledMachineTranslation(text, sourceLang, targetLang);
      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }
}
