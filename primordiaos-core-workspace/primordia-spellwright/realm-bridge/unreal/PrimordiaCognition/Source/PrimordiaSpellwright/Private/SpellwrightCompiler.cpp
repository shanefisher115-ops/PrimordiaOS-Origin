#include "SpellwrightCompiler.h"

#include "LoreCodex.h"
#include "Misc/FileHelper.h"
#include "PrimordiaSpellwright.h"
#include "SpellwrightOps.h"

namespace SpellwrightDsl
{
	enum class ETok : uint8
	{
		Word,
		String,
		LBrace,
		RBrace,
		Equals,
		EndOfStatement,
		End,
	};

	struct FToken
	{
		ETok Kind = ETok::End;
		FString Text;
		int32 Line = 1;
		int32 Start = 0;
		int32 End = 0;
	};

	bool IsWordChar(TCHAR C)
	{
		return !FChar::IsWhitespace(C) && C != '"' && C != '{' && C != '}' && C != '=' && C != ';' && C != '#';
	}

	/** Splits source into tokens. Never fails: a malformed string runs to the end of its line and is reported. */
	TArray<FToken> Lex(const FString& Src, TArray<FSpellwrightIssue>& Issues)
	{
		TArray<FToken> Out;
		int32 Line = 1;
		int32 i = 0;
		const int32 N = Src.Len();
		auto Emit = [&](ETok Kind, const FString& Text, int32 Start, int32 End)
		{
			FToken& T = Out.AddDefaulted_GetRef();
			T.Kind = Kind;
			T.Text = Text;
			T.Line = Line;
			T.Start = Start;
			T.End = End;
		};
		while (i < N)
		{
			const TCHAR C = Src[i];
			if (C == '\n')
			{
				Emit(ETok::EndOfStatement, TEXT("\n"), i, i + 1);
				++Line;
				++i;
			}
			else if (FChar::IsWhitespace(C))
			{
				++i;
			}
			else if (C == '#' || (C == '/' && i + 1 < N && Src[i + 1] == '/'))
			{
				while (i < N && Src[i] != '\n') { ++i; }
			}
			else if (C == ';') { Emit(ETok::EndOfStatement, TEXT(";"), i, i + 1); ++i; }
			else if (C == '{') { Emit(ETok::LBrace, TEXT("{"), i, i + 1); ++i; }
			else if (C == '}') { Emit(ETok::RBrace, TEXT("}"), i, i + 1); ++i; }
			else if (C == '=') { Emit(ETok::Equals, TEXT("="), i, i + 1); ++i; }
			else if (C == '"')
			{
				const int32 Start = i++;
				FString Value;
				bool bClosed = false;
				while (i < N)
				{
					const TCHAR S = Src[i];
					if (S == '\n') { break; }
					if (S == '"') { bClosed = true; ++i; break; }
					if (S == '\\' && i + 1 < N)
					{
						const TCHAR E = Src[i + 1];
						switch (E)
						{
						case 'n': Value.AppendChar('\n'); break;
						case 't': Value.AppendChar('\t'); break;
						case '"': Value.AppendChar('"'); break;
						case '\\': Value.AppendChar('\\'); break;
						default: Value.AppendChar('\\'); Value.AppendChar(E); break;
						}
						i += 2;
						continue;
					}
					Value.AppendChar(S);
					++i;
				}
				if (!bClosed)
				{
					FSpellwrightIssue& Issue = Issues.AddDefaulted_GetRef();
					Issue.Line = Line;
					Issue.Message = TEXT("unterminated string");
				}
				Emit(ETok::String, Value, Start, i);
			}
			else
			{
				const int32 Start = i;
				FString Word;
				while (i < N)
				{
					const TCHAR W = Src[i];
					if (W == '$' && i + 1 < N && Src[i + 1] == '{')
					{
						// ${...} placeholders and output references are part of the word.
						const int32 Close = Src.Find(TEXT("}"), ESearchCase::CaseSensitive, ESearchDir::FromStart, i);
						if (Close == INDEX_NONE)
						{
							Word += Src.Mid(i);
							i = N;
							break;
						}
						Word += Src.Mid(i, Close - i + 1);
						i = Close + 1;
						continue;
					}
					if (!IsWordChar(W) || (W == '/' && i + 1 < N && Src[i + 1] == '/' && Word.IsEmpty()))
					{
						break;
					}
					Word.AppendChar(W);
					++i;
				}
				Emit(ETok::Word, Word, Start, i);
			}
		}
		FToken& EndTok = Out.AddDefaulted_GetRef();
		EndTok.Kind = ETok::End;
		EndTok.Line = Line;
		EndTok.Start = EndTok.End = N;
		return Out;
	}

