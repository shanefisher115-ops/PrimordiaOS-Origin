import { antigravity } from "./antigravity.js";
import { World } from "../../modules/world/index.js";
import { Physics } from "../../modules/physics/index.js";
import { Editor } from "../../modules/editor/index.js";
import { Kernel } from "../core/kernel.js";
export async function interpretSentence(text) {
    const intent = await antigravity(text);
    switch (intent.action) {
        case "world.spawn":
            return World.spawn(intent.entity, intent.params);
        case "world.update":
            return World.update(intent.entity, intent.params);
        case "physics.force":
            return Physics.applyForce(intent.entity, intent.params);
        case "editor.select":
            return Editor.select(intent.entity);
        default:
            Kernel.emit("nl.unknown", { raw: text, intent });
            return intent;
    }
}
