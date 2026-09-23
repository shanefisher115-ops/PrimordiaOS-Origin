/**
 * @file SpatialQueryEngine.ts
 * @description Multi-modal query engine executing spatial, temporal, semantic,
 * and hybrid search across the PrimordiaOS Memory Graph.
 */

import { MemoryNode, MemoryNodeType, SpatialVector3 } from '../graph/MemoryNode.js';
import { MemoryGraphEngine } from '../graph/MemoryGraphEngine.js';
import { SpatialIndexer } from '../indexers/SpatialIndexer.js';
import { TemporalIndexer } from '../indexers/TemporalIndexer.js';
import { SemanticMapper } from '../semantic/SemanticMapper.js';
import { RealmMap } from '../realm/RealmMap.js';
import { MemoryLogger } from '../logging/MemoryLogger.js';

export interface SpatialFilter {
  center?: SpatialVector3;
  radius?: number;
  boundingBox?: {
    min: SpatialVector3;
    max: SpatialVector3;
  };
}

export interface TemporalFilter {
  fromTimestamp?: number;
  toTimestamp?: number;
  halfLifeDecayMs?: number;
}

export interface SemanticFilter {
  queryText?: string;
  tags?: string[];
  categories?: string[];
  minSimilarity?: number;
}

export interface HybridQueryWeights {
  spatialWeight: number;
  temporalWeight: number;
  semanticWeight: number;
}

export interface QueryOptions {
  spatial?: SpatialFilter;
  temporal?: TemporalFilter;
  semantic?: SemanticFilter;
  realmIds?: string[];
  types?: MemoryNodeType[];
  includeQuarantined?: boolean;
  weights?: Partial<HybridQueryWeights>;
  limit?: number;
  offset?: number;
}

export interface ScoredMemoryNode {
  node: MemoryNode;
  finalScore: number;
  scores: {
    spatialScore: number;
    temporalScore: number;
    semanticScore: number;
  };
  distanceToTarget?: number;
}

export interface QueryResult {
  matches: ScoredMemoryNode[];
  totalMatches: number;
  executionTimeMs: number;
  appliedFilters: {
    hasSpatial: boolean;
    hasTemporal: boolean;
    hasSemantic: boolean;
    hasRealm: boolean;
  };
}

export class SpatialQueryEngine {
  private readonly graph: MemoryGraphEngine;
  private readonly spatialIndexer: SpatialIndexer;
  private readonly temporalIndexer: TemporalIndexer;
  private readonly semanticMapper: SemanticMapper;
  private readonly realmMap: RealmMap;
  private readonly logger: MemoryLogger;

  constructor(
    graph: MemoryGraphEngine,
    spatialIndexer: SpatialIndexer,
    temporalIndexer: TemporalIndexer,
    semanticMapper: SemanticMapper,
    realmMap: RealmMap,
    logger?: MemoryLogger
  ) {
    this.graph = graph;
    this.spatialIndexer = spatialIndexer;
    this.temporalIndexer = temporalIndexer;
    this.semanticMapper = semanticMapper;
    this.realmMap = realmMap;
    this.logger = logger ?? new MemoryLogger({ component: 'SpatialQueryEngine' });
  }

  public searchSpatial(center: SpatialVector3, radius: number, limit = 50): ScoredMemoryNode[] {
    const rawNodes = this.spatialIndexer.findWithinRadius(center, radius);
    const scored: ScoredMemoryNode[] = rawNodes.map(node => {
      const dist = node.distanceTo(center);
      const spatialScore = radius > 0 ? Math.max(0, 1 - dist / radius) : 1;
      return {
        node,
        finalScore: Number(spatialScore.toFixed(4)),
        scores: { spatialScore, temporalScore: 1, semanticScore: 1 },
        distanceToTarget: Number(dist.toFixed(2)),
      };
    });

    return scored.sort((a, b) => b.finalScore - a.finalScore).slice(0, limit);
  }

  public searchTemporal(fromMs: number, toMs: number, limit = 50): ScoredMemoryNode[] {
    const rawNodes = this.temporalIndexer.findBetween(fromMs, toMs);
    const scored: ScoredMemoryNode[] = rawNodes.map(node => {
      const temporalScore = this.temporalIndexer.calculateDecayScore(node.timestamp);
      return {
        node,
        finalScore: temporalScore,
        scores: { spatialScore: 1, temporalScore, semanticScore: 1 },
      };
    });

    return scored.sort((a, b) => b.finalScore - a.finalScore).slice(0, limit);
  }

  public searchSemantic(queryText: string, minSimilarity = 0.1, limit = 50): ScoredMemoryNode[] {
    const queryTags = this.semanticMapper.extractTags(queryText);
    const allNodes = this.graph.getAllNodes();

    const scored: ScoredMemoryNode[] = [];
    for (const node of allNodes) {
      if (node.quarantineStatus === 'quarantined') continue;

      const sim = this.semanticMapper.computeSimilarity(queryTags, node.semanticTags, queryText, node.content);
      if (sim >= minSimilarity) {
        scored.push({
          node,
          finalScore: sim,
          scores: { spatialScore: 1, temporalScore: 1, semanticScore: sim },
        });
      }
    }

    return scored.sort((a, b) => b.finalScore - a.finalScore).slice(0, limit);
  }

