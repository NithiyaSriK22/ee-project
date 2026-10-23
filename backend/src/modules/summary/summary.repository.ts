import { prisma } from '../../database/prisma.js';
import { logger } from '../../config/logger.js';
import {
  ClinicalSummaryDto,
  SummaryPromptTemplateDto,
  EvaluationRunDto,
  SummaryJobStatus,
  SummaryPromptStatus,
} from './summary.types.js';
import { devFallbackSummaryStore, StoredSummaryRecord } from './dev-fallback-summary-store.js';

export class SummaryRepository {
  private static isDbAvailable: boolean | null = null;

  public static async isDatabaseAvailable(): Promise<boolean> {
    if (this.isDbAvailable !== null) return this.isDbAvailable;
    try {
      await Promise.race([
        prisma.$queryRaw`SELECT 1`,
        new Promise((_, reject) => setTimeout(() => reject(new Error('DB Timeout')), 300)),
      ]);
      this.isDbAvailable = true;
    } catch {
      this.isDbAvailable = false;
    }
    return this.isDbAvailable;
  }

  public static async findSummaryById(id: string): Promise<ClinicalSummaryDto | null> {
    if (!(await this.isDatabaseAvailable())) {
      return devFallbackSummaryStore.findSummaryById(id);
    }

    try {
      const summary = await prisma.clinicalSummary.findUnique({
        where: { id },
        include: {
          sections: {
            orderBy: { order: 'asc' },
            include: {
              statements: {
                orderBy: { order: 'asc' },
                include: { sources: true },
              },
            },
          },
        },
      });

      if (!summary) return null;
      return this.mapPrismaToDto(summary);
    } catch (err) {
      logger.warn('Database offline in findSummaryById, using dev fallback store', { id });
      return devFallbackSummaryStore.findSummaryById(id);
    }
  }

  public static async findLatestSummaryByVisitId(visitId: string): Promise<ClinicalSummaryDto | null> {
    if (!(await this.isDatabaseAvailable())) {
      return devFallbackSummaryStore.findLatestSummaryByVisitId(visitId);
    }
    try {
      const summary = await prisma.clinicalSummary.findFirst({
        where: { visit_id: visitId },
        orderBy: { version: 'desc' },
        include: {
          sections: {
            orderBy: { order: 'asc' },
            include: {
              statements: {
                orderBy: { order: 'asc' },
                include: { sources: true },
              },
            },
          },
        },
      });

      if (!summary) return null;
      return this.mapPrismaToDto(summary);
    } catch (err) {
      logger.warn('Database offline in findLatestSummaryByVisitId, using dev fallback store', { visitId });
      return devFallbackSummaryStore.findLatestSummaryByVisitId(visitId);
    }
  }

  public static async findSummaryVersionsByVisitId(visitId: string): Promise<ClinicalSummaryDto[]> {
    if (!(await this.isDatabaseAvailable())) {
      return devFallbackSummaryStore.findSummaryVersionsByVisitId(visitId);
    }
    try {
      const summaries = await prisma.clinicalSummary.findMany({
        where: { visit_id: visitId },
        orderBy: { version: 'desc' },
        include: {
          sections: {
            orderBy: { order: 'asc' },
            include: {
              statements: {
                orderBy: { order: 'asc' },
                include: { sources: true },
              },
            },
          },
        },
      });

      return summaries.map((s) => this.mapPrismaToDto(s));
    } catch (err) {
      logger.warn('Database offline in findSummaryVersionsByVisitId, using dev fallback store', { visitId });
      return devFallbackSummaryStore.findSummaryVersionsByVisitId(visitId);
    }
  }

  public static async createSummary(summaryData: StoredSummaryRecord): Promise<ClinicalSummaryDto> {
    if (!(await this.isDatabaseAvailable())) {
      return devFallbackSummaryStore.saveSummary(summaryData);
    }
    try {
      const created = await prisma.clinicalSummary.create({
        data: {
          id: summaryData.id,
          visit_id: summaryData.visitId,
          patient_id: summaryData.patientId,
          version: summaryData.version,
          status: summaryData.status,
          generation_mode: summaryData.generationMode,
          model_id: summaryData.modelId,
          model_version: summaryData.modelVersion,
          prompt_template_version: summaryData.promptTemplateVersion,
          input_hash: summaryData.inputHash,
          formulary_version_refs: summaryData.formularyVersionRefs,
          validation_outcome: summaryData.validationOutcome ? (summaryData.validationOutcome as any) : undefined,
          generated_at: new Date(summaryData.generatedAt),
          sections: {
            create: summaryData.sections.map((s) => ({
              section: s.section,
              order: s.order,
              statements: {
                create: s.statements.map((st) => ({
                  id: st.id || undefined,
                  text: st.text,
                  origin: st.origin,
                  order: st.order,
                  sources: {
                    create: st.sources.map((src) => ({
                      source_type: src.sourceType,
                      source_ref: src.sourceRef,
                      source_item_id: src.sourceItemId,
                    })),
                  },
                })),
              },
            })),
          },
        },
        include: {
          sections: {
            orderBy: { order: 'asc' },
            include: {
              statements: {
                orderBy: { order: 'asc' },
                include: { sources: true },
              },
            },
          },
        },
      });

      return this.mapPrismaToDto(created);
    } catch (err) {
      logger.warn('Database offline in createSummary, using dev fallback store', {
        visitId: summaryData.visitId,
      });
      return devFallbackSummaryStore.saveSummary(summaryData);
    }
  }

