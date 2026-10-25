#pragma once

#include "CoreMinimal.h"

enum class ESpellwrightArgType : uint8
{
	String,
	Number,
	Integer,
	Bool,
	/** x,y,z */
	Vector,
	/** AxB or AxBxC */
	Size,
	Path,
	/** Any JSON value. */
	Json,
};

struct PRIMORDIASPELLWRIGHT_API FSpellwrightArgSpec
{
	FString Name;
	ESpellwrightArgType Type = ESpellwrightArgType::String;
	bool bRequired = false;
	/** For String args: the allowed values. Empty = any. */
	TArray<FString> Choices;
};

/** What an op is: its arguments, cost, and the school of magic it belongs to. */
struct PRIMORDIASPELLWRIGHT_API FSpellwrightOpSpec
{
	FName Op;
	FName School;
	float Cost = 1.f;
	/** Whether the step needs a Target. */
	bool bTargetRequired = false;
	/** Runs out of the engine as a pipeline job (Bolt). */
	bool bPipeline = false;
	TArray<FSpellwrightArgSpec> Args;
	FString Description;

	const FSpellwrightArgSpec* FindArg(const FString& Name) const;
};

/**
 * Every op a spell may contain. The built-in ops are registered at module startup; other modules
 * register their own (RegisterOp replaces an existing spec with the same name).
 */
class PRIMORDIASPELLWRIGHT_API FSpellwrightOpRegistry
{
public:
	static FSpellwrightOpRegistry& Get();

	void RegisterOp(const FSpellwrightOpSpec& Spec);
	const FSpellwrightOpSpec* Find(FName Op) const;
	TArray<FName> GetOps() const;
	int32 Num() const { return Ops.Num(); }

	/** Checks a text value against a type. Values containing ${...} references always pass. */
	static bool ValueMatches(const FString& Value, ESpellwrightArgType Type);
	static bool ParseVector(const FString& Value, FVector& Out);
	static bool ParseSize(const FString& Value, FVector& Out);
	static bool ParseBool(const FString& Value, bool& Out);

	void RegisterBuiltins();

private:
	TMap<FName, FSpellwrightOpSpec> Ops;
	mutable FCriticalSection Lock;
};