	class FParser
	{
	public:
		FParser(const TArray<FToken>& InTokens, TArray<FSpellwrightIssue>& InIssues) : Tokens(InTokens), Issues(InIssues) {}

		TArray<FSpellwrightSpell> ParseFile()
		{
			TArray<FSpellwrightSpell> Spells;
			while (true)
			{
				SkipStatementEnds();
				const FToken& T = Peek();
				if (T.Kind == ETok::End)
				{
					break;
				}
				if (T.Kind == ETok::Word && T.Text == TEXT("spell"))
				{
					FSpellwrightSpell Spell;
					if (ParseSpell(Spell))
					{
						Spells.Add(MoveTemp(Spell));
					}
				}
				else
				{
					Error(T.Line, FString::Printf(TEXT("expected 'spell', found '%s'"), *Describe(T)));
					RecoverToNextSpell();
				}
			}
			return Spells;
		}

		/** Index of the token after the spell starting at Index (for template extraction). */
		int32 FindSpellEnd(int32 Index) const
		{
			int32 Depth = 0;
			for (int32 i = Index; i < Tokens.Num(); ++i)
			{
				if (Tokens[i].Kind == ETok::LBrace) { ++Depth; }
				else if (Tokens[i].Kind == ETok::RBrace)
				{
					if (--Depth == 0) { return i; }
				}
			}
			return INDEX_NONE;
		}

	private:
		const FToken& Peek(int32 Ahead = 0) const { return Tokens[FMath::Min(Pos + Ahead, Tokens.Num() - 1)]; }
		const FToken& Next() { const FToken& T = Peek(); Pos = FMath::Min(Pos + 1, Tokens.Num() - 1); return T; }

		static FString Describe(const FToken& T)
		{
			switch (T.Kind)
			{
			case ETok::End: return TEXT("end of file");
			case ETok::EndOfStatement: return T.Text == TEXT(";") ? TEXT(";") : TEXT("end of line");
			case ETok::String: return FString::Printf(TEXT("\"%s\""), *T.Text);
			default: return T.Text;
			}
		}

		void Error(int32 Line, const FString& Message)
		{
			FSpellwrightIssue& I = Issues.AddDefaulted_GetRef();
			I.Line = Line;
			I.Message = Message;
		}

		void SkipStatementEnds()
		{
			while (Peek().Kind == ETok::EndOfStatement) { Next(); }
		}

		void RecoverToNextSpell()
		{
			while (Peek().Kind != ETok::End && !(Peek().Kind == ETok::Word && Peek().Text == TEXT("spell")))
			{
				Next();
			}
		}

