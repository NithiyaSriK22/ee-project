import { prisma } from '../../../database/prisma.js';
import { devFallbackLanguageStore } from '../dev-fallback-language-store.js';
import { checkDatabaseAvailability } from '../../doctor-review/doctor-review.repository.js';
import { SupportedLanguageDTO, UiStatuses } from '../language.types.js';
import { TranslationsService } from '../translations/translations.service.js';
import { logger } from '../../../config/logger.js';

export class LanguagesService {
  /**
   * Returns list of languages that are currently ready and enabled for patients at the kiosk.
   * Gated: language appears on kiosk ONLY when its UI strings and active template translations are fully APPROVED.
   */
  public static async getKioskLanguages(): Promise<SupportedLanguageDTO[]> {
    const all = await this.listAllLanguages();
    const enabled = all.filter((l) => l.enabled && l.uiStatus === UiStatuses.READY);

    const readyLanguages: SupportedLanguageDTO[] = [];

    for (const lang of enabled) {
      // Check translation coverage gate for default template 1.0.0
      const coverage = await TranslationsService.getCoverageReport(lang.code, '1.0.0');
      if (coverage.isKioskReady) {
        readyLanguages.push(lang);
      } else {
        logger.info('Language excluded from kiosk due to incomplete approved coverage', {
          language: lang.code,
          coveragePercentage: coverage.coveragePercentage,
        });
      }
    }

    return readyLanguages;
  }

  /**
   * Admin view: lists all supported languages regardless of kiosk readiness.
   */
  public static async listAllLanguages(): Promise<SupportedLanguageDTO[]> {
    const isDb = await checkDatabaseAvailability();
    if (isDb) {
      try {
        const rows = await prisma.supportedLanguage.findMany({
          orderBy: { code: 'asc' },
        });
        if (rows.length > 0) {
          return rows.map((r) => ({
            id: r.id,
            code: r.code,
            displayName: r.display_name,
            textDirection: (r.text_direction as 'ltr' | 'rtl') || 'ltr',
            uiStatus: r.ui_status as any,
            voiceInputStatus: r.voice_input_status as any,
            voiceOutputStatus: r.voice_output_status as any,
            enabled: r.enabled,
            createdAt: r.created_at.toISOString(),
            updatedAt: r.updated_at.toISOString(),
          }));
        }
      } catch (err) {
        logger.warn('Error querying supportedLanguage from DB, falling back to in-mem store', { error: String(err) });
      }
    }

    return Array.from(devFallbackLanguageStore.languages.values());
  }

  /**
   * Admin update: configure language status, voice capabilities, or enable/disable.
   */
  public static async updateLanguage(
    code: string,
    updates: Partial<Pick<SupportedLanguageDTO, 'displayName' | 'uiStatus' | 'voiceInputStatus' | 'voiceOutputStatus' | 'enabled'>>
  ): Promise<SupportedLanguageDTO | null> {
    const isDb = await checkDatabaseAvailability();
    if (isDb) {
      try {
        const updated = await prisma.supportedLanguage.update({
          where: { code },
          data: {
            display_name: updates.displayName,
            ui_status: updates.uiStatus,
            voice_input_status: updates.voiceInputStatus,
            voice_output_status: updates.voiceOutputStatus,
            enabled: updates.enabled,
          },
        });
        return {
          id: updated.id,
          code: updated.code,
          displayName: updated.display_name,
          textDirection: (updated.text_direction as 'ltr' | 'rtl') || 'ltr',
          uiStatus: updated.ui_status as any,
          voiceInputStatus: updated.voice_input_status as any,
          voiceOutputStatus: updated.voice_output_status as any,
          enabled: updated.enabled,
          createdAt: updated.created_at.toISOString(),
          updatedAt: updated.updated_at.toISOString(),
        };
      } catch (err) {
        logger.warn('Error updating supportedLanguage in DB, falling back to in-mem store', { error: String(err) });
      }
    }

    const existing = devFallbackLanguageStore.languages.get(code);
    if (!existing) return null;

    const modified: SupportedLanguageDTO = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    devFallbackLanguageStore.languages.set(code, modified);
    return modified;
  }
}
