export function applyMutation(cadParams, mutation) {
    const { param, region, delta, type } = mutation;
    // Clone params so we don't mutate original directly
    const updated = { ...cadParams };
    // Apply mutation based on type
    switch (type) {
        case "increase":
            updated[param] = (updated[param] ?? 0) + delta;
            break;
        case "decrease":
            updated[param] = (updated[param] ?? 0) + delta; // delta is negative
            break;
        case "replace":
            updated[param] = delta; // delta is new value
            break;
        case "reshape":
            // Reshape is abstract — here we mark a flag for CADRoot to interpret
            updated[param] = {
                mode: "reshape",
                region,
                delta
            };
            break;
        default:
            console.warn("[PrimordiaCAD] Unknown mutation type:", type);
    }
    console.log("[PrimordiaCAD] Applied mutation:", mutation);
    console.log("[PrimordiaCAD] Updated CAD params:", updated);
    return updated;
}
