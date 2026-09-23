/**
 * Cloud Vessel container definition for Cloudflare Workers & Cloud Run.
 */
export const CloudVessel = {
  id: "vessel-cloud-edge",
  type: "serverless_edge",
  provider: "Cloudflare/GCP",
  capabilities: ["global_distribution", "ai_gateway", "ddos_protection", "serverless_scale"]
};

export default CloudVessel;
