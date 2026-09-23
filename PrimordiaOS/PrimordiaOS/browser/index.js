// primordiaos/realms/browser/index.ts
import { CommandBus } from "../../command-bus/bus";
import { extractLogo } from "./extractLogo";
export function registerBrowserRealm() {
    CommandBus.register("browser.extractLogo", extractLogo);
}
