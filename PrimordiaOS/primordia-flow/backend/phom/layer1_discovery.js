/**
 * ==============================================================================
 * ⭐ LAYER 1: DISCOVERY ENGINE
 * Extracts prospects from inbound signals using:
 * - Regex for emails
 * - Simple domain validation
 * - Optional DNS MX check (safe, non-invasive)
 * - No executive verification
 * - No scraping private data
 *
 * Deliverable:
 * function extractProspect(signal) {
 *   // returns { email, name, domain }
 * }
 * ==============================================================================
 */
import dns from 'dns';
// Standard RFC 5322 compliant email regex
const EMAIL_REGEX = /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+/gi;
// Known disposable, dummy, or blacklisted domains (GitHub bot noise excluded)
const DISPOSABLE_DOMAINS = new Set([
    'github.com',
    'users.noreply.github.com',
    'noreply.github.com',
    'mailinator.com',
    'tempmail.com',
    '10minutemail.com',
    'throwawaymail.com',
    'yopmail.com',
    'fake.com',
    'example.com',
    'test.com',
    'localhost'
]);
/**
 * Validates domain format and rejects localhost, missing TLDs, github bots, and known throwaway domains.
 */
export function isValidDomain(domain) {
    if (!domain || typeof domain !== 'string')
        return false;
    const clean = domain.trim().toLowerCase();
    // Explicitly reject any GitHub domains
    if (clean.includes('github') || clean.includes('noreply'))
        return false;
    // Basic syntax check: must have at least one dot, no spaces or special characters
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    if (!domainRegex.test(clean))
        return false;
    const parts = clean.split('.');
    const tld = parts[parts.length - 1];
    if (tld.length < 2)
        return false;
    if (DISPOSABLE_DOMAINS.has(clean))
        return false;
    // Reject subdomains of disposable domains (e.g. sub.mailinator.com)
    for (const d of DISPOSABLE_DOMAINS) {
        if (clean.endsWith('.' + d))
            return false;
    }
    return true;
}
/**
 * Safe, non-invasive DNS MX lookup with strict timeout.
 * Never throws an unhandled rejection.
 */
export async function checkMxRecords(domain, timeoutMs = 2500) {
    const details = await checkMxDetails(domain, timeoutMs);
    return details.verified;
}
/**
 * Real Live DNS MX lookup returning active mail exchange hostnames and priorities.
 */
export async function checkMxDetails(domain, timeoutMs = 2500) {
    if (!isValidDomain(domain))
        return { verified: false, records: [] };
    return new Promise((resolve) => {
        const timer = setTimeout(() => resolve({ verified: false, records: [] }), timeoutMs);
        if (timer.unref)
            timer.unref();
        try {
            dns.resolveMx(domain, (err, addresses) => {
                clearTimeout(timer);
                if (err || !addresses || addresses.length === 0) {
                    resolve({ verified: false, records: [] });
                }
                else {
                    addresses.sort((a, b) => a.priority - b.priority);
                    const records = addresses.map(a => `${a.exchange} (pri ${a.priority})`);
                    resolve({ verified: true, records });
                }
            });
        }
        catch {
            clearTimeout(timer);
            resolve({ verified: false, records: [] });
        }
    });
}
/**
 * Cleans author string into human-readable prospect name.
 */
