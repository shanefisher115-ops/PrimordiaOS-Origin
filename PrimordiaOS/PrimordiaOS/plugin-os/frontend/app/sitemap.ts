import type { MetadataRoute } from "next";

const routes = [
  "",
  "/primordiaos",
  "/features",
  "/downloads",
  "/api-demo",
  "/contact"
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://primordialorigin.com";

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date("2026-07-27"),
    changeFrequency: route === "" ? "daily" : "weekly",
    priority: route === "" ? 1 : 0.7
  }));
}
