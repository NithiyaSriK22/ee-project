"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentStorageService = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = __importDefault(require("node:crypto"));
const logger_js_1 = require("../../../config/logger.js");
const app_error_js_1 = require("../../../errors/app-error.js");
class DocumentStorageService {
    /**
     * Resolves the canonical root directory for permanent document storage.
     */
    static getStorageBaseDir() {
        const cwd = process.cwd();
        if (cwd.endsWith('backend')) {
            return node_path_1.default.resolve(cwd, 'storage', 'documents');
        }
        return node_path_1.default.resolve(cwd, 'backend', 'storage', 'documents');
    }
    /**
     * Validates identifier strings (visitId, documentId) against path traversal attacks.
     */
    static validateIdentifier(id, name = 'Identifier') {
        if (!id || typeof id !== 'string') {
            throw new app_error_js_1.ValidationError(`${name} is required`);
        }
        // Allow standard alphanumeric, uuid hyphens, underscores
        if (!/^[a-zA-Z0-9_-]+$/.test(id) || id.includes('..')) {
            throw new app_error_js_1.ForbiddenError(`Invalid ${name}: contains illegal characters or path traversal attempt`);
        }
    }
    /**
     * Saves uploaded document buffer atomically to disk with collision-resistant naming.
     */
    static async saveDocumentBuffer(visitId, file) {
        this.validateIdentifier(visitId, 'visitId');
        const storageBaseDir = this.getStorageBaseDir();
        const visitDir = node_path_1.default.join(storageBaseDir, visitId);
        // Ensure path boundary confinement
        const resolvedVisitDir = node_path_1.default.resolve(visitDir);
        if (!resolvedVisitDir.startsWith(node_path_1.default.resolve(storageBaseDir))) {
            throw new app_error_js_1.ForbiddenError('Path traversal attempt: target directory is outside storage root');
        }
        await node_fs_1.default.promises.mkdir(resolvedVisitDir, { recursive: true });
        // Generate collision-resistant unique filename
        const ext = node_path_1.default.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '') || '.bin';
        const baseRaw = node_path_1.default.basename(file.originalname, ext);
        const sanitizedBase = baseRaw.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50) || 'document';
        const uniquePrefix = node_crypto_1.default.randomUUID();
        const timestamp = Date.now();
        const diskFileName = `${uniquePrefix}_${timestamp}_${sanitizedBase}${ext}`;
        const targetFilePath = node_path_1.default.join(resolvedVisitDir, diskFileName);
        const tempFilePath = `${targetFilePath}.tmp.${node_crypto_1.default.randomUUID()}`;
        // Verify target path does not escape boundary
        if (!node_path_1.default.resolve(targetFilePath).startsWith(node_path_1.default.resolve(storageBaseDir))) {
            throw new app_error_js_1.ForbiddenError('Path traversal attempt: target file path is outside storage root');
        }
        try {
            // 1. Atomic write: write to unique temporary file
            await node_fs_1.default.promises.writeFile(tempFilePath, file.buffer);
            // 2. Atomic rename: move temporary file to final target destination
            await node_fs_1.default.promises.rename(tempFilePath, targetFilePath);
        }
        catch (writeError) {
            // Clean up temporary file if write or rename failed
            try {
                if (node_fs_1.default.existsSync(tempFilePath)) {
                    await node_fs_1.default.promises.unlink(tempFilePath);
                }
            }
            catch { }
            throw writeError;
        }
        const storageReference = `storage/documents/${visitId}/${diskFileName}`;
        logger_js_1.logger.info('Document permanently saved to local storage', {
            visitId,
            diskFileName,
            storageReference,
            sizeBytes: file.size,
        });
        return {
            diskFileName,
            storageReference,
            absoluteFilePath: targetFilePath,
        };
    }
    /**
     * Safely deletes a file from disk (used for cleanup on partially failed operations).
     */
    static async removeFileSafe(filePath) {
        try {
            if (filePath && node_fs_1.default.existsSync(filePath)) {
                await node_fs_1.default.promises.unlink(filePath);
                logger_js_1.logger.info('Orphaned document file cleaned up successfully', { filePath });
            }
        }
        catch (err) {
            logger_js_1.logger.warn('Failed to clean up orphaned document file', { filePath, error: String(err) });
        }
    }
    /**
     * Resolves and verifies an existing document file on disk within storage boundaries.
     */
    static resolveDocumentFile(storageReference) {
        if (!storageReference || typeof storageReference !== 'string') {
            return null;
        }
        // Reject path traversal tokens
        if (storageReference.includes('..') || storageReference.includes('\0')) {
            throw new app_error_js_1.ForbiddenError('Path traversal token detected in storage reference');
        }
        const storageBase = node_path_1.default.resolve(this.getStorageBaseDir());
        // If absolute path provided (either POSIX or Windows-style on any platform),
        // it must reside strictly within storageBase
        const isWindowsAbs = node_path_1.default.win32.isAbsolute(storageReference) || /^[a-zA-Z]:[\\/]/.test(storageReference) || storageReference.startsWith('\\\\');
        const isPosixAbs = node_path_1.default.posix.isAbsolute(storageReference);
        if (isWindowsAbs || isPosixAbs || node_path_1.default.isAbsolute(storageReference)) {
            if (isWindowsAbs && process.platform !== 'win32') {
                throw new app_error_js_1.ForbiddenError('Path traversal attempt: target file path is outside storage root');
            }
            const resolvedAbs = node_path_1.default.resolve(storageReference);
            if (!resolvedAbs.startsWith(storageBase)) {
                throw new app_error_js_1.ForbiddenError('Path traversal attempt: target file path is outside storage root');
            }
            return node_fs_1.default.existsSync(resolvedAbs) ? resolvedAbs : null;
        }
        const possiblePaths = [
            node_path_1.default.resolve(process.cwd(), storageReference),
            node_path_1.default.resolve(process.cwd(), 'backend', storageReference),
            node_path_1.default.resolve(storageBase, '..', '..', storageReference),
            node_path_1.default.resolve(storageBase, node_path_1.default.basename(node_path_1.default.dirname(storageReference)), node_path_1.default.basename(storageReference)),
        ];
        for (const p of possiblePaths) {
            const resolved = node_path_1.default.resolve(p);
            if (resolved.startsWith(storageBase) && node_fs_1.default.existsSync(resolved)) {
                return resolved;
            }
        }
        return null;
    }
    /**
     * Saves metadata JSON for durable offline persistence across server restarts.
     */
    static async saveDocumentMetadata(visitId, doc) {
        try {
            this.validateIdentifier(visitId, 'visitId');
            this.validateIdentifier(doc.id, 'documentId');
            const storageBase = this.getStorageBaseDir();
            const visitDir = node_path_1.default.join(storageBase, visitId);
            await node_fs_1.default.promises.mkdir(visitDir, { recursive: true });
            const metaPath = node_path_1.default.join(visitDir, `${doc.id}.meta.json`);
            const tempMetaPath = `${metaPath}.tmp.${node_crypto_1.default.randomUUID()}`;
            await node_fs_1.default.promises.writeFile(tempMetaPath, JSON.stringify(doc, null, 2), 'utf8');
            await node_fs_1.default.promises.rename(tempMetaPath, metaPath);
        }
        catch (err) {
            logger_js_1.logger.warn('Could not persist document metadata to disk', { docId: doc?.id, error: String(err) });
        }
    }
    /**
     * Loads metadata for a specific document from disk.
     */
    static async loadDocumentMetadata(visitId, docId) {
        try {
            this.validateIdentifier(visitId, 'visitId');
            this.validateIdentifier(docId, 'documentId');
            const metaPath = node_path_1.default.join(this.getStorageBaseDir(), visitId, `${docId}.meta.json`);
            if (node_fs_1.default.existsSync(metaPath)) {
                const content = await node_fs_1.default.promises.readFile(metaPath, 'utf8');
                return JSON.parse(content);
            }
        }
        catch { }
        return null;
    }
    /**
     * Reads all document metadata records for a visit from disk.
     */
    static async listVisitDocumentMetadata(visitId) {
        try {
            this.validateIdentifier(visitId, 'visitId');
            const visitDir = node_path_1.default.join(this.getStorageBaseDir(), visitId);
            if (!node_fs_1.default.existsSync(visitDir))
                return [];
            const files = await node_fs_1.default.promises.readdir(visitDir);
            const metaFiles = files.filter((f) => f.endsWith('.meta.json'));
            const records = [];
            for (const mf of metaFiles) {
                try {
                    const content = await node_fs_1.default.promises.readFile(node_path_1.default.join(visitDir, mf), 'utf8');
                    records.push(JSON.parse(content));
                }
                catch { }
            }
            records.sort((a, b) => new Date(b.created_at || b.uploaded_at).getTime() -
                new Date(a.created_at || a.uploaded_at).getTime());
            return records;
        }
        catch {
            return [];
        }
    }
}
exports.DocumentStorageService = DocumentStorageService;
