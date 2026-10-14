// Minimal JSON scanning over the request reliquary. Values are located as raw
// byte spans; nothing is unescaped or copied.

bool is_ws(uint c) { return c == 32u || c == 9u || c == 10u || c == 13u; }

uint skip_ws(uint p, uint e) {
    while (p < e && is_ws(rb(p))) p++;
    return p;
}

// Unterminated strings and containers return e + 1 (past the span), so callers
// that compare against e treat them as malformed.

// p is at the opening quote; returns the position just past the closing quote.
uint skip_string(uint p, uint e) {
    p++;
    while (p < e) {
        uint c = rb(p);
        if (c == 92u) { p += 2u; continue; }
        if (c == 34u) return p + 1u;
        p++;
    }
    return e + 1u;
}

// Returns the position just past the value starting at (or after whitespace from) p.
uint skip_value(uint p, uint e) {
    p = skip_ws(p, e);
    if (p >= e) return e;
    uint c = rb(p);
    if (c == 34u) return skip_string(p, e);
    if (c == 123u || c == 91u) {
        uint depth = 0u;
        while (p < e) {
            c = rb(p);
            if (c == 34u) { p = skip_string(p, e); continue; }
            if (c == 123u || c == 91u) depth++;
            else if (c == 125u || c == 93u) {
                depth--;
                if (depth == 0u) return p + 1u;
            }
            p++;
        }
        return e + 1u;
    }
    while (p < e) {
        c = rb(p);
        if (c == 44u || c == 125u || c == 93u || is_ws(c)) break;
        p++;
    }
    return p;
}

uint fnv(uint s, uint e) {
    uint h = 2166136261u;
    for (uint p = s; p < e; p++) { h ^= rb(p); h *= 16777619u; }
    return h;
}

// Finds a top-level member of the object at [os, oe) whose key hashes to keyHash.
bool find_member(uint os, uint oe, uint keyHash, out uint vs, out uint ve) {
    vs = 0u; ve = 0u;
    uint p = skip_ws(os, oe);
    if (p >= oe || rb(p) != 123u) return false;
    p++;
    for (uint guard = 0u; guard < 4096u; guard++) {
        p = skip_ws(p, oe);
        if (p >= oe) return false;
        uint c = rb(p);
        if (c == 125u) return false;
        if (c == 44u) { p++; continue; }
        if (c != 34u) return false;
        uint kend = skip_string(p, oe);
        uint h = fnv(p + 1u, kend - 1u);
        p = skip_ws(kend, oe);
        if (p >= oe || rb(p) != 58u) return false;
        p = skip_ws(p + 1u, oe);
        uint v1 = skip_value(p, oe);
        if (h == keyHash) { vs = p; ve = v1; return true; }
        p = v1;
    }
    return false;
}

bool parse_uint(uint s, uint e, out uint v) {
    v = 0u;
    if (s >= e || e - s > 9u) return false;
    for (uint p = s; p < e; p++) {
        uint c = rb(p);
        if (c < 48u || c > 57u) return false;
        v = v * 10u + (c - 48u);
    }
    return true;
}

uint lookup(uint first, uint count, uint h) {
    for (uint k = 0u; k < count; k++) {
        uvec2 en = gr.entries[first + k];
        if (en.x == h) return en.y;
    }
    return NOT_FOUND;
}
