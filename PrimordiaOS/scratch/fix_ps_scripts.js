import fs from 'fs';
import path from 'path';

function writeUtf8Bom(filePath, content) {
  const bom = Buffer.from([0xEF, 0xBB, 0xBF]);
  const textBuffer = Buffer.from(content, 'utf8');
  fs.writeFileSync(filePath, Buffer.concat([bom, textBuffer]));
  console.log(`[UTF-8 BOM] Written: ${filePath}`);
}

// 1. Fix Format-Primordial.ps1
const formatPrimordialPath = 'C:\\Users\\Shane\\core\\Format-Primordial.ps1';
const formatPrimordialContent = `<#
.SYNOPSIS
    Cosmic-themed color formatting utilities for PrimordialOS CLI output.
#>

# ── ANSI color palette ────────────────────────────────────────────────────────
$Script:Colors = @{
    Void        = "\`e[38;5;93m"    # Deep purple — branding / headers
    Cosmic      = "\`e[38;5;135m"   # Lavender — subheadings
    Starlight   = "\`e[38;5;231m"   # Bright white — primary values
    Ember       = "\`e[38;5;208m"   # Orange — warnings / highlights
    Aurora      = "\`e[38;5;51m"    # Cyan — success / positive
    Crimson     = "\`e[38;5;196m"   # Red — errors
    Mist        = "\`e[38;5;244m"   # Grey — muted / secondary
    Gold        = "\`e[38;5;220m"   # Gold — titles / emphasis
    Reset       = "\`e[0m"
    Bold        = "\`e[1m"
    Dim         = "\`e[2m"
    Underline   = "\`e[4m"
}

<#
.SYNOPSIS
    Write a colored line to the console. Returns nothing.
#>
function Write-Primordial {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory, ValueFromPipeline)]
        [string]$Text,
        [string]$Color = "Starlight",
        [switch]$Bold,
        [switch]$NoNewline
    )

    $esc     = if ($Script:Colors.ContainsKey($Color)) { $Script:Colors[$Color] } else { "" }
    $boldEsc = if ($Bold.IsPresent) { $Script:Colors.Bold } else { "" }
    $reset   = $Script:Colors.Reset
    $out     = "$boldEsc$esc$Text$reset"

    if ($NoNewline) { Write-Host $out -NoNewline }
    else            { Write-Host $out }
}

<#
.SYNOPSIS
    Write the PrimordialOS ASCII banner.
#>
function Write-PrimordialBanner {
    [CmdletBinding()]
    param(
        [string]$Subtitle = ""
    )

    $v  = $Script:Colors.Void
    $g  = $Script:Colors.Gold
    $c  = $Script:Colors.Cosmic
    $m  = $Script:Colors.Mist
    $rs = $Script:Colors.Reset
    $bd = $Script:Colors.Bold

    Write-Host ""
    Write-Host "\${bd}\${v}  ██████╗ ██████╗ ██╗███╗   ███╗ ██████╗ ██████╗ ██████╗ ██╗ █████╗ ██╗     \${rs}"
    Write-Host "\${bd}\${v}  ██╔══██╗██╔══██╗██║████╗ ████║██╔═══██╗██╔══██╗██╔══██╗██║██╔══██╗██║     \${rs}"
    Write-Host "\${bd}\${v}  ██████╔╝██████╔╝██║██╔████╔██║██║   ██║██████╔╝██║  ██║██║███████║██║     \${rs}"
    Write-Host "\${bd}\${v}  ██╔═══╝ ██╔══██╗██║██║╚██╔╝██║██║   ██║██╔══██╗██║  ██║██║██╔══██║██║     \${rs}"
    Write-Host "\${bd}\${v}  ██║     ██║  ██║██║██║ ╚═╝ ██║╚██████╔╝██║  ██║██████╔╝██║██║  ██║███████╗\${rs}"
    Write-Host "\${bd}\${v}  ╚═╝     ╚═╝  ╚═╝╚═╝╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═════╝ ╚═╝╚═╝  ╚═╝╚══════╝\${rs}"
    Write-Host "\${bd}\${g}                          ✦  O S  C L I  ✦\${rs}"
    if ($Subtitle) {
        Write-Host "\${c}                     $Subtitle\${rs}"
    }
    $divider = "-" * 70
    Write-Host "\${m}  $divider\${rs}"
    Write-Host ""
}

<#
.SYNOPSIS
    Format a key/value pair as a cosmic property row.
#>
function Write-PrimordialProp {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][string]$Key,
        [Parameter(Mandatory)][string]$Value,
        [string]$KeyColor   = "Cosmic",
        [string]$ValueColor = "Starlight"
    )
    $kesc  = if ($Script:Colors.ContainsKey($KeyColor)) { $Script:Colors[$KeyColor] } else { "" }
    $vesc  = if ($Script:Colors.ContainsKey($ValueColor)) { $Script:Colors[$ValueColor] } else { "" }
    $mesc  = $Script:Colors.Mist
    $rs    = $Script:Colors.Reset
    Write-Host "  \${kesc}\${Key}\${rs}\${mesc} ·· \${rs}\${vesc}\${Value}\${rs}"
}

<#
.SYNOPSIS
    Write a section divider with an optional label.
#>
function Write-PrimordialDivider {
    [CmdletBinding()]
    param([string]$Label = "")
    $m  = $Script:Colors.Mist
    $c  = $Script:Colors.Cosmic
    $rs = $Script:Colors.Reset
    if ($Label) {
        $count = [Math]::Max(0, 68 - $Label.Length - 2)
        $pad = "-" * $count
        Write-Host "  \${c}── \${Label} \${m}\${pad}\${rs}"
    } else {
        $pad = "-" * 70
        Write-Host "  \${m}\${pad}\${rs}"
    }
}

<#
.SYNOPSIS
    Write a success message with ✦ prefix.
#>
function Write-PrimordialSuccess {
    param([string]$Message)
    $a  = $Script:Colors.Aurora
    $rs = $Script:Colors.Reset
    $bd = $Script:Colors.Bold
    Write-Host "  \${bd}\${a}✦ \${Message}\${rs}"
}

<#
.SYNOPSIS
    Write a warning message with ⚡ prefix.
#>
function Write-PrimordialWarning {
    param([string]$Message)
    $e  = $Script:Colors.Ember
    $rs = $Script:Colors.Reset
    Write-Host "  \${e}⚡ \${Message}\${rs}"
}

<#
.SYNOPSIS
    Write an error message with ✖ prefix.
#>
function Write-PrimordialError {
    param([string]$Message)
    $cr = $Script:Colors.Crimson
    $rs = $Script:Colors.Reset
    $bd = $Script:Colors.Bold
    Write-Host "  \${bd}\${cr}✖ \${Message}\${rs}" -ForegroundColor Red
}

<#
.SYNOPSIS
    Render a PSObject or hashtable as a cosmic property table.
#>
function Format-PrimordialObject {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory, ValueFromPipeline)]
        [object]$InputObject,
        [string]$Title = ""
    )
    process {
        if ($Title) { Write-PrimordialDivider -Label $Title }
        $props = if ($InputObject -is [hashtable]) {
            $InputObject.GetEnumerator() | Sort-Object Key
        } else {
            $InputObject.PSObject.Properties | Where-Object { $_.MemberType -eq 'NoteProperty' }
        }
        foreach ($p in $props) {
            $val = if ($null -eq $p.Value) { "(null)" }
                   elseif ($p.Value -is [array]) { $p.Value -join ", " }
                   else { [string]$p.Value }
            Write-PrimordialProp -Key $p.Name -Value $val
        }
    }
}

<#
.SYNOPSIS
    Display a paged list of items with cosmic styling.
#>
function Format-PrimordialList {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][array]$Items,
        [string]$TitleProperty = "",
        [string]$SubProperty   = ""
    )
    $idx = 0
    foreach ($item in $Items) {
        $idx++
        $title = if ($TitleProperty -and $item.PSObject.Properties[$TitleProperty]) {
                     $item.$TitleProperty
                 } else { "Item $idx" }
        $sub   = if ($SubProperty -and $item.PSObject.Properties[$SubProperty]) {
                     $item.$SubProperty
                 } else { "" }

        $g  = $Script:Colors.Gold
        $m  = $Script:Colors.Mist
        $c  = $Script:Colors.Cosmic
        $rs = $Script:Colors.Reset
        Write-Host "  \${g}[\$idx]\${rs} \${c}\${title}\${rs}" -NoNewline
        if ($sub) { Write-Host "  \${m}\${sub}\${rs}" } else { Write-Host "" }
    }
}
`;
writeUtf8Bom(formatPrimordialPath, formatPrimordialContent);

