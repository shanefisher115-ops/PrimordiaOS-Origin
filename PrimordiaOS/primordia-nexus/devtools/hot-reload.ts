// devtools/hot-reload.ts
// PrimordiaOS Hot Reload Hooks — full implementation
// Allows modules to reload without restarting the entire OS

import fs from "fs";
import path from "path";
import { restartRuntime } from "../runtime";

export class HotReload {
    private watchers: fs.FSWatcher[] = [];

    watch(dir: string) {
        const fullPath = path.resolve(dir);

        if (!fs.existsSync(fullPath)) {
            console.warn(`[HotReload] Directory not found: ${fullPath}`);
            return;
        }

        const watcher = fs.watch(fullPath, async () => {
            console.log(`[HotReload] Change detected in ${dir}. Reloading…`);
            await restartRuntime();
        });

        this.watchers.push(watcher);
        console.log(`[HotReload] Watching ${fullPath}`);
    }

    stop() {
        for (const w of this.watchers) {
            w.close();
        }
        this.watchers = [];
        console.log("[HotReload] Stopped.");
    }
}

export const hotReload = new HotReload();
