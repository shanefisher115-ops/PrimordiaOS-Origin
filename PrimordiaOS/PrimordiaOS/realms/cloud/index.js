import { cloudflareGateway } from "./cloudflare-gateway.js";
import { cloudShell } from "./cloud-shell.js";

export const CloudRealm = {
  id: "cloud_realm",
  name: "Cloudflare & Distributed Cloud Realm",
  gateway: cloudflareGateway,
  shell: cloudShell,
  async init() {
    await cloudflareGateway.init();
  }
};

export default CloudRealm;
