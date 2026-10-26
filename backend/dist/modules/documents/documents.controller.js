"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentsController = void 0;
const node_path_1 = __importDefault(require("node:path"));
const documents_service_js_1 = require("./documents.service.js");
const response_util_js_1 = require("../../utils/response.util.js");
const app_error_js_1 = require("../../errors/app-error.js");
class DocumentsController {
    static async uploadDocument(req, res, next) {
        try {
            if (!req.kioskSession) {
                throw new app_error_js_1.AuthenticationError('Active kiosk session required');
            }
            const { visitId, patientId } = req.kioskSession;
            let fileData;
            // Handle Multer upload or JSON base64 upload
            if (req.file) {
                const f = req.file;
                if (!f.buffer || f.size === 0) {
                    throw new app_error_js_1.ValidationError('Uploaded file is empty (0 bytes). Please upload a valid document.');
                }
                fileData = {
                    buffer: f.buffer,
                    originalname: f.originalname || 'uploaded_document.bin',
                    mimetype: f.mimetype,
                    size: f.size,
                };
            }
            else if (req.body?.fileBase64 !== undefined) {
                if (typeof req.body.fileBase64 !== 'string' || req.body.fileBase64.trim() === '') {
                    throw new app_error_js_1.ValidationError('Uploaded file is empty (0 bytes). Please upload a valid document.');
                }
                let buffer;
                try {
                    buffer = Buffer.from(req.body.fileBase64, 'base64');
                }
                catch {
                    throw new app_error_js_1.ValidationError('Malformed base64 file data provided.');
                }
                if (buffer.length === 0) {
                    throw new app_error_js_1.ValidationError('Uploaded file is empty (0 bytes). Please upload a valid document.');
                }
                if (buffer.length > 15 * 1024 * 1024) {
                    throw new app_error_js_1.ValidationError('File size exceeds maximum permitted limit of 15MB.');
                }
                fileData = {
                    buffer,
                    originalname: req.body.fileName || 'scanned_prescription.jpg',
                    mimetype: req.body.mimeType || 'image/jpeg',
                    size: buffer.length,
                };
            }
            else {
                throw new app_error_js_1.ValidationError('No document file payload provided. Provide multipart file or fileBase64.');
            }
            const documentType = req.body?.documentType || 'PRESCRIPTION';
            const scanDate = req.body?.scanDate || null;
            const scanType = req.body?.scanType || null;
            const doctorNotes = req.body?.doctorNotes || req.body?.notes || null;
            let metadata = req.body?.metadata || null;
            if (typeof metadata === 'string') {
                try {
                    metadata = JSON.parse(metadata);
                }
                catch { }
            }
            const result = await documents_service_js_1.DocumentsService.uploadAndProcessDocument(visitId, patientId, fileData, documentType, {
                scanDate,
                scanType,
                doctorNotes,
                metadata,
            });
            response_util_js_1.ResponseUtil.created(res, result, 'Document uploaded and routed according to clinical classification');
        }
        catch (error) {
            next(error);
        }
    }
    static async getDocumentStatus(req, res, next) {
        try {
            if (!req.kioskSession) {
                throw new app_error_js_1.AuthenticationError('Active kiosk session required');
            }
            const { id } = req.params;
            if (!id)
                throw new app_error_js_1.ValidationError('Document ID is required');
            const status = await documents_service_js_1.DocumentsService.getDocumentStatus(id, req.kioskSession.visitId);
            response_util_js_1.ResponseUtil.success(res, status, 'Document status retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    }
    static async getValidatedFields(req, res, next) {
        try {
            if (!req.kioskSession) {
                throw new app_error_js_1.AuthenticationError('Active kiosk session required');
            }
            const { id } = req.params;
            if (!id)
                throw new app_error_js_1.ValidationError('Document ID is required');
            const fields = await documents_service_js_1.DocumentsService.getValidatedFields(id, req.kioskSession.visitId);
            response_util_js_1.ResponseUtil.success(res, fields, 'Validated document fields retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    }
    static async revalidate(req, res, next) {
        try {
            if (!req.kioskSession) {
                throw new app_error_js_1.AuthenticationError('Active kiosk session required');
            }
            const { id } = req.params;
            if (!id)
                throw new app_error_js_1.ValidationError('Document ID is required');
            const result = await documents_service_js_1.DocumentsService.revalidate(id, req.kioskSession.visitId);
            response_util_js_1.ResponseUtil.success(res, result, 'Document re-validated with active reference dataset');
        }
        catch (error) {
            next(error);
        }
    }
    static async listVisitDocuments(req, res, next) {
        try {
            if (!req.kioskSession) {
                throw new app_error_js_1.AuthenticationError('Active kiosk session required');
            }
            const docs = await documents_service_js_1.DocumentsService.listVisitDocuments(req.kioskSession.visitId);
            response_util_js_1.ResponseUtil.success(res, docs, 'Visit documents retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    }
    static async streamDocumentFile(req, res, next) {
        try {
            if (!req.kioskSession) {
                throw new app_error_js_1.AuthenticationError('Active kiosk session required');
            }
            const { id } = req.params;
            if (!id)
                throw new app_error_js_1.ValidationError('Document ID is required');
            const fileInfo = await documents_service_js_1.DocumentsService.getDocumentFile(id, req.kioskSession.visitId);
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
}
exports.DocumentsController = DocumentsController;
