import {
  ClinicalSummaryDto,
  SummaryPromptTemplateDto,
  EvaluationRunDto,
  SummaryJobStatus,
  SummarySectionDto,
} from './summary.types.js';
import { PromptManager } from './generation/prompt-manager.js';

export interface StoredSummaryRecord extends ClinicalSummaryDto {
  sections: SummarySectionDto[];
}

export interface StoredJobRecord {
  id: string;
  visitId: string;
  status: SummaryJobStatus;
  attempts: number;
  errorCode?: string | null;
  errorMessage?: string | null;
  summaryId?: string | null;
  startedAt?: Date | string | null;
  completedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export class DevFallbackSummaryStore {
  private summaries = new Map<string, StoredSummaryRecord>();
  private promptTemplates = new Map<string, SummaryPromptTemplateDto>();
  private evaluationRuns = new Map<string, EvaluationRunDto>();
  private generationJobs = new Map<string, StoredJobRecord>();

  constructor() {
    // Seed default active prompt template
    const defaultPrompt = PromptManager.getDefaultPrompt();
    this.promptTemplates.set(defaultPrompt.id, defaultPrompt);
    this.promptTemplates.set(defaultPrompt.version, defaultPrompt);
  }

  public saveSummary(summary: StoredSummaryRecord): StoredSummaryRecord {
    this.summaries.set(summary.id, { ...summary });
    return summary;
  }

  public findSummaryById(id: string): StoredSummaryRecord | null {
    return this.summaries.get(id) || null;
  }

  public findLatestSummaryByVisitId(visitId: string): StoredSummaryRecord | null {
    const visitSummaries = Array.from(this.summaries.values())
      .filter((s) => s.visitId === visitId)
      .sort((a, b) => b.version - a.version);

    return visitSummaries[0] || null;
  }

  public findSummaryVersionsByVisitId(visitId: string): StoredSummaryRecord[] {
    return Array.from(this.summaries.values())
      .filter((s) => s.visitId === visitId)
      .sort((a, b) => b.version - a.version);
  }

  public markSuperseded(oldSummaryId: string, newSummaryId: string): void {
    const old = this.summaries.get(oldSummaryId);
    if (old) {
      old.status = 'STALE';
      old.supersededBy = newSummaryId;
      this.summaries.set(oldSummaryId, old);
    }
  }

  public savePromptTemplate(template: SummaryPromptTemplateDto): SummaryPromptTemplateDto {
    this.promptTemplates.set(template.id, { ...template });
    this.promptTemplates.set(template.version, { ...template });
    return template;
  }

  public findPromptTemplateById(id: string): SummaryPromptTemplateDto | null {
    return this.promptTemplates.get(id) || null;
  }

  public findPromptTemplateByVersion(version: string): SummaryPromptTemplateDto | null {
    return this.promptTemplates.get(version) || null;
  }

  public findActivePromptTemplate(): SummaryPromptTemplateDto | null {
    for (const tmpl of this.promptTemplates.values()) {
      if (tmpl.status === 'ACTIVE') {
        return tmpl;
      }
    }
    return PromptManager.getDefaultPrompt();
  }

  public listPromptTemplates(): SummaryPromptTemplateDto[] {
    const unique = new Map<string, SummaryPromptTemplateDto>();
    for (const tmpl of this.promptTemplates.values()) {
      unique.set(tmpl.id, tmpl);
    }
    return Array.from(unique.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public updatePromptStatus(
    id: string,
    status: SummaryPromptTemplateDto['status'],
    extra?: { reviewedBy?: string; activatedAt?: Date }
  ): SummaryPromptTemplateDto | null {
    const tmpl = this.promptTemplates.get(id);
    if (!tmpl) return null;
    tmpl.status = status;
    if (extra?.reviewedBy) tmpl.reviewedBy = extra.reviewedBy;
    if (extra?.activatedAt) tmpl.activatedAt = extra.activatedAt;
    tmpl.updatedAt = new Date();
    this.promptTemplates.set(tmpl.id, tmpl);
    this.promptTemplates.set(tmpl.version, tmpl);
    return tmpl;
  }

  public saveEvaluationRun(run: EvaluationRunDto): EvaluationRunDto {
    this.evaluationRuns.set(run.id, { ...run });
    return run;
  }

  public findLatestEvaluationRunForPrompt(promptVersion: string): EvaluationRunDto | null {
    const matching = Array.from(this.evaluationRuns.values())
      .filter((r) => r.promptVersion === promptVersion)
      .sort((a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime());
    return matching[0] || null;
  }

  public upsertGenerationJob(job: StoredJobRecord): StoredJobRecord {
    this.generationJobs.set(job.visitId, { ...job });
    return job;
  }

  public findGenerationJobByVisitId(visitId: string): StoredJobRecord | null {
    return this.generationJobs.get(visitId) || null;
  }

  public clear(): void {
    this.summaries.clear();
    this.generationJobs.clear();
    this.evaluationRuns.clear();
  }
}

export const devFallbackSummaryStore = new DevFallbackSummaryStore();
