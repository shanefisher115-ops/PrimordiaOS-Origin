import { PrimordiaEvent } from '../core/eventBus';
import { RoutedOffer } from '../agents/affiliate/offerRouter';

export type OfferEvent = PrimordiaEvent<RoutedOffer[]>;
