$global:Kernel = @{
    Commands = @{}
}

function Register-Command($name, $handler) {
    $global:Kernel.Commands[$name] = $handler
}

function Invoke-KernelCommand($name, $args) {
    if ($global:Kernel.Commands.ContainsKey($name)) {
        return & $global:Kernel.Commands[$name] $args
    } else {
        return "ERR: command '$name' not found"
    }
}
