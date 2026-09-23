"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const workers_1 = require("@notionhq/workers");
const schema_builder_1 = require("@notionhq/workers/schema-builder");
const worker = new workers_1.Worker();
exports.default = worker;
// Example agent tool that returns a greeting
// Delete this when you're ready to start building your own tools.
worker.tool("sayHello", {
    title: "Say Hello",
    description: "Returns a friendly greeting for the given name.",
    schema: schema_builder_1.j.object({
        name: schema_builder_1.j.string().describe("The name to greet."),
    }),
    execute: ({ name }) => `Hello, ${name}!`,
});
