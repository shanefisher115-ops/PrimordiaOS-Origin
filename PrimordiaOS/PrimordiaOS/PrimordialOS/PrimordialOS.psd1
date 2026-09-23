@{
    ModuleVersion     = '3.1.0'
    GUID              = '11111111-2222-3333-4444-555555555555'
    Author            = 'Primordial Antigravity Core Team'
    Description       = 'Primordial Antigravity Unified Runtime Module'
    RootModule        = 'PrimordialOS.psm1'
    FunctionsToExport = @(
        'Initialize-PrimordialMemory',
        'Set-PrimordialMemory',
        'Get-PrimordialMemory',
        'Clear-PrimordialMemory',
        'Export-PrimordialState',
        'Import-PrimordialState',
        'Enable-PrimordialAntigravityKernel',
        'Disable-PrimordialAntigravityKernel',
        'Add-PrimordialAgent',
        'Register-PrimordialAgent',
        'Get-PrimordialAgents',
        'Unregister-PrimordialAgent',
        'Start-PrimordialSwarmBrain',
        'Initialize-PrimordialChamber',
        'Get-PrimordialChambers',
        'Add-PrimordialLoop',
        'Register-PrimordialLoop',
        'Start-PrimordialLoop',
        'Stop-PrimordialLoop',
        'Get-PrimordialLoops',
        'Start-PrimordialAntigravity',
        'Start-PrimordiaOS',
        'Show-PrimordialHUD',
        'Show-PrimordialDashboard',
        'Add-PrimordialProphecyOracle',
        'Invoke-PrimordialProphecy',
        'Get-PrimordialProphecyHistory',
        'Test-PrimordialDiagnostic',
        'Register-PrimordialRoute',
        'Invoke-PrimordialRouter'
    )
    AliasesToExport   = @(
        'diag',
        'dash',
        'hud',
        'prophecy',
        'agents',
        'chambers',
        'loops',
        'route',
        'Boot-SwarmBrain',
        'Initialize-Chamber',
        'Enable-AntigravityKernel',
        'Add-ProphecyOracle',
        'Get-ProphecyHistory',
        'Invoke-PrimordialDiagnostic',
        'Stop-PrimordialAgent'
    )
}
