#include "SpellwrightOps.h"

#include "PrimordiaSpellwright.h"
#include "Misc/ScopeLock.h"

namespace
{
	using EArg = ESpellwrightArgType;

	FSpellwrightArgSpec Req(const TCHAR* Name, ESpellwrightArgType Type, TArray<FString> Choices = {})
	{
		return FSpellwrightArgSpec{Name, Type, true, MoveTemp(Choices)};
	}

	FSpellwrightArgSpec Opt(const TCHAR* Name, ESpellwrightArgType Type, TArray<FString> Choices = {})
	{
		return FSpellwrightArgSpec{Name, Type, false, MoveTemp(Choices)};
	}

	FSpellwrightOpSpec Op(const TCHAR* Name, const TCHAR* School, float Cost, bool bPipeline, bool bTarget, const TCHAR* Description, TArray<FSpellwrightArgSpec> Args)
	{
		FSpellwrightOpSpec S;
		S.Op = Name;
		S.School = School;
		S.Cost = Cost;
		S.bPipeline = bPipeline;
		S.bTargetRequired = bTarget;
		S.Description = Description;
		S.Args = MoveTemp(Args);
		return S;
	}

	bool IsNumber(const FString& V)
	{
		if (V.IsEmpty())
		{
			return false;
		}
		return FCString::IsNumeric(*V);
	}

	bool IsInteger(const FString& V)
	{
		if (!IsNumber(V))
		{
			return false;
		}
		int32 Dot;
		return !V.FindChar('.', Dot) && !V.Contains(TEXT("e")) && !V.Contains(TEXT("E"));
	}

	bool ParseComponents(const FString& Value, const TCHAR* Separator, int32 MinCount, int32 MaxCount, FVector& Out)
	{
		TArray<FString> Parts;
		Value.ParseIntoArray(Parts, Separator, false);
		if (Parts.Num() < MinCount || Parts.Num() > MaxCount)
		{
			return false;
		}
		double C[3] = {0, 0, 0};
		for (int32 i = 0; i < Parts.Num(); ++i)
		{
			const FString P = Parts[i].TrimStartAndEnd();
			if (!IsNumber(P))
			{
				return false;
			}
			C[i] = FCString::Atod(*P);
		}
		Out = FVector(C[0], C[1], C[2]);
		return true;
	}

	const TArray<FString> AnimationEngines = {TEXT("eevee"), TEXT("cycles"), TEXT("workbench")};
	const TArray<FString> MeshFormats = {TEXT("glb"), TEXT("gltf"), TEXT("fbx"), TEXT("obj"), TEXT("usd")};
}

const FSpellwrightArgSpec* FSpellwrightOpSpec::FindArg(const FString& Name) const
{
	return Args.FindByPredicate([&Name](const FSpellwrightArgSpec& A) { return A.Name == Name; });
}

FSpellwrightOpRegistry& FSpellwrightOpRegistry::Get()
{
	static FSpellwrightOpRegistry Registry;
	return Registry;
}

void FSpellwrightOpRegistry::RegisterOp(const FSpellwrightOpSpec& Spec)
{
	FScopeLock Guard(&Lock);
	Ops.Add(Spec.Op, Spec);
}

const FSpellwrightOpSpec* FSpellwrightOpRegistry::Find(FName Op) const
{
	FScopeLock Guard(&Lock);
	return Ops.Find(Op);
}

TArray<FName> FSpellwrightOpRegistry::GetOps() const
{
	FScopeLock Guard(&Lock);
	TArray<FName> Out;
	Ops.GetKeys(Out);
	Out.Sort(FNameLexicalLess());
	return Out;
}

bool FSpellwrightOpRegistry::ParseVector(const FString& Value, FVector& Out)
{
	return ParseComponents(Value, TEXT(","), 3, 3, Out);
}

bool FSpellwrightOpRegistry::ParseSize(const FString& Value, FVector& Out)
{
	return ParseComponents(Value.ToLower(), TEXT("x"), 2, 3, Out);
}

