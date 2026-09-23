// src/realms/blogEngine/publisher.ts
import * as fs from 'fs';
import * as path from 'path';
export class BlogPublisher {
    outputDir;
    funnelAgent;
    indexFilePath;
    lineageFilePath;
    constructor(config) {
        this.outputDir = config.outputDir;
        this.funnelAgent = config.funnelAgent;
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
        this.indexFilePath = path.join(this.outputDir, 'blog_index.json');
        this.lineageFilePath = path.join(this.outputDir, 'blog_lineage.jsonl');
    }
    /**
     * Publishes a deterministic BlogPost:
     * 1. Writes markdown artifact to /data/blog/<slug>.md
     * 2. Writes JSON metadata to /data/blog/<slug>.json
     * 3. Appends audit record to append-only blog_lineage.jsonl
     * 4. Synchronizes blog_index.json
     * 5. Broadcasts BLOG_POST_CREATED to FunnelAgent
     */
    publish(post) {
        try {
            if (!fs.existsSync(this.outputDir)) {
                fs.mkdirSync(this.outputDir, { recursive: true });
            }
            const markdownPath = path.join(this.outputDir, `${post.slug}.md`);
            const jsonPath = path.join(this.outputDir, `${post.slug}.json`);
            // 1. Build Markdown with canonical frontmatter
            const markdownContent = this.formatMarkdown(post);
            fs.writeFileSync(markdownPath, markdownContent, 'utf-8');
            // 2. Write JSON metadata
            fs.writeFileSync(jsonPath, JSON.stringify(post, null, 2), 'utf-8');
            // 3. Append to append-only lineage
            const lineageEntry = {
                ts: post.ts,
                id: post.id,
                slug: post.slug,
                realm: post.realm,
                title: post.title,
                idempotencyKey: post.idempotencyKey,
                auditHash: post.auditHash,
                wordCount: post.wordCount,
                publishedAtMs: Date.now(),
            };
            fs.appendFileSync(this.lineageFilePath, JSON.stringify(lineageEntry) + '\n', 'utf-8');
            // 4. Update blog_index.json
            this.updateIndex(post, `${post.slug}.md`);
            // 5. Broadcast to FunnelAgent
            if (this.funnelAgent) {
                this.funnelAgent.notifyBlogPost(post);
            }
            return {
                published: true,
                markdownPath,
                jsonPath,
                indexUpdated: true,
                lineageUpdated: true,
                post,
            };
        }
        catch (err) {
            console.error(`[BlogPublisher] Failed to publish post ${post.id}:`, err);
            return {
                published: false,
                markdownPath: path.join(this.outputDir, `${post.slug}.md`),
                jsonPath: path.join(this.outputDir, `${post.slug}.json`),
                indexUpdated: false,
                lineageUpdated: false,
                post,
                error: err.message,
            };
        }
    }
    getIndex() {
        if (!fs.existsSync(this.indexFilePath)) {
            return [];
        }
        try {
            const content = fs.readFileSync(this.indexFilePath, 'utf-8');
            return JSON.parse(content);
        }
        catch {
            return [];
        }
    }
    getLineage() {
        if (!fs.existsSync(this.lineageFilePath)) {
            return [];
        }
        try {
            const content = fs.readFileSync(this.lineageFilePath, 'utf-8').trim();
            if (!content)
                return [];
            return content.split('\n').map((line) => JSON.parse(line));
        }
        catch {
            return [];
        }
    }
    formatMarkdown(post) {
        const frontmatter = [
            '---',
            `id: "${post.id}"`,
            `title: ${JSON.stringify(post.title)}`,
            `slug: "${post.slug}"`,
            `realm: "${post.realm}"`,
            `ts: ${post.ts}`,
            `date: "${new Date(post.ts).toISOString()}"`,
            `tags: ${JSON.stringify(post.tags)}`,
            `glyphs: ${JSON.stringify(post.glyphs ?? [])}`,
            `idempotencyKey: "${post.idempotencyKey}"`,
            `auditHash: "${post.auditHash}"`,
            `wordCount: ${post.wordCount ?? 0}`,
            `ctaUrl: "${post.ctaUrl ?? ''}"`,
            `ctaText: "${post.ctaText ?? ''}"`,
            '---',
            '',
            post.body,
        ].join('\n');
        return frontmatter;
    }
    updateIndex(post, mdFilename) {
        let index = [];
        if (fs.existsSync(this.indexFilePath)) {
            try {
                const raw = fs.readFileSync(this.indexFilePath, 'utf-8');
                index = JSON.parse(raw);
            }
            catch {
                index = [];
            }
        }
        const newItem = {
            id: post.id,
            ts: post.ts,
            title: post.title,
            slug: post.slug,
            realm: String(post.realm),
            tags: post.tags,
            glyphs: (post.glyphs ?? []),
            wordCount: post.wordCount ?? 0,
            auditHash: post.auditHash,
            markdownFile: mdFilename,
        };
        // Remove existing item with same slug if present to maintain idempotency
        const filtered = index.filter((item) => item.slug !== post.slug && item.id !== post.id);
        filtered.unshift(newItem);
        fs.writeFileSync(this.indexFilePath, JSON.stringify(filtered, null, 2), 'utf-8');
    }
}
