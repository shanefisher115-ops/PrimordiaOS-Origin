/**
 * @file SpatialIndexer.ts
 * @description High-performance 3D Spatial Grid indexer for MemoryNodes in PrimordiaOS.
 * Provides bucketed spatial hashing, radius search, bounding box queries, k-NN, and spatial clustering.
 */
import { MemoryLogger } from '../logging/MemoryLogger.js';
export class SpatialIndexer {
    cellSize;
    // Spatial hash: "x:y:z" -> Set of node IDs
    grid = new Map();
    // Node ID -> spatial hash key
    nodeKeys = new Map();
    // Node ID -> MemoryNode reference
    indexedNodes = new Map();
    logger;
    constructor(cellSize = 100, logger) {
        this.cellSize = cellSize;
        this.logger = logger ?? new MemoryLogger({ component: 'SpatialIndexer' });
    }
    hash(coords) {
        const cx = Math.floor(coords.x / this.cellSize);
        const cy = Math.floor(coords.y / this.cellSize);
        const cz = Math.floor(coords.z / this.cellSize);
        return `${cx}:${cy}:${cz}`;
    }
    indexNode(node) {
        if (this.nodeKeys.has(node.id)) {
            this.unindexNode(node.id);
        }
        const key = this.hash(node.coordinates);
        let cell = this.grid.get(key);
        if (!cell) {
            cell = new Set();
            this.grid.set(key, cell);
        }
        cell.add(node.id);
        this.nodeKeys.set(node.id, key);
        this.indexedNodes.set(node.id, node);
    }
    unindexNode(nodeId) {
        const key = this.nodeKeys.get(nodeId);
        if (!key)
            return false;
        const cell = this.grid.get(key);
        if (cell) {
            cell.delete(nodeId);
            if (cell.size === 0) {
                this.grid.delete(key);
            }
        }
        this.nodeKeys.delete(nodeId);
        this.indexedNodes.delete(nodeId);
        return true;
    }
    reindexNode(node) {
        this.indexNode(node);
    }
    clear() {
        this.grid.clear();
        this.nodeKeys.clear();
        this.indexedNodes.clear();
    }
    findWithinRadius(center, radius) {
        const minX = Math.floor((center.x - radius) / this.cellSize);
        const maxX = Math.floor((center.x + radius) / this.cellSize);
        const minY = Math.floor((center.y - radius) / this.cellSize);
        const maxY = Math.floor((center.y + radius) / this.cellSize);
        const minZ = Math.floor((center.z - radius) / this.cellSize);
        const maxZ = Math.floor((center.z + radius) / this.cellSize);
        const candidateIds = new Set();
        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                for (let z = minZ; z <= maxZ; z++) {
                    const key = `${x}:${y}:${z}`;
                    const cell = this.grid.get(key);
                    if (cell) {
                        for (const id of cell)
                            candidateIds.add(id);
                    }
                }
            }
        }
        const results = [];
        const r2 = radius * radius;
        for (const id of candidateIds) {
            const node = this.indexedNodes.get(id);
            if (!node)
                continue;
            const dx = node.coordinates.x - center.x;
            const dy = node.coordinates.y - center.y;
            const dz = node.coordinates.z - center.z;
            if (dx * dx + dy * dy + dz * dz <= r2) {
                results.push(node);
            }
        }
        return results;
    }
    findInBoundingBox(min, max) {
        const minX = Math.floor(min.x / this.cellSize);
        const maxX = Math.floor(max.x / this.cellSize);
        const minY = Math.floor(min.y / this.cellSize);
        const maxY = Math.floor(max.y / this.cellSize);
        const minZ = Math.floor(min.z / this.cellSize);
        const maxZ = Math.floor(max.z / this.cellSize);
        const candidateIds = new Set();
        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                for (let z = minZ; z <= maxZ; z++) {
                    const key = `${x}:${y}:${z}`;
                    const cell = this.grid.get(key);
                    if (cell) {
                        for (const id of cell)
                            candidateIds.add(id);
                    }
                }
            }
        }
        const results = [];
        for (const id of candidateIds) {
            const node = this.indexedNodes.get(id);
            if (node && node.isWithinBoundingBox(min, max)) {
                results.push(node);
            }
        }
        return results;
    }
    findKNearest(target, k) {
        if (this.indexedNodes.size === 0 || k <= 0) {
            return [];
        }
        const allWithDistances = [];
        for (const node of this.indexedNodes.values()) {
            const dist = node.distanceTo(target);
            allWithDistances.push({ node, distance: dist });
        }
        allWithDistances.sort((a, b) => a.distance - b.distance);
        return allWithDistances.slice(0, k);
    }
    computeClusters(clusterRadius = 150, minClusterSize = 2) {
        const visited = new Set();
        const clusters = [];
        let clusterIdx = 1;
        for (const node of this.indexedNodes.values()) {
            if (visited.has(node.id))
                continue;
            const neighbors = this.findWithinRadius(node.coordinates, clusterRadius);
            if (neighbors.length >= minClusterSize) {
                const clusterNodes = [];
                const queue = [...neighbors];
                for (const n of neighbors) {
                    visited.add(n.id);
                }
                while (queue.length > 0) {
                    const current = queue.shift();
                    clusterNodes.push(current);
                    const subNeighbors = this.findWithinRadius(current.coordinates, clusterRadius);
                    if (subNeighbors.length >= minClusterSize) {
                        for (const sub of subNeighbors) {
                            if (!visited.has(sub.id)) {
                                visited.add(sub.id);
                                queue.push(sub);
                            }
                        }
                    }
                }
                // Compute centroid
                let sumX = 0;
                let sumY = 0;
                let sumZ = 0;
                for (const cn of clusterNodes) {
                    sumX += cn.coordinates.x;
                    sumY += cn.coordinates.y;
                    sumZ += cn.coordinates.z;
                }
                const count = clusterNodes.length;
                const centroid = {
                    x: Number((sumX / count).toFixed(2)),
                    y: Number((sumY / count).toFixed(2)),
                    z: Number((sumZ / count).toFixed(2)),
                };
                // Compute max spread radius
                let maxDist = 0;
                for (const cn of clusterNodes) {
                    const dx = cn.coordinates.x - centroid.x;
                    const dy = cn.coordinates.y - centroid.y;
                    const dz = cn.coordinates.z - centroid.z;
                    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                    if (dist > maxDist)
                        maxDist = dist;
                }
                clusters.push({
                    id: `cluster_spatial_${clusterIdx++}`,
                    centroid,
                    radius: Number(maxDist.toFixed(2)),
                    nodeCount: count,
                    nodeIds: clusterNodes.map(n => n.id),
                });
            }
        }
        return clusters;
    }
    getIndexSize() {
        return this.indexedNodes.size;
    }
}
