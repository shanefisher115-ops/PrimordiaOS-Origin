// network/external-api.ts
// PrimordiaOS External API Client — full implementation
// Wraps HttpClient with domain-specific helpers and tracing

import { httpClient } from "./http-client";

export class ExternalAPI {
    async fetchJSON(url: string) {
        const res = await httpClient.get(url);
        return res.data;
    }

    async sendJSON(url: string, payload: any) {
        const res = await httpClient.post(url, payload);
        return res.data;
    }

    async ping(url: string) {
        try {
            const res = await httpClient.get(url);
            return { ok: true, status: res.status };
        } catch {
            return { ok: false };
        }
    }
}

export const externalAPI = new ExternalAPI();
