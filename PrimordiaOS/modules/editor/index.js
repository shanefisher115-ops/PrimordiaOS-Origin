import { Kernel } from "../../kernel/core/kernel.js";
export class EditorModule {
    constructor() {
        console.log("[PrimordiaOS] Editor Module Loaded");
    }
    select(entityId) {
        Kernel.emit("editor.select", { entityId });
    }
    transform(entityId, transform) {
        Kernel.emit("editor.transform", { entityId, transform });
    }
    notify(message) {
        Kernel.emit("editor.notify", { message });
    }
}
export const Editor = new EditorModule();
Kernel.registerModule("editor", Editor);
