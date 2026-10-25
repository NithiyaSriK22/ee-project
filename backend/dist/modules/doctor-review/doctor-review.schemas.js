"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.amendConfirmedRecordSchema = exports.confirmReviewSchema = exports.requestRegenerationSchema = exports.rejectDraftSchema = exports.removeStatementSchema = exports.addStatementSchema = exports.editStatementSchema = exports.submitResolutionSchema = exports.startReviewSchema = exports.releaseVisitSchema = exports.claimVisitSchema = void 0;
const zod_1 = require("zod");
const doctor_review_types_js_1 = require("./doctor-review.types.js");
const resolutionTypeValues = Object.values(doctor_review_types_js_1.ResolutionTypes);
const rejectionReasonValues = Object.values(doctor_review_types_js_1.RejectionReasons);
const mustResolveItemTypeValues = Object.values(doctor_review_types_js_1.MustResolveItemTypes);
exports.claimVisitSchema = zod_1.z.object({
    params: zod_1.z.object({
        visitId: zod_1.z.string().min(1, 'Visit ID is required'),
    }),
    body: zod_1.z.object({
        forceTakeover: zod_1.z.boolean().optional(),
        takeoverReason: zod_1.z.string().max(255).optional(),
        outOfQueueReason: zod_1.z.string().max(255).optional(),
    }).optional(),
});
exports.releaseVisitSchema = zod_1.z.object({
    params: zod_1.z.object({
        visitId: zod_1.z.string().min(1, 'Visit ID is required'),
    }),
});
exports.startReviewSchema = zod_1.z.object({
    params: zod_1.z.object({
        visitId: zod_1.z.string().min(1, 'Visit ID is required'),
    }),
    body: zod_1.z.object({
        outOfQueueReason: zod_1.z.string().max(255).optional(),
    }).optional(),
});
exports.submitResolutionSchema = zod_1.z.object({
    params: zod_1.z.object({
        reviewId: zod_1.z.string().min(1, 'Review ID is required'),
    }),
    body: zod_1.z.object({
        itemRef: zod_1.z.string().min(1, 'Item reference is required'),
        itemType: zod_1.z.enum(mustResolveItemTypeValues),
        resolutionType: zod_1.z.enum(resolutionTypeValues),
        correctedValue: zod_1.z.string().optional().nullable(),
        sourceHash: zod_1.z.string().optional().nullable(),
        viewedSource: zod_1.z.boolean().default(false),
    }).refine((data) => {
        if (data.resolutionType === doctor_review_types_js_1.ResolutionTypes.CORRECTED) {
            return !!data.correctedValue && data.correctedValue.trim().length > 0;
        }
        return true;
    }, {
        message: "A corrected value is required when resolutionType is 'CORRECTED'",
        path: ['correctedValue'],
    }),
});
exports.editStatementSchema = zod_1.z.object({
    params: zod_1.z.object({
        reviewId: zod_1.z.string().min(1, 'Review ID is required'),
        statementId: zod_1.z.string().min(1, 'Statement ID is required'),
    }),
    body: zod_1.z.object({
        editedText: zod_1.z.string().min(1, 'Edited statement text cannot be empty'),
        previousTextRef: zod_1.z.string().optional(),
    }),
});
exports.addStatementSchema = zod_1.z.object({
    params: zod_1.z.object({
        reviewId: zod_1.z.string().min(1, 'Review ID is required'),
    }),
    body: zod_1.z.object({
        section: zod_1.z.string().min(1, 'Section is required'),
        text: zod_1.z.string().min(1, 'Statement text cannot be empty'),
        order: zod_1.z.number().int().min(0).default(0),
    }),
});
exports.removeStatementSchema = zod_1.z.object({
    params: zod_1.z.object({
        reviewId: zod_1.z.string().min(1, 'Review ID is required'),
        statementId: zod_1.z.string().min(1, 'Statement ID is required'),
    }),
});
exports.rejectDraftSchema = zod_1.z.object({
    params: zod_1.z.object({
        reviewId: zod_1.z.string().min(1, 'Review ID is required'),
    }),
    body: zod_1.z.object({
        reason: zod_1.z.enum(rejectionReasonValues),
        note: zod_1.z.string().max(500).optional(),
    }),
});
exports.requestRegenerationSchema = zod_1.z.object({
    params: zod_1.z.object({
        reviewId: zod_1.z.string().min(1, 'Review ID is required'),
    }),
    body: zod_1.z.object({
        reason: zod_1.z.string().max(255).optional(),
    }).optional(),
});
exports.confirmReviewSchema = zod_1.z.object({
    params: zod_1.z.object({
        reviewId: zod_1.z.string().min(1, 'Review ID is required'),
    }),
    body: zod_1.z.object({
        attestationAccepted: zod_1.z.boolean().refine((val) => val === true, {
            message: 'Physician attestation must be explicitly accepted to confirm clinical record',
        }),
        attestationVersion: zod_1.z.string().default('ATTEST-v1.0.0'),
    }),
});
exports.amendConfirmedRecordSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1, 'Confirmed record ID is required'),
    }),
    body: zod_1.z.object({
        amendmentReason: zod_1.z.string().min(5, 'Amendment reason must be at least 5 characters'),
        statements: zod_1.z.array(zod_1.z.object({
            section: zod_1.z.string().min(1),
            text: zod_1.z.string().min(1),
            origin: zod_1.z.string().min(1),
            order: zod_1.z.number().int().min(0),
            aiStatementId: zod_1.z.string().optional().nullable(),
            resolutionType: zod_1.z.string().optional().nullable(),
            sourceRefs: zod_1.z.any().optional(),
        })).min(1, 'Amended record must contain at least one statement'),
        attestationAccepted: zod_1.z.boolean().refine((val) => val === true, {
            message: 'Physician attestation must be re-accepted for clinical amendment',
        }),
        attestationVersion: zod_1.z.string().min(1, 'Attestation version is required'),
    }),
});