		bool ParseSpell(FSpellwrightSpell& Spell)
		{
			const FToken& Kw = Next(); // 'spell'
			const FToken& NameTok = Next();
			if (NameTok.Kind != ETok::Word)
			{
				Error(NameTok.Line, FString::Printf(TEXT("expected a spell name after 'spell', found '%s'"), *Describe(NameTok)));
				RecoverToNextSpell();
				return false;
			}
			FString Name = NameTok.Text;
			FString School;
			if (Name.Split(TEXT(":"), &Name, &School))
			{
				if (School.IsEmpty() && Peek().Kind == ETok::Word)
				{
					School = Next().Text;
				}
			}
			else if (Peek().Kind == ETok::Word && Peek().Text.StartsWith(TEXT(":")))
			{
				School = Next().Text.Mid(1);
				if (School.IsEmpty() && Peek().Kind == ETok::Word)
				{
					School = Next().Text;
				}
			}
			Spell.Name = FName(*Name);
			Spell.Intent = Spell.Name;
			if (!School.IsEmpty())
			{
				Spell.School = FName(*School);
			}
			SkipStatementEnds();
			if (Peek().Kind != ETok::LBrace)
			{
				Error(Peek().Line, FString::Printf(TEXT("expected '{' after spell %s, found '%s'"), *Name, *Describe(Peek())));
				RecoverToNextSpell();
				return false;
			}
			Next();
			const int32 StartLine = Kw.Line;

			while (true)
			{
				SkipStatementEnds();
				const FToken& T = Peek();
				if (T.Kind == ETok::RBrace)
				{
					Next();
					return true;
				}
				if (T.Kind == ETok::End)
				{
					Error(StartLine, FString::Printf(TEXT("spell %s is missing its closing '}'"), *Name));
					return true;
				}
				ParseStatement(Spell);
			}
		}

		/** The tokens of one statement, without its terminator. Stops before a '}' so the spell can close. */
		TArray<FToken> TakeStatement()
		{
			TArray<FToken> Out;
			while (Peek().Kind != ETok::EndOfStatement && Peek().Kind != ETok::RBrace && Peek().Kind != ETok::End)
			{
				Out.Add(Next());
			}
			return Out;
		}

		static TArray<FString> SplitList(const TArray<FToken>& Stmt, int32 From)
		{
			TArray<FString> Out;
			for (int32 i = From; i < Stmt.Num(); ++i)
			{
				TArray<FString> Parts;
				Stmt[i].Text.ParseIntoArray(Parts, TEXT(","), true);
				for (FString& P : Parts)
				{
					P.TrimStartAndEndInline();
					if (!P.IsEmpty()) { Out.Add(P); }
				}
			}
			return Out;
		}

		void ParseStatement(FSpellwrightSpell& Spell)
		{
			const TArray<FToken> Stmt = TakeStatement();
			if (Stmt.Num() == 0)
			{
				return;
			}
			const FToken& Head = Stmt[0];
			if (Head.Kind != ETok::Word)
			{
				Error(Head.Line, FString::Printf(TEXT("a statement must start with a keyword or an op, found '%s'"), *Describe(Head)));
				return;
			}
			const FString Kw = Head.Text;
			auto Single = [&](FString& Out) -> bool
			{
				if (Stmt.Num() != 2 || (Stmt[1].Kind != ETok::Word && Stmt[1].Kind != ETok::String))
				{
					Error(Head.Line, FString::Printf(TEXT("'%s' takes exactly one value"), *Kw));
					return false;
				}
				Out = Stmt[1].Text;
				return true;
			};

			FString Value;
			if (Kw == TEXT("realm")) { if (Single(Value)) { Spell.Realm = FName(*Value); } return; }
			if (Kw == TEXT("school")) { if (Single(Value)) { Spell.School = FName(*Value); } return; }
			if (Kw == TEXT("intent")) { if (Single(Value)) { Spell.Intent = FName(*Value); } return; }
			if (Kw == TEXT("goal")) { if (Single(Value)) { Spell.GoalId = FName(*Value); } return; }
			if (Kw == TEXT("subject")) { if (Single(Value)) { Spell.Subject = Value; } return; }
			if (Kw == TEXT("priority"))
			{
				if (Single(Value))
				{
					if (!FCString::IsNumeric(*Value)) { Error(Head.Line, TEXT("priority must be a number")); return; }
					Spell.Priority = FCString::Atoi(*Value);
				}
				return;
			}
			if (Kw == TEXT("glyphs"))
			{
				for (const FString& G : SplitList(Stmt, 1)) { Spell.Glyphs.AddUnique(FName(*G)); }
				return;
			}
			int32 Dot;
			if (!Kw.FindChar('.', Dot))
			{
				Error(Head.Line, FString::Printf(TEXT("unknown statement '%s' (steps are ops like cadcam.fabricate)"), *Kw));
				return;
			}
			ParseStep(Spell, Stmt);
		}