bool FSpellwrightOpRegistry::ParseBool(const FString& Value, bool& Out)
{
	const FString V = Value.ToLower();
	if (V == TEXT("true") || V == TEXT("yes") || V == TEXT("on") || V == TEXT("1")) { Out = true; return true; }
	if (V == TEXT("false") || V == TEXT("no") || V == TEXT("off") || V == TEXT("0")) { Out = false; return true; }
	return false;
}

bool FSpellwrightOpRegistry::ValueMatches(const FString& Value, ESpellwrightArgType Type)
{
	if (Value.Contains(TEXT("${")))
	{
		return true; // resolved at execution time
	}
	FVector V;
	bool B;
	switch (Type)
	{
	case EArg::String: return true;
	case EArg::Path: return !Value.IsEmpty();
	case EArg::Number: return IsNumber(Value);
	case EArg::Integer: return IsInteger(Value);
	case EArg::Bool: return ParseBool(Value, B);
	case EArg::Vector: return ParseVector(Value, V);
	case EArg::Size: return ParseSize(Value, V);
	case EArg::Json: return !Value.IsEmpty();
	}
	return false;
}

void FSpellwrightOpRegistry::RegisterBuiltins()
{
	const TArray<FSpellwrightOpSpec> Builtins = {
		// In-engine world actions
		Op(TEXT("world.spawn"), TEXT("forging"), 1.f, false, false, TEXT("Spawn actors of a class (or Blueprint path) at a location."),
			// "at" is x,y,z or "player" (in front of the player).
			{Req(TEXT("class"), EArg::Path), Opt(TEXT("at"), EArg::String), Opt(TEXT("rotation"), EArg::Vector), Opt(TEXT("scale"), EArg::Vector),
			 Opt(TEXT("tag"), EArg::String), Opt(TEXT("count"), EArg::Integer), Opt(TEXT("spacing"), EArg::Number), Opt(TEXT("label"), EArg::String)}),
		Op(TEXT("world.destroy"), TEXT("binding"), 1.f, false, true, TEXT("Destroy every actor carrying the target tag."), {Opt(TEXT("limit"), EArg::Integer)}),
		Op(TEXT("world.tag"), TEXT("binding"), 0.5f, false, true, TEXT("Add or remove a tag on actors matched by the target (tag or actor name)."),
			{Opt(TEXT("add"), EArg::String), Opt(TEXT("remove"), EArg::String)}),
		Op(TEXT("world.move"), TEXT("weaving"), 1.f, false, true, TEXT("Move actors matched by the target to a location, or by an offset."),
			{Opt(TEXT("to"), EArg::Vector), Opt(TEXT("by"), EArg::Vector), Opt(TEXT("rotation"), EArg::Vector)}),
		Op(TEXT("world.light"), TEXT("illumination"), 0.5f, false, true, TEXT("Set intensity and colour of the lights on matched actors."),
			{Opt(TEXT("intensity"), EArg::Number), Opt(TEXT("color"), EArg::Vector), Opt(TEXT("scale"), EArg::Number)}),
		Op(TEXT("world.log"), TEXT("chronicle"), 0.1f, false, false, TEXT("Write a message to the log and to memory."), {Req(TEXT("message"), EArg::String)}),

		// Lore
		Op(TEXT("lore.record"), TEXT("chronicle"), 0.5f, false, false, TEXT("Record a runtime event in the codex."),
			{Req(TEXT("title"), EArg::String), Opt(TEXT("account"), EArg::String), Opt(TEXT("realm"), EArg::String), Opt(TEXT("stability"), EArg::Number)}),
		Op(TEXT("lore.evolve"), TEXT("chronicle"), 2.f, false, false, TEXT("Advance lore history by some eras."), {Opt(TEXT("eras"), EArg::Integer)}),
		Op(TEXT("lore.inscribe"), TEXT("chronicle"), 0.2f, false, false, TEXT("Write a phrase in the glyph tongue (outputs glyphs, sigils, meaning)."),
			{Req(TEXT("text"), EArg::String)}),

		// CAD/CAM
		Op(TEXT("cadcam.fabricate"), TEXT("forging"), 5.f, true, false, TEXT("Design a part, generate toolpaths, simulate, compile G-code and send it down the pipeline."),
			{Opt(TEXT("shape"), EArg::String, {TEXT("rect"), TEXT("polygon"), TEXT("circle")}), Opt(TEXT("feature"), EArg::String, {TEXT("pocket"), TEXT("profile"), TEXT("drill"), TEXT("face")}),
			 Opt(TEXT("width"), EArg::Number), Opt(TEXT("height"), EArg::Number), Opt(TEXT("radius"), EArg::Number), Opt(TEXT("sides"), EArg::Integer),
			 Opt(TEXT("depth"), EArg::Number), Opt(TEXT("stock"), EArg::Size), Opt(TEXT("tool"), EArg::Number), Opt(TEXT("rpm"), EArg::Number),
			 Opt(TEXT("feed"), EArg::Number), Opt(TEXT("plunge"), EArg::Number), Opt(TEXT("stepdown"), EArg::Number), Opt(TEXT("stepover"), EArg::Number),
			 Opt(TEXT("holes"), EArg::String), Opt(TEXT("outside"), EArg::Bool), Opt(TEXT("material"), EArg::String), Opt(TEXT("dialect"), EArg::String, {TEXT("linuxcnc"), TEXT("grbl")}), Opt(TEXT("submit"), EArg::Bool)}),
		Op(TEXT("cadcam.simulate"), TEXT("forging"), 2.f, false, false, TEXT("Same as fabricate, without sending the job: toolpath, G-code and simulation only."),
			{Opt(TEXT("shape"), EArg::String, {TEXT("rect"), TEXT("polygon"), TEXT("circle")}), Opt(TEXT("feature"), EArg::String, {TEXT("pocket"), TEXT("profile"), TEXT("drill"), TEXT("face")}),
			 Opt(TEXT("width"), EArg::Number), Opt(TEXT("height"), EArg::Number), Opt(TEXT("radius"), EArg::Number), Opt(TEXT("sides"), EArg::Integer),
			 Opt(TEXT("depth"), EArg::Number), Opt(TEXT("stock"), EArg::Size), Opt(TEXT("tool"), EArg::Number), Opt(TEXT("rpm"), EArg::Number),
			 Opt(TEXT("feed"), EArg::Number), Opt(TEXT("plunge"), EArg::Number), Opt(TEXT("stepdown"), EArg::Number), Opt(TEXT("stepover"), EArg::Number),
			 Opt(TEXT("holes"), EArg::String), Opt(TEXT("outside"), EArg::Bool), Opt(TEXT("material"), EArg::String), Opt(TEXT("dialect"), EArg::String, {TEXT("linuxcnc"), TEXT("grbl")})}),

		// Blender
		Op(TEXT("blender.render"), TEXT("illumination"), 6.f, true, false, TEXT("Render a still or an animation in Blender."),
			{Opt(TEXT("scene"), EArg::Path), Opt(TEXT("output"), EArg::Path), Opt(TEXT("engine"), EArg::String, AnimationEngines), Opt(TEXT("resolution"), EArg::Size),
			 Opt(TEXT("samples"), EArg::Integer), Opt(TEXT("frame_start"), EArg::Integer), Opt(TEXT("frame_end"), EArg::Integer), Opt(TEXT("animation"), EArg::Bool)}),
		Op(TEXT("blender.animate"), TEXT("dreaming"), 4.f, true, true, TEXT("Keyframe an object (keyframes JSON, or a turntable)."),
			{Opt(TEXT("keyframes"), EArg::Json), Opt(TEXT("turntable"), EArg::Bool), Opt(TEXT("frames"), EArg::Integer), Opt(TEXT("fps"), EArg::Integer), Opt(TEXT("scene"), EArg::Path), Opt(TEXT("save"), EArg::Path)}),
		Op(TEXT("blender.import"), TEXT("forging"), 2.f, true, false, TEXT("Import a mesh file into the Blender scene."),
			{Req(TEXT("path"), EArg::Path), Opt(TEXT("format"), EArg::String, MeshFormats), Opt(TEXT("scene"), EArg::Path), Opt(TEXT("save"), EArg::Path)}),
		Op(TEXT("blender.export"), TEXT("forging"), 2.f, true, false, TEXT("Export the Blender scene (or named objects) to a mesh file."),
			{Req(TEXT("path"), EArg::Path), Opt(TEXT("format"), EArg::String, MeshFormats), Opt(TEXT("objects"), EArg::String), Opt(TEXT("scene"), EArg::Path), Opt(TEXT("import"), EArg::Bool)}),
		Op(TEXT("blender.mesh"), TEXT("forging"), 2.f, true, true, TEXT("Send the static meshes of tagged actors to Blender as one object."),
			{Opt(TEXT("name"), EArg::String), Opt(TEXT("save"), EArg::Path)}),

		// DaVinci Resolve
		Op(TEXT("davinci.assemble"), TEXT("chronicle"), 3.f, true, false, TEXT("Import media (a folder of renders or files) and lay it on a timeline."),
			{Req(TEXT("source"), EArg::Path), Opt(TEXT("project"), EArg::String), Opt(TEXT("timeline"), EArg::String), Opt(TEXT("fps"), EArg::Number)}),
		Op(TEXT("davinci.grade"), TEXT("illumination"), 2.f, true, false, TEXT("Apply a LUT and/or CDL to every clip on a timeline."),
			{Opt(TEXT("project"), EArg::String), Opt(TEXT("timeline"), EArg::String), Opt(TEXT("lut"), EArg::Path), Opt(TEXT("slope"), EArg::Vector),
			 Opt(TEXT("offset"), EArg::Vector), Opt(TEXT("power"), EArg::Vector), Opt(TEXT("saturation"), EArg::Number), Opt(TEXT("node"), EArg::Integer)}),
		Op(TEXT("davinci.render"), TEXT("chronicle"), 5.f, true, false, TEXT("Render a timeline to a file."),
			{Opt(TEXT("project"), EArg::String), Opt(TEXT("timeline"), EArg::String), Req(TEXT("target"), EArg::Path), Opt(TEXT("name"), EArg::String),
			 Opt(TEXT("format"), EArg::String), Opt(TEXT("codec"), EArg::String), Opt(TEXT("preset"), EArg::String)}),

		// Pipeline and build
		Op(TEXT("bolt.submit"), TEXT("weaving"), 1.f, true, false, TEXT("Submit a raw job of any kind to the Bolt pipeline."),
			{Req(TEXT("kind"), EArg::String), Opt(TEXT("payload"), EArg::Json)}),
		Op(TEXT("autobuilder.build"), TEXT("forging"), 3.f, true, false, TEXT("Rebuild the Primordia modules through the Autobuilder."),
			{Req(TEXT("reason"), EArg::String), Opt(TEXT("target"), EArg::String), Opt(TEXT("configuration"), EArg::String), Opt(TEXT("mode"), EArg::String, {TEXT("project"), TEXT("plugin")})}),
		Op(TEXT("autobuilder.deploy"), TEXT("forging"), 2.f, true, false, TEXT("Install the plugin source into the Unreal project."),
			{Req(TEXT("reason"), EArg::String)}),
	};
	for (const FSpellwrightOpSpec& Spec : Builtins)
	{
		RegisterOp(Spec);
	}
	UE_LOG(LogSpellwright, Log, TEXT("Registered %d built-in ops"), Builtins.Num());
}
