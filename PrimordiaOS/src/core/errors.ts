import { Logger } from './logger';

export class PrimordiaError extends Error {
  constructor(message: string, public context?: any) {
    super(message);
    Logger.error('PrimordiaError thrown', { message, context });
  }
}

export class ValidationError extends PrimordiaError {}
export class AuthError extends PrimordiaError {}
export class RoutingError extends PrimordiaError {}