		void ParseStep(FSpellwrightSpell& Spell, const TArray<FToken>& Stmt)
		{
			FSpellwrightStep Step;
			Step.Op = FName(*Stmt[0].Text);
			const int32 Line = Stmt[0].Line;
			bool bTargetSet = false;

			for (int32 i = 1; i < Stmt.Num(); ++i)
			{
				const FToken& T = Stmt[i];
				const bool bValue = T.Kind == ETok::Word || T.Kind == ETok::String;
				if (T.Kind == ETok::Word && T.Text == TEXT("as") && i + 1 < Stmt.Num() && Stmt[i + 1].Kind == ETok::Word &&
					!(i + 2 < Stmt.Num() && Stmt[i + 2].Kind == ETok::Equals))
				{
					Step.Label = FName(*Stmt[++i].Text);
					continue;
				}
				if (T.Kind == ETok::Word && T.Text == TEXT("after") && !(i + 1 < Stmt.Num() && Stmt[i + 1].Kind == ETok::Equals))
				{
					int32 j = i + 1;
					TArray<FToken> List;
					while (j < Stmt.Num() && Stmt[j].Kind == ETok::Word && Stmt[j].Text != TEXT("as") && !(j + 1 < Stmt.Num() && Stmt[j + 1].Kind == ETok::Equals))
					{
						List.Add(Stmt[j++]);
					}
					if (List.Num() == 0)
					{
						Error(Line, TEXT("'after' needs at least one step label"));
					}
					for (const FString& L : SplitList(List, 0)) { Step.After.AddUnique(FName(*L)); }
					i = j - 1;
					continue;
				}
				if (bValue && i + 1 < Stmt.Num() && Stmt[i + 1].Kind == ETok::Equals)
				{
					if (i + 2 >= Stmt.Num() || (Stmt[i + 2].Kind != ETok::Word && Stmt[i + 2].Kind != ETok::String))
					{
						Error(Line, FString::Printf(TEXT("argument '%s' has no value"), *T.Text));
						i += 1;
						continue;
					}
					if (Step.Args.Contains(T.Text))
					{
						Error(Line, FString::Printf(TEXT("argument '%s' is given twice"), *T.Text));
					}
					Step.Args.Add(T.Text, Stmt[i + 2].Text);
					i += 2;
					continue;
				}
				if (bValue && !bTargetSet && Step.Args.Num() == 0)
				{
					Step.Target = T.Text;
					bTargetSet = true;
					continue;
				}
				Error(Line, FString::Printf(TEXT("unexpected '%s' in step %s"), *Describe(T), *Stmt[0].Text));
			}
			Spell.Steps.Add(MoveTemp(Step));
		}

		const TArray<FToken>& Tokens;
		TArray<FSpellwrightIssue>& Issues;
		int32 Pos = 0;
	};
}

bool FSpellwrightCompiler::FParseResult::HasErrors() const
{
	return Issues.ContainsByPredicate([](const FSpellwrightIssue& I) { return I.Severity == ESpellwrightIssueSeverity::Error; });
}

FSpellwrightCompiler::FParseResult FSpellwrightCompiler::Parse(const FString& Source)
{
	FParseResult Result;
	const TArray<SpellwrightDsl::FToken> Tokens = SpellwrightDsl::Lex(Source, Result.Issues);
	SpellwrightDsl::FParser Parser(Tokens, Result.Issues);
	Result.Spells = Parser.ParseFile();
	for (FSpellwrightSpell& S : Result.Spells)
	{
		S.Source = Source;
	}
	return Result;
}

