"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentSummaryService = void 0;
const prisma_js_1 = require("../../database/prisma.js");
const documents_repository_js_1 = require("../documents/documents.repository.js");
const document_storage_service_js_1 = require("../documents/storage/document-storage.service.js");
const logger_js_1 = require("../../config/logger.js");
const summary_service_js_1 = require("./summary.service.js");
class DocumentSummaryService {
    /**
     * Generates or retrieves an individual AI clinical summary for a specific document.
     */
    static async summarizeDocument(documentId) {
        const document = await documents_repository_js_1.DocumentsRepository.findDocumentById(documentId);
        if (!document) {
            throw new Error(`Document not found: ${documentId}`);
        }
        // Check if an individual summary is already cached and valid
        if (document.summary && typeof document.summary === 'object') {
            const cached = document.summary;
            if (cached.documentId === documentId && Array.isArray(cached.importantFindings)) {
                return cached;
            }
        }
        const rawFields = (document.raw_fields || []);
        const validatedFields = (document.validated_fields || []);
        // Extract clinical entities from verified formulary & OCR fields
        const medications = [];
        const diagnoses = [];
        const allergies = [];
        const labResults = [];
        const abnormalValues = [];
        const importantFindings = [];
        const clinicalObservations = [];
        const missingOrUnreadable = [];
        // Extract drug names and dosages
        const drugFields = validatedFields.filter((f) => f.field_type === 'drug_name' || f.fieldType === 'drug_name');
        const dosageFields = rawFields.filter((f) => f.field_type === 'dosage' || f.fieldType === 'dosage');
        drugFields.forEach((drug, idx) => {
            const name = drug.matched_reference_value || drug.matchedReferenceValue || drug.raw_text || 'Prescribed Medication';
            const dosage = dosageFields[idx]?.raw_text || dosageFields[idx]?.rawText || null;
            medications.push({
                name,
                dosage,
                frequency: 'As indicated on prescription',
                duration: null,
            });
            importantFindings.push(`Active prescription for ${name}${dosage ? ` (${dosage})` : ''}`);
        });
        // Extract diagnoses
        const diagFields = rawFields.filter((f) => f.field_type === 'diagnosis' || f.fieldType === 'diagnosis');
        diagFields.forEach((d) => {
            const text = d.raw_text || d.rawText;
            if (text && !diagnoses.includes(text)) {
                diagnoses.push(text);
                importantFindings.push(`Clinical diagnosis documented: ${text}`);
            }
        });
        // Extract allergies
        const allergyFields = rawFields.filter((f) => f.field_type === 'allergy' || f.fieldType === 'allergy');
        allergyFields.forEach((a) => {
            const text = a.raw_text || a.rawText;
            if (text && !allergies.includes(text)) {
                allergies.push(text);
                importantFindings.push(`Documented drug/substance allergy: ${text}`);
            }
        });
        // Extract lab results
        const labFields = rawFields.filter((f) => f.field_type === 'lab_value' || f.field_type === 'lab_test_name');
        if (labFields.length > 0) {
            for (let i = 0; i < labFields.length; i += 2) {
                const testName = labFields[i]?.raw_text || 'Clinical Test';
                const value = labFields[i + 1]?.raw_text || 'Normal';
                const isAbn = /high|elevated|positive|abnormal|\+/i.test(value);
                labResults.push({
                    testName,
                    value,
                    unit: null,
                    referenceRange: null,
                    isAbnormal: isAbn,
                });
                if (isAbn) {
                    abnormalValues.push(`${testName}: ${value} (Out of range)`);
                    importantFindings.push(`Abnormal laboratory finding: ${testName} was ${value}`);
                }
                else {
                    importantFindings.push(`Laboratory test ${testName}: ${value}`);
                }
            }
        }
        // Check for unreadable / failed items
        if (document.ocr_status === 'FAILED' || document.overall_status === 'EXTRACTION_FAILED') {
            missingOrUnreadable.push('Optical character recognition failed to reliably extract full handwritten text.');
            missingOrUnreadable.push('Manual clinical verification of the original physical image is required.');
        }
        else if (drugFields.length === 0 && diagFields.length === 0 && labFields.length === 0) {
            missingOrUnreadable.push('No recognized clinical medication, lab, or diagnostic entities found in digitized text.');
        }
        // Date extraction
        const dateField = rawFields.find((f) => f.field_type === 'date' || f.fieldType === 'date');
        const docDate = dateField?.raw_text || (document.uploaded_at ? new Date(document.uploaded_at).toISOString().split('T')[0] : null);
        const reportName = document.document_type === 'PRESCRIPTION'
            ? 'Outpatient Prescription Record'
            : document.document_type === 'LAB_REPORT'
                ? 'Diagnostic Laboratory Report'
                : document.document_type === 'DISCHARGE_SUMMARY'
                    ? 'Inpatient Discharge Summary'
                    : `${document.document_type} Report`;
        if (clinicalObservations.length === 0 && importantFindings.length > 0) {
            clinicalObservations.push(`Record analyzed with ${validatedFields.length} verified clinical formulary tokens.`);
        }
        const provider = summary_service_js_1.SummaryService.getProvider();
        const isMock = provider.isMock !== false;
        const modelId = provider.modelId || 'medikiosk-clinical-document-v1';
        const individualSummary = {
            documentId: document.id,
            fileName: document.file_name,
            documentType: document.document_type,
            documentDate: docDate,
            reportOrTestName: reportName,
            importantFindings: importantFindings.length > 0 ? importantFindings : ['Document uploaded and archived for physician inspection.'],
            laboratoryResults: labResults,
            abnormalValues,
            diagnoses,
            medications,
            allergies,
            clinicalObservations,
            missingOrUnreadableInfo: missingOrUnreadable,
            generatedAt: new Date().toISOString(),
            modelId,
            isMock,
            rawTextExcerpt: rawFields.map((f) => f.raw_text || f.rawText).filter(Boolean).join(' ').slice(0, 300) || '[No raw text excerpt available]',
        };
        // Save individual summary to database safely
        const isDbUp = await (0, prisma_js_1.checkDatabaseHealth)();
        if (isDbUp) {
            try {
                await prisma_js_1.prisma.$executeRawUnsafe(`UPDATE uploaded_documents SET summary = $1::jsonb, updated_at = NOW() WHERE id = $2::uuid`, JSON.stringify(individualSummary), documentId);
            }
            catch (err) {
                logger_js_1.logger.warn('Failed to update uploaded_documents.summary via SQL', { error: err?.message, documentId });
            }
        }
        // Save to disk metadata for permanent resilience
        await document_storage_service_js_1.DocumentStorageService.saveDocumentMetadata(document.visit_id, {
            ...document,
            summary: individualSummary,
        });
        return individualSummary;
    }
    /**
     * Generates or retrieves the consolidated Combined Summary of all uploaded documents for a visit.
     */
    static async getCombinedRecordSummary(visitId, forceRegenerate = false) {
        const isDbUp = await (0, prisma_js_1.checkDatabaseHealth)();
        // Check if an existing combined summary is stored in database
        if (isDbUp && !forceRegenerate) {
            try {
                const rows = await prisma_js_1.prisma.$queryRawUnsafe(`SELECT * FROM combined_document_summaries WHERE visit_id = $1 ORDER BY generated_at DESC LIMIT 1`, visitId);
                if (rows && rows.length > 0) {
                    const row = rows[0];
                    const payload = typeof row.summary_payload === 'string' ? JSON.parse(row.summary_payload) : row.summary_payload;
                    return {
                        ...payload,
                        id: row.id,
                        visitId: row.visit_id,
                        patientId: row.patient_id,
                        doctorReviewStatus: row.status,
                        doctorNotes: row.doctor_notes,
                        doctorApprovedAt: row.doctor_approved_at ? new Date(row.doctor_approved_at).toISOString() : null,
                        doctorApprovedBy: row.doctor_approved_by,
                        isStale: row.is_stale,
                    };
                }
            }
            catch (err) {
                logger_js_1.logger.warn('Error reading from combined_document_summaries table', { error: err?.message, visitId });
            }
        }
        // Assemble fresh combined summary from all visit documents
        const allDocs = await documents_repository_js_1.DocumentsRepository.findDocumentsByVisitId(visitId);
        const includedDocs = [];
        const excludedDocs = [];
        const consolidatedFindings = [];
        const allMedications = [];
        const allLabResults = [];
        const allDiagnoses = [];
        const allAllergies = [];
        const timelineChanges = [];
        const potentialInconsistencies = [];
        for (const doc of allDocs) {
            if (doc.ocr_status === 'FAILED' || doc.overall_status === 'EXTRACTION_FAILED') {
                excludedDocs.push({
                    documentId: doc.id,
                    fileName: doc.file_name,
                    reason: doc.ocr_error_message || 'Handwritten or low-resolution image could not be automatically extracted; requires manual inspection.',
                });
            }
            else {
                // Generate or get individual summary for this document
                try {
                    const docSummary = await this.summarizeDocument(doc.id);
                    includedDocs.push({
                        documentId: doc.id,
                        fileName: doc.file_name,
                        documentType: doc.document_type,
                        documentDate: docSummary.documentDate,
                    });
                    // Consolidate findings
                    docSummary.importantFindings.forEach((f) => {
                        if (!consolidatedFindings.includes(f)) {
                            consolidatedFindings.push(`[${doc.file_name}] ${f}`);
                        }
                    });
                    // Consolidate medications
                    docSummary.medications.forEach((med) => {
                        allMedications.push({
                            name: med.name,
                            dosage: med.dosage,
                            sourceDocument: doc.file_name,
                        });
                    });
                    // Consolidate lab results
                    docSummary.laboratoryResults.forEach((lab) => {
                        allLabResults.push({
                            ...lab,
                            date: docSummary.documentDate,
                            sourceDocument: doc.file_name,
                        });
                    });
                    // Consolidate diagnoses
                    docSummary.diagnoses.forEach((d) => {
                        if (!allDiagnoses.includes(d))
                            allDiagnoses.push(d);
                    });
                    // Consolidate allergies
                    docSummary.allergies.forEach((a) => {
                        if (!allAllergies.includes(a))
                            allAllergies.push(a);
                    });
                }
                catch (e) {
                    excludedDocs.push({
                        documentId: doc.id,
                        fileName: doc.file_name,
                        reason: `Error generating individual document summary: ${e?.message}`,
                    });
                }
            }
        }
        // Check for timeline changes or inconsistencies across documents
        if (includedDocs.length > 1) {
            timelineChanges.push(`Patient presented ${includedDocs.length} medical documents across consultation history.`);
            // Check for multiple prescriptions with potentially conflicting dosages
            const drugCounts = new Map();
            allMedications.forEach((m) => {
                const key = m.name.toLowerCase().trim();
                const existing = drugCounts.get(key) || [];
                existing.push({ doc: m.sourceDocument, dosage: m.dosage });
                drugCounts.set(key, existing);
            });
            drugCounts.forEach((occurrences, drugName) => {
                if (occurrences.length > 1) {
                    const dosages = occurrences.map((o) => o.dosage || 'unspecified dosage');
                    const distinctDosages = Array.from(new Set(dosages));
                    if (distinctDosages.length > 1) {
                        potentialInconsistencies.push(`Dosage discrepancy detected for '${drugName}': documented as ${distinctDosages.join(' vs ')} across different records.`);
                    }
                    else {
                        timelineChanges.push(`Repeated prescription for '${drugName}' confirmed across multiple records.`);
                    }
                }
            });
        }
        const provider = summary_service_js_1.SummaryService.getProvider();
        const generationMode = provider.isMock ? 'MOCK_SIMULATION' : 'LLM';
        const combinedSummary = {
            visitId,
            patientId: allDocs[0]?.patient_id || null,
            generatedAt: new Date().toISOString(),
            totalDocumentsCount: allDocs.length,
            includedDocuments: includedDocs,
            excludedOrFailedDocuments: excludedDocs,
            consolidatedFindings: consolidatedFindings.length > 0 ? consolidatedFindings : ['No prior clinical findings extracted.'],
            importantLabResults: allLabResults,
            timelineChanges,
            potentialInconsistencies,
            activeMedications: allMedications,
            diagnosesRecorded: allDiagnoses,
            allergiesRecorded: allAllergies,
            isStale: false,
            doctorReviewStatus: 'PENDING_REVIEW',
            generationMode,
        };
        // Store in PostgreSQL
        if (isDbUp) {
            try {
                await prisma_js_1.prisma.$executeRawUnsafe(`INSERT INTO combined_document_summaries 
           (visit_id, patient_id, summary_payload, total_documents_count, included_document_ids, excluded_document_ids, status, is_stale, generated_at)
           VALUES ($1, $2, $3::jsonb, $4, $5::jsonb, $6::jsonb, $7, $8, NOW())`, visitId, allDocs[0]?.patient_id || null, JSON.stringify(combinedSummary), allDocs.length, JSON.stringify(includedDocs.map((d) => d.documentId)), JSON.stringify(excludedDocs.map((d) => d.documentId)), 'PENDING_REVIEW', false);
            }
            catch (saveErr) {
                logger_js_1.logger.warn('Failed to persist combined_document_summaries to DB', { error: saveErr?.message, visitId });
            }
        }
        return combinedSummary;
    }
    /**
     * Marks existing combined summary as stale when a new document is uploaded.
     */
    static async markCombinedSummaryStale(visitId) {
        const isDbUp = await (0, prisma_js_1.checkDatabaseHealth)();
        if (isDbUp) {
            try {
                await prisma_js_1.prisma.$executeRawUnsafe(`UPDATE combined_document_summaries SET is_stale = TRUE, updated_at = NOW() WHERE visit_id = $1`, visitId);
            }
            catch (err) {
                logger_js_1.logger.warn('Failed to mark combined summary as stale', { error: err?.message, visitId });
            }
        }
    }
    /**
     * Allows an authorized doctor to approve the combined records summary.
     */
    static async approveCombinedSummary(visitId, doctorName, notes) {
        const isDbUp = await (0, prisma_js_1.checkDatabaseHealth)();
        if (isDbUp) {
            try {
                await prisma_js_1.prisma.$executeRawUnsafe(`UPDATE combined_document_summaries 
           SET status = 'APPROVED', doctor_notes = $1, doctor_approved_at = NOW(), doctor_approved_by = $2, updated_at = NOW()
           WHERE visit_id = $3`, notes || 'Approved by physician upon clinical review', doctorName, visitId);
            }
            catch (err) {
                logger_js_1.logger.warn('Failed to approve combined summary in DB', { error: err?.message, visitId });
            }
        }
        return this.getCombinedRecordSummary(visitId, false);
    }
}
exports.DocumentSummaryService = DocumentSummaryService;
