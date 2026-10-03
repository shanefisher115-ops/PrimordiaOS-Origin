#include \"PrimordiaConsoleWidget.h\"
#include \"Widgets/Text/STextBlock.h\"

void SPrimordiaConsoleWidget::Construct(const FArguments& InArgs) {
  ChildSlot[
    SNew(STextBlock).Text(FText::FromString(\"Primordia Console Ready\"))
  ];
}