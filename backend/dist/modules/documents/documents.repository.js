"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentsRepository = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = __importDefault(require("node:crypto"));
const prisma_js_1 = require("../../database/prisma.js");
const document_storage_service_js_1 = require("./storage/document-storage.service.js");
const logger_js_1 = require("../../config/logger.js");
const uuid_util_js_1 = require("../../utils/uuid.util.js");
// In-memory cache for fast access & resilient fallback
const memoryDocuments = new Map();
const memoryVisitDocuments = new Map();
class DocumentsRepository {
    /**
     * Searches disk for document metadata JSON if not present in memory cache.
     */
    static async searchDiskForDocument(docId) {
        try {
            const base = document_storage_service_js_1.DocumentStorageService.getStorageBaseDir();
            if (!node_fs_1.default.existsSync(base))
                return null;
            const dirs = await node_fs_1.default.promises.readdir(base);
            for (const d of dirs) {
                const metaFile = node_path_1.default.join(base, d, `${docId}.meta.json`);
                if (node_fs_1.default.existsSync(metaFile)) {
                    const content = await node_fs_1.default.promises.readFile(metaFile, 'utf8');
                    const parsed = JSON.parse(content);
                    memoryDocuments.set(docId, parsed);
                    return parsed;
                }
            }
        }
        catch { }
        return null;
    }
    static async createDocument(data) {
        const isDbUp = await (0, prisma_js_1.checkDatabaseHealth)();
        if (isDbUp) {
            try {
                const created = await prisma_js_1.prisma.uploadedDocument.create({
                    data: {
                        visit_id: data.visitId,
                        patient_id: (0, uuid_util_js_1.toUuid)(data.patientId),
                        document_type: data.documentType,
                        file_name: data.fileName,
                        mime_type: data.mimeType,
                        file_size_bytes: data.fileSizeBytes,
                        storage_reference: data.storageReference,
                        consent_verified: data.consentVerified,
                        ocr_status: 'PENDING',
                        overall_status: 'PENDING_VALIDATION',
                    },
                });
                memoryDocuments.set(created.id, created);
                const list = memoryVisitDocuments.get(data.visitId) || [];
                list.unshift(created);
                memoryVisitDocuments.set(data.visitId, list);
                // Also persist metadata manifest to disk for offline resilience
                await document_storage_service_js_1.DocumentStorageService.saveDocumentMetadata(data.visitId, created);
                return created;
            }
            catch (dbErr) {
                logger_js_1.logger.error('Failed to create uploadedDocument in database', { error: dbErr?.message, visitId: data.visitId });
                throw dbErr;
            }
        }
        const doc = {
            id: node_crypto_1.default.randomUUID(),
            visit_id: data.visitId,
            patient_id: data.patientId,
            document_type: data.documentType,
            file_name: data.fileName,
            mime_type: data.mimeType,
            file_size_bytes: data.fileSizeBytes,
            storage_reference: data.storageReference,
            consent_verified: data.consentVerified,
            ocr_status: 'PENDING',
            overall_status: 'PENDING_VALIDATION',
            ocr_error_message: null,
            uploaded_at: new Date(),
            created_at: new Date(),
            updated_at: new Date(),
            raw_fields: [],
            validated_fields: [],
        };
        memoryDocuments.set(doc.id, doc);
        const list = memoryVisitDocuments.get(data.visitId) || [];
        list.unshift(doc);
        memoryVisitDocuments.set(data.visitId, list);
        // Save durable local metadata file to disk
        await document_storage_service_js_1.DocumentStorageService.saveDocumentMetadata(data.visitId, doc);
        return doc;
    }
    static async findDocumentById(id) {
        const isDbUp = await (0, prisma_js_1.checkDatabaseHealth)();
        if (isDbUp && (0, uuid_util_js_1.isUuid)(id)) {
            try {
                const doc = await prisma_js_1.prisma.uploadedDocument.findUnique({
                    where: { id },
                    include: {
                        raw_fields: true,
                        validated_fields: {
                            orderBy: { is_critical: 'desc' },
                        },
                    },
                });
                if (doc)
                    return doc;
            }
            catch { }
        }
        const cached = memoryDocuments.get(id);
        if (cached)
            return cached;
        // Search disk for persisted metadata
        return this.searchDiskForDocument(id);
    }
    static async findDocumentsByVisitId(visitId) {
        const isDbUp = await (0, prisma_js_1.checkDatabaseHealth)();
        if (isDbUp) {
            try {
                const dbDocs = await prisma_js_1.prisma.uploadedDocument.findMany({
                    where: { visit_id: visitId },
                    orderBy: { created_at: 'desc' },
                    include: {
                        _count: {
                            select: { raw_fields: true, validated_fields: true },
                        },
                        validated_fields: true,
                    },
                });
                if (dbDocs && dbDocs.length > 0) {
                    return dbDocs;
                }
            }
            catch { }
        }
        const memoryList = memoryVisitDocuments.get(visitId);
        if (memoryList && memoryList.length > 0) {
            return memoryList;
        }
        // Load from durable disk metadata
        const diskList = await document_storage_service_js_1.DocumentStorageService.listVisitDocumentMetadata(visitId);
        if (diskList.length > 0) {
            memoryVisitDocuments.set(visitId, diskList);
            for (const d of diskList) {
                memoryDocuments.set(d.id, d);
            }
            return diskList;
        }
        return [];
    }
    static async findValidatedFieldsByVisitId(visitId) {
        const isDbUp = await (0, prisma_js_1.checkDatabaseHealth)();
        if (isDbUp) {
            try {
                return await prisma_js_1.prisma.uploadedDocument.findMany({
                    where: { visit_id: visitId },
                    include: {
                        validated_fields: {
                            orderBy: [{ is_critical: 'desc' }, { created_at: 'asc' }],
                        },
                    },
                });
            }
            catch { }
        }
        const docs = await this.findDocumentsByVisitId(visitId);
        return docs.map((d) => ({
            ...d,
            validated_fields: d.validated_fields || [],
        }));
    }
    static async updateDocument(id, data) {
        const isDbUp = await (0, prisma_js_1.checkDatabaseHealth)();
        if (isDbUp) {
            try {
                const updateData = {};
                if (data.ocr_status !== undefined)
                    updateData.ocr_status = data.ocr_status;
                if (data.ocr_error_message !== undefined)
                    updateData.ocr_error_message = data.ocr_error_message;
                if (data.overall_status !== undefined)
                    updateData.overall_status = data.overall_status;
                const updated = await prisma_js_1.prisma.uploadedDocument.update({
                    where: { id },
                    data: updateData,
                    include: { raw_fields: true, validated_fields: true },
                });
                memoryDocuments.set(id, updated);
                await document_storage_service_js_1.DocumentStorageService.saveDocumentMetadata(updated.visit_id, updated);
                return updated;
            }
            catch { }
        }
        let doc = memoryDocuments.get(id);
        if (!doc) {
            doc = await this.searchDiskForDocument(id);
        }
        if (doc) {
            Object.assign(doc, data);
            doc.updated_at = new Date();
            memoryDocuments.set(id, doc);
            await document_storage_service_js_1.DocumentStorageService.saveDocumentMetadata(doc.visit_id, doc);
            return doc;
        }
        return null;
    }
}
exports.DocumentsRepository = DocumentsRepository;
