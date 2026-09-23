# PrimordiaOS Spatial Memory Engine Subsystem

[![Node Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![ESM](https://img.shields.io/badge/module-ESM-yellow.svg)](https://nodejs.org/api/esm.html)
[![Cloud Run](https://img.shields.io/badge/Google%20Cloud-Run%20Ready-4285F4.svg)](https://cloud.google.com/run)

The **Spatial Memory Engine** is a core subsystem of the PrimordiaOS sovereign architecture. It unifies high-dimensional spatial indexing (3D coordinate realms), chronological time-series indexes, semantic taxonomy ontology, graph topology, real-time cross-subsystem context synchronization, and crash-resilient atomic persistence.

---

## 🏛️ Swarm Architecture & Roles

The subsystem was synthesized via a coordinated 13-agent sovereign swarm:

1. **Folder Architect**: Established the directory hierarchy and component isolation.
2. **Spatial Memory Architect**: Authored `SpatialMemoryEngine`, `SpatialMemoryBoot`, and `SpatialMemoryShutdown`.
3. **Realm Map Specialist**: Implemented `RealmMap` with 3D coordinate boundaries and adjacency graphs.
4. **Context Sync Specialist**: Created `ContextSyncEngine` with Lamport logical clocks, vector clocks, and conflict resolution across Kernel, Cockpit, VisionCore, MoneyPlugHub, and Unreal Bridge.
5. **Memory Graph Specialist**: Built `MemoryGraphEngine`, `MemoryNode`, and `MemoryEdge` with subgraphs and pathfinding.
6. **Spatial Indexer Specialist**: Implemented `SpatialIndexer` with 3D spatial hashing, radius queries, bounding boxes, and DBSCAN-style spatial clustering.
7. **Temporal Indexer Specialist**: Implemented `TemporalIndexer` with binary-search ordered timelines, exponential half-life decay, and burst clustering.
8. **Semantic Mapper Specialist**: Developed `SemanticMapper` for tokenization, Jaccard similarity, taxonomy classification, and cryptographic SHA-256 fingerprinting.
9. **Spatial Query Engine Specialist**: Engineered `SpatialQueryEngine` executing multi-modal hybrid queries with configurable weights.
10. **Memory Persistence Specialist**: Implemented `MemoryPersistenceLayer` with Write-Ahead Logging (WAL), atomic `.tmp` file renames, and manifest checksums.
11. **Safety & Logging Specialist**: Delivered `MemorySafetyLayer` (quarantine pool, bounds validation, cycle defense) and `MemoryLogger` (structured JSON logging and circular buffers).
12. **Deployment Specialist**: Configured `Dockerfile` and `cloudbuild.yaml` for Google Cloud Run deployment.
13. **QA Validator**: Validated TypeScript ESM typing, imports, and compilation.

---

## 📁 Project Structure

```
spatial-memory-engine/
├── src/
│   ├── core/
│   │   ├── SpatialMemoryEngine.ts     # Master coordinator and high-level API
│   │   ├── SpatialMemoryBoot.ts       # Hydration, validation, and warm-up sequence
│   │   └── SpatialMemoryShutdown.ts   # Graceful drain, snapshot flush, and signal broadcast
│   ├── realm/
│   │   └── RealmMap.ts                # 3D realm boundaries and topological adjacency
│   ├── sync/
│   │   └── ContextSyncEngine.ts       # Subsystem sync, Lamport clocks, conflict resolution
│   ├── graph/
│   │   ├── MemoryNode.ts              # Core MemoryNode entity with 3D coordinates
│   │   ├── MemoryEdge.ts              # Directed edges (semantic, spatial, temporal, causal)
│   │   └── MemoryGraphEngine.ts       # Graph operations, subgraphs, BFS pathfinding
│   ├── indexers/
│   │   ├── SpatialIndexer.ts          # 3D spatial grid, k-NN, radius search, clustering
│   │   └── TemporalIndexer.ts         # Timeline search, exponential decay, burst clustering
│   ├── semantic/
│   │   └── SemanticMapper.ts          # Semantic tagging, categories, SHA-256 fingerprints
│   ├── query/
│   │   └── SpatialQueryEngine.ts      # Multi-modal hybrid query ranking engine
│   ├── persistence/
│   │   └── MemoryPersistenceLayer.ts  # WAL append-log, atomic snapshots, manifest checksums
│   ├── safety/
│   │   └── MemorySafetyLayer.ts       # Quarantine pool, bounds enforcement, injection defense
│   ├── logging/
│   │   └── MemoryLogger.ts            # Structured JSON telemetry and circular ring buffer
│   └── index.ts                       # Subsystem exports & Cloud Run HTTP server daemon
├── package.json                       # ESM project manifest
├── tsconfig.json                      # NodeNext TypeScript configuration
├── Dockerfile                         # Multi-stage production container build
├── cloudbuild.yaml                    # Google Cloud Build & Cloud Run pipeline
└── README.md                          # Subsystem documentation
```

---

## ⚙️ System Requirements & Environment Variables

- **Node.js**: `v20.0.0` or newer
- **TypeScript**: `5.5+`
- **Module Format**: Pure ESM (`"type": "module"`)

### Environment Variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | HTTP server port for Cloud Run | `8080` |
| `PRIMORDIAOS_KEY` | Cryptographic sovereignty / auth token | `undefined` (Local fallback mode) |
| `SPATIAL_MEMORY_PATH` | Storage directory for snapshots and WAL | `./data/spatial-memory` |
| `REALM_MAP_PATH` | File path for realm geometry and adjacency | `./data/realm-map.json` |
| `LOG_LEVEL` | Minimum log level (`DEBUG`, `INFO`, `WARN`, `ERROR`, `FATAL`) | `INFO` |

---

## 🚀 Local Development

### 1. Install Dependencies
```bash
cd spatial-memory-engine
npm install
```

### 2. Compile TypeScript
```bash
npm run build
```

### 3. Launch the Daemon
```bash
npm start
```

The daemon starts on `http://0.0.0.0:8080`.

---

## 🌐 Cloud Run Microservice API Reference

### Health & Liveness
- `GET /healthz`
  - Returns `200 OK` with `{ "status": "HEALTHY", "online": true }`. Used by Cloud Run probes.

### Engine Telemetry
- `GET /api/status`
  - Returns live node/edge counts, graph density, uptime, and vector clock coherence metrics.

### Realms
- `GET /api/realms`
  - Returns all registered realms (Sovereign Core, Cockpit, VisionCore, MoneyPlugHub, Unreal Bridge, Lexicon).

### Memory Creation & Linking
- `POST /api/memory/create`
  - Request body:
    ```json
    {
      "content": "Operator executed high-altitude neural warp benchmark",
      "coordinates": { "x": 100, "y": 50, "z": 0 },
      "type": "observation",
      "semanticTags": ["warp", "telemetry"]
    }
    ```
- `POST /api/memory/link`
  - Request body:
    ```json
    {
      "sourceId": "<node-uuid-1>",
      "targetId": "<node-uuid-2>",
      "type": "causal",
      "weight": 0.95
    }
    ```

### Hybrid Multi-Modal Queries
- `POST /api/query`
  - Executes multi-criteria ranking combining spatial distance, temporal decay, and semantic relevance:
    ```json
    {
      "spatial": { "center": { "x": 0, "y": 0, "z": 0 }, "radius": 500 },
      "semantic": { "queryText": "neural warp telemetry", "minSimilarity": 0.2 },
      "temporal": { "halfLifeDecayMs": 86400000 },
      "weights": { "spatialWeight": 0.4, "temporalWeight": 0.2, "semanticWeight": 0.4 },
      "limit": 10
    }
    ```

### Context Synchronization
- `POST /api/sync`
  - Broadcasts cross-subsystem context updates and runs Lamport conflict detection:
    ```json
    {
      "subsystemId": "COCKPIT",
      "activeRealmId": "sovereign_cockpit",
      "payload": { "activeView": "NEURAL_THEATER" },
      "focusTargetId": "actor_stream_4k"
    }
    ```

### Clustering & Flush
- `GET /api/clusters/spatial?radius=150&minSize=2`
- `GET /api/clusters/temporal?deltaMs=60000&minSize=2`
- `POST /api/flush`

---

## 🐳 Docker & Cloud Run Deployment

### Local Container Run
```bash
docker build -t primordia-spatial-memory .
docker run -p 8080:8080 \
  -e PRIMORDIAOS_KEY=your_key_here \
  primordia-spatial-memory
```

### Deploying via Google Cloud Build
```bash
gcloud builds submit --config=cloudbuild.yaml --substitutions=_REGION="us-central1"
```