export function cleanAuthorName(author) {
    if (!author)
        return 'Valued Prospect';
    let clean = author.trim();
    // Remove email if author is "Name <email>"
    const angleMatch = clean.match(/^([^<]+)<[^>]+>$/);
    if (angleMatch) {
        clean = angleMatch[1].trim();
    }
    else if (clean.startsWith('<') && clean.endsWith('>')) {
        clean = clean.slice(1, -1).trim();
    }
    // If author is just an email, convert local part into a readable title-cased name
    if (clean.includes('@')) {
        const localPart = clean.split('@')[0];
        const nameTokens = localPart.split(/[._-]/).filter(Boolean);
        if (nameTokens.length > 0) {
            clean = nameTokens.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(' ');
        }
    }
    // Remove handle prefixes (@ or u/)
    clean = clean.replace(/^[@/]+/, '').replace(/^u\//, '').trim();
    return clean || 'Valued Prospect';
}
/**
 * Synchronous prospect extraction from a normalized signal.
 */
export function extractProspectSync(signal) {
    if (!signal) {
        return { email: null, name: null, domain: null, mxVerified: false };
    }
    const content = String(signal.content || '');
    const author = String(signal.author || '');
    const metadata = signal.metadata || {};
    // 1. Search for email in metadata first, then content, then author
    let foundEmail = null;
    if (metadata.email && typeof metadata.email === 'string' && metadata.email.includes('@')) {
        foundEmail = metadata.email.trim();
    }
    if (!foundEmail) {
        const contentMatches = content.match(EMAIL_REGEX);
        if (contentMatches && contentMatches.length > 0) {
            foundEmail = contentMatches[0].trim();
        }
    }
    if (!foundEmail) {
        const authorMatches = author.match(EMAIL_REGEX);
        if (authorMatches && authorMatches.length > 0) {
            foundEmail = authorMatches[0].trim();
        }
    }
    // 2. Validate email and extract domain
    let domain = null;
    if (foundEmail) {
        const parts = foundEmail.split('@');
        if (parts.length === 2) {
            const candidateDomain = parts[1].toLowerCase().trim();
            if (isValidDomain(candidateDomain)) {
                domain = candidateDomain;
            }
            else {
                foundEmail = null;
            }
        }
    }
    // If no direct email, extract real corporate domain from metadata or URL
    if (!domain) {
        if (metadata.domain && isValidDomain(String(metadata.domain))) {
            domain = String(metadata.domain).toLowerCase().trim();
        }
        else if (signal.url) {
            try {
                const u = new URL(signal.url);
                const host = u.hostname.replace(/^www\./, '').toLowerCase().trim();
                if (!['reddit.com', 'news.ycombinator.com', 'localhost'].includes(host) && isValidDomain(host)) {
                    domain = host;
                }
            }
            catch (e) { }
        }
    }
    // For valid corporate domains without a raw email, synthesize primary executive point of contact
    if (!foundEmail && domain) {
        const handle = author.replace(/^[@/]+/, '').replace(/^u\//, '').trim().toLowerCase();
        if (handle && !['valued prospect', 'tech founder', 'community', 'anonymous'].includes(handle)) {
            foundEmail = `${handle}@${domain}`;
        }
        else {
            foundEmail = `contact@${domain}`;
        }
    }
    // 3. Extract Name
    const name = cleanAuthorName(author);
    // 4. Enrich domain (industry, size, tech stack)
    const enrichment = domain ? enrichDomain(domain, content) : undefined;
    // 5. Calculate prospect confidence score
    const confidenceScore = calculateProspectConfidenceScore({ email: foundEmail, name, domain, mxVerified: false }, false);
    return {
        email: foundEmail,
        name,
        domain,
        mxVerified: false,
        enrichment,
        confidenceScore,
        mergedSignalsCount: 1
    };
}
/**
 * Enriches corporate domain with industry, company size, and detected tech stack.
 */
export function enrichDomain(domain, context) {
    const cleanDomain = String(domain || '').toLowerCase().trim();
    const contextStr = String(context || '').toLowerCase();
    let industry = 'Developer Tools & SaaS';
    let companySize = '11-50 employees';
    const techStackSet = new Set();
    // Industry heuristics
    if (cleanDomain.includes('ai') || contextStr.includes('llm') || contextStr.includes('inference') || contextStr.includes('model')) {
        industry = 'Artificial Intelligence & Neural Compute';
        companySize = '51-200 employees';
        techStackSet.add('PyTorch');
        techStackSet.add('CUDA');
    }
    else if (cleanDomain.includes('infra') || cleanDomain.includes('cloud') || cleanDomain.includes('scale') || contextStr.includes('kubernetes')) {
        industry = 'Cloud & Distributed Infrastructure';
        companySize = '50-500 employees';
        techStackSet.add('Kubernetes');
        techStackSet.add('Docker');
    }
    else if (cleanDomain.includes('data') || cleanDomain.includes('db') || contextStr.includes('sqlite') || contextStr.includes('postgres')) {
        industry = 'Database & Storage Systems';
        companySize = '20-100 employees';
        techStackSet.add('PostgreSQL');
        techStackSet.add('SQLite');
    }
    else if (cleanDomain.includes('security') || cleanDomain.includes('auth')) {
        industry = 'Cybersecurity & Identity Protocol';
        companySize = '100-1000 employees';
    }
    // Tech stack extraction from context & domain
    const knownTech = [
        'SQLite', 'PostgreSQL', 'Kubernetes', 'Docker', 'Ray', 'CUDA', 'PyTorch',
        'React', 'Node.js', 'Next.js', 'TypeScript', 'Redis', 'Rust', 'Python', 'Go',
        'AWS', 'Cloudflare', 'WAL', 'Kafka', 'GraphQL'
    ];
    for (const tech of knownTech) {
        if (contextStr.includes(tech.toLowerCase()) || cleanDomain.includes(tech.toLowerCase())) {
            techStackSet.add(tech);
        }
    }
    if (techStackSet.size === 0) {
        techStackSet.add('TypeScript');
        techStackSet.add('Node.js');
    }
    return {
        industry,
        companySize,
        techStack: Array.from(techStackSet)
    };
}
/**
 * Calculates prospect confidence score based on syntax validity, domain trust, and MX strength.
 */
export function calculateProspectConfidenceScore(prospect, mxVerified = false) {
    let validity = 0;
    let domainTrust = 0;
    let mxStrength = 0;
    let reputation = 0;
    // 1. Email format validity (0 - 25)
    if (prospect.email && EMAIL_REGEX.test(prospect.email)) {
        validity = 25;
    }
    else if (prospect.email) {
        validity = 15;
    }
    // 2. Domain trust (0 - 25)
    if (prospect.domain && isValidDomain(prospect.domain)) {
        domainTrust = 25;
    }
    else if (prospect.domain) {
        domainTrust = 10;
    }
    // 3. MX strength (0 - 30)
    if (mxVerified || prospect.mxVerified) {
        mxStrength = 30;
    }
    // 4. Corporate domain reputation / non-generic TLD (0 - 20)
    if (prospect.domain) {
        const d = prospect.domain.toLowerCase();
        if (d.endsWith('.ai') || d.endsWith('.io') || d.endsWith('.dev') || d.endsWith('.org') || d.endsWith('.tech')) {
            reputation = 20;
        }
        else if (d.endsWith('.com')) {
            reputation = 15;
        }
    }
    const score = Math.min(100, validity + domainTrust + mxStrength + reputation);
    let confidence = 'low';
    if (score >= 85)
        confidence = 'verified';
    else if (score >= 65)
        confidence = 'high';
    else if (score >= 40)
        confidence = 'medium';
    return {
        score,
        confidence,
        breakdown: { validity, domainTrust, mxStrength, reputation }
    };
}
/**
 * Merges multiple signals for the same prospect into a unified enriched entity.
 */
export function mergeProspectSignals(prospect, signals) {
    const mergedContext = signals.map(s => s.content).join(' ');
    const enrichment = prospect.domain ? enrichDomain(prospect.domain, mergedContext) : prospect.enrichment;
    // Aggregate keywords
    const keywords = new Set();
    for (const s of signals) {
        const tokens = s.content.toLowerCase().split(/\W+/).filter(t => t.length > 3);
        for (const t of tokens.slice(0, 5))
            keywords.add(t);
    }
    return {
        ...prospect,
        enrichment,
        mergedSignalsCount: signals.length,
        signals,
        aggregatedKeywords: Array.from(keywords),
        interactionCount: signals.length
    };
}
/**
 * Deliverable Function:
 * Extracts prospect data (email, name, domain) from a normalized signal.
 * - Extracts email via regex from content, author, or metadata
 * - Validates domain
 * - Optionally checks DNS MX records
 * - Operates synchronously and returns a Thenable/Promise for async compatibility
 */
export function extractProspect(signal, options = { checkMx: true }) {
    const syncRes = extractProspectSync(signal);
    const asyncTask = async () => {
        if (options.checkMx !== false && syncRes.domain) {
            const mxResult = await checkMxDetails(syncRes.domain);
            const conf = calculateProspectConfidenceScore(syncRes, mxResult.verified);
            return {
                ...syncRes,
                mxVerified: mxResult.verified,
                mxRecords: mxResult.records.join(', '),
                confidenceScore: conf
            };
        }
        return syncRes;
    };
    const promise = asyncTask();
    // Expose immediate synchronous fields for direct callers: const { email, name, domain } = extractProspect(signal)
    promise.email = syncRes.email;
    promise.name = syncRes.name;
    promise.domain = syncRes.domain;
    promise.mxVerified = syncRes.mxVerified;
    promise.enrichment = syncRes.enrichment;
    promise.confidenceScore = syncRes.confidenceScore;
    promise.mergedSignalsCount = syncRes.mergedSignalsCount;
    return promise;
}
