"use strict";
/**
 * MODULE 4A — CLINICAL TIMELINE & LONGITUDINAL HISTORY
 * ClinicalTimelineService: Aggregates patient documents, lab results, and prior records
 * into a chronological timeline with date-unknown grouping and deterministic lab trends.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClinicalTimelineService = void 0;
const prisma_js_1 = require("../../database/prisma.js");
const logger_js_1 = require("../../config/logger.js");
const clinical_timeline_types_js_1 = require("./clinical-timeline.types.js");
const lab_flagging_service_js_1 = require("./lab-flagging.service.js");
const doctor_review_repository_js_1 = require("../doctor-review/doctor-review.repository.js");
class ClinicalTimelineService {
    static inMemoryTimelineItems = new Map();
    static seedTimelineItems(patientId, items) {
        this.inMemoryTimelineItems.set(patientId, items);
    }
    /**
     * Generates a deterministic chronological timeline for a patient
     */
    static async getPatientTimeline(patientId, options) {
        const rawItems = [];
        // Check in-memory store first
        if (this.inMemoryTimelineItems.has(patientId)) {
            rawItems.push(...this.inMemoryTimelineItems.get(patientId));
        }
        const isDbUp = await (0, doctor_review_repository_js_1.checkDatabaseAvailability)();
        // 1. Fetch Module 4 Validated Document Fields
        if (isDbUp) {
            try {
                const documents = await prisma_js_1.prisma.uploadedDocument.findMany({
                    where: { patient_id: patientId },
                    include: {
                        raw_fields: true,
                        validated_fields: true,
                    },
                    orderBy: { uploaded_at: 'desc' },
                });
                for (const doc of documents) {
                    // Document-level date resolution
                    const docDateStr = this.extractDocumentDate(doc);
                    for (const vf of doc.validated_fields) {
                        const isVerified = vf.result === 'VERIFIED';
                        const displayVal = isVerified
                            ? (vf.matched_reference_value || '')
                            : 'value not verified';
                        const itemType = this.mapDocumentTypeToTimelineType(doc.document_type);
                        const category = this.mapFieldTypeToCategory(vf.field_type, doc.document_type);
                        let labFlag = null;
                        if (category === 'LAB') {
                            const rawField = doc.raw_fields?.find((rf) => rf.field_type === vf.field_type);
                            const reportRange = rawField?.bounding_box && typeof rawField.bounding_box === 'object'
                                ? rawField.bounding_box.printedRange
                                : undefined;
                            labFlag = lab_flagging_service_js_1.LabFlaggingService.evaluateLabResult({
                                testCodeOrName: vf.field_type,
                                rawValue: isVerified ? (vf.matched_reference_value || '') : 'UNVERIFIED',
                                rawUnit: rawField?.extracted_unit || 'mg/dL',
                                isVerified,
                                verificationState: vf.result,
                                reportPrintedRange: reportRange,
                                patientAge: options?.patientAge,
                                patientGender: options?.patientGender,
                            });
                        }
                        rawItems.push({
                            id: `doc_${doc.id}_fld_${vf.id}`,
                            itemType,
                            category,
                            documentId: doc.id,
                            visitId: doc.visit_id,
                            documentType: doc.document_type,
                            fileName: doc.file_name,
                            title: `${doc.document_type}: ${vf.field_type}`,
                            clinicalDate: docDateStr.date,
                            dateState: docDateStr.dateState,
                            sourceType: 'DOCUMENT_FIELD',
                            sourceRef: `doc_${doc.id}_vf_${vf.id}`,
                            isVerified,
                            verificationState: vf.result,
                            displayValue: displayVal,
                            details: {
                                rawText: vf.matched_reference_value || '',
                                ocrConfidence: vf.ocr_confidence,
                                matchedReferenceValue: vf.matched_reference_value,
                                explanation: vf.explanation,
                            },
                            labFlag,
                        });
                    }
                }
            }
            catch (err) {
                logger_js_1.logger.warn('Error fetching document fields for timeline', { patientId, error: String(err) });
            }
            // 2. Fetch Module 7 Prior Confirmed Records
            try {
                const confirmedRecords = await prisma_js_1.prisma.confirmedRecord.findMany({
                    where: {
                        visit_id: { in: await this.getPatientVisitIds(patientId) },
                    },
                    include: {
                        statements: true,
                    },
                    orderBy: { confirmed_at: 'desc' },
                });
                for (const cr of confirmedRecords) {
                    const confirmDate = cr.confirmed_at.toISOString().split('T')[0];
                    for (const stmt of cr.statements) {
                        rawItems.push({
                            id: `conf_rec_${cr.id}_stmt_${stmt.id}`,
                            itemType: clinical_timeline_types_js_1.TimelineItemTypes.PRIOR_VISIT_RECORD,
                            category: stmt.section === 'MEDICATIONS' ? 'MEDICATION' : 'CLINICAL_NOTE',
                            visitId: cr.visit_id,
                            title: `Confirmed ${stmt.section}`,
                            clinicalDate: confirmDate || null,
                            dateState: 'EXACT',
                            sourceType: 'CONFIRMED_RECORD',
                            sourceRef: `conf_${cr.id}_stmt_${stmt.id}`,
                            isVerified: true,
                            verificationState: 'VERIFIED',
                            displayValue: stmt.text,
                            details: {
                                section: stmt.section,
                                origin: stmt.origin,
                                confirmedByDoctorName: cr.confirmed_by_doctor_name,
                                attestationVersion: cr.attestation_version,
                            },
                        });
                    }
                }
            }
            catch (err) {
                logger_js_1.logger.warn('Error fetching confirmed records for timeline', { patientId, error: String(err) });
            }
        }
        // 3. Partition into Chronological and "Date unknown" Buckets (Section 3)
        const exactDateItems = [];
        const dateUnknownItems = [];
        for (const item of rawItems) {
            if (item.dateState === 'EXACT' && item.clinicalDate) {
                exactDateItems.push(item);
            }
            else {
                dateUnknownItems.push(item);
            }
        }
        // Group exact date items by YYYY-MM-DD
        const dateMap = new Map();
        for (const item of exactDateItems) {
            const d = item.clinicalDate;
            if (!dateMap.has(d)) {
                dateMap.set(d, []);
            }
            dateMap.get(d).push(item);
        }
        // Sort dates in descending order (newest first)
        const sortedDates = Array.from(dateMap.keys()).sort((a, b) => b.localeCompare(a));
        const chronologicalBuckets = sortedDates.map((dateStr) => ({
            dateLabel: dateStr,
            dateState: 'EXACT',
            items: dateMap.get(dateStr),
        }));
        const dateUnknownBucket = {
            dateLabel: 'Date unknown',
            dateState: 'DATE_UNKNOWN',
            items: dateUnknownItems,
        };
        return {
            patientId,
            totalItems: rawItems.length,
            chronologicalBuckets,
            dateUnknownBucket,
        };
    }
    /**
     * Deterministic Longitudinal Trends for a specific Lab Test (Section 5)
     */
    static async getLabTrends(patientId, testCodeOrName) {
        const timeline = await this.getPatientTimeline(patientId);
        const cleanTest = testCodeOrName.trim().toUpperCase();
        const matchingPoints = [];
        let detectedUnit = 'mg/dL';
        let resolvedTestName = testCodeOrName;
        // Collect all matching verified lab items
        const allItems = [
            ...timeline.chronologicalBuckets.flatMap((b) => b.items),
            ...timeline.dateUnknownBucket.items,
        ];
        for (const item of allItems) {
            if (item.category !== 'LAB' || !item.labFlag)
                continue;
            const flag = item.labFlag;
            if (flag.testCode.toUpperCase() === cleanTest ||
                flag.testName.toUpperCase() === cleanTest ||
                flag.testName.toUpperCase().includes(cleanTest) ||
                cleanTest.includes(flag.testCode.toUpperCase())) {
                resolvedTestName = flag.testName;
                detectedUnit = flag.unit || detectedUnit;
                if (flag.numericValue !== null && item.clinicalDate) {
                    matchingPoints.push({
                        date: item.clinicalDate,
                        dateState: item.dateState,
                        value: flag.numericValue,
                        rawText: flag.rawValue,
                        unit: flag.unit,
                        flagState: flag.flagState,
                        sourceRef: item.sourceRef,
                        documentId: item.documentId,
                        visitId: item.visitId,
                    });
                }
            }
        }
        // Sort strictly chronological ascending (oldest to newest)
        matchingPoints.sort((a, b) => a.date.localeCompare(b.date));
        // Detect timeline gaps (> 90 days between readings) honestly
        const gapDescriptions = [];
        for (let i = 0; i < matchingPoints.length - 1; i++) {
            const pt1 = matchingPoints[i];
            const pt2 = matchingPoints[i + 1];
            if (!pt1 || !pt2)
                continue;
            const p1 = new Date(pt1.date);
            const p2 = new Date(pt2.date);
            const diffMs = p2.getTime() - p1.getTime();
            const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
            if (diffDays > 90) {
                gapDescriptions.push(`Gap of ${diffDays} days between ${pt1.date} and ${pt2.date}`);
            }
        }
        const latestPoint = matchingPoints[matchingPoints.length - 1];
        return {
            testCode: cleanTest,
            testName: resolvedTestName,
            unit: detectedUnit,
            points: matchingPoints,
            hasGaps: gapDescriptions.length > 0,
            gapDescriptions,
            latestFlagState: latestPoint ? latestPoint.flagState : 'NO_RANGE_AVAILABLE',
        };
    }
    /**
     * Helper: Resolves verified document clinical date or marks Date unknown
     */
    static extractDocumentDate(doc) {
        // 1. Look for explicit verified document date field
        const dateField = doc.validated_fields?.find((f) => f.field_type === 'DOCUMENT_DATE' || f.field_type === 'PRESCRIPTION_DATE' || f.field_type === 'REPORT_DATE');
        if (dateField && dateField.result === 'VERIFIED') {
            const val = (dateField.matched_reference_value || '').trim();
            const parsed = new Date(val);
            if (!isNaN(parsed.getTime())) {
                return {
                    date: parsed.toISOString().split('T')[0] || null,
                    dateState: 'EXACT',
                };
            }
        }
        // 2. If uploaded date is known and verified
        if (doc.uploaded_at) {
            return {
                date: doc.uploaded_at.toISOString().split('T')[0] || null,
                dateState: 'EXACT',
            };
        }
        return {
            date: null,
            dateState: 'DATE_UNKNOWN',
        };
    }
    static mapDocumentTypeToTimelineType(docType) {
        switch (docType) {
            case 'PRESCRIPTION':
                return clinical_timeline_types_js_1.TimelineItemTypes.PRESCRIPTION;
            case 'LAB_REPORT':
                return clinical_timeline_types_js_1.TimelineItemTypes.LAB_RESULT;
            case 'DISCHARGE_SUMMARY':
                return clinical_timeline_types_js_1.TimelineItemTypes.DISCHARGE_SUMMARY;
            default:
                return clinical_timeline_types_js_1.TimelineItemTypes.LAB_RESULT;
        }
    }
    static mapFieldTypeToCategory(fieldType, docType) {
        const fUpper = fieldType.toUpperCase();
        if (fUpper.includes('DRUG') || fUpper.includes('MEDICINE') || fUpper.includes('DOSAGE') || docType === 'PRESCRIPTION') {
            return 'MEDICATION';
        }
        if (fUpper.includes('ALLERGY')) {
            return 'ALLERGY';
        }
        if (fUpper.includes('DIAGNOSIS') || fUpper.includes('CONDITION') || fUpper.includes('SURGERY')) {
            return 'CONDITION';
        }
        if (docType === 'LAB_REPORT' || fUpper.includes('GLUCOSE') || fUpper.includes('HEMOGLOBIN') || fUpper.includes('CREATININE') || fUpper.includes('POTASSIUM')) {
            return 'LAB';
        }
        return 'CLINICAL_NOTE';
    }
    static async getPatientVisitIds(patientId) {
        try {
            const profiles = await prisma_js_1.prisma.patientVisitProfile.findMany({
                where: { patient_id: patientId },
                select: { visit_id: true },
            });
            return profiles.map((p) => p.visit_id);
        }
        catch {
            return [];
        }
    }
}
exports.ClinicalTimelineService = ClinicalTimelineService;
