import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { logger } from '../../../config/logger.js';
import { ValidationError, ForbiddenError } from '../../../errors/app-error.js';

export class DocumentStorageService {
  /**
   * Resolves the canonical root directory for permanent document storage.
   */
  public static getStorageBaseDir(): string {
    const cwd = process.cwd();
    if (cwd.endsWith('backend')) {
      return path.resolve(cwd, 'storage', 'documents');
    }
    return path.resolve(cwd, 'backend', 'storage', 'documents');
  }

  /**
   * Validates identifier strings (visitId, documentId) against path traversal attacks.
   */
  public static validateIdentifier(id: string, name: string = 'Identifier'): void {
    if (!id || typeof id !== 'string') {
      throw new ValidationError(`${name} is required`);
    }
    // Allow standard alphanumeric, uuid hyphens, underscores
    if (!/^[a-zA-Z0-9_-]+$/.test(id) || id.includes('..')) {
      throw new ForbiddenError(`Invalid ${name}: contains illegal characters or path traversal attempt`);
    }
  }

  /**
   * Saves uploaded document buffer atomically to disk with collision-resistant naming.
   */
  public static async saveDocumentBuffer(
    visitId: string,
    file: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    }
  ): Promise<{
    diskFileName: string;
    storageReference: string;
    absoluteFilePath: string;
  }> {
    this.validateIdentifier(visitId, 'visitId');

    const storageBaseDir = this.getStorageBaseDir();
    const visitDir = path.join(storageBaseDir, visitId);

    // Ensure path boundary confinement
    const resolvedVisitDir = path.resolve(visitDir);
    if (!resolvedVisitDir.startsWith(path.resolve(storageBaseDir))) {
      throw new ForbiddenError('Path traversal attempt: target directory is outside storage root');
    }

    await fs.promises.mkdir(resolvedVisitDir, { recursive: true });

    // Generate collision-resistant unique filename
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '') || '.bin';
    const baseRaw = path.basename(file.originalname, ext);
    const sanitizedBase = baseRaw.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50) || 'document';
    const uniquePrefix = crypto.randomUUID();
    const timestamp = Date.now();
    const diskFileName = `${uniquePrefix}_${timestamp}_${sanitizedBase}${ext}`;

    const targetFilePath = path.join(resolvedVisitDir, diskFileName);
    const tempFilePath = `${targetFilePath}.tmp.${crypto.randomUUID()}`;

    // Verify target path does not escape boundary
    if (!path.resolve(targetFilePath).startsWith(path.resolve(storageBaseDir))) {
      throw new ForbiddenError('Path traversal attempt: target file path is outside storage root');
    }

    try {
      // 1. Atomic write: write to unique temporary file
      await fs.promises.writeFile(tempFilePath, file.buffer);

      // 2. Atomic rename: move temporary file to final target destination
      await fs.promises.rename(tempFilePath, targetFilePath);
    } catch (writeError) {
      // Clean up temporary file if write or rename failed
      try {
        if (fs.existsSync(tempFilePath)) {
          await fs.promises.unlink(tempFilePath);
        }
      } catch {}
      throw writeError;
    }

    const storageReference = `storage/documents/${visitId}/${diskFileName}`;

    logger.info('Document permanently saved to local storage', {
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
  public static async removeFileSafe(filePath: string): Promise<void> {
    try {
      if (filePath && fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        logger.info('Orphaned document file cleaned up successfully', { filePath });
      }
    } catch (err) {
      logger.warn('Failed to clean up orphaned document file', { filePath, error: String(err) });
    }
  }

  /**
   * Resolves and verifies an existing document file on disk within storage boundaries.
   */
  public static resolveDocumentFile(storageReference: string): string | null {
    if (!storageReference || typeof storageReference !== 'string') {
      return null;
    }

    // Reject path traversal tokens
    if (storageReference.includes('..') || storageReference.includes('\0')) {
      throw new ForbiddenError('Path traversal token detected in storage reference');
    }

    const storageBase = path.resolve(this.getStorageBaseDir());

    // If absolute path provided, it must reside strictly within storageBase
    if (path.isAbsolute(storageReference)) {
      const resolvedAbs = path.resolve(storageReference);
      if (!resolvedAbs.startsWith(storageBase)) {
        throw new ForbiddenError('Path traversal attempt: target file path is outside storage root');
      }
      return fs.existsSync(resolvedAbs) ? resolvedAbs : null;
    }

    const possiblePaths = [
      path.resolve(process.cwd(), storageReference),
      path.resolve(process.cwd(), 'backend', storageReference),
      path.resolve(storageBase, '..', '..', storageReference),
      path.resolve(storageBase, path.basename(path.dirname(storageReference)), path.basename(storageReference)),
    ];

    for (const p of possiblePaths) {
      const resolved = path.resolve(p);
      if (resolved.startsWith(storageBase) && fs.existsSync(resolved)) {
        return resolved;
      }
    }

    return null;
  }

  /**
   * Saves metadata JSON for durable offline persistence across server restarts.
   */
  public static async saveDocumentMetadata(visitId: string, doc: any): Promise<void> {
    try {
      this.validateIdentifier(visitId, 'visitId');
      this.validateIdentifier(doc.id, 'documentId');

      const storageBase = this.getStorageBaseDir();
      const visitDir = path.join(storageBase, visitId);
      await fs.promises.mkdir(visitDir, { recursive: true });

      const metaPath = path.join(visitDir, `${doc.id}.meta.json`);
      const tempMetaPath = `${metaPath}.tmp.${crypto.randomUUID()}`;

      await fs.promises.writeFile(tempMetaPath, JSON.stringify(doc, null, 2), 'utf8');
      await fs.promises.rename(tempMetaPath, metaPath);
    } catch (err) {
      logger.warn('Could not persist document metadata to disk', { docId: doc?.id, error: String(err) });
    }
  }

  /**
   * Loads metadata for a specific document from disk.
   */
  public static async loadDocumentMetadata(visitId: string, docId: string): Promise<any | null> {
    try {
      this.validateIdentifier(visitId, 'visitId');
      this.validateIdentifier(docId, 'documentId');

      const metaPath = path.join(this.getStorageBaseDir(), visitId, `${docId}.meta.json`);
      if (fs.existsSync(metaPath)) {
        const content = await fs.promises.readFile(metaPath, 'utf8');
        return JSON.parse(content);
      }
    } catch {}
    return null;
  }

  /**
   * Reads all document metadata records for a visit from disk.
   */
  public static async listVisitDocumentMetadata(visitId: string): Promise<any[]> {
    try {
      this.validateIdentifier(visitId, 'visitId');
      const visitDir = path.join(this.getStorageBaseDir(), visitId);
      if (!fs.existsSync(visitDir)) return [];

      const files = await fs.promises.readdir(visitDir);
      const metaFiles = files.filter((f) => f.endsWith('.meta.json'));
      const records: any[] = [];

      for (const mf of metaFiles) {
        try {
          const content = await fs.promises.readFile(path.join(visitDir, mf), 'utf8');
          records.push(JSON.parse(content));
        } catch {}
      }

      records.sort(
        (a, b) =>
          new Date(b.created_at || b.uploaded_at).getTime() -
          new Date(a.created_at || a.uploaded_at).getTime()
      );
      return records;
    } catch {
      return [];
    }
  }
}
