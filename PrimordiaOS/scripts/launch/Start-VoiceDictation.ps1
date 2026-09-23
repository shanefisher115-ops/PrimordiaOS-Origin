<#
.SYNOPSIS
    Antigravity CLI Voice Dictation Controller for PrimordiaOS
.DESCRIPTION
    Automates pre-flight diagnostics, microphone verification, local interactive
    CLI launching with voice dictation, and background mic-serve daemon management
    for SSH/WSL remote dictation sessions.
#>

[CmdletBinding()]
param (
    [Parameter(Position = 0)]
    [ValidateSet('Start', 'Conversational', 'Cockpit', 'MicServe', 'StopMicServe', 'Kokoro', 'StopKokoro', 'Check')]
    [string]$Action = 'Conversational'
)

$ErrorActionPreference = 'Stop'

function Test-MicrophoneHealth {
    Write-Host ''
    Write-Host '[+] Verifying Microphone and System Access...' -ForegroundColor Cyan

    # 1. Check Windows Privacy Setting for Microphone
    $regPath = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\microphone'
    $consent = (Get-ItemProperty -Path $regPath -ErrorAction SilentlyContinue).Value
    $desktopConsent = (Get-ItemProperty -Path "$regPath\NonPackaged" -ErrorAction SilentlyContinue).Value

    if ($consent -eq 'Allow' -and $desktopConsent -eq 'Allow') {
        Write-Host '  [OK] Windows Microphone Access: ALLOWED (Desktop apps permitted)' -ForegroundColor Green
    } else {
        Write-Host '  [!] Windows Microphone Access may be restricted.' -ForegroundColor Yellow
        Write-Host '      Please check Settings -> Privacy and Security -> Microphone' -ForegroundColor DarkGray
    }

    # 2. Check Audio Hardware Devices
    $devices = Get-CimInstance Win32_SoundDevice | Where-Object { $_.Status -eq 'OK' }
    if ($devices) {
        Write-Host '  [OK] Detected Active Audio Hardware:' -ForegroundColor Green
        foreach ($dev in $devices) {
            Write-Host ('       - ' + $dev.Name) -ForegroundColor DarkCyan
        }
    } else {
        Write-Host '  [!] No active sound devices detected.' -ForegroundColor Yellow
    }

    # 3. Check agy executable
    $agyCmd = Get-Command 'agy.exe' -ErrorAction SilentlyContinue
    if ($agyCmd) {
        $ver = (& agy.exe --version 2>&1).Trim()
        Write-Host ('  [OK] Antigravity CLI binary: ' + $agyCmd.Source + ' (v' + $ver + ')') -ForegroundColor Green
    } else {
        Write-Host '  [X] agy.exe not found in PATH.' -ForegroundColor Red
        return $false
    }

    return $true
}

