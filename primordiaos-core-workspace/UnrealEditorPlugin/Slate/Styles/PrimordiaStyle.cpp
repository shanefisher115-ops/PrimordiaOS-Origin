#include \"PrimordiaStyle.h\"

TSharedPtr<FSlateStyleSet> FPrimordiaStyle::StyleSet;

void FPrimordiaStyle::Initialize() {
  StyleSet = MakeShareable(new FSlateStyleSet(\"PrimordiaStyle\"));
}

void FPrimordiaStyle::Shutdown() {
  StyleSet.Reset();
}