/**
 * @file SemanticMapper.ts
 * @description Extracts semantic features, tags, taxonomy classifications, and cryptographic
 * fingerprints from MemoryNodes in PrimordiaOS.
 */
import { createHash } from 'node:crypto';
import { MemoryLogger } from '../logging/MemoryLogger.js';
const DEFAULT_CATEGORIES = [
    {
        name: 'SOVEREIGN_DIRECTIVE',
        keywords: ['sovereign', 'kernel', 'rule', 'antigrav', 'security', 'veto', 'governance', 'policy', 'human'],
        weight: 1.0,
    },
    {
        name: 'COCKPIT_TELEMETRY',
        keywords: ['cockpit', 'arcade', 'hud', 'terminal', 'fps', 'gpu', 'telemetry', 'client', 'websocket'],
        weight: 0.9,
    },
    {
        name: 'VISION_SYNTHESIS',
        keywords: ['movieforge', 'theater', 'shader', 'lut', 'cinema', 'video', 'stream', 'camera', '4k'],
        weight: 0.95,
    },
    {
        name: 'AUTONOMOUS_LOOP',
        keywords: ['moneyplughub', 'autopost', 'loop', 'temporal', 'publish', 'syndication', 'bot', 'cron'],
        weight: 0.9,
    },
    {
        name: 'UNREAL_SIMULATION',
        keywords: ['unreal', 'niagara', 'particle', 'actor', 'mesh', 'cad', 'physics', 'transform', 'velocity'],
        weight: 0.95,
    },
    {
        name: 'LEXICON_INSCRIPTION',
        keywords: ['lexicon', 'codex', 'definition', 'concept', 'ontology', 'inscription', 'taxonomy'],
        weight: 0.85,
    },
];
const STOPWORDS = new Set([
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren',
    'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
    'can', 'cannot', 'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for',
    'from', 'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him',
    'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'more',
    'most', 'my', 'myself', 'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other',
    'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such',
    'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they',
    'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what',
    'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would', 'you', 'your', 'yours',
]);
export class SemanticMapper {
    categories;
    logger;
    constructor(categories, logger) {
        this.categories = categories ?? DEFAULT_CATEGORIES;
        this.logger = logger ?? new MemoryLogger({ component: 'SemanticMapper' });
    }
    tokenize(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s-]/g, ' ')
            .split(/\s+/)
            .filter(token => token.length > 2 && !STOPWORDS.has(token));
    }
    extractTags(text, maxTags = 8) {
        const tokens = this.tokenize(text);
        const frequency = new Map();
        for (const token of tokens) {
            frequency.set(token, (frequency.get(token) || 0) + 1);
        }
        return Array.from(frequency.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, maxTags)
            .map(([word]) => word);
    }
    classifyCategory(text, tags = []) {
        const lowerText = text.toLowerCase();
        const tokenSet = new Set([...this.tokenize(text), ...tags.map(t => t.toLowerCase())]);
        let bestCategory = 'GENERAL_OBSERVATION';
        let highestScore = 0;
        for (const cat of this.categories) {
            let matchCount = 0;
            for (const kw of cat.keywords) {
                if (tokenSet.has(kw) || lowerText.includes(kw)) {
                    matchCount += 1;
                }
            }
            const score = matchCount * cat.weight;
            if (score > highestScore && score >= 1.0) {
                highestScore = score;
                bestCategory = cat.name;
            }
        }
        return bestCategory;
    }
    computeFingerprint(text, tags = []) {
        const sortedTokens = [...this.tokenize(text), ...tags.map(t => t.toLowerCase())].sort();
        const normalized = sortedTokens.join('|');
        return createHash('sha256').update(normalized).digest('hex');
    }
    computeSimilarity(tagsA, tagsB, contentA, contentB) {
        const setA = new Set([...tagsA.map(t => t.toLowerCase()), ...(contentA ? this.tokenize(contentA) : [])]);
        const setB = new Set([...tagsB.map(t => t.toLowerCase()), ...(contentB ? this.tokenize(contentB) : [])]);
        if (setA.size === 0 || setB.size === 0) {
            return 0;
        }
        let intersectionCount = 0;
        for (const item of setA) {
            if (setB.has(item)) {
                intersectionCount += 1;
            }
        }
        // Jaccard similarity coefficient
        const unionSize = setA.size + setB.size - intersectionCount;
        return unionSize > 0 ? Number((intersectionCount / unionSize).toFixed(4)) : 0;
    }
    enrichNode(node) {
        if (!node.semanticTags || node.semanticTags.length === 0) {
            node.semanticTags = this.extractTags(node.content);
        }
        if (!node.semanticFingerprint) {
            node.semanticFingerprint = this.computeFingerprint(node.content, node.semanticTags);
        }
        if (!node.metadata['semanticCategory']) {
            node.metadata['semanticCategory'] = this.classifyCategory(node.content, node.semanticTags);
        }
    }
}
