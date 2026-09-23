export async function synthesizeRealmEntity(sectorKey: string, tier: string, seed: number): Promise<string> {
    const prompt = `You are an ancient autonomous intelligence within PrimordiaFlow. 
    A traveler has just anchored in Sector [${sectorKey}] possessing the architectural tier [${tier}] and resonance seed [${seed}].
    Generate a short, mythic, atmospheric lore fragment and greeting for this sector in under 40 words. Maintain a luminous, cosmic tone.`;

    try {
        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'llama3.2',
                prompt: prompt,
                stream: false
            })
        });

        const data: any = await response.json();
        return data.response ? data.response.trim() : "The lattice hums with silent static.";
    } catch (error) {
        console.error("[LatticeMind] Ollama offline or unreachable:", error);
        return "A dormant resonance field lingers in the void.";
    }
}