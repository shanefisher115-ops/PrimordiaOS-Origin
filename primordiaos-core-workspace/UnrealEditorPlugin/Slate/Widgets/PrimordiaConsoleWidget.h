#pragma once
#include \"Widgets/SCompoundWidget.h\"

class SPrimordiaConsoleWidget : public SCompoundWidget {
public:
  SLATE_BEGIN_ARGS(SPrimordiaConsoleWidget) {}
  SLATE_END_ARGS()

  void Construct(const FArguments& InArgs);
};