export function assertPlatformIdentity(platform) {
    if (!platform) {
        throw new Error("[Identity] Missing platform identifier.");
    }
    return true;
}
