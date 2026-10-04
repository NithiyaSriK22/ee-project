import { FormularyRepository } from './formulary.repository.js';
import { NotFoundError, ValidationError } from '../../../errors/app-error.js';
import { logger } from '../../../config/logger.js';

export class FormularyService {
  public static async listVersions() {
    return FormularyRepository.listVersions();
  }

  public static async getVersionById(id: string) {
    const version = await FormularyRepository.findVersionById(id);
    if (!version) {
      throw new NotFoundError(`Formulary version not found: ${id}`);
    }
    return version;
  }

  public static async createVersion(
    data: {
      versionCode: string;
      description?: string;
      sourceName: string;
    },
    createdBy?: string
  ) {
    const created = await FormularyRepository.createVersion({
      ...data,
      createdBy,
    });

    logger.info('New Formulary Version created (DRAFT)', {
      versionId: created.id,
      versionCode: created.version_code,
    });

    return created;
  }

  public static async activateVersion(id: string, reviewedBy?: string) {
    const existing = await FormularyRepository.findVersionById(id);
    if (!existing) {
      throw new NotFoundError(`Formulary version not found: ${id}`);
    }

    if (existing.drugs.length === 0) {
      throw new ValidationError('Cannot activate an empty formulary version. Please add or import drugs first.');
    }

    const activated = await FormularyRepository.activateVersion(id, reviewedBy);

    logger.info('Formulary Version ACTIVATED for live clinical validation', {
      versionId: activated.id,
      versionCode: activated.version_code,
    });

    return activated;
  }

  public static async addDrug(
    versionId: string,
    drug: {
      genericName: string;
      canonicalName: string;
      brandNames?: string[];
      dosageForms?: string[];
      commonMisreadings?: string[];
      scheduleType?: string;
    }
  ) {
    const version = await FormularyRepository.findVersionById(versionId);
    if (!version) {
      throw new NotFoundError(`Formulary version not found: ${versionId}`);
    }

    return FormularyRepository.addDrug(versionId, drug);
  }

  public static async importDrugs(
    versionId: string,
    drugs: Array<{
      genericName: string;
      canonicalName: string;
      brandNames?: string[];
      dosageForms?: string[];
      commonMisreadings?: string[];
      scheduleType?: string;
    }>
  ) {
    const version = await FormularyRepository.findVersionById(versionId);
    if (!version) {
      throw new NotFoundError(`Formulary version not found: ${versionId}`);
    }

    if (!Array.isArray(drugs) || drugs.length === 0) {
      throw new ValidationError('Import payload must contain an array of drugs.');
    }

    const imported = await FormularyRepository.importDrugsBatch(versionId, drugs);

    logger.info('Formulary drugs imported in batch', {
      versionId,
      importedCount: imported.length,
    });

    return {
      success: true,
      importedCount: imported.length,
      versionCode: version.version_code,
    };
  }
}
