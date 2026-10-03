# Vision Core

## Purpose
Provide perception layer for multimodal inputs and scene understanding.

## Responsibilities
- Ingest visual/audio/text signals.
- Extract features.
- Feed agents and memory engine.

## Interfaces
- API: process(input), subscribeOutput(handler).
- Emits: vision.perceived, vision.feature.
- Consumes: external sensor streams.

## Constraints
- Pluggable backends (Cloudflare AI, local models, etc.).