  public static async markSuperseded(oldSummaryId: string, newSummaryId: string): Promise<void> {
    if (!(await this.isDatabaseAvailable())) {
      devFallbackSummaryStore.markSuperseded(oldSummaryId, newSummaryId);
      return;
    }
    try {
      await prisma.clinicalSummary.update({
        where: { id: oldSummaryId },
        data: {
          status: 'STALE',
          superseded_by: newSummaryId,
        },
      });
    } catch (err) {
      logger.warn('Database offline in markSuperseded, updating dev fallback store');
      devFallbackSummaryStore.markSuperseded(oldSummaryId, newSummaryId);
    }
  }

  public static async findActivePromptTemplate(): Promise<SummaryPromptTemplateDto | null> {
    if (!(await this.isDatabaseAvailable())) {
      return devFallbackSummaryStore.findActivePromptTemplate();
    }
    try {
      const tmpl = await prisma.summaryPromptTemplate.findFirst({
        where: { status: 'ACTIVE' },
        orderBy: { updated_at: 'desc' },
      });

      if (!tmpl) {
        return devFallbackSummaryStore.findActivePromptTemplate();
      }

      return {
        id: tmpl.id,
        version: tmpl.version,
        status: tmpl.status as SummaryPromptStatus,
        systemPrompt: tmpl.system_prompt,
        outputSchemaVersion: tmpl.output_schema_version,
        createdBy: tmpl.created_by,
        reviewedBy: tmpl.reviewed_by,
        activatedAt: tmpl.activated_at,
        createdAt: tmpl.created_at,
        updatedAt: tmpl.updated_at,
      };
    } catch {
      return devFallbackSummaryStore.findActivePromptTemplate();
    }
  }

  public static async findPromptTemplateById(id: string): Promise<SummaryPromptTemplateDto | null> {
    if (!(await this.isDatabaseAvailable())) {
      return devFallbackSummaryStore.findPromptTemplateById(id);
    }
    try {
      const tmpl = await prisma.summaryPromptTemplate.findUnique({
        where: { id },
      });
      if (!tmpl) return devFallbackSummaryStore.findPromptTemplateById(id);
      return {
        id: tmpl.id,
        version: tmpl.version,
        status: tmpl.status as SummaryPromptStatus,
        systemPrompt: tmpl.system_prompt,
        outputSchemaVersion: tmpl.output_schema_version,
        createdBy: tmpl.created_by,
        reviewedBy: tmpl.reviewed_by,
        activatedAt: tmpl.activated_at,
        createdAt: tmpl.created_at,
        updatedAt: tmpl.updated_at,
      };
    } catch {
      return devFallbackSummaryStore.findPromptTemplateById(id);
    }
  }

  public static async findPromptTemplateByVersion(version: string): Promise<SummaryPromptTemplateDto | null> {
    if (!(await this.isDatabaseAvailable())) {
      return devFallbackSummaryStore.findPromptTemplateByVersion(version);
    }
    try {
      const tmpl = await prisma.summaryPromptTemplate.findUnique({
        where: { version },
      });
      if (!tmpl) return devFallbackSummaryStore.findPromptTemplateByVersion(version);
      return {
        id: tmpl.id,
        version: tmpl.version,
        status: tmpl.status as SummaryPromptStatus,
        systemPrompt: tmpl.system_prompt,
        outputSchemaVersion: tmpl.output_schema_version,
        createdBy: tmpl.created_by,
        reviewedBy: tmpl.reviewed_by,
        activatedAt: tmpl.activated_at,
        createdAt: tmpl.created_at,
        updatedAt: tmpl.updated_at,
      };
    } catch {
      return devFallbackSummaryStore.findPromptTemplateByVersion(version);
    }
  }

