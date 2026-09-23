$src = "C:\Users\Shane\Documents\dev\primordiaos\unreal_plugin_src\"
$pluginRoot = "C:\Users\Shane\Documents\dev\PrimordiaUnreal\Plugins\PrimordiaOSBridge\"
$pluginSource = "$pluginRoot\Source\PrimordiaOSBridge\"
$public = "$pluginSource\Public\"
$private = "$pluginSource\Private\"

New-Item -ItemType Directory -Force -Path $pluginRoot | Out-Null
New-Item -ItemType Directory -Force -Path $pluginSource | Out-Null
New-Item -ItemType Directory -Force -Path $public | Out-Null
New-Item -ItemType Directory -Force -Path $private | Out-Null

Copy-Item "$src\PrimordiaOSBridge.uplugin" "$pluginRoot\PrimordiaOSBridge.uplugin" -Force
Copy-Item "$src\PrimordiaOSBridge.Build.cs" "$pluginSource\PrimordiaOSBridge.Build.cs" -Force
Copy-Item "$src\PrimordiaBridge.h" $public -Force
Copy-Item "$src\PrimordiaBridge.cpp" $private -Force
Copy-Item "$src\PrimordiaOSBridgeModule.cpp" $private -Force

Write-Host "PrimordiaOSBridge plugin synced into Unreal project."