bool FSpellwrightCompiler::LoadTemplates(const FString& Source, TArray<FSpellwrightIssue>& OutIssues)
{
	using namespace SpellwrightDsl;
	const int32 IssuesBefore = OutIssues.Num();
	const TArray<FToken> Tokens = Lex(Source, OutIssues);
	FParser Scanner(Tokens, OutIssues);

	int32 Loaded = 0;
	for (int32 i = 0; i < Tokens.Num(); ++i)
	{
		if (Tokens[i].Kind != ETok::Word || Tokens[i].Text != TEXT("spell") || i + 1 >= Tokens.Num())
		{
			continue;
		}
		FString Verb = Tokens[i + 1].Text;
		FString Ignored;
		Verb.Split(TEXT(":"), &Verb, &Ignored);
		const int32 Close = Scanner.FindSpellEnd(i);
		if (Close == INDEX_NONE || Verb.IsEmpty())
		{
			FSpellwrightIssue& Issue = OutIssues.AddDefaulted_GetRef();
			Issue.Line = Tokens[i].Line;
			Issue.Message = TEXT("template block is not closed");
			break;
		}
		FTemplate Template;
		Template.Verb = FName(*Verb);
		Template.Text = Source.Mid(Tokens[i].Start, Tokens[Close].End - Tokens[i].Start);

		// A template must parse once its placeholders are filled with something.
		TArray<FString> Missing;
		TMap<FString, FString> Probe;
		FString Probed = Template.Text;
		int32 From = 0;
		while ((From = Probed.Find(TEXT("${"), ESearchCase::CaseSensitive, ESearchDir::FromStart, From)) != INDEX_NONE)
		{
			const int32 End = Probed.Find(TEXT("}"), ESearchCase::CaseSensitive, ESearchDir::FromStart, From);
			if (End == INDEX_NONE) { break; }
			FString Inner = Probed.Mid(From + 2, End - From - 2);
			FString PName, PDefault;
			if (!Inner.Split(TEXT("|"), &PName, &PDefault)) { PName = Inner; }
			int32 Dot;
			if (!PName.FindChar('.', Dot)) { Probe.Add(PName, TEXT("1")); }
			From = End + 1;
		}
		const FParseResult Check = Parse(Substitute(Template.Text, Probe, Missing));
		if (Check.HasErrors() || Check.Spells.Num() != 1)
		{
			for (FSpellwrightIssue Issue : Check.Issues)
			{
				Issue.Line += Tokens[i].Line - 1;
				Issue.Message = FString::Printf(TEXT("template %s: %s"), *Verb, *Issue.Message);
				OutIssues.Add(Issue);
			}
		}
		else
		{
			Templates.Add(Template.Verb, Template);
			++Loaded;
		}
		i = Close;
	}
	UE_LOG(LogSpellwright, Log, TEXT("Loaded %d spell templates"), Loaded);
	return OutIssues.Num() == IssuesBefore;
}

bool FSpellwrightCompiler::LoadTemplatesFromFile(const FString& Path, TArray<FSpellwrightIssue>& OutIssues)
{
	FString Source;
	if (!FFileHelper::LoadFileToString(Source, *Path))
	{
		FSpellwrightIssue& Issue = OutIssues.AddDefaulted_GetRef();
		Issue.Message = FString::Printf(TEXT("cannot read template file %s"), *Path);
		return false;
	}
	return LoadTemplates(Source, OutIssues);
}

TArray<FName> FSpellwrightCompiler::GetVerbs() const
{
	TArray<FName> Verbs;
	Templates.GetKeys(Verbs);
	Verbs.Sort(FNameLexicalLess());
	return Verbs;
}

