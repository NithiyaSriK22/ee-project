import { prisma, checkDatabaseHealth } from '../../../database/prisma.js';
import { FormularyStatus } from '../documents.types.js';
import {
  SEED_FORMULARY_VERSION,
  SEED_FORMULARY_DRUGS,
} from './seed-formulary.js';
import { logger } from '../../../config/logger.js';
import { FormularyDataset } from '../validation/types.js';

export class FormularyRepository {
  /**
   * Retrieves the currently active formulary dataset with its drugs,
   * initializing the authoritative seed dataset if none exists in database.
   */
  public static async getActiveFormularyDataset(): Promise<FormularyDataset> {
    const isDbUp = await checkDatabaseHealth();
    if (isDbUp) {
      try {
        let activeVersion = await prisma.formularyVersion.findFirst({
          where: {
            status: FormularyStatus.ACTIVE,
            is_active: true,
          },
          include: {
            drugs: {
              where: { is_active: true },
            },
          },
        });

        // Auto-seed if database is clean
        if (!activeVersion) {
          activeVersion = await this.seedDefaultFormulary();
        }

        if (activeVersion) {
          return {
            versionId: activeVersion.id,
            versionCode: activeVersion.version_code,
            drugs: activeVersion.drugs.map((d: any) => ({
              id: d.id,
              genericName: d.generic_name,
              canonicalName: d.canonical_name,
              brandNames: d.brand_names,
              dosageForms: d.dosage_forms,
              commonMisreadings: d.common_misreadings,
              scheduleType: d.schedule_type,
            })),
          };
        }
      } catch (err) {
        logger.warn('FormularyRepository: Database error fetching formulary, falling back to seed dataset', { error: String(err) });
      }
    }

    // High-resilience fallback: return in-memory static seed formulary
    return {
      versionId: 'ver-seed-fallback-2026',
      versionCode: SEED_FORMULARY_VERSION.versionCode,
      drugs: SEED_FORMULARY_DRUGS.map((d, index) => ({
        id: `drug-seed-${index}`,
        genericName: d.genericName,
        canonicalName: d.canonicalName,
        brandNames: d.brandNames,
        dosageForms: d.dosageForms,
        commonMisreadings: d.commonMisreadings,
        scheduleType: d.scheduleType || 'SCHEDULE_H',
      })),
    };
  }

  /**
   * Seeds the default national formulary reference dataset
   */
  public static async seedDefaultFormulary() {
    logger.info('Initializing authoritative default Formulary Version (NFI-EML-2026.1)...');

    const existing = await prisma.formularyVersion.findUnique({
      where: { version_code: SEED_FORMULARY_VERSION.versionCode },
      include: { drugs: true },
    });

    if (existing) {
      if (!existing.is_active || existing.status !== FormularyStatus.ACTIVE) {
        return prisma.formularyVersion.update({
          where: { id: existing.id },
          data: {
            status: FormularyStatus.ACTIVE,
            is_active: true,
            activated_at: new Date(),
          },
          include: { drugs: true },
        });
      }
      return existing;
    }

    const created = await prisma.formularyVersion.create({
      data: {
        version_code: SEED_FORMULARY_VERSION.versionCode,
        description: SEED_FORMULARY_VERSION.description,
        source_name: SEED_FORMULARY_VERSION.sourceName,
        status: FormularyStatus.ACTIVE,
        is_active: true,
        activated_at: new Date(),
        drugs: {
          create: SEED_FORMULARY_DRUGS.map((d) => ({
            generic_name: d.genericName,
            canonical_name: d.canonicalName,
            brand_names: d.brandNames,
            dosage_forms: d.dosageForms,
            common_misreadings: d.commonMisreadings,
            schedule_type: d.scheduleType,
            is_active: true,
          })),
        },
      },
      include: {
        drugs: true,
      },
    });

    logger.info('Authoritative Formulary dataset successfully initialized', {
      versionCode: created.version_code,
      drugCount: created.drugs.length,
    });

    return created;
  }

  public static async listVersions() {
    return prisma.formularyVersion.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        _count: {
          select: { drugs: true, validated_fields: true },
        },
      },
    });
  }

  public static async findVersionById(id: string) {
    return prisma.formularyVersion.findUnique({
      where: { id },
      include: {
        drugs: {
          orderBy: { generic_name: 'asc' },
        },
      },
    });
  }

  public static async createVersion(data: {
    versionCode: string;
    description?: string;
    sourceName: string;
    createdBy?: string;
  }) {
    return prisma.formularyVersion.create({
      data: {
        version_code: data.versionCode,
        description: data.description,
        source_name: data.sourceName,
        status: FormularyStatus.DRAFT,
        is_active: false,
        created_by: data.createdBy,
      },
    });
  }

  public static async activateVersion(id: string, reviewedBy?: string) {
    // 1. Mark all other versions inactive
    await prisma.formularyVersion.updateMany({
      data: { is_active: false },
    });

    // 2. Activate target version
    return prisma.formularyVersion.update({
      where: { id },
      data: {
        status: FormularyStatus.ACTIVE,
        is_active: true,
        reviewed_by: reviewedBy,
        activated_at: new Date(),
      },
    });
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
    return prisma.formularyDrug.create({
      data: {
        version_id: versionId,
        generic_name: drug.genericName,
        canonical_name: drug.canonicalName,
        brand_names: drug.brandNames || [],
        dosage_forms: drug.dosageForms || [],
        common_misreadings: drug.commonMisreadings || [],
        schedule_type: drug.scheduleType,
      },
    });
  }

  public static async importDrugsBatch(
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
    return prisma.$transaction(
      drugs.map((d) =>
        prisma.formularyDrug.create({
          data: {
            version_id: versionId,
            generic_name: d.genericName,
            canonical_name: d.canonicalName,
            brand_names: d.brandNames || [],
            dosage_forms: d.dosageForms || [],
            common_misreadings: d.commonMisreadings || [],
            schedule_type: d.scheduleType,
          },
        })
      )
    );
  }
}
