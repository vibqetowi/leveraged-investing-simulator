# Remove the empty folders and git leftovers in this repo, with Claude-Code-Setup's tool.
#
#   powershell -ExecutionPolicy Bypass -File tools/remove-orphan-dirs.ps1 [--apply]
#
# A stand-in written by Claude-Code-Setup's setup-root.ps1: it runs the real
# tools/remove-orphan-dirs.ps1 there with --root set to this repo, and passes on
# everything else (dry unless --apply). The tool itself is described there.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
# Claude-Code-Setup, at this path from this repo (setup-root.ps1 writes it).
$tool = [System.IO.Path]::GetFullPath((Join-Path $root '../../Claude-Code-Setup/tools/remove-orphan-dirs.ps1'))
if (-not (Test-Path -LiteralPath $tool)) {
    [Console]::Error.WriteLine("Claude-Code-Setup's remove-orphan-dirs.ps1 isn't at $tool")
    exit 1
}
$global:LASTEXITCODE = 0
& $tool '--root' $root @args
exit $LASTEXITCODE
