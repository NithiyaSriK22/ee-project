"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.devFallbackSummaryStore = exports.DevFallbackSummaryStore = void 0;
const prompt_manager_js_1 = require("./generation/prompt-manager.js");
class DevFallbackSummaryStore {
    summaries = new Map();
    promptTemplates = new Map();
    evaluationRuns = new Map();
    generationJobs = new Map();
    constructor() {
        // Seed default active prompt template
        const defaultPrompt = prompt_manager_js_1.PromptManager.getDefaultPrompt();
        this.promptTemplates.set(defaultPrompt.id, defaultPrompt);
        this.promptTemplates.set(defaultPrompt.version, defaultPrompt);
    }
    saveSummary(summary) {
        this.summaries.set(summary.id, { ...summary });
        return summary;
    }
    findSummaryById(id) {
        return this.summaries.get(id) || null;
    }
    findLatestSummaryByVisitId(visitId) {
        const visitSummaries = Array.from(this.summaries.values())
            .filter((s) => s.visitId === visitId)
            .sort((a, b) => b.version - a.version);
        return visitSummaries[0] || null;
    }
    findSummaryVersionsByVisitId(visitId) {
        return Array.from(this.summaries.values())
            .filter((s) => s.visitId === visitId)
            .sort((a, b) => b.version - a.version);
    }
    markSuperseded(oldSummaryId, newSummaryId) {
        const old = this.summaries.get(oldSummaryId);
        if (old) {
            old.status = 'STALE';
            old.supersededBy = newSummaryId;
            this.summaries.set(oldSummaryId, old);
        }
    }
    savePromptTemplate(template) {
        this.promptTemplates.set(template.id, { ...template });
        this.promptTemplates.set(template.version, { ...template });
        return template;
    }
    findPromptTemplateById(id) {
        return this.promptTemplates.get(id) || null;
    }
    findPromptTemplateByVersion(version) {
        return this.promptTemplates.get(version) || null;
    }
    findActivePromptTemplate() {
        for (const tmpl of this.promptTemplates.values()) {
            if (tmpl.status === 'ACTIVE') {
                return tmpl;
            }
        }
        return prompt_manager_js_1.PromptManager.getDefaultPrompt();
    }
    listPromptTemplates() {
        const unique = new Map();
        for (const tmpl of this.promptTemplates.values()) {
            unique.set(tmpl.id, tmpl);
        }
        return Array.from(unique.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    updatePromptStatus(id, status, extra) {
        const tmpl = this.promptTemplates.get(id);
        if (!tmpl)
            return null;
        tmpl.status = status;
        if (extra?.reviewedBy)
            tmpl.reviewedBy = extra.reviewedBy;
        if (extra?.activatedAt)
            tmpl.activatedAt = extra.activatedAt;
        tmpl.updatedAt = new Date();
        this.promptTemplates.set(tmpl.id, tmpl);
        this.promptTemplates.set(tmpl.version, tmpl);
        return tmpl;
    }
    saveEvaluationRun(run) {
        this.evaluationRuns.set(run.id, { ...run });
        return run;
    }
    findLatestEvaluationRunForPrompt(promptVersion) {
        const matching = Array.from(this.evaluationRuns.values())
            .filter((r) => r.promptVersion === promptVersion)
            .sort((a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime());
        return matching[0] || null;
    }
    upsertGenerationJob(job) {
        this.generationJobs.set(job.visitId, { ...job });
        return job;
    }
    findGenerationJobByVisitId(visitId) {
        return this.generationJobs.get(visitId) || null;
    }
    clear() {
        this.summaries.clear();
        this.generationJobs.clear();
        this.evaluationRuns.clear();
    }
}
exports.DevFallbackSummaryStore = DevFallbackSummaryStore;
exports.devFallbackSummaryStore = new DevFallbackSummaryStore();
