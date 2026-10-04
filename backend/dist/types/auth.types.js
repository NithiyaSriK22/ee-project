"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupportedLanguages = exports.ConsentGrantedVia = exports.ConsentTypes = exports.StaffUserStatus = exports.UserRoles = void 0;
exports.UserRoles = {
    PATIENT: 'PATIENT',
    COMPANION: 'COMPANION',
    STAFF_ATTENDANT: 'STAFF_ATTENDANT',
    DOCTOR: 'DOCTOR',
    ADMIN: 'ADMIN',
    SUPER_ADMIN: 'SUPER_ADMIN',
};
exports.StaffUserStatus = {
    ACTIVE: 'ACTIVE',
    SUSPENDED: 'SUSPENDED',
    DISABLED: 'DISABLED',
    PENDING_VERIFICATION: 'PENDING_VERIFICATION',
};
exports.ConsentTypes = {
    VISIT_DATA_COLLECTION: 'VISIT_DATA_COLLECTION',
    DOCUMENT_PROCESSING: 'DOCUMENT_PROCESSING',
    AI_SUMMARIZATION: 'AI_SUMMARIZATION',
    SHARE_WITH_DOCTOR: 'SHARE_WITH_DOCTOR',
};
exports.ConsentGrantedVia = {
    PATIENT: 'patient',
    COMPANION: 'companion',
    STAFF_ASSISTED: 'staff_assisted',
};
exports.SupportedLanguages = ['en', 'hi', 'ta', 'te', 'kn', 'ml', 'mr', 'bn', 'gu'];
