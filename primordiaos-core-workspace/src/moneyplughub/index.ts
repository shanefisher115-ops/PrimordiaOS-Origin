import { phom, RouteMessage } from "../phom";

export interface MoneyChannel {
  name: string;
  description?: string;
}

export interface MoneyEvent {
  channel: string;
  type: string;
  payload: unknown;
}

export class MoneyPlugHub {
  private channels: Map<string, MoneyChannel> = new Map();

  async start(): Promise<void> {
    console.log("[MoneyPlugHub] started");
  }

  async health(): Promise<{ status: string }> {
    return { status: "healthy" };
  }

  registerChannel(channel: MoneyChannel): void {
    this.channels.set(channel.name, channel);
    console.log("[MoneyPlugHub] Channel registered:", channel.name);
  }

  listChannels(): MoneyChannel[] {
    return Array.from(this.channels.values());
  }

  async emit(event: MoneyEvent): Promise<void> {
    console.log("[MoneyPlugHub] Event:", event.channel, event.type);
    const msg: RouteMessage = {
      from: "MoneyPlugHub",
      to: "Aetherflow",
      topic: "money.event",
      payload: event
    };
    await phom.publish(msg);
  }
}

export const moneyPlugHub = new MoneyPlugHub();
