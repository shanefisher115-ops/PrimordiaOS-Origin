"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postBrowserContext = postBrowserContext;
const API_URL = "https://primordia-api-560206548182.us-central1.run.app/api/browser/context";
async function postBrowserContext(context) {
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