// 2. Fix Help-Primordial.ps1
const helpPrimordialPath = 'C:\\Users\\Shane\\core\\Help-Primordial.ps1';
let helpContent = fs.readFileSync(helpPrimordialPath, 'utf8');
// Fix .ContainsKey on OrderedDictionary
helpContent = helpContent.replace(/\$Script:CommandRegistry\.ContainsKey\(\$key\)/g, '$Script:CommandRegistry.Contains($key)');

// Add forge and antigrav to subcommands if not already present
if (!helpContent.includes('forge = [ordered]@{')) {
  const insertIndex = helpContent.indexOf('hud = [ordered]@{');
  const forgeHelp = `    forge = [ordered]@{
        Synopsis    = "Store Asset Forge Realm -- multi-platform store asset generation."
        Description = "Automated cinematic pipeline binding Stitch x Figma x MCP x Antigravity."
        Usage       = "primordial forge [subcommand] [options]"
        Subcommands = [ordered]@{
            status   = "Check Store Asset Forge realm and bundle status"
            run      = "Execute the 5-stage asset production pipeline"
            audit    = "Run ANTIGRAV() sovereignty audit on forge assets"
        }
        Flags = [ordered]@{
            "-JsonOut" = "Output raw JSON data"
        }
        Examples = @(
            "primordial forge status"
            "primordial forge run"
            "primordial forge audit"
        )
    }
    antigrav = [ordered]@{
        Synopsis    = "ANTIGRAV() sovereignty and anti-collapse validation engine."
        Description = "Run structural friction and sovereignty audits on realms and codebases."
        Usage       = "primordial antigrav [target] [options]"
        Flags = [ordered]@{
            "-JsonOut" = "Output raw JSON audit report"
        }
        Examples = @(
            "primordial antigrav"
            "primordial antigrav store_asset_forge"
        )
    }
`;
  helpContent = helpContent.slice(0, insertIndex) + forgeHelp + helpContent.slice(insertIndex);
  
  // Also add forge and antigrav to root subcommands list
  helpContent = helpContent.replace('version   = "Display version, build, and environment information"', `version   = "Display version, build, and environment information"\n            forge     = "Store Asset Forge Realm asset pipeline (status | run | audit)"\n            antigrav  = "ANTIGRAV() sovereignty validation engine"`);
}
writeUtf8Bom(helpPrimordialPath, helpContent);