switch ($Action) {
    'Check' {
        Test-MicrophoneHealth | Out-Null
        Write-Host ''
        Write-Host '[OK] Pre-flight check complete.' -ForegroundColor Green
        Write-Host ''
    }

    'MicServe' {
        Write-Host ''
        Write-Host '[+] Starting agy mic-serve loopback server on 127.0.0.1:4713...' -ForegroundColor Cyan
        $existing = Get-Process -Name 'agy' -ErrorAction SilentlyContinue | Where-Object {
            (Get-NetTCPConnection -OwningProcess $_.Id -LocalPort 4713 -ErrorAction SilentlyContinue)
        }
        if ($existing) {
            Write-Host ('  [*] mic-serve is already running on port 4713 (PID: ' + $existing.Id + ').') -ForegroundColor Yellow
        } else {
            $proc = Start-Process -FilePath 'agy.exe' -ArgumentList 'mic-serve' -PassThru -WindowStyle Hidden
            Start-Sleep -Seconds 1
            $conn = Get-NetTCPConnection -LocalPort 4713 -ErrorAction SilentlyContinue
            if ($conn) {
                Write-Host ('  [OK] mic-serve is actively listening on 127.0.0.1:4713 (PID: ' + $proc.Id + ').') -ForegroundColor Green
                Write-Host '  [*] For SSH forwarding, run:' -ForegroundColor DarkGray
                Write-Host '      ssh -f -N -R 24713:localhost:4713 [remote-machine]' -ForegroundColor DarkCyan
            } else {
                Write-Host ('  [!] Started PID ' + $proc.Id + ' but port 4713 is not yet active.') -ForegroundColor Yellow
            }
        }
    }

    'StopMicServe' {
        Write-Host ''
        Write-Host '[+] Stopping agy mic-serve background processes...' -ForegroundColor Cyan
        $stopped = 0
        Get-Process -Name 'agy' -ErrorAction SilentlyContinue | ForEach-Object {
            $conn = Get-NetTCPConnection -OwningProcess $_.Id -LocalPort 4713 -ErrorAction SilentlyContinue
            if ($conn) {
                Stop-Process -Id $_.Id -Force
                $stopped++
            }
        }
        if ($stopped -gt 0) {
            Write-Host ('  [OK] Terminated ' + $stopped + ' mic-serve process(es).') -ForegroundColor Green
        } else {
            Write-Host '  [*] No active mic-serve processes found on port 4713.' -ForegroundColor Yellow
        }
    }

    'Kokoro' {
        Write-Host ''
        Write-Host '[+] Starting Primordia Kokoro Voice Daemon on 127.0.0.1:5050...' -ForegroundColor Cyan
        $existing = Get-NetTCPConnection -LocalPort 5050 -ErrorAction SilentlyContinue
        if ($existing) {
            Write-Host ('  [*] Kokoro Voice Daemon is already running on port 5050 (PID: ' + $existing.OwningProcess + ').') -ForegroundColor Yellow
        } else {
            $scriptPath = Join-Path $PWD 'voice_server.py'
            $proc = Start-Process -FilePath 'py.exe' -ArgumentList ('-3.13 ' + $scriptPath) -PassThru -WindowStyle Hidden
            Start-Sleep -Seconds 3
            $conn = Get-NetTCPConnection -LocalPort 5050 -ErrorAction SilentlyContinue
            if ($conn) {
                Write-Host ('  [OK] Kokoro Voice Daemon online on http://127.0.0.1:5050 (PID: ' + $proc.Id + ').') -ForegroundColor Green
                Write-Host '  [*] Endpoints: POST /speak | GET /voices | GET /status | POST /chat_and_speak' -ForegroundColor DarkCyan
            } else {
                Write-Host ('  [!] Started PID ' + $proc.Id + ' - verifying port 5050 initialization...') -ForegroundColor Yellow
            }
        }
    }

    'StopKokoro' {
        Write-Host ''
        Write-Host '[+] Stopping Kokoro Voice Daemon...' -ForegroundColor Cyan
        $conn = Get-NetTCPConnection -LocalPort 5050 -ErrorAction SilentlyContinue
        if ($conn) {
            Stop-Process -Id $conn.OwningProcess -Force
            Write-Host ('  [OK] Terminated Kokoro Voice process (PID: ' + $conn.OwningProcess + ').') -ForegroundColor Green
        } else {
            Write-Host '  [*] No active Kokoro process found on port 5050.' -ForegroundColor Yellow
        }
    }

    'Conversational' {
        Write-Host ''
        Write-Host '[+] Verifying Kokoro Voice Daemon on port 5050...' -ForegroundColor Cyan
        $conn = Get-NetTCPConnection -LocalPort 5050 -ErrorAction SilentlyContinue
        if (-not $conn) {
            Write-Host '  [*] Starting Kokoro Voice Daemon in background...' -ForegroundColor Yellow
            $voiceScript = Join-Path $PWD 'voice_server.py'
            Start-Process -FilePath 'py.exe' -ArgumentList ('-3.13 ' + $voiceScript) -WindowStyle Hidden
            Start-Sleep -Seconds 3
        } else {
            Write-Host '  [OK] Kokoro Voice Daemon active on port 5050.' -ForegroundColor Green
        }

        Write-Host ''
        Write-Host '[+] Launching PrimordiaOS Conversational Engine...' -ForegroundColor Cyan
        & py.exe -3.13 (Join-Path $PWD 'primordia_conversation.py')
    }

    'Cockpit' {
        Write-Host ''
        Write-Host '[+] Verifying Kokoro Voice Daemon on port 5050...' -ForegroundColor Cyan
        $conn = Get-NetTCPConnection -LocalPort 5050 -ErrorAction SilentlyContinue
        if (-not $conn) {
            Write-Host '  [*] Starting Kokoro Voice Daemon in background...' -ForegroundColor Yellow
            $voiceScript = Join-Path $PWD 'voice_server.py'
            Start-Process -FilePath 'py.exe' -ArgumentList ('-3.13 ' + $voiceScript) -WindowStyle Hidden
            Start-Sleep -Seconds 3
        } else {
            Write-Host '  [OK] Kokoro Voice Daemon active on port 5050.' -ForegroundColor Green
        }

        Write-Host ''
        Write-Host '[+] Launching PrimordiaOS 7-Realm Visual Cockpit Bridge (Port 5055)...' -ForegroundColor Cyan
        Write-Host '  [*] Opening Cockpit HUD: http://localhost:5055/' -ForegroundColor DarkCyan
        Start-Process 'http://localhost:5055/'
        & py.exe -3.13 (Join-Path $PWD 'cockpit_bridge.py')
    }

    'Start' {
        $ready = Test-MicrophoneHealth
        if (-not $ready) {
            Write-Host ''
            Write-Host '[X] Pre-flight failed. Aborting.' -ForegroundColor Red
            return
        }

        Write-Host ''
        Write-Host '================================================================================' -ForegroundColor Cyan
        Write-Host '                     ANTIGRAVITY VOICE DICTATION READY                          ' -ForegroundColor Green
        Write-Host '================================================================================' -ForegroundColor Cyan
        Write-Host '  Controls in CLI:' -ForegroundColor White
        Write-Host '    - Press [F5] or type [/voice] to start recording.' -ForegroundColor Yellow
        Write-Host '    - Speak into your microphone; real-time transcript streams into prompt box.' -ForegroundColor Yellow
        Write-Host '    - Press [Enter] or [F5] to stop recording and retain transcript.' -ForegroundColor Yellow
        Write-Host '    - Press [Esc] to discard recording.' -ForegroundColor Yellow
        Write-Host '================================================================================' -ForegroundColor Cyan
        Write-Host ''
        Write-Host ('[+] Launching agy CLI in workspace: ' + $PWD) -ForegroundColor Cyan
        Write-Host ''
        & agy.exe
    }
}
