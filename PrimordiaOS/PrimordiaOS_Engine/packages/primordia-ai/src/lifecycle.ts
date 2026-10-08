// packages/primordia-ai/src/lifecycle.ts
const DEFAULT_TIMEOUT_MS = 5000; // 5s circuit breaker for Gemini Flash transitions

export async function transitionModelWithTimeout(
  targetModel: string, 
  payload: any, 
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`https://api.primordia.os/v1/models/${targetModel}/transition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Model transition failed with status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`[CircuitBreaker] Gemini Flash transition to ${targetModel} timed out after ${timeoutMs}ms`);
    }
    throw error;
  }
}
