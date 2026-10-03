#pragma once
#include \"Styling/SlateStyle.h\"

class FPrimordiaStyle {
public:
  static void Initialize();
  static void Shutdown();
  static TSharedPtr<FSlateStyleSet> StyleSet;
};