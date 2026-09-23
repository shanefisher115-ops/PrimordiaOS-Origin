import { Logger } from './logger';
export class PrimordiaError extends Error {
    context;
    constructor(message, context) {
        super(message);
        this.context = context;
        Logger.error('PrimordiaError thrown', { message, context });
    }
}
export class ValidationError extends PrimordiaError {
}
export class AuthError extends PrimordiaError {
}
export class RoutingError extends PrimordiaError {
}
