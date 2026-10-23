import path from 'node:path';
import { Response, NextFunction } from 'express';
import { AppRequest } from '../../types/api.types.js';
import { DocumentsService } from './documents.service.js';
import { ResponseUtil } from '../../utils/response.util.js';
import { AuthenticationError, ValidationError } from '../../errors/app-error.js';

export class DocumentsController {
  public static async uploadDocument(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.kioskSession) {
        throw new AuthenticationError('Active kiosk session required');
      }

      const { visitId, patientId } = req.kioskSession;
      let fileData: { buffer: Buffer; originalname: string; mimetype: string; size: number };

      // Handle Multer upload or JSON base64 upload
      if ((req as any).file) {
        const f = (req as any).file;
        if (!f.buffer || f.size === 0) {
          throw new ValidationError('Uploaded file is empty (0 bytes). Please upload a valid document.');
        }
        fileData = {
          buffer: f.buffer,
          originalname: f.originalname || 'uploaded_document.bin',
          mimetype: f.mimetype,
          size: f.size,
        };
      } else if (req.body?.fileBase64 !== undefined) {
        if (typeof req.body.fileBase64 !== 'string' || req.body.fileBase64.trim() === '') {
          throw new ValidationError('Uploaded file is empty (0 bytes). Please upload a valid document.');
        }
        let buffer: Buffer;
        try {
          buffer = Buffer.from(req.body.fileBase64, 'base64');
        } catch {
          throw new ValidationError('Malformed base64 file data provided.');
        }
        if (buffer.length === 0) {
          throw new ValidationError('Uploaded file is empty (0 bytes). Please upload a valid document.');
        }
        if (buffer.length > 15 * 1024 * 1024) {
          throw new ValidationError('File size exceeds maximum permitted limit of 15MB.');
        }
        fileData = {
          buffer,
          originalname: req.body.fileName || 'scanned_prescription.jpg',
          mimetype: req.body.mimeType || 'image/jpeg',
          size: buffer.length,
        };
      } else {
        throw new ValidationError('No document file payload provided. Provide multipart file or fileBase64.');
      }

      const documentType = req.body?.documentType || 'PRESCRIPTION';
      const result = await DocumentsService.uploadAndProcessDocument(
        visitId,
        patientId,
        fileData,
        documentType
      );

      ResponseUtil.created(res, result, 'Document uploaded, OCR extracted, and validated deterministically');
    } catch (error) {
      next(error);
    }
  }

  public static async getDocumentStatus(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.kioskSession) {
        throw new AuthenticationError('Active kiosk session required');
      }

      const { id } = req.params;
      if (!id) throw new ValidationError('Document ID is required');

      const status = await DocumentsService.getDocumentStatus(id, req.kioskSession.visitId);
      ResponseUtil.success(res, status, 'Document status retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async getValidatedFields(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.kioskSession) {
        throw new AuthenticationError('Active kiosk session required');
      }

      const { id } = req.params;
      if (!id) throw new ValidationError('Document ID is required');

      const fields = await DocumentsService.getValidatedFields(id, req.kioskSession.visitId);
      ResponseUtil.success(res, fields, 'Validated document fields retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async revalidate(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.kioskSession) {
        throw new AuthenticationError('Active kiosk session required');
      }

      const { id } = req.params;
      if (!id) throw new ValidationError('Document ID is required');

      const result = await DocumentsService.revalidate(id, req.kioskSession.visitId);
      ResponseUtil.success(res, result, 'Document re-validated with active reference dataset');
    } catch (error) {
      next(error);
    }
  }

  public static async listVisitDocuments(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.kioskSession) {
        throw new AuthenticationError('Active kiosk session required');
      }

      const docs = await DocumentsService.listVisitDocuments(req.kioskSession.visitId);
      ResponseUtil.success(res, docs, 'Visit documents retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async streamDocumentFile(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.kioskSession) {
        throw new AuthenticationError('Active kiosk session required');
      }

      const { id } = req.params;
      if (!id) throw new ValidationError('Document ID is required');

      const fileInfo = await DocumentsService.getDocumentFile(id, req.kioskSession.visitId);

      const safeFileName = path.basename(fileInfo.fileName).replace(/["\r\n]/g, '_');
      res.setHeader('Content-Type', fileInfo.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${safeFileName}"`);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'private, max-age=300');
      res.sendFile(fileInfo.filePath);
    } catch (error) {
      next(error);
    }
  }
}

