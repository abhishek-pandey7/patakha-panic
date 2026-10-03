$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$nodePath = if ($nodeCommand) { $nodeCommand.Source } else { Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' }
if (-not (Test-Path -LiteralPath $nodePath)) { throw 'Install Node.js 20.19+ before starting the game.' }
$vitePath = Join-Path $PSScriptRoot 'node_modules\vite\bin\vite.js'
if (-not (Test-Path -LiteralPath $vitePath)) { throw 'Run npm install or pnpm install in this folder first.' }
Write-Host 'Patakha Panic is starting. Open http://localhost:5173 in your browser.'
& $nodePath $vitePath --host 127.0.0.1
