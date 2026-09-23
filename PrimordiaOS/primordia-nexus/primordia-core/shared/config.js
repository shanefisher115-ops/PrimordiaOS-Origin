// shared/config.ts
// PrimordiaOS Configuration System — full implementation
export class PrimordiaConfig {
    schema;
    values;
    constructor(schema) {
        this.schema = schema;
        this.values = new Map();
        this.loadDefaults();
    }
    loadDefaults() {
        for (const key of Object.keys(this.schema)) {
            this.values.set(key, this.schema[key].default);
        }
    }
    load(overrides) {
        for (const key of Object.keys(overrides)) {
            if (!this.schema[key]) {
                console.warn(`[Config] Unknown key "${key}" ignored.`);
                continue;
            }
            const value = overrides[key];
            const validator = this.schema[key].validate;
            if (validator && !validator(value)) {
                throw new Error(`[Config] Invalid value for "${key}": ${value}`);
            }
            this.values.set(key, value);
        }
    }
    get(key) {
        if (!this.schema[key]) {
            throw new Error(`[Config] Unknown key "${key}"`);
        }
        return this.values.get(key);
    }
    set(key, value) {
        if (!this.schema[key]) {
            throw new Error(`[Config] Unknown key "${key}"`);
        }
        const validator = this.schema[key].validate;
        if (validator && !validator(value)) {
            throw new Error(`[Config] Invalid value for "${key}": ${value}`);
        }
        this.values.set(key, value);
    }
    validateAll() {
        for (const key of Object.keys(this.schema)) {
            const entry = this.schema[key];
            const value = this.values.get(key);
            if (entry.required && value === undefined) {
                throw new Error(`[Config] Missing required key "${key}"`);
            }
            if (entry.validate && !entry.validate(value)) {
                throw new Error(`[Config] Validation failed for key "${key}"`);
            }
        }
    }
}
// Example schema (you can expand later)
export const config = new PrimordiaConfig({
    "pipeline.antigravity.enabled": {
        default: true,
        required: true,
        validate: (v) => typeof v === "boolean"
    },
    "vision.stateGraph.enabled": {
        default: true,
        required: true,
        validate: (v) => typeof v === "boolean"
    },
    "osmium.snapshotInterval": {
        default: 5000,
        required: true,
        validate: (v) => typeof v === "number" && v > 0
    }
});
