"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = void 0;
const zod_1 = require("zod");
const app_error_js_1 = require("../errors/app-error.js");
const validateRequest = (schemas) => {
    return async (req, _res, next) => {
        try {
            if (schemas.body) {
                req.body = await schemas.body.parseAsync(req.body);
            }
            if (schemas.query) {
                req.query = await schemas.query.parseAsync(req.query);
            }
            if (schemas.params) {
                req.params = await schemas.params.parseAsync(req.params);
            }
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const details = error.errors.map((err) => ({
                    field: err.path.join('.'),
                    message: err.message,
                    rule: err.code,
                }));
                next(new app_error_js_1.ValidationError('Request validation failed', details));
            }
            else {
                next(error);
            }
        }
    };
};
exports.validateRequest = validateRequest;
