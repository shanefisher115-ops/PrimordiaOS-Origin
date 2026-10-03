#pragma once

#include \"Widgets/SCompoundWidget.h\"

class SPrimordiaPanel : public SCompoundWidget {
public:
    SLATE_BEGIN_ARGS(SPrimordiaPanel) {}
    SLATE_END_ARGS()

    void Construct(const FArguments& InArgs);
};