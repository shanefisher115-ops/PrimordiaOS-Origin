import fs from "fs";
export class FigmaIngestEngine {
    /**
     * Ingests Figma source or exported file structure and produces frames & component metadata
     */
    async ingest(figmaSourcePath) {
        console.log(`[FigmaIngestEngine] Reading source: ${figmaSourcePath}`);
        let rawData;
        if (fs.existsSync(figmaSourcePath)) {
            const content = fs.readFileSync(figmaSourcePath, "utf-8");
            try {
                rawData = JSON.parse(content);
            }
            catch {
                // Mock fallback if binary .fig
                rawData = this.getFallbackDocument();
            }
        }
        else {
            console.warn(`[FigmaIngestEngine] File not found at ${figmaSourcePath}, generating standard PrimordiaOS frames.`);
            rawData = this.getFallbackDocument();
        }
        const documentNode = rawData.document || rawData;
        const rawFrames = documentNode.children || [];
        const frames = [];
        const components = [];
        for (const item of rawFrames) {
            const frame = {
                id: item.id || `frame_${Math.random().toString(36).substring(2, 9)}`,
                name: item.name || "Untitled_Frame",
                bounds: item.bounds || { x: 0, y: 0, width: 1290, height: 2796 },
                backgroundColor: item.backgroundColor || "#07090E",
                components: item.components || [],
                exportSettings: item.exportSettings || [{ format: "PNG", suffix: "@3x", constraint: { type: "SCALE", value: 3 } }]
            };
            frames.push(frame);
            if (item.components && Array.isArray(item.components)) {
                for (const cmp of item.components) {
                    components.push({
                        id: cmp.id,
                        name: cmp.name,
                        frameId: frame.id
                    });
                }
            }
        }
        const result = {
            sourceFile: figmaSourcePath,
            framesCount: frames.length,
            componentsCount: components.length,
            frames,
            components,
            timestamp: new Date().toISOString()
        };
        return result;
    }
    getFallbackDocument() {
        return {
            document: {
                id: "primordia_default_figma",
                name: "PrimordiaOS Core UI",
                children: [
                    {
                        id: "frame_01_dashboard",
                        name: "Screen_01_SovereignDashboard",
                        bounds: { x: 0, y: 0, width: 1290, height: 2796 },
                        backgroundColor: "#07090E",
                        components: [
                            { id: "cmp_sigil", name: "Sigil_Primordia", type: "VECTOR" },
                            { id: "cmp_altitude", name: "Gauge_CognitiveAltitude", type: "COMPONENT" }
                        ]
                    },
                    {
                        id: "frame_02_moneyplughub",
                        name: "Screen_02_MoneyPlugHub_Vault",
                        bounds: { x: 1400, y: 0, width: 1290, height: 2796 },
                        backgroundColor: "#0D111A",
                        components: [
                            { id: "cmp_vault", name: "Card_SyndicateVault", type: "COMPONENT" },
                            { id: "cmp_loop", name: "Visual_AutonomousLoop", type: "COMPONENT" }
                        ]
                    }
                ]
            }
        };
    }
}