// 3. Fix PrimordialOS.psm1
const psmPath = 'C:\\Users\\Shane\\PrimordialOS.psm1';
let psmContent = fs.readFileSync(psmPath, 'utf8');

if (!psmContent.includes('Invoke-ForgeCommand.ps1')) {
  psmContent = psmContent.replace('"commands\\Invoke-DesignCommand.ps1"', '"commands\\Invoke-DesignCommand.ps1",\n    "commands\\Invoke-ForgeCommand.ps1"');
}
if (!psmContent.includes('"forge" {')) {
  const switchIndex = psmContent.indexOf('default {');
  const forgeSwitch = `        "forge" {
            $parsed = _Parse-PrimordialTail -Tail $tail -DefaultSubcommand "status"
            $splat  = $parsed.Params
            Invoke-ForgeCommand -Subcommand $parsed.Subcommand @splat
            return
        }

        "antigrav" {
            $parsed = _Parse-PrimordialTail -Tail $tail -DefaultSubcommand "audit"
            $splat  = $parsed.Params
            Invoke-ForgeCommand -Subcommand "audit" @splat
            return
        }

        `;
  psmContent = psmContent.slice(0, switchIndex) + forgeSwitch + psmContent.slice(switchIndex);
}
if (!psmContent.includes('"Invoke-ForgeCommand"')) {
  psmContent = psmContent.replace('"Invoke-DesignCommand",', '"Invoke-DesignCommand",\n    "Invoke-ForgeCommand",');
}
writeUtf8Bom(psmPath, psmContent);

// 4. Re-encode all files in C:\Users\Shane\commands\ with UTF-8 BOM
const commandDir = 'C:\\Users\\Shane\\commands';
const files = fs.readdirSync(commandDir);
for (const file of files) {
  if (file.endsWith('.ps1')) {
    const fullPath = path.join(commandDir, file);
    let content = fs.readFileSync(fullPath, 'utf8');
    writeUtf8Bom(fullPath, content);
  }
}

// 5. Re-encode core files
const coreDir = 'C:\\Users\\Shane\\core';
const coreFiles = fs.readdirSync(coreDir);
for (const file of coreFiles) {
  if (file.endsWith('.ps1')) {
    const fullPath = path.join(coreDir, file);
    let content = fs.readFileSync(fullPath, 'utf8');
    writeUtf8Bom(fullPath, content);
  }
}

console.log('All files fixed and encoded with UTF-8 BOM successfully!');
