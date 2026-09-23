function Invoke-KernelCommand {
    param(
        [string]$cmd,
        [array]$args
    )

    switch ($cmd) {
        "core.ping" { return "pong" }
        default { return "Unknown command: $cmd" }
    }
}
