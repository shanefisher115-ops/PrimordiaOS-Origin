"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = sitemap;
const routes = [
    "",
    "/primordiaos",
    "/features",
    "/downloads",
    "/api-demo",
    "/contact"
];
function sitemap() {
    const baseUrl = "https://primordialorigin.com";
    return routes.map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date("2026-07-27"),
        changeFrequency: route === "" ? "daily" : "weekly",
        priority: route === "" ? 1 : 0.7
    }));
}
