import { Router, Response, NextFunction } from 'express';
import { LanguageController } from './language.controller.js';
import { authenticateStaff, authorizeRoles } from '../../middleware/auth.middleware.js';
import { AppRequest } from '../../types/api.types.js';
import { TokenUtil } from '../../utils/token.util.js';

export const optionalKioskAuth = (req: AppRequest, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const kioskHeader = req.headers['x-kiosk-session-token'] as string | undefined;

  let token: string | undefined;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (kioskHeader) {
    token = kioskHeader;
  }

  if (token) {
    try {
      const claims = TokenUtil.verifyKioskSessionToken(token);
      req.kioskSession = {
        sessionId: claims.sessionId || 'kiosk-session',
        visitId: claims.visitId,
        patientId: claims.patientId,
        hospitalRegistrationNumber: (claims as any).hospitalRegistrationNumber || 'HRN',
      };
    } catch {
      // Ignored for optional auth
    }
  }
  next();
};

export const kioskContentRouter = Router();

// Kiosk session endpoints
kioskContentRouter.get('/languages', LanguageController.getKioskLanguages);
kioskContentRouter.get('/content/bundle', LanguageController.getKioskContentBundle);
kioskContentRouter.post('/voice/transcribe', LanguageController.transcribeVoice);
kioskContentRouter.post('/voice/synthesize', LanguageController.synthesizeVoice);
kioskContentRouter.get('/voice/synthesize', LanguageController.synthesizeVoice);
kioskContentRouter.post('/voice/map-answer', LanguageController.mapVoiceAnswer);
kioskContentRouter.post('/sync/answers', optionalKioskAuth, LanguageController.syncAnswers);
kioskContentRouter.get('/help/question/:questionCode', LanguageController.getQuestionHelp);
kioskContentRouter.get('/help/:topic', LanguageController.getHelpTopic);
kioskContentRouter.post('/assistant/message', optionalKioskAuth, LanguageController.assistantMessage);

import { UserRoles } from '../../types/auth.types.js';

// Admin translation & languages router
export const adminTranslationRouter = Router();

adminTranslationRouter.get('/languages', LanguageController.listAllLanguages);
adminTranslationRouter.patch('/languages/:code', authenticateStaff, authorizeRoles(UserRoles.ADMIN, UserRoles.SUPER_ADMIN), LanguageController.updateLanguage);
adminTranslationRouter.get('/translations/coverage', LanguageController.getCoverage);
adminTranslationRouter.post('/translations', authenticateStaff, authorizeRoles(UserRoles.ADMIN, UserRoles.SUPER_ADMIN, UserRoles.DOCTOR), LanguageController.createTranslation);
adminTranslationRouter.post('/translations/submit-review', authenticateStaff, LanguageController.submitReview);
adminTranslationRouter.post('/translations/approve', authenticateStaff, authorizeRoles(UserRoles.DOCTOR, UserRoles.ADMIN, UserRoles.SUPER_ADMIN), LanguageController.approveTranslation);

// Doctor secondary machine translation route
export const doctorTranslationRouter = Router();
doctorTranslationRouter.post('/translate-text', LanguageController.getMachineTranslation);