FString FSpellwrightCompiler::QuoteValue(const FString& Value)
{
	bool bBare = !Value.IsEmpty() && !Value.StartsWith(TEXT("//"));
	for (const TCHAR C : Value)
	{
		if (!SpellwrightDsl::IsWordChar(C) && C != '$')
		{
			bBare = false;
			break;
		}
	}
	if (bBare)
	{
		return Value;
	}
	FString Escaped = Value.Replace(TEXT("\\"), TEXT("\\\\")).Replace(TEXT("\""), TEXT("\\\"")).Replace(TEXT("\n"), TEXT("\\n")).Replace(TEXT("\t"), TEXT("\\t"));
	return FString::Printf(TEXT("\"%s\""), *Escaped);
}

FString FSpellwrightCompiler::Substitute(const FString& Template, const TMap<FString, FString>& Params, TArray<FString>& OutMissing)
{
	FString Out;
	Out.Reserve(Template.Len());
	bool bInString = false;
	bool bInComment = false;
	const int32 N = Template.Len();
	for (int32 i = 0; i < N; ++i)
	{
		const TCHAR C = Template[i];
		if (bInComment)
		{
			Out.AppendChar(C);
			bInComment = C != '\n';
			continue;
		}
		if (!bInString && (C == '#' || (C == '/' && i + 1 < N && Template[i + 1] == '/')))
		{
			bInComment = true;
			Out.AppendChar(C);
			continue;
		}
		if (C == '\\' && bInString && i + 1 < N)
		{
			Out.AppendChar(C);
			Out.AppendChar(Template[++i]);
			continue;
		}
		if (C == '"')
		{
			bInString = !bInString;
			Out.AppendChar(C);
			continue;
		}
		if (C == '$' && i + 1 < N && Template[i + 1] == '{')
		{
			const int32 Close = Template.Find(TEXT("}"), ESearchCase::CaseSensitive, ESearchDir::FromStart, i);
			if (Close != INDEX_NONE)
			{
				const FString Inner = Template.Mid(i + 2, Close - i - 2);
				FString Name, Default;
				const bool bHasDefault = Inner.Split(TEXT("|"), &Name, &Default);
				if (!bHasDefault) { Name = Inner; }
				Name.TrimStartAndEndInline();
				int32 Dot;
				if (!Name.FindChar('.', Dot))
				{
					FString Value;
					bool bRaw = false;
					if (const FString* Found = Params.Find(Name))
					{
						Value = *Found;
					}
					else if (bHasDefault)
					{
						Value = Default;
						bRaw = true; // defaults are written by the template author in DSL form
					}
					else
					{
						OutMissing.AddUnique(Name);
					}
					if (bInString)
					{
						Out += Value.Replace(TEXT("\\"), TEXT("\\\\")).Replace(TEXT("\""), TEXT("\\\""));
					}
					else
					{
						Out += bRaw ? Value : QuoteValue(Value);
					}
					i = Close;
					continue;
				}
			}
		}
		Out.AppendChar(C);
	}
	return Out;
}

