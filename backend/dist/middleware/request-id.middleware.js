"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestIdMiddleware = void 0;
const crypto_1 = require("crypto");
const requestIdMiddleware = (req, res, next) => {
    const existingId = req.headers['x-request-id'];
    const requestId = (typeof existingId === 'string' && existingId.trim() !== '')
        ? existingId
        : (0, crypto_1.randomUUID)();
    req.requestId = requestId;
    res.setHeader('X-Request-ID', requestId);
    next();
};
exports.requestIdMiddleware = requestIdMiddleware;
