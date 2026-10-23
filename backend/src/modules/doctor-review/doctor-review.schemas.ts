import { z } from 'zod';
import { ResolutionTypes, RejectionReasons, MustResolveItemTypes } from './doctor-review.types.js';

const resolutionTypeValues = Object.values(ResolutionTypes) as [string, ...string[]];
const rejectionReasonValues = Object.values(RejectionReasons) as [string, ...string[]];
const mustResolveItemTypeValues = Object.values(MustResolveItemTypes) as [string, ...string[]];

export const claimVisitSchema = z.object({
  params: z.object({
    visitId: z.string().min(1, 'Visit ID is required'),
  }),
  body: z.object({
    forceTakeover: z.boolean().optional(),
    takeoverReason: z.string().max(255).optional(),
    outOfQueueReason: z.string().max(255).optional(),
  }).optional(),
});

export const releaseVisitSchema = z.object({
  params: z.object({
    visitId: z.string().min(1, 'Visit ID is required'),
  }),
});

export const startReviewSchema = z.object({
  params: z.object({
    visitId: z.string().min(1, 'Visit ID is required'),
  }),
  body: z.object({
    outOfQueueReason: z.string().max(255).optional(),
  }).optional(),
});

export const submitResolutionSchema = z.object({
  params: z.object({
    reviewId: z.string().min(1, 'Review ID is required'),
  }),
  body: z.object({
    itemRef: z.string().min(1, 'Item reference is required'),
    itemType: z.enum(mustResolveItemTypeValues),
    resolutionType: z.enum(resolutionTypeValues),
    correctedValue: z.string().optional().nullable(),
    sourceHash: z.string().optional().nullable(),
    viewedSource: z.boolean().default(false),
  }).refine(
    (data) => {
      if (data.resolutionType === ResolutionTypes.CORRECTED) {
        return !!data.correctedValue && data.correctedValue.trim().length > 0;
      }
      return true;
    },
    {
      message: "A corrected value is required when resolutionType is 'CORRECTED'",
      path: ['correctedValue'],
    }
  ),
});

export const editStatementSchema = z.object({
  params: z.object({
    reviewId: z.string().min(1, 'Review ID is required'),
    statementId: z.string().min(1, 'Statement ID is required'),
  }),
  body: z.object({
    editedText: z.string().min(1, 'Edited statement text cannot be empty'),
    previousTextRef: z.string().optional(),
  }),
});

export const addStatementSchema = z.object({
  params: z.object({
    reviewId: z.string().min(1, 'Review ID is required'),
  }),
  body: z.object({
    section: z.string().min(1, 'Section is required'),
    text: z.string().min(1, 'Statement text cannot be empty'),
    order: z.number().int().min(0).default(0),
  }),
});

export const removeStatementSchema = z.object({
  params: z.object({
    reviewId: z.string().min(1, 'Review ID is required'),
    statementId: z.string().min(1, 'Statement ID is required'),
  }),
});

export const rejectDraftSchema = z.object({
  params: z.object({
    reviewId: z.string().min(1, 'Review ID is required'),
  }),
  body: z.object({
    reason: z.enum(rejectionReasonValues),
    note: z.string().max(500).optional(),
  }),
});

export const requestRegenerationSchema = z.object({
  params: z.object({
    reviewId: z.string().min(1, 'Review ID is required'),
  }),
  body: z.object({
    reason: z.string().max(255).optional(),
  }).optional(),
});

export const confirmReviewSchema = z.object({
  params: z.object({
    reviewId: z.string().min(1, 'Review ID is required'),
  }),
  body: z.object({
    attestationAccepted: z.boolean().refine((val) => val === true, {
      message: 'Physician attestation must be explicitly accepted to confirm clinical record',
    }),
    attestationVersion: z.string().default('ATTEST-v1.0.0'),
  }),
});

export const amendConfirmedRecordSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Confirmed record ID is required'),
  }),
  body: z.object({
    amendmentReason: z.string().min(5, 'Amendment reason must be at least 5 characters'),
    statements: z.array(
      z.object({
        section: z.string().min(1),
        text: z.string().min(1),
        origin: z.string().min(1),
        order: z.number().int().min(0),
        aiStatementId: z.string().optional().nullable(),
        resolutionType: z.string().optional().nullable(),
        sourceRefs: z.any().optional(),
      })
    ).min(1, 'Amended record must contain at least one statement'),
    attestationAccepted: z.boolean().refine((val) => val === true, {
      message: 'Physician attestation must be re-accepted for clinical amendment',
    }),
    attestationVersion: z.string().min(1, 'Attestation version is required'),
  }),
});
