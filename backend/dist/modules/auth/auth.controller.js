"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const auth_service_js_1 = require("./auth.service.js");
const response_util_js_1 = require("../../utils/response.util.js");
class AuthController {
    static async register(req, res, next) {
        try {
            const user = await auth_service_js_1.AuthService.registerStaff(req.body);
            response_util_js_1.ResponseUtil.created(res, user, 'Staff account registered successfully');
        }
        catch (error) {
            next(error);
        }
    }
    static async login(req, res, next) {
        try {
            const result = await auth_service_js_1.AuthService.loginStaff(req.body);
            response_util_js_1.ResponseUtil.success(res, result, 'Login successful');
        }
        catch (error) {
            next(error);
        }
    }
    static async logout(req, res, next) {
        try {
            const refreshToken = req.body?.refreshToken;
            const result = await auth_service_js_1.AuthService.logout(refreshToken);
            response_util_js_1.ResponseUtil.success(res, result, 'Logout successful');
        }
        catch (error) {
            next(error);
        }
    }
    static async refresh(req, res, next) {
        try {
            const { refreshToken } = req.body;
            const result = await auth_service_js_1.AuthService.refreshAccessToken(refreshToken);
            response_util_js_1.ResponseUtil.success(res, result, 'Token refreshed successfully');
        }
        catch (error) {
            next(error);
        }
    }
    static async me(req, res, next) {
        try {
            if (!req.user) {
                response_util_js_1.ResponseUtil.error(res, 401, 'UNAUTHORIZED', 'Authentication required');
                return;
            }
            const profile = await auth_service_js_1.AuthService.getProfile(req.user.id);
            response_util_js_1.ResponseUtil.success(res, profile, 'Profile retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    }
    static async changePassword(req, res, next) {
        try {
            if (!req.user) {
                response_util_js_1.ResponseUtil.error(res, 401, 'UNAUTHORIZED', 'Authentication required');
                return;
            }
            const result = await auth_service_js_1.AuthService.changePassword(req.user.id, req.body);
            response_util_js_1.ResponseUtil.success(res, result, 'Password changed successfully');
        }
        catch (error) {
            next(error);
        }
    }
    static async forgotPassword(req, res, next) {
        try {
            const result = await auth_service_js_1.AuthService.forgotPassword(req.body.email);
            response_util_js_1.ResponseUtil.success(res, result, result.message);
        }
        catch (error) {
            next(error);
        }
    }
    static async resetPassword(req, res, next) {
        try {
            const result = await auth_service_js_1.AuthService.resetPassword(req.body);
            response_util_js_1.ResponseUtil.success(res, result, result.message);
        }
        catch (error) {
            next(error);
        }
    }
    static async verifyEmail(req, res, next) {
        try {
            const result = await auth_service_js_1.AuthService.verifyEmail(req.body.token);
            response_util_js_1.ResponseUtil.success(res, result, result.message);
        }
        catch (error) {
            next(error);
        }
    }
    static async resendVerification(req, res, next) {
        try {
            const result = await auth_service_js_1.AuthService.resendVerification(req.body.email);
            response_util_js_1.ResponseUtil.success(res, result, result.message);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AuthController = AuthController;
