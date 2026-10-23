"use strict";
/**
 * MODULE 4A — CLINICAL TIMELINE & LONGITUDINAL HISTORY
 * LongitudinalDiffService: Pure deterministic "Changed Since Last Visit" diff engine
 *
 * SAFETY BOUNDARY:
 * - Deterministic diff on structured answers and validated fields (added, removed, changed).
 * - Labeled with dates.
 * - ZERO AI narrative.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LongitudinalDiffService = void 0;
const prisma_js_1 = require("../../database/prisma.js");
const logger_js_1 = require("../../config/logger.js");
const doctor_review_repository_js_1 = require("../doctor-review/doctor-review.repository.js");
class LongitudinalDiffService {
    // In-memory prior visit mock store for isolated test suites
    static inMemoryVisits = new Map();
    static seedVisitData(visitId, data) {
        this.inMemoryVisits.set(visitId, data);
    }
    static clearInMemoryStore() {
        this.inMemoryVisits.clear();
    }
    /**
     * Deterministically computes differences between current visit and the prior visit
     */
    static async computeVisitDiff(patientId, currentVisitId, explicitPriorVisitId) {
        const todayStr = new Date().toISOString().split('T')[0] || '';
        // 1. Resolve prior visit ID if not explicitly provided
        let priorVisitId = explicitPriorVisitId || null;
        let priorVisitDate = null;
        if (!priorVisitId) {
            const isDbUp = await (0, doctor_review_repository_js_1.checkDatabaseAvailability)();
            if (isDbUp) {
                try {
                    const priorProfile = await prisma_js_1.prisma.patientVisitProfile.findFirst({
                        where: {
                            patient_id: patientId,
                            visit_id: { not: currentVisitId },
                        },
                        orderBy: { created_at: 'desc' },
                    });
                    if (priorProfile) {
                        priorVisitId = priorProfile.visit_id;
                        priorVisitDate = priorProfile.created_at.toISOString().split('T')[0] || null;
                    }
                }
                catch (err) {
                    logger_js_1.logger.info('DB lookup for prior visit bypassed or failed, checking in-memory', { patientId });
                }
            }
        }
        // Check in-memory store if DB lookup didn't yield a prior visit
        if (!priorVisitId) {
            for (const [vId, val] of this.inMemoryVisits.entries()) {
                if (vId !== currentVisitId && val.patientId === patientId) {
                    priorVisitId = vId;
                    priorVisitDate = '2026-06-01';
                    break;
                }
            }
        }
        if (!priorVisitId) {
            return {
                patientId,
                currentVisitId,
                priorVisitId: null,
                currentVisitDate: todayStr,
                priorVisitDate: null,
                hasPriorVisit: false,
                added: [],
                removed: [],
                changed: [],
                totalChanges: 0,
            };
        }
        // 2. Collect current visit items
        const currentItems = await this.collectVisitItems(currentVisitId);
        // 3. Collect prior visit items
        const priorItems = await this.collectVisitItems(priorVisitId);
        // 4. Compute Added, Removed, Changed
        const added = [];
        const removed = [];
        const changed = [];
        const priorMap = new Map();
        for (const item of priorItems) {
            priorMap.set(item.key.toUpperCase(), item);
        }
        const currentMap = new Map();
        for (const item of currentItems) {
            currentMap.set(item.key.toUpperCase(), item);
        }
        // Evaluate items in current visit against prior
        for (const [key, curr] of currentMap.entries()) {
            const prev = priorMap.get(key);
            if (!prev) {
                // Item is newly reported or added
                added.push({
                    key,
                    category: curr.category,
                    label: curr.label,
                    diffType: 'ADDED',
                    currentValue: curr.value,
                    currentDate: curr.date || todayStr,
                    notes: 'New item recorded in current visit',
                });
            }
            else {
                // Item present in both: compare canonical normalized values
                const normCurr = this.normalizeValue(curr.value);
                const normPrev = this.normalizeValue(prev.value);
                if (normCurr !== normPrev) {
                    changed.push({
                        key,
                        category: curr.category,
                        label: curr.label,
                        diffType: 'CHANGED',
                        priorValue: prev.value,
                        currentValue: curr.value,
                        priorDate: prev.date || priorVisitDate,
                        currentDate: curr.date || todayStr,
                        notes: `Value modified from "${prev.value}" to "${curr.value}"`,
                    });
                }
            }
        }
        // Evaluate items present in prior visit that are missing in current visit
        for (const [key, prev] of priorMap.entries()) {
            if (!currentMap.has(key)) {
                removed.push({
                    key,
                    category: prev.category,
                    label: prev.label,
                    diffType: 'REMOVED',
                    priorValue: prev.value,
                    priorDate: prev.date || priorVisitDate,
                    notes: 'Item from prior visit no longer present or discontinued',
                });
            }
        }
        const totalChanges = added.length + removed.length + changed.length;
        return {
            patientId,
            currentVisitId,
            priorVisitId,
            currentVisitDate: todayStr,
            priorVisitDate: priorVisitDate || 'Prior Record',
            hasPriorVisit: true,
            added,
            removed,
            changed,
            totalChanges,
        };
    }
    /**
     * Helper: collects structured interview and validated fields for a visit
     */
    static async collectVisitItems(visitId) {
        const items = [];
        // Check in-memory store first
        if (this.inMemoryVisits.has(visitId)) {
            const mem = this.inMemoryVisits.get(visitId);
            items.push(...mem.answers, ...mem.fields);
            return items;
        }
        // Query Database
        const isDbUp = await (0, doctor_review_repository_js_1.checkDatabaseAvailability)();
        if (isDbUp) {
            try {
                const answers = await prisma_js_1.prisma.interviewAnswer.findMany({
                    where: { visit_id: visitId },
                    include: { question: true },
                });
                for (const a of answers) {
                    const valStr = typeof a.answer_value === 'object' && a.answer_value !== null
                        ? String(a.answer_value.value ?? JSON.stringify(a.answer_value))
                        : String(a.answer_value ?? '');
                    const key = a.question.question_code || a.question.id;
                    const cat = this.mapSectionToCategory(a.question.section);
                    items.push({
                        key,
                        label: a.question.prompt_text,
                        value: valStr,
                        category: cat,
                        date: a.answered_at.toISOString().split('T')[0] || '',
                    });
                }
                const docs = await prisma_js_1.prisma.uploadedDocument.findMany({
                    where: { visit_id: visitId },
                    include: { validated_fields: true },
                });
                for (const d of docs) {
                    const dDate = d.uploaded_at.toISOString().split('T')[0] || '';
                    for (const vf of d.validated_fields) {
                        if (vf.result === 'VERIFIED') {
                            const val = vf.matched_reference_value || '';
                            items.push({
                                key: `${d.document_type}_${vf.field_type}`,
                                label: `${d.document_type}: ${vf.field_type}`,
                                value: val,
                                category: d.document_type === 'PRESCRIPTION' ? 'MEDICATION' : 'LAB',
                                date: dDate,
                            });
                        }
                    }
                }
            }
            catch (err) {
                logger_js_1.logger.info('DB query error while collecting visit items for diff', { visitId });
            }
        }
        return items;
    }
    static normalizeValue(val) {
        return (val || '').toLowerCase().trim().replace(/\s+/g, ' ');
    }
    static mapSectionToCategory(section) {
        switch (section) {
            case 'MEDICATIONS':
                return 'MEDICATION';
            case 'ALLERGIES':
                return 'ALLERGY';
            case 'PAST_MEDICAL_HISTORY':
                return 'CONDITION';
            default:
                return 'INTAKE_ANSWER';
        }
    }
}
exports.LongitudinalDiffService = LongitudinalDiffService;
