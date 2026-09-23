export class SovereignSafetyForUnreal {
    validate(task: any) {
        if (task.sovereignty === "low") {
            return { allowed: false, reason: "Low sovereignty cannot modify Unreal worlds" };
        }

        if (task.risk > 3) {
            return { allowed: false, reason: "Risk too high for Unreal simulation" };
        }

        return { allowed: true };
    }
}
