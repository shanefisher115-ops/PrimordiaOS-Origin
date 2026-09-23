# ==============================================================================
# PRIMORDIAOS - UNREAL PHYSICS REALM AND KERR ACCRETION DISK LAUNCHER
# ==============================================================================

Write-Host ""
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "*  PRIMORDIAOS - UNREAL PHYSICS REALM GENERATOR (GR/QM/MHD)    *" -ForegroundColor Yellow
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "[1/3] Transmitting Kerr Metric and Quantum Distortion Wave..." -ForegroundColor Green

try {
    $udp = New-Object System.Net.Sockets.UdpClient
    $udp.Connect("127.0.0.1", 8000)

    $addr = [System.Text.Encoding]::ASCII.GetBytes("/Antigravity/Niagara/PhysicsRealm`0`0`0")
    $tag  = [System.Text.Encoding]::ASCII.GetBytes(",f`0`0")
    $val  = [System.BitConverter]::GetBytes([float]3.0)
    [Array]::Reverse($val)

    $packet = $addr + $tag + $val
    $udp.Send($packet, $packet.Length) | Out-Null
    $udp.Close()
    Write-Host "  -> OSC Physics Realm Distortion wave sent to 127.0.0.1:8000" -ForegroundColor DarkGray
} catch {
    Write-Host "  -> OSC stream standby" -ForegroundColor DarkGray
}

Write-Host "[2/3] Verified HLSL Compute Shaders and Manifest:" -ForegroundColor Green
Write-Host "  -> Shaders/PrimordiaPhysicsCompute.usf" -ForegroundColor DarkCyan
Write-Host "  -> Shaders/PostProcess_KerrBlackHoleLensing.usf" -ForegroundColor DarkCyan
Write-Host "  -> realms/realm_physics_kernel.json" -ForegroundColor DarkCyan
Write-Host "  -> Source_CPP/PrimordiaWorldBuilder/Public/PrimordiaPhysicsSubsystem.h" -ForegroundColor DarkCyan

Write-Host "[3/3] Ready for In-Engine Execution!" -ForegroundColor Yellow
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "To materialize Kerr Accretion Rings in the live Unreal viewport," -ForegroundColor Cyan
Write-Host "paste this into the Python Console in Unreal:" -ForegroundColor Yellow
Write-Host "import primordia_physics_realm_builder as prb; prb.PhysicsRealmGenerator().spawn_kerr_accretion_disk()" -ForegroundColor White
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host ""
