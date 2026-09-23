import axios from 'axios';
import { Logger } from '../core/logger';

export class CloudflareGateway {
  private client = axios.create({
    baseURL: process.env.CLOUDFLARE_GATEWAY_URL,
    timeout: 10000,
  });

  async dispatch(path: string, payload: any) {
    try {
      const res = await this.client.post(path, payload);
      Logger.info('CloudflareGateway dispatched', { path, status: res.status });
      return res.data;
    } catch (err) {
      Logger.error('CloudflareGateway error', { error: (err as Error).message });
      throw err;
    }
  }
}

export const cloudflareGateway = new CloudflareGateway();
