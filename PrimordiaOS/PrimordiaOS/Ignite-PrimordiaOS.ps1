#Requires -Version 5.1
<#
.SYNOPSIS
    PrimordiaOS Master Ignition & Kernel Activation Sequence
#>

[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "`n=======================================================" -ForegroundColor Cyan
Write-Host "       PRIMORDIAOS MASTER KERNEL ACTIVATION" -ForegroundColor Cyan
Write-Host "=======================================================`n" -ForegroundColor Cyan

# Import Module
Import-Module "C:\Users\Shane\PrimordiaOS\PrimordialOS\PrimordialOS.psd1" -Force -Global

# -------------------------------------------------------------
# STEP 1: Register Core Personas
# -------------------------------------------------------------
Write-Host ">>> [STEP 1/9] Registering Core Personas..." -ForegroundColor Yellow
Add-PrimordialAgent -Name "Liam" -Role "Strategist"
Add-PrimordialAgent -Name "Rachel" -Role "Explainer"
Add-PrimordialAgent -Name "Adam" -Role "Architect"
Add-PrimordialAgent -Name "Antoni" -Role "Optimizer"
Add-PrimordialAgent -Name "Josh" -Role "Motivator"

Write-Host "`n[Verifying Agents]" -ForegroundColor DarkYellow
agents

# -------------------------------------------------------------
# STEP 2: Initialize Memory Banks
# -------------------------------------------------------------
Write-Host "`n>>> [STEP 2/9] Initializing Primordial Memory Banks..." -ForegroundColor Yellow
Initialize-PrimordialMemory

Write-Host "`n[Verifying Dashboard]" -ForegroundColor DarkYellow
dash

# -------------------------------------------------------------
# STEP 3: Bind Antigravity Kernel
# -------------------------------------------------------------
Write-Host "`n>>> [STEP 3/9] Binding Antigravity Kernel..." -ForegroundColor Yellow
Enable-AntigravityKernel

Write-Host "`n[Verifying Kernel Diagnostics]" -ForegroundColor DarkYellow
diag

# -------------------------------------------------------------
# STEP 4: Initialize Chamber States
# -------------------------------------------------------------
Write-Host "`n>>> [STEP 4/9] Initializing Chamber States..." -ForegroundColor Yellow
Initialize-Chamber -Name "RealityEngine"
Initialize-Chamber -Name "NeuralField"
Initialize-Chamber -Name "SigilForge"
Initialize-Chamber -Name "WarpGate"
Initialize-Chamber -Name "XPReactor"
Initialize-Chamber -Name "TimeDilation"
Initialize-Chamber -Name "SwarmBrain"
Initialize-Chamber -Name "BlackHole"

Write-Host "`n[Verifying Chambers]" -ForegroundColor DarkYellow
chambers

# -------------------------------------------------------------
# STEP 5: Boot Swarm Brain
# -------------------------------------------------------------
Write-Host "`n>>> [STEP 5/9] Booting Swarm Brain & Cognitive Tensors..." -ForegroundColor Yellow
Boot-SwarmBrain

Write-Host "`n[Verifying Swarm Cognitive Tensors]" -ForegroundColor DarkYellow
agents

# -------------------------------------------------------------
# STEP 6: Register Loop Engine
# -------------------------------------------------------------
Write-Host "`n>>> [STEP 6/9] Registering Loop Engine..." -ForegroundColor Yellow
Add-PrimordialLoop -Name "ProphecyLoop" -IntervalSeconds 5

Write-Host "`n[Verifying Loop Registry]" -ForegroundColor DarkYellow
loops

# -------------------------------------------------------------
# STEP 7: Activate Runtime
# -------------------------------------------------------------
Write-Host "`n>>> [STEP 7/9] Activating PrimordiaOS Runtime..." -ForegroundColor Yellow
Start-PrimordiaOS

Write-Host "`n[Verifying Primordial HUD]" -ForegroundColor DarkYellow
hud

# -------------------------------------------------------------
# STEP 8: Perform First Prophecy Cycle
# -------------------------------------------------------------
Write-Host "`n>>> [STEP 8/9] Executing First Prophecy Cycle..." -ForegroundColor Yellow
prophecy "PrimordiaOS online."

# -------------------------------------------------------------
# STEP 9: Final Health Check & State Persistence
# -------------------------------------------------------------
Write-Host "`n>>> [STEP 9/9] Executing Final System Diagnostic..." -ForegroundColor Yellow
$finalDiag = diag

Export-PrimordialState -Path "C:\Users\Shane\PrimordiaOS\PrimordialState.json"

Write-Host "`n=======================================================" -ForegroundColor Green
Write-Host "       PRIMORDIAOS FULLY ACTIVATED AND OPERATIONAL" -ForegroundColor Green
Write-Host "=======================================================`n" -ForegroundColor Green
