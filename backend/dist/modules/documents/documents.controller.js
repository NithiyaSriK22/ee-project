"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentsController = void 0;
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
                fileData = {
                    buffer: f.buffer,
                    originalname: f.originalname,
                    mimetype: f.mimetype,
                    size: f.size,
                };
            }
            else if (req.body?.fileBase64) {
                const buffer = Buffer.from(req.body.fileBase64, 'base64');
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
            const result = await documents_service_js_1.DocumentsService.uploadAndProcessDocument(visitId, patientId, fileData, documentType);
            response_util_js_1.ResponseUtil.created(res, result, 'Document uploaded, OCR extracted, and validated deterministically');
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
}
exports.DocumentsController = DocumentsController;
