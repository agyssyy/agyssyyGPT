<#
.SYNOPSIS
  Build everything for AgyssyyGPT: JS bundle, optional native agyssyy.exe, npm package.
#>
[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $root

Write-Host "==> Installing dependencies"
npm install

Write-Host "==> Typecheck"
npm run -w app typecheck

Write-Host "==> Tests"
npm run -w app test

Write-Host "==> Building CLI bundle"
npm run -w app build

Write-Host "==> Building agyssyy.exe (best effort)"
node scripts/build-exe.mjs
if ($LASTEXITCODE -eq 0) {
  Write-Host "==> Packing npm package"
  node scripts/package-npm.mjs --pack
} else {
  Write-Warning "Native binary build skipped; npm package not assembled."
}
