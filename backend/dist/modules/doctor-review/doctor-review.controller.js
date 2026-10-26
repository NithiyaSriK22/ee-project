"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DoctorReviewController = void 0;
const node_path_1 = __importDefault(require("node:path"));
const queue_service_js_1 = require("./queue/queue.service.js");
const workspace_service_js_1 = require("./workspace/workspace.service.js");
const review_service_js_1 = require("./review/review.service.js");
const confirmation_service_js_1 = require("./confirmation/confirmation.service.js");
const amendment_service_js_1 = require("./confirmation/amendment.service.js");
const doctor_review_repository_js_1 = require("./doctor-review.repository.js");
const token_util_js_1 = require("../../utils/token.util.js");
const doctor_review_types_js_1 = require("./doctor-review.types.js");
const app_error_js_1 = require("../../errors/app-error.js");
const prisma_js_1 = require("../../database/prisma.js");
const documents_service_js_1 = require("../documents/documents.service.js");
const documents_repository_js_1 = require("../documents/documents.repository.js");
const document_storage_service_js_1 = require("../documents/storage/document-storage.service.js");
const document_summary_service_js_1 = require("../summary/document-summary.service.js");
class DoctorReviewController {
    // ============================================================================
    // QUEUE ENDPOINTS
    // ============================================================================
    static async getQueue(req, res, next) {
        try {
            const queue = await queue_service_js_1.QueueService.getQueue(req.user, {
                department: req.query.department,
                status: req.query.status,
            });
            res.json({
                success: true,
                data: queue,
                count: queue.length,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async getDashboardStats(req, res, next) {
        try {
            const department = req.query.department || req.user?.hospitalDepartment || undefined;
            const stats = await doctor_review_repository_js_1.DoctorReviewRepository.getDashboardStats(department);
            res.json({
                success: true,
                data: stats,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async createQuickNote(req, res, next) {
        try {
            const noteText = req.body.noteText || req.body.note;
            const visitId = req.body.visitId || 'OPD-GENERAL';
            if (!noteText) {
                res.status(400).json({
                    success: false,
                    error: { code: 'VALIDATION_ERROR', message: 'Note text is required' },
                });
                return;
            }
            const note = await doctor_review_repository_js_1.DoctorReviewRepository.createQuickNote({
                visitId,
                noteText,
                doctorId: req.user.id,
                doctorName: req.user.fullName || 'Attending Physician',
            });
            res.status(201).json({
                success: true,
                data: note,
                message: 'Quick note saved successfully',
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async claimVisit(req, res, next) {
        try {
            const visitId = req.params.visitId;
            const result = await queue_service_js_1.QueueService.claimVisit(visitId, req.user, req.body);
            res.json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async releaseVisit(req, res, next) {
        try {
            const visitId = req.params.visitId;
            const result = await queue_service_js_1.QueueService.releaseVisit(visitId, req.user);
            res.json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    // ============================================================================
    // WORKSPACE & RAW VIEW ENDPOINTS
    // ============================================================================
    static async getWorkspace(req, res, next) {
        try {
            const visitId = req.params.visitId;
            const workspace = await workspace_service_js_1.WorkspaceService.getWorkspace(visitId, req.user, {
                outOfQueueReason: req.query.outOfQueueReason,
            });
            res.json({
                success: true,
                data: workspace,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async getRawView(req, res, next) {
        try {
            const visitId = req.params.visitId;
            const rawView = await workspace_service_js_1.WorkspaceService.getRawView(visitId, req.user);
            res.json({
                success: true,
                data: rawView,
            });
        }
        catch (error) {
            next(error);
        }
    }
    // ============================================================================
    // REVIEW ACTIONS ENDPOINTS
    // ============================================================================
    static async startReview(req, res, next) {
        try {
            const visitId = req.params.visitId;
            const review = await review_service_js_1.ReviewService.startReview(visitId, req.user, req.body);
            res.json({
                success: true,
                data: review,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async submitResolution(req, res, next) {
        try {
            const reviewId = req.params.reviewId;
            const resolution = await review_service_js_1.ReviewService.saveResolution(reviewId, req.body, req.user);
            res.json({
                success: true,
                data: resolution,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async editStatement(req, res, next) {
        try {
            const reviewId = req.params.reviewId;
            const statementId = req.params.statementId;
            const { editedText, previousTextRef } = req.body;
            const edit = await review_service_js_1.ReviewService.editStatement(reviewId, statementId, editedText, previousTextRef, req.user);
            res.json({
                success: true,
                data: edit,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async addStatement(req, res, next) {
        try {
            const reviewId = req.params.reviewId;
            const { section, text, order } = req.body;
            const statement = await review_service_js_1.ReviewService.addDoctorStatement(reviewId, section, text, order, req.user);
            res.json({
                success: true,
                data: statement,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async removeStatement(req, res, next) {
        try {
            const reviewId = req.params.reviewId;
            const statementId = req.params.statementId;
            const result = await review_service_js_1.ReviewService.removeStatement(reviewId, statementId, req.user);
            res.json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async rejectDraft(req, res, next) {
        try {
            const reviewId = req.params.reviewId;
            const { reason, note } = req.body;
            const review = await review_service_js_1.ReviewService.rejectDraft(reviewId, reason, note, req.user);
            res.json({
                success: true,
                data: review,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async requestRegeneration(req, res, next) {
        try {
            const reviewId = req.params.reviewId;
            const newSummary = await review_service_js_1.ReviewService.requestRegeneration(reviewId, req.body?.reason, req.user);
            res.json({
                success: true,
                data: newSummary,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async confirmReview(req, res, next) {
        try {
            const reviewId = req.params.reviewId;
            const { attestationAccepted, attestationVersion } = req.body;
            const confirmedRecord = await confirmation_service_js_1.ConfirmationService.confirmReview(reviewId, req.user, attestationAccepted, attestationVersion);
            res.json({
                success: true,
                data: confirmedRecord,
            });
        }
        catch (error) {
            next(error);
        }
    }
    // ============================================================================
    // CONFIRMED RECORDS & AMENDMENT ENDPOINTS
    // ============================================================================
    static async getLatestConfirmedRecord(req, res, next) {
        try {
            const visitId = req.params.visitId;
            const record = await amendment_service_js_1.AmendmentService.getLatestConfirmedRecord(visitId);
            res.json({
                success: true,
                data: record,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async getConfirmedRecordById(req, res, next) {
        try {
            const id = req.params.id;
            const record = await amendment_service_js_1.AmendmentService.getConfirmedRecord(id);
            res.json({
                success: true,
                data: record,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async getConfirmedRecordVersions(req, res, next) {
        try {
            const id = req.params.id;
            const record = await amendment_service_js_1.AmendmentService.getConfirmedRecord(id);
            const versions = await amendment_service_js_1.AmendmentService.getVersions(record.visitId);
            res.json({
                success: true,
                data: versions,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async amendConfirmedRecord(req, res, next) {
        try {
            const id = req.params.id;
            const { amendmentReason, statements, attestationAccepted, attestationVersion } = req.body;
            const record = await amendment_service_js_1.AmendmentService.amendRecord(id, req.user, amendmentReason, statements, attestationAccepted, attestationVersion);
            res.json({
                success: true,
                data: record,
            });
        }
        catch (error) {
            next(error);
        }
    }
    // ============================================================================
    // PROVENANCE & SIGNED DOCUMENT SNIPPET ENDPOINTS
    // ============================================================================
    static async getStatementSources(req, res, next) {
        try {
            const statementId = req.params.statementId;
            // Audit source opened
            await doctor_review_repository_js_1.DoctorReviewRepository.recordAuditEvent({
                action: doctor_review_types_js_1.DoctorReviewAuditEvents.SOURCE_OPENED,
                visitId: 'statement-provenance',
                actorId: req.user?.id,
                actorRole: req.user?.role,
                metadata: { statementId },
            });
            res.json({
                success: true,
                data: {
                    statementId,
                    explanation: 'Provenance traceability linked to Module 3 answers and Module 4 verified document fields.',
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    // Active short-lived signed snippet tokens (key: token -> { documentId, expiresAt })
    static activeSnippetTokens = new Map();
    static async getDocumentSnippet(req, res, next) {
        try {
            const documentId = req.params.documentId;
            const requestedVisitId = req.query.visitId;
            const requestedPatientId = req.query.patientId;
            if (!req.user || !['DOCTOR', 'SUPER_ADMIN'].includes(req.user.role)) {
                throw new app_error_js_1.ForbiddenError('Signed document snippet access restricted to treating physicians.');
            }
            // Validate documentId against path traversal
            document_storage_service_js_1.DocumentStorageService.validateIdentifier(documentId, 'documentId');
            if (requestedVisitId) {
                document_storage_service_js_1.DocumentStorageService.validateIdentifier(requestedVisitId, 'visitId');
            }
            if (requestedPatientId) {
                document_storage_service_js_1.DocumentStorageService.validateIdentifier(requestedPatientId, 'patientId');
            }
            const doc = await documents_repository_js_1.DocumentsRepository.findDocumentById(documentId);
            // Enforce cross-patient / visit isolation if document record exists
            if (doc) {
                if (requestedVisitId && doc.visit_id !== requestedVisitId) {
                    throw new app_error_js_1.ForbiddenError('Access denied: Document does not belong to the requested visit session.');
                }
                if (requestedPatientId && doc.patient_id && doc.patient_id !== requestedPatientId) {
                    throw new app_error_js_1.ForbiddenError('Access denied: Document does not belong to the requested patient.');
                }
                // Enforce claim check: if claimed by another doctor, verify unexpired claim
                const existingClaim = await doctor_review_repository_js_1.DoctorReviewRepository.getClaim(doc.visit_id);
                if (existingClaim &&
                    existingClaim.claimedByDoctorId &&
                    existingClaim.claimedByDoctorId !== req.user.id &&
                    req.user.role !== 'SUPER_ADMIN') {
                    if (existingClaim.expiresAt && new Date(existingClaim.expiresAt) > new Date()) {
                        if (!req.query.outOfQueueReason && !req.body?.outOfQueueReason) {
                            throw new app_error_js_1.ForbiddenError(`Case is currently claimed by Dr. ${existingClaim.claimedByDoctorName || 'another doctor'}. Cannot access document sources without permission.`);
                        }
                    }
                }
            }
            const fileName = doc?.file_name || 'Prescription_Document.png';
            const visitId = doc?.visit_id || requestedVisitId || documentId;
            // Generate a short-lived cryptographic signed access token (15 minutes expiry)
            const { token: signedSnippetToken, expiresAt } = token_util_js_1.TokenUtil.generateSignedDocumentToken(documentId, req.user.id, 15 * 60 * 1000);
            DoctorReviewController.activeSnippetTokens.set(signedSnippetToken, { documentId, expiresAt });
            // Clean up expired tokens
            const now = Date.now();
            for (const [t, data] of DoctorReviewController.activeSnippetTokens.entries()) {
                if (data.expiresAt.getTime() < now) {
                    DoctorReviewController.activeSnippetTokens.delete(t);
                }
            }
            // Audit source inspection
            await doctor_review_repository_js_1.DoctorReviewRepository.recordAuditEvent({
                action: doctor_review_types_js_1.DoctorReviewAuditEvents.SOURCE_OPENED,
                visitId,
                actorId: req.user.id,
                actorRole: req.user.role,
                metadata: { documentId, snippetAccess: 'SIGNED_TOKEN_ISSUED' },
            });
            const cropUrl = `/api/v1/doctor/documents/${documentId}/image?token=${signedSnippetToken}`;
            res.json({
                success: true,
                data: {
                    documentId,
                    signedToken: signedSnippetToken,
                    signedUrl: cropUrl,
                    cropSnippetUrl: cropUrl,
                    expiresAt: expiresAt.toISOString(),
                    fileName,
                    mimeType: doc?.mime_type || (fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/png'),
                    snippetRef: req.query.snippetRef || 'prescription_field_1',
                    snippetCropCoordinates: { x: 45, y: 120, width: 340, height: 180 },
                    message: 'Signed short-lived document snippet URL generated (expires in 15 minutes).',
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async streamDocumentImage(req, res, next) {
        try {
            const documentId = req.params.documentId;
            const token = req.query.token;
            const requestedVisitId = req.query.visitId;
            const requestedPatientId = req.query.patientId;
            // 0. Path traversal validation
            document_storage_service_js_1.DocumentStorageService.validateIdentifier(documentId, 'documentId');
            if (requestedVisitId) {
                document_storage_service_js_1.DocumentStorageService.validateIdentifier(requestedVisitId, 'visitId');
            }
            if (requestedPatientId) {
                document_storage_service_js_1.DocumentStorageService.validateIdentifier(requestedPatientId, 'patientId');
            }
            let isAuthorized = false;
            let doctorId = 'signed-token-viewer';
            // 1. Check cryptographic signed query token (?token=...)
            if (token) {
                const verified = token_util_js_1.TokenUtil.verifySignedDocumentToken(token);
                if (verified && verified.documentId === documentId) {
                    isAuthorized = true;
                    doctorId = verified.doctorId;
                }
                else if (DoctorReviewController.activeSnippetTokens.has(token)) {
                    const stored = DoctorReviewController.activeSnippetTokens.get(token);
                    if (stored.documentId === documentId && stored.expiresAt > new Date()) {
                        isAuthorized = true;
                    }
                }
            }
            // 2. Check Bearer Authorization header if token not used or expired
            if (!isAuthorized && req.headers.authorization?.startsWith('Bearer ')) {
                const jwtToken = req.headers.authorization.split(' ')[1];
                if (jwtToken) {
                    const claims = token_util_js_1.TokenUtil.verifyStaffAccessToken(jwtToken);
                    if (!['DOCTOR', 'SUPER_ADMIN'].includes(claims.role)) {
                        throw new app_error_js_1.ForbiddenError('Access restricted to physicians and administrators.');
                    }
                    isAuthorized = true;
                    doctorId = claims.sub;
                }
            }
            // If caller is neither verified by signed token nor staff doctor Bearer header, deny immediately with 403
            if (!isAuthorized) {
                throw new app_error_js_1.ForbiddenError('Invalid, expired, or missing signed document access token');
            }
            // 3. Verify document exists in database/repository before streaming
            const doc = await documents_repository_js_1.DocumentsRepository.findDocumentById(documentId);
            if (!doc) {
                throw new app_error_js_1.NotFoundError(`Document not found: ${documentId}`);
            }
            // Enforce cross-patient visit association check if specified in query
            if (requestedVisitId && doc.visit_id !== requestedVisitId) {
                throw new app_error_js_1.ForbiddenError('Access denied: Document does not belong to the requested visit session.');
            }
            if (requestedPatientId && doc.patient_id && doc.patient_id !== requestedPatientId) {
                throw new app_error_js_1.ForbiddenError('Access denied: Document does not belong to the requested patient.');
            }
            // Check claim ownership: if claimed by another doctor, block unauthorized viewing unless super admin or outOfQueueReason
            const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';
            if (!isSuperAdmin && doctorId && doctorId !== 'signed-token-viewer') {
                const existingClaim = await doctor_review_repository_js_1.DoctorReviewRepository.getClaim(doc.visit_id);
                if (existingClaim &&
                    existingClaim.claimedByDoctorId &&
                    existingClaim.claimedByDoctorId !== doctorId) {
                    if (existingClaim.expiresAt && new Date(existingClaim.expiresAt) > new Date()) {
                        if (!req.query.outOfQueueReason && !req.body?.outOfQueueReason) {
                            throw new app_error_js_1.ForbiddenError('Access denied: Case is claimed by another physician.');
                        }
                    }
                }
            }
            // Retrieve verified physical file metadata from DocumentsService
            const fileInfo = await documents_service_js_1.DocumentsService.getDocumentFile(documentId);
            // Audit source image inspection
            doctor_review_repository_js_1.DoctorReviewRepository.recordAuditEvent({
                action: doctor_review_types_js_1.DoctorReviewAuditEvents.SOURCE_OPENED,
                visitId: fileInfo.visitId || documentId,
                actorId: doctorId,
                actorRole: 'DOCTOR',
                metadata: { documentId, streamType: 'ORIGINAL_IMAGE_STREAM', fileName: fileInfo.fileName },
            }).catch(() => { });
            const safeFileName = node_path_1.default.basename(fileInfo.fileName).replace(/["\r\n]/g, '_');
            res.setHeader('Content-Type', fileInfo.mimeType);
            res.setHeader('Content-Disposition', `inline; filename="${safeFileName}"`);
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('Cache-Control', 'private, max-age=300');
            res.sendFile(fileInfo.filePath);
        }
        catch (error) {
            next(error);
        }
    }
    // ============================================================================
    // MEDICAL RECORDS & AI SUMMARIES ENDPOINTS (Patient-Doctor Portal Integration)
    // ============================================================================
    static async getMedicalRecordsForVisit(req, res, next) {
        try {
            const visitId = req.params.visitId;
            const docs = await documents_repository_js_1.DocumentsRepository.findDocumentsByVisitId(visitId);
            // Attach individual AI summary to each document
            const enrichedDocs = await Promise.all(docs.map(async (doc) => {
                let summary = doc.summary;
                if (!summary) {
                    try {
                        summary = await document_summary_service_js_1.DocumentSummaryService.summarizeDocument(doc.id);
                    }
                    catch { }
                }
                return {
                    id: doc.id,
                    visitId: doc.visit_id,
                    patientId: doc.patient_id,
                    documentType: doc.document_type,
                    fileName: doc.file_name,
                    mimeType: doc.mime_type,
                    fileSizeBytes: doc.file_size_bytes,
                    ocrStatus: doc.ocr_status,
                    overallStatus: doc.overall_status,
                    ocrErrorMessage: doc.ocr_error_message ||
                        (doc.ocr_status === 'FAILED'
                            ? 'Handwritten text could not be reliably extracted. Please review the original document.'
                            : null),
                    uploadedAt: doc.uploaded_at || doc.created_at || null,
                    scanDate: doc.scan_date || null,
                    scanType: doc.scan_type || null,
                    doctorNotes: doc.doctor_notes || null,
                    metadata: doc.metadata || null,
                    summary,
                };
            }));
            res.json({
                success: true,
                data: enrichedDocs,
                message: 'Medical records and individual AI summaries retrieved',
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async getIndividualDocumentSummary(req, res, next) {
        try {
            const documentId = req.params.documentId;
            const summary = await document_summary_service_js_1.DocumentSummaryService.summarizeDocument(documentId);
            res.json({
                success: true,
                data: summary,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async getCombinedRecordSummary(req, res, next) {
        try {
            const visitId = req.params.visitId;
            const forceRegenerate = req.query.regenerate === 'true';
            const summary = await document_summary_service_js_1.DocumentSummaryService.getCombinedRecordSummary(visitId, forceRegenerate);
            res.json({
                success: true,
                data: summary,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async regenerateCombinedRecordSummary(req, res, next) {
        try {
            const visitId = req.params.visitId;
            const summary = await document_summary_service_js_1.DocumentSummaryService.getCombinedRecordSummary(visitId, true);
            res.json({
                success: true,
                data: summary,
                message: 'Combined medical records summary regenerated successfully',
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async approveCombinedRecordSummary(req, res, next) {
        try {
            const visitId = req.params.visitId;
            const doctorName = req.user?.fullName || req.user?.email || 'Attending Physician';
            const notes = req.body?.notes;
            const summary = await document_summary_service_js_1.DocumentSummaryService.approveCombinedSummary(visitId, doctorName, notes);
            res.json({
                success: true,
                data: summary,
                message: 'Combined medical records summary approved by physician',
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async uploadVisitDocument(req, res, next) {
        try {
            const { visitId } = req.params;
            const patientId = req.body?.patientId;
            if (!visitId) {
                throw new app_error_js_1.ValidationError('Visit ID is required');
            }
            let fileData;
            if (req.file) {
                const f = req.file;
                if (!f.buffer || f.size === 0) {
                    throw new app_error_js_1.ValidationError('Uploaded file is empty.');
                }
                fileData = {
                    buffer: f.buffer,
                    originalname: f.originalname || 'uploaded_document.bin',
                    mimetype: f.mimetype,
                    size: f.size,
                };
            }
            else if (req.body?.fileBase64 !== undefined) {
                const buffer = Buffer.from(req.body.fileBase64, 'base64');
                fileData = {
                    buffer,
                    originalname: req.body.fileName || 'uploaded_doc.jpg',
                    mimetype: req.body.mimeType || 'image/jpeg',
                    size: buffer.length,
                };
            }
            else {
                throw new app_error_js_1.ValidationError('No document file payload provided.');
            }
            let resolvedPatientId = patientId;
            if (!resolvedPatientId) {
                const vp = await prisma_js_1.prisma.patientVisitProfile.findFirst({ where: { visit_id: visitId } });
                resolvedPatientId = vp?.patient_id || 'default_patient';
            }
            const documentType = req.body?.documentType || 'PRESCRIPTION';
            const result = await documents_service_js_1.DocumentsService.uploadAndProcessDocument(visitId, resolvedPatientId, fileData, documentType);
            res.status(201).json({
                success: true,
                data: result,
                message: 'Document uploaded and processed successfully',
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.DoctorReviewController = DoctorReviewController;
