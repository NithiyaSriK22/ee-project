"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentSummaryService = void 0;
const prisma_js_1 = require("../../database/prisma.js");
const documents_repository_js_1 = require("../documents/documents.repository.js");
const document_storage_service_js_1 = require("../documents/storage/document-storage.service.js");
const logger_js_1 = require("../../config/logger.js");
const summary_service_js_1 = require("./summary.service.js");
const documents_types_js_1 = require("../documents/documents.types.js");
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
        // Medical Imaging documents (Ultrasound, X-Ray, CT, MRI):
        // Bypass text OCR and AI hallucination, preserve for visual physician inspection
        if ((0, documents_types_js_1.isMedicalImagingDocument)(document.document_type)) {
            const scanDateStr = document.scan_date
                ? new Date(document.scan_date).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                })
                : null;
            const modalityName = document.scan_type || `${document.document_type.replace(/_/g, ' ')}`;
            const doctorNotes = document.doctor_notes || null;
            const imagingSummary = {
                documentId: document.id,
                fileName: document.file_name,
                documentType: document.document_type,
                documentDate: scanDateStr || 'Date unavailable',
                reportOrTestName: modalityName,
                summaryStatus: 'AVAILABLE',
                extractionStatus: 'SUCCESSFUL',
                clinicalWarning: null,
                isHandwritten: false,
                importantFindings: [
                    `Diagnostic imaging scan: ${document.file_name} (${modalityName}).`,
                    'Direct visual inspection by treating physician required. Ordinary text OCR and automated interpretations are bypassed for radiological safety.',
                ],
                laboratoryResults: [],
                abnormalValues: [],
                diagnoses: [],
                medications: [],
                allergies: [],
                clinicalObservations: [
                    `Modality: ${modalityName}`,
                    scanDateStr ? `Scan Date: ${scanDateStr}` : 'Scan date not specified',
                    doctorNotes ? `Patient Notes: "${doctorNotes}"` : 'No patient notes provided.',
                    'Original high-resolution image preserved for clinical zoom inspection.',
                ],
                missingOrUnreadableInfo: [],
                generatedAt: new Date().toISOString(),
                modelId: 'IMAGING_PHYSICIAN_GATE',
                isMock: false,
                rawTextExcerpt: doctorNotes
                    ? `[Patient Note: ${doctorNotes}]`
                    : '[Medical imaging file - visual inspection required]',
            };
            const isDbUp = await (0, prisma_js_1.checkDatabaseHealth)();
            if (isDbUp) {
                try {
                    await prisma_js_1.prisma.$executeRawUnsafe(`UPDATE uploaded_documents SET summary = $1::jsonb, updated_at = NOW() WHERE id = $2::uuid`, JSON.stringify(imagingSummary), documentId);
                }
                catch { }
            }
            await document_storage_service_js_1.DocumentStorageService.saveDocumentMetadata(document.visit_id, {
                ...document,
                summary: imagingSummary,
            });
            return imagingSummary;
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
        const isFailed = document.ocr_status === 'FAILED' || document.overall_status === 'EXTRACTION_FAILED';
        if (isFailed) {
            const failedSummary = {
                documentId: document.id,
                fileName: document.file_name,
                documentType: document.document_type,
                documentDate: docDate,
                reportOrTestName: reportName,
                summaryStatus: 'UNAVAILABLE',
                extractionStatus: 'FAILED',
                clinicalWarning: 'Handwritten text could not be reliably extracted. Please review the original document.',
                isHandwritten: true,
                importantFindings: [],
                laboratoryResults: [],
                abnormalValues: [],
                diagnoses: [],
                medications: [],
                allergies: [],
                clinicalObservations: [
                    'Automated summarization withheld: Optical character recognition failed to reliably extract clinical text.',
                    'Manual clinical verification of the original physical image is required.',
                ],
                missingOrUnreadableInfo: [
                    'Handwritten text could not be reliably extracted. Please review the original document.',
                    'Treating physician must review the original scan directly before clinical decisions.',
                ],
                generatedAt: new Date().toISOString(),
                modelId: 'SAFE_EXTRACTION_GATE',
                isMock: false,
                rawTextExcerpt: document.ocr_error_message || '[Handwritten text could not be reliably extracted. Please review the original document.]',
            };
            const isDbUp = await (0, prisma_js_1.checkDatabaseHealth)();
            if (isDbUp) {
                try {
                    await prisma_js_1.prisma.$executeRawUnsafe(`UPDATE uploaded_documents SET summary = $1::jsonb, updated_at = NOW() WHERE id = $2::uuid`, JSON.stringify(failedSummary), documentId);
                }
                catch (err) {
                    logger_js_1.logger.warn('Failed to update uploaded_documents.summary via SQL', { error: err?.message, documentId });
                }
            }
            await document_storage_service_js_1.DocumentStorageService.saveDocumentMetadata(document.visit_id, {
                ...document,
                summary: failedSummary,
            });
            return failedSummary;
        }
        const isPartial = document.ocr_status === 'PARTIALLY_SUCCESSFUL' || document.overall_status === 'PARTIALLY_VERIFIED';
        const summaryStatus = isPartial ? 'PARTIAL' : 'AVAILABLE';
        const extractionStatus = isPartial ? 'PARTIALLY_SUCCESSFUL' : 'SUCCESSFUL';
        const clinicalWarning = isPartial
            ? 'Partial extraction only: Some handwritten notes could not be verified. Refer to original document.'
            : null;
        if (isPartial) {
            missingOrUnreadable.push('Partial extraction: Handwritten prescription body could not be fully transcribed.');
        }
        if (clinicalObservations.length === 0 && importantFindings.length > 0) {
            clinicalObservations.push(`Record analyzed with ${validatedFields.length} verified clinical formulary tokens.`);
        }
        const provider = summary_service_js_1.SummaryService.getProvider();
        let isMock = provider.isMock !== false;
        let modelId = provider.modelId || 'medikiosk-clinical-document-v1';
        // If a real AI provider is configured, attempt genuine live inference on verified excerpt
        if (!isMock && typeof provider.generate === 'function' && importantFindings.length > 0) {
            try {
                const rawExcerpt = rawFields.map((f) => f.raw_text || f.rawText).filter(Boolean).join(' ').slice(0, 800);
                const systemPrompt = 'You are a clinical summarization AI. Analyze the extracted clinical text and respond ONLY with a JSON object with keys: importantFindings (array of strings) and clinicalObservations (array of strings). Do not invent information.';
                const userPayload = JSON.stringify({ documentType: document.document_type, extractedText: rawExcerpt, verifiedMedications: medications.map((m) => m.name) });
                const llmResult = await provider.generate(userPayload, systemPrompt);
                let parsed = null;
                try {
                    parsed = JSON.parse(llmResult.rawOutput);
                }
                catch {
                    // LLM returned non-JSON output
                }
                if (parsed && Array.isArray(parsed.importantFindings) && parsed.importantFindings.length > 0) {
                    importantFindings.push(...parsed.importantFindings.filter((f) => !importantFindings.includes(f)));
                    isMock = false;
                    modelId = provider.modelId;
                }
                else {
                    modelId = provider.modelId;
                    isMock = false;
                }
            }
            catch (err) {
                logger_js_1.logger.warn('LLM provider unavailable for individual document summary, falling back to deterministic extraction', {
                    documentId,
                    error: err?.message,
                });
                isMock = false;
                modelId = 'TEMPLATE_FALLBACK';
                clinicalObservations.push('Document analyzed via deterministic template fallback: Local LLM service was unavailable.');
            }
        }
        const individualSummary = {
            documentId: document.id,
            fileName: document.file_name,
            documentType: document.document_type,
            documentDate: docDate,
            reportOrTestName: reportName,
            summaryStatus,
            extractionStatus,
            clinicalWarning,
            isHandwritten: isPartial,
            importantFindings: importantFindings.length > 0 ? importantFindings : (isPartial ? ['Partial document header recorded for physician review.'] : ['Document uploaded and archived for physician inspection.']),
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
                    reason: doc.ocr_error_message || 'Handwritten text could not be reliably extracted. Please review the original document.',
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
                    // Only consolidate medications, labs, and diagnoses for textual clinical documents
                    if (!(0, documents_types_js_1.isMedicalImagingDocument)(doc.document_type)) {
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
                    else {
                        timelineChanges.push(`Diagnostic Imaging Study: ${doc.file_name} (${doc.scan_type || doc.document_type}) uploaded for physician review.`);
                    }
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
                const dosageMatch = m.dosage || m.name.match(/\b\d+\s*(?:mg|ml|g)\b/i)?.[0] || null;
                const key = m.name.replace(/\s*\d+\s*(?:mg|ml|g)\b/i, '').toLowerCase().trim();
                const existing = drugCounts.get(key) || [];
                existing.push({ doc: m.sourceDocument, dosage: dosageMatch });
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
        let generationMode = provider.isMock ? 'MOCK_SIMULATION' : 'LLM';
        if (!provider.isMock && typeof provider.generate === 'function') {
            try {
                const systemPrompt = 'You are a multi-document clinical synthesis AI. Compare medical records, identify timeline changes and potential inconsistencies, and respond ONLY with a JSON object containing keys: timelineChanges (array of strings), potentialInconsistencies (array of strings).';
                const userPayload = JSON.stringify({
                    visitId,
                    totalDocuments: allDocs.length,
                    medications: allMedications,
                    labResults: allLabResults,
                    diagnoses: allDiagnoses,
                });
                const llmResult = await provider.generate(userPayload, systemPrompt);
                let parsed = null;
                try {
                    parsed = JSON.parse(llmResult.rawOutput);
                }
                catch { }
                if (parsed) {
                    if (Array.isArray(parsed.timelineChanges)) {
                        parsed.timelineChanges.forEach((t) => {
                            if (!timelineChanges.includes(t))
                                timelineChanges.push(t);
                        });
                    }
                    if (Array.isArray(parsed.potentialInconsistencies)) {
                        parsed.potentialInconsistencies.forEach((i) => {
                            if (!potentialInconsistencies.includes(i))
                                potentialInconsistencies.push(i);
                        });
                    }
                    generationMode = 'LLM';
                }
            }
            catch (err) {
                logger_js_1.logger.warn('LLM provider unavailable for combined document summary synthesis, falling back to template synthesis', {
                    visitId,
                    error: err?.message,
                });
                generationMode = 'TEMPLATE_FALLBACK';
                timelineChanges.push('Consolidated via deterministic template fallback: Local LLM service was unavailable.');
            }
        }
        if (includedDocs.length === 0 && allDocs.length > 0) {
            timelineChanges.push('Automated summary unavailable: All uploaded documents contain handwritten or unreadable text. Physician must inspect original documents.');
        }
        const combinedSummary = {
            visitId,
            patientId: allDocs[0]?.patient_id || null,
            generatedAt: new Date().toISOString(),
            totalDocumentsCount: allDocs.length,
            includedDocuments: includedDocs,
            excludedOrFailedDocuments: excludedDocs,
            consolidatedFindings: consolidatedFindings.length > 0 ? consolidatedFindings : (includedDocs.length === 0 ? [] : ['No prior clinical findings extracted.']),
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
                const existing = await prisma_js_1.prisma.$queryRawUnsafe(`SELECT id FROM combined_document_summaries WHERE visit_id = $1 LIMIT 1`, visitId);
                if (existing && existing.length > 0) {
                    await prisma_js_1.prisma.$executeRawUnsafe(`UPDATE combined_document_summaries
             SET summary_payload = $1::jsonb, total_documents_count = $2, included_document_ids = $3::jsonb, excluded_document_ids = $4::jsonb, is_stale = FALSE, updated_at = NOW()
             WHERE visit_id = $5`, JSON.stringify(combinedSummary), allDocs.length, JSON.stringify(includedDocs.map((d) => d.documentId)), JSON.stringify(excludedDocs.map((d) => d.documentId)), visitId);
                    combinedSummary.id = existing[0].id;
                }
                else {
                    const inserted = await prisma_js_1.prisma.$queryRawUnsafe(`INSERT INTO combined_document_summaries
             (id, visit_id, patient_id, summary_payload, total_documents_count, included_document_ids, excluded_document_ids, status, is_stale, generated_at, created_at, updated_at)
             VALUES (gen_random_uuid(), $1, $2::uuid, $3::jsonb, $4, $5::jsonb, $6::jsonb, $7, $8, NOW(), NOW(), NOW())
             RETURNING id`, visitId, allDocs[0]?.patient_id || null, JSON.stringify(combinedSummary), allDocs.length, JSON.stringify(includedDocs.map((d) => d.documentId)), JSON.stringify(excludedDocs.map((d) => d.documentId)), 'PENDING_REVIEW', false);
                    if (inserted && inserted.length > 0) {
                        combinedSummary.id = inserted[0].id;
                    }
                }
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
