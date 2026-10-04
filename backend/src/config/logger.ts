import { env } from './env.config.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  requestId?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  durationMs?: number;
  errorCode?: string;
  userId?: string; // Only non-PHI internal identifiers if necessary
  [key: string]: unknown;
}

// PHI / Secret keys that must ALWAYS be redacted from any log object
const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'jwt',
  'secret',
  'authorization',
  'cookie',
  'aadhaar',
  'national_id',
  'phone',
  'email',
  'patient_name',
  'raw_ocr_text',
  'transcript',
  'interview_answer',
  'clinical_summary',
  'diagnosis',
  'prescription_image',
  'file_buffer',
]);

const sanitizeLogData = (data: unknown, depth = 0): unknown => {
  if (depth > 3 || data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeLogData(item, depth + 1));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey) || lowerKey.includes('password') || lowerKey.includes('secret')) {
      sanitized[key] = '[REDACTED_SENSITIVE_DATA]';
    } else {
      sanitized[key] = sanitizeLogData(value, depth + 1);
    }
  }
  return sanitized;
};

class Logger {
  private logLevels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  private currentLevelScore: number;

  constructor() {
    this.currentLevelScore = this.logLevels[env.LOG_LEVEL as LogLevel] ?? 1;
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString();
    const sanitizedContext = context ? sanitizeLogData(context) : undefined;

    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...(sanitizedContext ? { context: sanitizedContext } : {}),
    };

    return JSON.stringify(logEntry);
  }

  public debug(message: string, context?: LogContext): void {
    if (this.currentLevelScore <= this.logLevels.debug) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  public info(message: string, context?: LogContext): void {
    if (this.currentLevelScore <= this.logLevels.info) {
      console.info(this.formatMessage('info', message, context));
    }
  }

  public warn(message: string, context?: LogContext): void {
    if (this.currentLevelScore <= this.logLevels.warn) {
      console.warn(this.formatMessage('warn', message, context));
    }
  }

  public error(message: string, context?: LogContext): void {
    if (this.currentLevelScore <= this.logLevels.error) {
      console.error(this.formatMessage('error', message, context));
    }
  }
}

export const logger = new Logger();
