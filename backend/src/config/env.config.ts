import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().positive().default(5000),
  API_BASE_URL: z.string().default('http://localhost:5000/api/v1'),
  DATABASE_URL: z.string().url().default('postgresql://medikiosk_user:medikiosk_password@localhost:5432/medikiosk_db?schema=public'),
  KIOSK_FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  DOCTOR_PORTAL_FRONTEND_URL: z.string().url().default('http://localhost:5174'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters').default('development_jwt_secret_must_be_at_least_32_chars_long_medikiosk'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_SECRET: z.string().min(16).default('development_refresh_token_secret_medikiosk_32_chars_minimum'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),
  KIOSK_SESSION_SECRET: z.string().min(16).default('development_kiosk_session_secret_medikiosk_32_chars_minimum'),
  KIOSK_SESSION_EXPIRES_IN: z.string().default('1h'),
  PASSWORD_RESET_TOKEN_EXPIRES_IN: z.string().default('1h'),
  EMAIL_VERIFICATION_TOKEN_EXPIRES_IN: z.string().default('24h'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000), // 15 mins
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  AUTH_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(20), // Stricter for auth
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ FATAL: Invalid environment configuration:');
    result.error.issues.forEach((issue) => {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    });
    // In production or development startup failure
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
    // Fallback safe defaults for test if needed
    return envSchema.parse({});
  }
  return result.data;
};

export const env = parseEnv();
export type EnvConfig = z.infer<typeof envSchema>;
