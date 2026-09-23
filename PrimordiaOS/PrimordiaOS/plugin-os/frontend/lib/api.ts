export type BrowserContextPayload = {
  source: "primordialorigin.com";
  page: string;
  signal: string;
  intent: string;
  timestamp: string;
};

export type BrowserContextResponse = {
  nextAction?: string;
  [key: string]: unknown;
};

const API_URL = "https://primordia-api-560206548182.us-central1.run.app/api/browser/context";

export async function postBrowserContext(context: BrowserContextPayload): Promise<BrowserContextResponse> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(context)
  });

  if (!response.ok) {
    throw new Error(`Cloud Run API returned ${response.status}`);
  }

  return response.json();
}
