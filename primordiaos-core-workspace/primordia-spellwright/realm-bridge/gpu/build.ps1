# Builds the standalone GPU engine with MSVC + Ninja from a plain PowerShell.
#   ./build.ps1            Release build into ./build
#   ./build.ps1 -Test      ...then runs the GPU tests (validation layer on)
param(
	[switch]$Test,
	[string]$Config = "Release",
	[string]$VulkanSdk = $(if ($env:VULKAN_SDK -and (Test-Path "$env:VULKAN_SDK/Include/vulkan/vulkan.h")) { $env:VULKAN_SDK } else { (Get-ChildItem "C:/VulkanSDK" -Directory | Sort-Object Name -Descending | Select-Object -First 1).FullName })
)
$ErrorActionPreference = "Stop"
$here = $PSScriptRoot
$vswhere = "${env:ProgramFiles(x86)}/Microsoft Visual Studio/Installer/vswhere.exe"
$vs = & $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
if (-not $vs) { throw "Visual Studio with the C++ x64 tools is required" }
$devCmd = Join-Path $vs "Common7/Tools/VsDevCmd.bat"
$env:VULKAN_SDK = $VulkanSdk
Write-Host "Vulkan SDK: $VulkanSdk"
$configure = "cmake -S `"$here`" -B `"$here/build`" -G Ninja -DCMAKE_BUILD_TYPE=$Config -DVulkan_ROOT=`"$VulkanSdk`""
$build = "cmake --build `"$here/build`""
cmd /c "`"$devCmd`" -arch=x64 -host_arch=x64 >nul && $configure && $build"
if ($LASTEXITCODE -ne 0) { throw "build failed ($LASTEXITCODE)" }
if ($Test) {
	& "$here/build/bin/primordia_gpu_tests.exe"
	if ($LASTEXITCODE -ne 0) { throw "GPU tests failed ($LASTEXITCODE)" }
}
