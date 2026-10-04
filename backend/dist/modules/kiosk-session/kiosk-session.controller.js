"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KioskSessionController = void 0;
const kiosk_session_service_js_1 = require("./kiosk-session.service.js");
const response_util_js_1 = require("../../utils/response.util.js");
const app_error_js_1 = require("../../errors/app-error.js");
class KioskSessionController {
    static async start(req, res, next) {
        try {
            const result = await kiosk_session_service_js_1.KioskSessionService.startSession(req.body);
            response_util_js_1.ResponseUtil.created(res, result, 'Kiosk session initialized successfully');
        }
        catch (error) {
            next(error);
        }
    }
    static async me(req, res, next) {
        try {
            if (!req.kioskSession) {
                throw new app_error_js_1.AuthenticationError('Active kiosk session required');
            }
            const result = await kiosk_session_service_js_1.KioskSessionService.getSessionMe(req.kioskSession.visitId);
            response_util_js_1.ResponseUtil.success(res, result, 'Active session retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    }
    static async end(req, res, next) {
        try {
            if (!req.kioskSession) {
                throw new app_error_js_1.AuthenticationError('Active kiosk session required');
            }
            const result = await kiosk_session_service_js_1.KioskSessionService.endSession(req.kioskSession.visitId);
            response_util_js_1.ResponseUtil.success(res, result, result.message);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.KioskSessionController = KioskSessionController;