  public query(options: QueryOptions): QueryResult {
    const startTime = performance.now();
    const weights: HybridQueryWeights = {
      spatialWeight: options.weights?.spatialWeight ?? 0.35,
      temporalWeight: options.weights?.temporalWeight ?? 0.25,
      semanticWeight: options.weights?.semanticWeight ?? 0.4,
    };

    // Normalize weights to sum to 1
    const totalWeight = weights.spatialWeight + weights.temporalWeight + weights.semanticWeight || 1;
    const normWeights = {
      spatial: weights.spatialWeight / totalWeight,
      temporal: weights.temporalWeight / totalWeight,
      semantic: weights.semanticWeight / totalWeight,
    };

    // Candidate selection
    let candidateNodes: MemoryNode[] = [];

    if (options.spatial?.center && options.spatial?.radius !== undefined) {
      candidateNodes = this.spatialIndexer.findWithinRadius(
        options.spatial.center,
        options.spatial.radius
      );
    } else if (options.spatial?.boundingBox) {
      candidateNodes = this.spatialIndexer.findInBoundingBox(
        options.spatial.boundingBox.min,
        options.spatial.boundingBox.max
      );
    } else if (
      options.temporal?.fromTimestamp !== undefined &&
      options.temporal?.toTimestamp !== undefined
    ) {
      candidateNodes = this.temporalIndexer.findBetween(
        options.temporal.fromTimestamp,
        options.temporal.toTimestamp
      );
    } else {
      candidateNodes = this.graph.getAllNodes();
    }

    // Filter and score candidates
    const scoredList: ScoredMemoryNode[] = [];
    const queryTags = options.semantic?.queryText
      ? this.semanticMapper.extractTags(options.semantic.queryText)
      : options.semantic?.tags || [];

    for (const node of candidateNodes) {
      // Quarantine check
      if (!options.includeQuarantined && node.quarantineStatus === 'quarantined') {
        continue;
      }

      // Realm filter
      if (options.realmIds && options.realmIds.length > 0 && !options.realmIds.includes(node.realmId)) {
        continue;
      }

      // Node type filter
      if (options.types && options.types.length > 0 && !options.types.includes(node.type)) {
        continue;
      }

      // Semantic category filter
      if (options.semantic?.categories && options.semantic.categories.length > 0) {
        const cat = String(node.metadata['semanticCategory'] || '');
        if (!options.semantic.categories.includes(cat)) {
          continue;
        }
      }

      // Compute Spatial Score
      let spatialScore = 1.0;
      let distanceToTarget: number | undefined;
      if (options.spatial?.center) {
        distanceToTarget = node.distanceTo(options.spatial.center);
        const radius = options.spatial.radius || 1000;
        spatialScore = Math.max(0, 1 - distanceToTarget / radius);
      }

      // Compute Temporal Score
      let temporalScore = 1.0;
      if (options.temporal?.halfLifeDecayMs) {
        temporalScore = this.temporalIndexer.calculateDecayScore(
          node.timestamp,
          options.temporal.halfLifeDecayMs
        );
      } else {
        temporalScore = this.temporalIndexer.calculateDecayScore(node.timestamp);
      }

      // Compute Semantic Score
      let semanticScore = 1.0;
      if (queryTags.length > 0 || options.semantic?.queryText) {
        semanticScore = this.semanticMapper.computeSimilarity(
          queryTags,
          node.semanticTags,
          options.semantic?.queryText,
          node.content
        );

        if (
          options.semantic?.minSimilarity !== undefined &&
          semanticScore < options.semantic.minSimilarity
        ) {
          continue;
        }
      }

      // Final hybrid score calculation
      const finalScore = Number(
        (
          normWeights.spatial * spatialScore +
          normWeights.temporal * temporalScore +
          normWeights.semantic * semanticScore
        ).toFixed(4)
      );

      scoredList.push({
        node,
        finalScore,
        scores: {
          spatialScore: Number(spatialScore.toFixed(4)),
          temporalScore: Number(temporalScore.toFixed(4)),
          semanticScore: Number(semanticScore.toFixed(4)),
        },
        ...(distanceToTarget !== undefined
          ? { distanceToTarget: Number(distanceToTarget.toFixed(2)) }
          : {}),
      });
    }

    // Sort descending by score
    scoredList.sort((a, b) => b.finalScore - a.finalScore);

    const offset = options.offset || 0;
    const limit = options.limit || 50;
    const paginatedMatches = scoredList.slice(offset, offset + limit);

    const executionTimeMs = Number((performance.now() - startTime).toFixed(2));

    return {
      matches: paginatedMatches,
      totalMatches: scoredList.length,
      executionTimeMs,
      appliedFilters: {
        hasSpatial: Boolean(options.spatial),
        hasTemporal: Boolean(options.temporal),
        hasSemantic: Boolean(options.semantic),
        hasRealm: Boolean(options.realmIds && options.realmIds.length > 0),
      },
    };
  }
}