  public static async listPromptTemplates(): Promise<SummaryPromptTemplateDto[]> {
    if (!(await this.isDatabaseAvailable())) {
      return devFallbackSummaryStore.listPromptTemplates();
    }
    try {
      const templates = await prisma.summaryPromptTemplate.findMany({
        orderBy: { created_at: 'desc' },
      });
      if (templates.length === 0) {
        return devFallbackSummaryStore.listPromptTemplates();
      }
      return templates.map((tmpl) => ({
        id: tmpl.id,
        version: tmpl.version,
        status: tmpl.status as SummaryPromptStatus,
        systemPrompt: tmpl.system_prompt,
        outputSchemaVersion: tmpl.output_schema_version,
        createdBy: tmpl.created_by,
        reviewedBy: tmpl.reviewed_by,
        activatedAt: tmpl.activated_at,
        createdAt: tmpl.created_at,
        updatedAt: tmpl.updated_at,
      }));
    } catch {
      return devFallbackSummaryStore.listPromptTemplates();
    }
  }

  public static async createPromptTemplate(data: {
    version: string;
    systemPrompt: string;
    outputSchemaVersion: string;
    createdBy?: string;
  }): Promise<SummaryPromptTemplateDto> {
    if (!(await this.isDatabaseAvailable())) {
      const tmpl: SummaryPromptTemplateDto = {
        id: `prm-${Date.now()}`,
        version: data.version,
        status: 'DRAFT',
        systemPrompt: data.systemPrompt,
        outputSchemaVersion: data.outputSchemaVersion,
        createdBy: data.createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return devFallbackSummaryStore.savePromptTemplate(tmpl);
    }
    try {
      const created = await prisma.summaryPromptTemplate.create({
        data: {
          version: data.version,
          system_prompt: data.systemPrompt,
          output_schema_version: data.outputSchemaVersion,
          status: 'DRAFT',
          created_by: data.createdBy,
        },
      });

      return {
        id: created.id,
        version: created.version,
        status: 'DRAFT',
        systemPrompt: created.system_prompt,
        outputSchemaVersion: created.output_schema_version,
        createdBy: created.created_by,
        createdAt: created.created_at,
        updatedAt: created.updated_at,
      };
    } catch {
      const tmpl: SummaryPromptTemplateDto = {
        id: `prm-${Date.now()}`,
        version: data.version,
        status: 'DRAFT',
        systemPrompt: data.systemPrompt,
        outputSchemaVersion: data.outputSchemaVersion,
        createdBy: data.createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return devFallbackSummaryStore.savePromptTemplate(tmpl);
    }
  }

  public static async updatePromptTemplateStatus(
    id: string,
    status: SummaryPromptStatus,
    extra?: { reviewedBy?: string; activatedAt?: Date }
  ): Promise<SummaryPromptTemplateDto | null> {
    if (!(await this.isDatabaseAvailable())) {
      return devFallbackSummaryStore.updatePromptStatus(id, status, extra);
    }
    try {
      const updated = await prisma.summaryPromptTemplate.update({
        where: { id },
        data: {
          status,
          reviewed_by: extra?.reviewedBy,
          activated_at: extra?.activatedAt,
        },
      });

      return {
        id: updated.id,
        version: updated.version,
        status: updated.status as SummaryPromptStatus,
        systemPrompt: updated.system_prompt,
        outputSchemaVersion: updated.output_schema_version,
        createdBy: updated.created_by,
        reviewedBy: updated.reviewed_by,
        activatedAt: updated.activated_at,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at,
      };
    } catch {
      return devFallbackSummaryStore.updatePromptStatus(id, status, extra);
    }
  }

  public static async saveEvaluationRun(run: EvaluationRunDto): Promise<EvaluationRunDto> {
    if (!(await this.isDatabaseAvailable())) {
      return devFallbackSummaryStore.saveEvaluationRun(run);
    }
    try {
      await prisma.summaryEvaluationRun.create({
        data: {
          id: run.id,
          prompt_template_id: run.promptTemplateId,
          prompt_version: run.promptVersion,
          model_id: run.modelId,
          passed: run.passed,
          total_cases: run.totalCases,
          passed_cases: run.passedCases,
          failed_cases: run.failedCases,
          metrics: run.metrics as any,
          executed_by: run.executedBy,
          executed_at: new Date(run.executedAt),
        },
      });
      return run;
    } catch {
      return devFallbackSummaryStore.saveEvaluationRun(run);
    }
  }

  public static async findLatestEvaluationRunForPrompt(
    promptVersion: string
  ): Promise<EvaluationRunDto | null> {
    if (!(await this.isDatabaseAvailable())) {
      return devFallbackSummaryStore.findLatestEvaluationRunForPrompt(promptVersion);
    }
    try {
      const run = await prisma.summaryEvaluationRun.findFirst({
        where: { prompt_version: promptVersion },
        orderBy: { executed_at: 'desc' },
      });

      if (!run) return devFallbackSummaryStore.findLatestEvaluationRunForPrompt(promptVersion);

      return {
        id: run.id,
        promptTemplateId: run.prompt_template_id,
        promptVersion: run.prompt_version,
        modelId: run.model_id,
        passed: run.passed,
        totalCases: run.total_cases,
        passedCases: run.passed_cases,
        failedCases: run.failed_cases,
        metrics: run.metrics as any,
        executedAt: run.executed_at,
        executedBy: run.executed_by,
      };
    } catch {
      return devFallbackSummaryStore.findLatestEvaluationRunForPrompt(promptVersion);
    }
  }

  public static async upsertGenerationJob(job: {
    visitId: string;
    status: SummaryJobStatus;
    attempts: number;
    errorCode?: string | null;
    errorMessage?: string | null;
    summaryId?: string | null;
  }) {
    if (!(await this.isDatabaseAvailable())) {
      return devFallbackSummaryStore.upsertGenerationJob({
        id: `job-${Date.now()}`,
        visitId: job.visitId,
        status: job.status,
        attempts: job.attempts,
        errorCode: job.errorCode,
        errorMessage: job.errorMessage,
        summaryId: job.summaryId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    try {
      return await prisma.summaryGenerationJob.create({
        data: {
          visit_id: job.visitId,
          status: job.status,
          attempts: job.attempts,
          error_code: job.errorCode,
          error_message: job.errorMessage,
          summary_id: job.summaryId,
          started_at: new Date(),
        },
      });
    } catch {
      return devFallbackSummaryStore.upsertGenerationJob({
        id: `job-${Date.now()}`,
        visitId: job.visitId,
        status: job.status,
        attempts: job.attempts,
        errorCode: job.errorCode,
        errorMessage: job.errorMessage,
        summaryId: job.summaryId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  public static async findJobByVisitId(visitId: string) {
    if (!(await this.isDatabaseAvailable())) {
      return devFallbackSummaryStore.findGenerationJobByVisitId(visitId);
    }
    try {
      return await prisma.summaryGenerationJob.findFirst({
        where: { visit_id: visitId },
        orderBy: { created_at: 'desc' },
      });
    } catch {
      return devFallbackSummaryStore.findGenerationJobByVisitId(visitId);
    }
  }

  private static mapPrismaToDto(raw: any): ClinicalSummaryDto {
    const isMock = raw.model_id === 'medikiosk-constrained-summary-v1';
    const isInsufficient = raw.status === 'INSUFFICIENT_EVIDENCE';
    const safetyLabel = isInsufficient
      ? 'Incomplete draft — insufficient clinical source information'
      : raw.generation_mode === 'TEMPLATE_FALLBACK'
      ? 'Template-only fallback draft — not confirmed by a doctor'
      : isMock
      ? 'Mock AI draft (deterministic simulation) — not confirmed by a doctor'
      : 'AI-assisted draft (Local LLM) — not confirmed by a doctor';

    return {
      id: raw.id,
      visitId: raw.visit_id,
      patientId: raw.patient_id,
      version: raw.version,
      status: raw.status,
      generationMode: raw.generation_mode,
      providerId: isMock ? 'MOCK_PROVIDER' : (raw.model_id ? 'LOCAL_LLM' : null),
      isMock,
      modelId: raw.model_id,
      modelVersion: raw.model_version,
      promptTemplateVersion: raw.prompt_template_version,
      inputHash: raw.input_hash,
      formularyVersionRefs: raw.formulary_version_refs || [],
      validationOutcome: raw.validation_outcome,
      generatedAt: raw.generated_at,
      supersededBy: raw.superseded_by,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
      safetyLabel,
      sections: (raw.sections || []).map((sec: any) => ({
        id: sec.id,
        section: sec.section,
        order: sec.order,
        statements: (sec.statements || []).map((stmt: any) => ({
          id: stmt.id,
          text: stmt.text,
          origin: stmt.origin,
          order: stmt.order,
          sources: (stmt.sources || []).map((src: any) => ({
            id: src.id,
            sourceType: src.source_type,
            sourceRef: src.source_ref,
            sourceItemId: src.source_item_id,
          })),
        })),
      })),
    };
  }
}
