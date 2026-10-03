import { promotionEngine } from '../promotion/index.js';

export class MoneyPlugHub {
  constructor() {
    this.channels = new Map();
  }

  async start() {
    console.log('[MoneyPlugHub] started');
  }

  async health() {
    return { status: 'healthy' };
  }

  registerChannel(channel) {
    this.channels.set(channel.name, channel);
    console.log('[MoneyPlugHub] Channel registered:', channel.name);
  }

  listChannels() {
    return Array.from(this.channels.values());
  }

  async emit(event) {
    console.log('[MoneyPlugHub] Event:', event.channel, event.type);

    if (event.type === 'payment.succeeded') {
      await promotionEngine.onRevenue({
        sessionId: event.payload?.id,
        productId: event.payload?.metadata?.product_id,
        amount: event.payload?.amount_total,
        type: event.type,
      });
    }
  }
}

export const moneyPlugHub = new MoneyPlugHub();