bool FSpellwrightCompiler::CompileIntent(const FSpellwrightIntent& Intent, const FLoreCodex* Codex, FSpellwrightSpell& OutSpell, TArray<FSpellwrightIssue>& OutIssues) const
{
	const FTemplate* Template = Templates.Find(Intent.Verb);
	if (!Template)
	{
		FSpellwrightIssue& Issue = OutIssues.AddDefaulted_GetRef();
		Issue.Message = FString::Printf(TEXT("no spell template for verb '%s'"), *Intent.Verb.ToString());
		return false;
	}

	TMap<FString, FString> Params = Intent.Params;
	Params.Add(TEXT("subject"), Intent.Subject.IsEmpty() ? Intent.Verb.ToString() : Intent.Subject);
	Params.Add(TEXT("verb"), Intent.Verb.ToString());
	if (!Intent.Realm.IsNone()) { Params.Add(TEXT("realm"), Intent.Realm.ToString()); }
	if (!Intent.GoalId.IsNone()) { Params.Add(TEXT("goal"), Intent.GoalId.ToString()); }

	TArray<FString> Missing;
	const FString Source = Substitute(Template->Text, Params, Missing);
	for (const FString& M : Missing)
	{
		FSpellwrightIssue& Issue = OutIssues.AddDefaulted_GetRef();
		Issue.Message = FString::Printf(TEXT("intent '%s' is missing parameter '%s'"), *Intent.Verb.ToString(), *M);
	}
	if (Missing.Num() > 0)
	{
		return false;
	}

	FParseResult Parsed = Parse(Source);
	OutIssues.Append(Parsed.Issues);
	if (Parsed.HasErrors() || Parsed.Spells.Num() != 1)
	{
		return false;
	}
	OutSpell = MoveTemp(Parsed.Spells[0]);
	OutSpell.Intent = Intent.Verb;
	OutSpell.Subject = Intent.Subject;
	if (!Intent.Realm.IsNone()) { OutSpell.Realm = Intent.Realm; }
	if (Intent.Priority != 0) { OutSpell.Priority = Intent.Priority; }
	if (!Intent.GoalId.IsNone()) { OutSpell.GoalId = Intent.GoalId; }
	OutSpell.Provenance = Intent.Provenance.IsEmpty() ? TEXT("planner") : Intent.Provenance;
	Finalize(OutSpell, Codex);
	return true;
}

FSpellwrightCompiler::FParseResult FSpellwrightCompiler::CompileSource(const FString& Source, const FLoreCodex* Codex, const FString& Provenance) const
{
	FParseResult Result = Parse(Source);
	for (FSpellwrightSpell& Spell : Result.Spells)
	{
		Spell.Provenance = Provenance;
		Finalize(Spell, Codex);
	}
	return Result;
}

void FSpellwrightCompiler::Finalize(FSpellwrightSpell& Spell, const FLoreCodex* Codex)
{
	if (!Spell.Id.IsValid())
	{
		Spell.Id = FGuid::NewGuid();
	}
	for (int32 i = 0; i < Spell.Steps.Num(); ++i)
	{
		if (Spell.Steps[i].Label.IsNone())
		{
			Spell.Steps[i].Label = FName(*FString::Printf(TEXT("s%d"), i + 1));
		}
	}

	const FSpellwrightOpRegistry& Registry = FSpellwrightOpRegistry::Get();
	if (Codex)
	{
		if (Spell.Glyphs.Num() == 0)
		{
			Spell.Glyphs = Codex->Inscribe(Spell.Subject.IsEmpty() ? Spell.Name.ToString() : Spell.Subject);
		}
		Spell.Sigils = Codex->FindSigilsIn(Spell.Glyphs);
	}
	if (Spell.School.IsNone())
	{
		if (Codex && Spell.Sigils.Num() > 0)
		{
			if (const FLoreGlyph* Sigil = Codex->FindGlyph(Spell.Sigils[0])) { Spell.School = Sigil->School; }
		}
		if (Spell.School.IsNone() && Codex) { Spell.School = Codex->DominantSchool(Spell.Glyphs); }
		if (Spell.School.IsNone() && Spell.Steps.Num() > 0)
		{
			if (const FSpellwrightOpSpec* Spec = Registry.Find(Spell.Steps[0].Op)) { Spell.School = Spec->School; }
		}
	}

	float Cost = 0.f;
	for (const FSpellwrightStep& Step : Spell.Steps)
	{
		const FSpellwrightOpSpec* Spec = Registry.Find(Step.Op);
		Cost += Spec ? Spec->Cost : 1.f;
	}
	float Stability = 1.f;
	if (Codex && !Spell.Realm.IsNone())
	{
		if (const FLoreRealm* Realm = Codex->FindRealm(Spell.Realm)) { Stability = Realm->Stability; }
	}
	// Casting in an unstable realm costs more: up to double at zero stability.
	Spell.Cost = Cost * (1.f + (1.f - FMath::Clamp(Stability, 0.f, 1.f)));
}
