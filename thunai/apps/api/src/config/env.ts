import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3001', 10),
  DEMO_MODE: process.env.DEMO_MODE !== 'false', // Default true for hackathon demo
  OCR_MODE: (process.env.OCR_MODE === 'live' ? 'live' : 'cached') as 'cached' | 'live',
  SUMMARY_MODE: (process.env.SUMMARY_MODE === 'llm' ? 'llm' : 'template') as 'template' | 'llm',
  LLM_API_KEY: process.env.LLM_API_KEY || '',
  DB_PATH: process.env.DB_PATH || path.resolve(process.cwd(), 'data', 'thunai.db'),
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
};
