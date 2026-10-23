"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalUploadMiddleware = void 0;
const multer_1 = __importDefault(require("multer"));
const app_error_js_1 = require("../errors/app-error.js");
/**
 * Memory storage keeps file buffers in memory for atomic disk writing by DocumentStorageService.
 */
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 15 * 1024 * 1024, // 15MB strict limit
        files: 1,
    },
    fileFilter: (_req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf'];
        if (allowedMimes.includes(file.mimetype.toLowerCase())) {
            cb(null, true);
        }
        else {
            cb(new app_error_js_1.ValidationError(`Unsupported file format: ${file.mimetype}. Permitted formats: JPEG, PNG, WEBP, PDF.`));
        }
    },
}).single('file');
/**
 * Optional upload middleware:
 * - If request is multipart/form-data, parses the file and populates req.file with 15MB limit enforcement.
 * - If request is JSON (base64 payload), passes through directly to body parser.
 */
const optionalUploadMiddleware = (req, res, next) => {
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('multipart/form-data')) {
        upload(req, res, (err) => {
            if (err) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return next(new app_error_js_1.ValidationError('File size exceeds maximum permitted limit of 15MB.'));
                }
                if (err instanceof app_error_js_1.ValidationError) {
                    return next(err);
                }
                return next(new app_error_js_1.ValidationError(`File upload error: ${err.message}`));
            }
            next();
        });
    }
    else {
        next();
    }
};
exports.optionalUploadMiddleware = optionalUploadMiddleware;
