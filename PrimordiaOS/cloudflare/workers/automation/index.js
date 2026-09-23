"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const autopost_ts_1 = require("../../autopost/autopost.ts");
function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}
exports.default = {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;
        if (request.method === "POST" && path === "/autopost") {
            try {
                const payload = await request.json();
                const caption = await (0, autopost_ts_1.autopostRouter)(payload);
                return json({ caption });
            }
            catch (err) {
                return json({ error: err?.message ?? "autopost failed" }, 500);
            }
        }
        return json({ primordia: "automation-online" });
    },
};
