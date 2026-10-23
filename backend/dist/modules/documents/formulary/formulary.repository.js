"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormularyRepository = void 0;
const prisma_js_1 = require("../../../database/prisma.js");
const documents_types_js_1 = require("../documents.types.js");
const seed_formulary_js_1 = require("./seed-formulary.js");
const logger_js_1 = require("../../../config/logger.js");
class FormularyRepository {
    /**
     * Retrieves the currently active formulary dataset with its drugs,
     * initializing the authoritative seed dataset if none exists in database.
     */
    static async getActiveFormularyDataset() {
        const isDbUp = await (0, prisma_js_1.checkDatabaseHealth)();
        if (isDbUp) {
            try {
                let activeVersion = await prisma_js_1.prisma.formularyVersion.findFirst({
                    where: {
                        status: documents_types_js_1.FormularyStatus.ACTIVE,
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
                        drugs: activeVersion.drugs.map((d) => ({
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
            }
            catch (err) {
                logger_js_1.logger.warn('FormularyRepository: Database error fetching formulary, falling back to seed dataset', { error: String(err) });
            }
        }
        // High-resilience fallback: return in-memory static seed formulary
        return {
            versionId: 'ver-seed-fallback-2026',
            versionCode: seed_formulary_js_1.SEED_FORMULARY_VERSION.versionCode,
            drugs: seed_formulary_js_1.SEED_FORMULARY_DRUGS.map((d, index) => ({
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
    static async seedDefaultFormulary() {
        logger_js_1.logger.info('Initializing authoritative default Formulary Version (NFI-EML-2026.1)...');
        const existing = await prisma_js_1.prisma.formularyVersion.findUnique({
            where: { version_code: seed_formulary_js_1.SEED_FORMULARY_VERSION.versionCode },
            include: { drugs: true },
        });
        if (existing) {
            if (!existing.is_active || existing.status !== documents_types_js_1.FormularyStatus.ACTIVE) {
                return prisma_js_1.prisma.formularyVersion.update({
                    where: { id: existing.id },
                    data: {
                        status: documents_types_js_1.FormularyStatus.ACTIVE,
                        is_active: true,
                        activated_at: new Date(),
                    },
                    include: { drugs: true },
                });
            }
            return existing;
        }
        const created = await prisma_js_1.prisma.formularyVersion.create({
            data: {
                version_code: seed_formulary_js_1.SEED_FORMULARY_VERSION.versionCode,
                description: seed_formulary_js_1.SEED_FORMULARY_VERSION.description,
                source_name: seed_formulary_js_1.SEED_FORMULARY_VERSION.sourceName,
                status: documents_types_js_1.FormularyStatus.ACTIVE,
                is_active: true,
                activated_at: new Date(),
                drugs: {
                    create: seed_formulary_js_1.SEED_FORMULARY_DRUGS.map((d) => ({
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
        logger_js_1.logger.info('Authoritative Formulary dataset successfully initialized', {
            versionCode: created.version_code,
            drugCount: created.drugs.length,
        });
        return created;
    }
    static async listVersions() {
        return prisma_js_1.prisma.formularyVersion.findMany({
            orderBy: { created_at: 'desc' },
            include: {
                _count: {
                    select: { drugs: true, validated_fields: true },
                },
            },
        });
    }
    static async findVersionById(id) {
        return prisma_js_1.prisma.formularyVersion.findUnique({
            where: { id },
            include: {
                drugs: {
                    orderBy: { generic_name: 'asc' },
                },
            },
        });
    }
    static async createVersion(data) {
        return prisma_js_1.prisma.formularyVersion.create({
            data: {
                version_code: data.versionCode,
                description: data.description,
                source_name: data.sourceName,
                status: documents_types_js_1.FormularyStatus.DRAFT,
                is_active: false,
                created_by: data.createdBy,
            },
        });
    }
    static async activateVersion(id, reviewedBy) {
        // 1. Mark all other versions inactive
        await prisma_js_1.prisma.formularyVersion.updateMany({
            data: { is_active: false },
        });
        // 2. Activate target version
        return prisma_js_1.prisma.formularyVersion.update({
            where: { id },
            data: {
                status: documents_types_js_1.FormularyStatus.ACTIVE,
                is_active: true,
                reviewed_by: reviewedBy,
                activated_at: new Date(),
            },
        });
    }
    static async addDrug(versionId, drug) {
        return prisma_js_1.prisma.formularyDrug.create({
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
    static async importDrugsBatch(versionId, drugs) {
        return prisma_js_1.prisma.$transaction(drugs.map((d) => prisma_js_1.prisma.formularyDrug.create({
            data: {
                version_id: versionId,
                generic_name: d.genericName,
                canonical_name: d.canonicalName,
                brand_names: d.brandNames || [],
                dosage_forms: d.dosageForms || [],
                common_misreadings: d.commonMisreadings || [],
                schedule_type: d.scheduleType,
            },
        })));
    }
}
exports.FormularyRepository = FormularyRepository;
