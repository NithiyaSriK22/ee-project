import { Request } from 'express';
import { UserRole } from './clinical.types.js';

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
  hospitalId?: string;
  sessionId?: string;
}

export interface AppRequest extends Request {
  requestId?: string;
  user?: AuthenticatedUser;
}
