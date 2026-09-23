"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const generator_1 = require("@/primordia/generator");
async function POST(req) {
    const body = await req.json();
    const pipeline = generator_1.Generator.generatePipeline(body);
    const artifacts = await generator_1.Generator.emitArtifacts(pipeline);
    return server_1.NextResponse.json(artifacts);
}
