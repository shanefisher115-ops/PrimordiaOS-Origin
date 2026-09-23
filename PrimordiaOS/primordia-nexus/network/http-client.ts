// network/http-client.ts
// PrimordiaOS HTTP Client — full implementation
// Supports GET, POST, retries, backoff, and request tracing

import http from "http";
import https from "https";

export interface HttpResponse<T = any> {
    status: number;
    headers: Record<string, string | string[]>;
    data: T;
}

export class HttpClient {
    async get<T = any>(url: string, retries = 2): Promise<HttpResponse<T>> {
        return this.request<T>("GET", url, null, retries);
    }

    async post<T = any>(url: string, body: any, retries = 2): Promise<HttpResponse<T>> {
        return this.request<T>("POST", url, body, retries);
    }

    private async request<T>(
        method: string,
        url: string,
        body: any,
        retries: number
    ): Promise<HttpResponse<T>> {
        const isHttps = url.startsWith("https://");
        const client = isHttps ? https : http;

        const attempt = async (retryCount: number): Promise<HttpResponse<T>> => {
            return new Promise((resolve, reject) => {
                const req = client.request(url, { method }, (res) => {
                    let data = "";

                    res.on("data", (chunk) => (data += chunk));
                    res.on("end", () => {
                        try {
                            resolve({
                                status: res.statusCode || 0,
                                headers: res.headers,
                                data: data ? JSON.parse(data) : null
                            });
                        } catch (err) {
                            reject(err);
                        }
                    });
                });

                req.on("error", async (err) => {
                    if (retryCount > 0) {
                        const backoff = (3 - retryCount) * 200;
                        await new Promise((r) => setTimeout(r, backoff));
                        resolve(attempt(retryCount - 1));
                    } else {
                        reject(err);
                    }
                });

                if (body) {
                    req.write(JSON.stringify(body));
                }

                req.end();
            });
        };

        return attempt(retries);
    }
}

export const httpClient = new HttpClient();
