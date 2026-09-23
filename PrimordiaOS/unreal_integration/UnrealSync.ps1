$source = "C:\Users\Shane\Documents\dev\primordiaos\unreal_integration\"
$dest = "C:\Users\Shane\Documents\dev\PrimordiaUnreal\Source\PrimordiaUnreal\Primordia\"

Copy-Item "$source\PrimordiaBridge.h" $dest -Force
Copy-Item "$source\PrimordiaBridge.cpp" $dest -Force

Write-Host "Primordia Unreal integration synced."
