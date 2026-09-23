param([string]$input)

if ([string]::IsNullOrWhiteSpace($input)) {
    return ""
}

$parts = $input.Split(" ", [System.StringSplitOptions]::RemoveEmptyEntries)

$cmd = $parts[0]
$args = if ($parts.Length -gt 1) { $parts[1..($parts.Length-1)] } else { @() }

Invoke-KernelCommand $cmd $args
