import { PrimordiaEvent } from '../core/eventBus';
import { PostbackPayload } from '../services/postbackService';

export type ConversionEvent = PrimordiaEvent<PostbackPayload>;
