import { Request } from 'express';
import { StaffUserPayload, KioskSessionPayload } from './auth.types.js';

export interface AppRequest extends Request {
  requestId?: string;
  user?: StaffUserPayload;
  kioskSession?: KioskSessionPayload;
}

