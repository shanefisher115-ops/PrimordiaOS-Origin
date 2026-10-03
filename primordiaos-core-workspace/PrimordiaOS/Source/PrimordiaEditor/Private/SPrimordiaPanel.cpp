#include \"SPrimordiaPanel.h\"
#include \"Widgets/Layout/SVerticalBox.h\"
#include \"Widgets/Text/STextBlock.h\"

void SPrimordiaPanel::Construct(const FArguments& InArgs) {
    ChildSlot
    [
        SNew(SVerticalBox)
        + SVerticalBox::Slot()
        .AutoHeight()
        [
            SNew(STextBlock)
            .Text(FText::FromString(TEXT(\"PrimordiaOS Engine Panel\")))
        ]
    ];
}