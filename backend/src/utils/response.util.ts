import { Response } from 'express';
import { ErrorCodeType } from '../errors/error-codes.js';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  meta?: Record<string, unknown>;
  error?: {
    code: ErrorCodeType;
    message: string;
    details?: unknown[];
  };
}

export class ResponseUtil {
  public static success<T>(
    res: Response,
    data: T,
    message: string = 'Request successful',
    statusCode: number = 200,
    meta?: Record<string, unknown>
  ): Response {
    const payload: ApiResponse<T> = {
      success: true,
      data,
      message,
      meta: {
        timestamp: new Date().toISOString(),
        ...(meta || {}),
      },
    };
    return res.status(statusCode).json(payload);
  }

  public static created<T>(
    res: Response,
    data: T,
    message: string = 'Resource created successfully',
    meta?: Record<string, unknown>
  ): Response {
    return this.success(res, data, message, 201, meta);
  }

  public static error(
    res: Response,
    statusCode: number,
    code: ErrorCodeType,
    message: string,
    details: unknown[] = []
  ): Response {
    const payload: ApiResponse = {
      success: false,
      error: {
        code,
        message,
        details: details.length > 0 ? details : undefined,
      },
    };
    return res.status(statusCode).json(payload);
  }
}
