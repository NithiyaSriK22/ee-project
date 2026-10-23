import { devFallbackLanguageStore } from '../dev-fallback-language-store.js';
import { ContentStatuses, KioskHelpArticleDTO, QuestionHelpTextDTO } from '../language.types.js';
import { NotFoundError } from '../../../errors/app-error.js';

export class HelpService {
  /**
   * Returns pre-authored, clinician-approved explanation for a question in the patient's language.
   * STRICT: Plain words and examples only; never hints at the answer or what patient "should" say.
   */
  public static async getQuestionHelp(questionCode: string, language: string = 'en'): Promise<QuestionHelpTextDTO> {
    for (const [, qh] of devFallbackLanguageStore.questionHelpTexts.entries()) {
      if (qh.questionCode === questionCode && qh.language === language && qh.status === ContentStatuses.APPROVED) {
        return qh;
      }
    }

    // Fallback to English approved help if available
    if (language !== 'en') {
      for (const [, qh] of devFallbackLanguageStore.questionHelpTexts.entries()) {
        if (qh.questionCode === questionCode && qh.language === 'en' && qh.status === ContentStatuses.APPROVED) {
          return qh;
        }
      }
    }

    throw new NotFoundError(`Approved help text not found for question ${questionCode} in language ${language}`);
  }

  /**
   * Returns approved kiosk help article on usage, scanning, queue, or staff assistance.
   */
  public static async getHelpArticle(topic: string, language: string = 'en'): Promise<KioskHelpArticleDTO> {
    for (const [, art] of devFallbackLanguageStore.helpArticles.entries()) {
      if (art.topic === topic && art.language === language && art.status === ContentStatuses.APPROVED) {
        return art;
      }
    }

    // Fallback to English approved article if available
    if (language !== 'en') {
      for (const [, art] of devFallbackLanguageStore.helpArticles.entries()) {
        if (art.topic === topic && art.language === 'en' && art.status === ContentStatuses.APPROVED) {
          return art;
        }
      }
    }

    throw new NotFoundError(`Approved help article not found for topic ${topic} in language ${language}`);
  }

  /**
   * Lists all approved help topics for the patient's language.
   */
  public static async listHelpArticles(language: string = 'en'): Promise<KioskHelpArticleDTO[]> {
    const list: KioskHelpArticleDTO[] = [];
    for (const [, art] of devFallbackLanguageStore.helpArticles.entries()) {
      if (art.language === language && art.status === ContentStatuses.APPROVED) {
        list.push(art);
      }
    }
    return list;
  }
}
