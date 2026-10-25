#pragma once

#include "CoreMinimal.h"
#include "Dom/JsonObject.h"

/**
 * Realm-from-prompt helpers. The prompt and JSON schema live in
 * Resources/Ollama/realm_prompt.json (shared with node-bridge/examples/ollama-realm-check.js,
 * which tests them against live models).
 */
namespace PrimordiaOllamaRealm
{
	/** Loads the Worldforge system prompt and the structured-output schema (as JSON text). */
	PRIMORDIAOLLAMA_API bool LoadPromptResource(FString& OutSystemPrompt, FString& OutSchemaJson, FString& OutError);

	/**
	 * Turns a model's realm design into a strict PRS-1 manifest: unknown kinds dropped,
	 * numbers clamped, defaults filled, ids/order assigned, exactly one soul glyph.
	 * Mirror of node-bridge/examples/ollama-realm-repair.js; keep the two in step.
	 * SeedOverride 0 = derive the seed from the realm name (FNV-1a).
	 */
	PRIMORDIAOLLAMA_API TSharedRef<FJsonObject> RepairManifest(const TSharedPtr<FJsonObject>& Raw, uint32 SeedOverride, TArray<FString>& OutRepairs);
}
