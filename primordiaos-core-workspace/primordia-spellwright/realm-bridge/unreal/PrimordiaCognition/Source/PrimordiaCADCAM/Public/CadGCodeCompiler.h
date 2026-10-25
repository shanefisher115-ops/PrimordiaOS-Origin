#pragma once

#include "CoreMinimal.h"
#include "CadTypes.h"

enum class ECadGCodeDialect : uint8
{
	/** LinuxCNC / Fanuc-style: O-number, T M06 tool change, G04 P in seconds. */
	LinuxCNC,
	/** GRBL 1.1: no O-number or tool change (written as comments), G4 P in seconds. */
	Grbl,
};

struct PRIMORDIACADCAM_API FCadGCodeOptions
{
	ECadGCodeDialect Dialect = ECadGCodeDialect::LinuxCNC;
	int32 ProgramNumber = 1001;
	int32 Decimals = 3;
	bool bLineNumbers = false;
	int32 LineNumberStep = 10;
	bool bComments = true;
	bool bCoolant = false;
	/** Seconds to dwell after spindle start (G4), 0 = none. */
	double SpindleWarmupSeconds = 2.0;
};

struct PRIMORDIACADCAM_API FCadGCodeParseResult
{
	TArray<FCadMove> Moves;
	TArray<FString> Errors;
	double SpindleRpm = 0.0;
	int32 ToolNumber = 0;
	bool bEnded = false;
};

/**
 * RS-274 program writer and reader (LinuxCNC or GRBL dialect, see FCadGCodeOptions).
 *
 * Writes G21 G90 G94 G17 programs with modal suppression: G0/G1 and F are emitted only when they
 * change, and only the axes that move. The reader understands what the writer emits plus G20 (inch),
 * G91 (incremental), G4, comments in () and after ';', and N words, so a program can be compiled,
 * read back and simulated to prove the program, not just the toolpath.
 */
class PRIMORDIACADCAM_API FCadGCodeCompiler
{
public:
	FCadGCodeOptions Options;

	FString Compile(const FCadPart& Part, const FCadToolpath& Toolpath, double EstimatedSeconds = 0.0) const;

	static FCadGCodeParseResult Parse(const FString& Program, double SafeZ = 5.0);

	/** Strips characters G-code comments cannot hold. */
	static FString SanitizeComment(const FString& Text);

private:
	FString Num(double V) const;
};
