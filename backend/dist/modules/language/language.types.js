"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewDecisions = exports.ContentStatuses = exports.VoiceStatuses = exports.UiStatuses = exports.SupportedLanguageCodes = void 0;
exports.SupportedLanguageCodes = {
    ENGLISH: 'en',
    TAMIL: 'ta',
    HINDI: 'hi',
};
exports.UiStatuses = {
    READY: 'READY',
    PARTIAL: 'PARTIAL',
    DISABLED: 'DISABLED',
};
exports.VoiceStatuses = {
    SUPPORTED: 'SUPPORTED',
    UNTESTED: 'UNTESTED',
    UNSUPPORTED: 'UNSUPPORTED',
};
exports.ContentStatuses = {
    DRAFT: 'DRAFT',
    IN_REVIEW: 'IN_REVIEW',
    APPROVED: 'APPROVED',
    RETIRED: 'RETIRED',
};
exports.ReviewDecisions = {
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    NEEDS_REVISION: 'NEEDS_REVISION',
};
