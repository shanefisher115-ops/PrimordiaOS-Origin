#pragma once

#include "CoreMinimal.h"
#include "SpellwrightTypes.h"

class FLoreCodex;

/**
 * The Spellwright DSL.
 *
 *   # comments run to the end of the line (also //)
 *   spell forge_spire : forging {
 *       realm   realm_worldforge
 *       glyphs  glyph_f, glyph_t          # optional; otherwise the subject is inscribed
 *       priority 5
 *       subject "the eastern spire"
 *       cadcam.fabricate spire shape=polygon sides=8 radius=40 depth=12 stock=120x120x30 tool=6 as cut
 *       blender.render output="C:/renders/spire.png" engine=eevee after cut
 *   }
 *
 * A statement ends at a newline or ';'. A step is an op (a word containing a dot), an optional target
 * (the first value not followed by '='), key=value arguments, an optional "as <label>" and an optional
 * "after <label>[,<label>...]". Values are bare words (letters, digits and _ . : / \ - + , x) or
 * double-quoted strings with \" \\ \n \t escapes. Steps without "after" depend on nothing.
 *
 * Templates are the same blocks with ${name} or ${name|default} placeholders, keyed by the spell name
 * (the verb). ${label.key} (a dotted name) is left alone at compile time: it is an output reference
 * the executor resolves when the step starts.
 */
class PRIMORDIASPELLWRIGHT_API FSpellwrightCompiler
{
public:
	struct PRIMORDIASPELLWRIGHT_API FParseResult
	{
		TArray<FSpellwrightSpell> Spells;
		TArray<FSpellwrightIssue> Issues;
		bool HasErrors() const;
	};

	/** Parses DSL source into spells (not yet finalized: no glyphs, cost or labels). */
	static FParseResult Parse(const FString& Source);

	/** Loads (adds to / replaces) verb templates from DSL source. */
	bool LoadTemplates(const FString& Source, TArray<FSpellwrightIssue>& OutIssues);
	bool LoadTemplatesFromFile(const FString& Path, TArray<FSpellwrightIssue>& OutIssues);

	bool HasTemplate(FName Verb) const { return Templates.Contains(Verb); }
	TArray<FName> GetVerbs() const;

	/** Planner intent -> spell. Returns false (with issues) if the verb is unknown or the template does not parse. */
	bool CompileIntent(const FSpellwrightIntent& Intent, const FLoreCodex* Codex, FSpellwrightSpell& OutSpell, TArray<FSpellwrightIssue>& OutIssues) const;

	/** DSL source -> finalized spells. */
	FParseResult CompileSource(const FString& Source, const FLoreCodex* Codex, const FString& Provenance = TEXT("dsl")) const;

	/**
	 * Fills what parsing cannot know: id, default labels, the inscription (glyphs and sigils), the school
	 * (template's, else the dominant school of the glyphs, else the first step's op school) and the cost
	 * (sum of op costs, raised in unstable realms).
	 */
	static void Finalize(FSpellwrightSpell& Spell, const FLoreCodex* Codex);

	/** Replaces ${name} / ${name|default} placeholders whose name has no dot. Missing names are reported. */
	static FString Substitute(const FString& Template, const TMap<FString, FString>& Params, TArray<FString>& OutMissing);

	/** Quotes a value for the DSL when it is not a bare word. */
	static FString QuoteValue(const FString& Value);

private:
	struct FTemplate
	{
		FName Verb;
		FString Text;
	};
	TMap<FName, FTemplate> Templates;
};
