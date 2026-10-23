import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../errors/app-error.js';

/**
 * Memory storage keeps file buffers in memory for atomic disk writing by DocumentStorageService.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB strict limit
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf'];
    if (allowedMimes.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new ValidationError(`Unsupported file format: ${file.mimetype}. Permitted formats: JPEG, PNG, WEBP, PDF.`));
    }
  },
}).single('file');

/**
 * Optional upload middleware:
 * - If request is multipart/form-data, parses the file and populates req.file with 15MB limit enforcement.
 * - If request is JSON (base64 payload), passes through directly to body parser.
 */
export const optionalUploadMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    upload(req, res, (err: any) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new ValidationError('File size exceeds maximum permitted limit of 15MB.'));
        }
        if (err instanceof ValidationError) {
          return next(err);
        }
        return next(new ValidationError(`File upload error: ${err.message}`));
      }
      next();
    });
  } else {
    next();
  }
};
