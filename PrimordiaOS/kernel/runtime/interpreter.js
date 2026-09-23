"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.interpretSentence = interpretSentence;
const antigravity_js_1 = require("./antigravity.js");
const kernel_js_1 = require("../core/kernel.js");
const index_js_1 = require("../../modules/world/index.js");
const index_js_2 = require("../../modules/physics/index.js");
const index_js_3 = require("../../modules/editor/index.js");
async function interpretSentence(input) {
    const intent = await (0, antigravity_js_1.antigravity)(input);
    switch (intent.action) {
        case "world.spawn":
            index_js_1.World.spawn(intent.entity, intent.params);
            break;
        case "world.update":
            index_js_1.World.update(intent.entity, intent.params);
            break;
        case "physics.force":
            index_js_2.Physics.applyForce(intent.entity, intent.params);
            break;
        case "editor.select":
            index_js_3.Editor.select(intent.entity);
            break;
        default:
            kernel_js_1.Kernel.emit("nl.unknown", { raw: input, intent });
    }
}
