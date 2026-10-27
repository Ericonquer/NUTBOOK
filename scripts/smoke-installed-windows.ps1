param([string]$ReportDirectory = 'windows-smoke-report')
$ErrorActionPreference = 'Stop'
if (-not $env:RUNNER_TEMP) { throw 'RUNNER_TEMP is required for an isolated install' }
$packages = @(Get-ChildItem src-tauri/target/release/bundle/nsis/*.exe)
if ($packages.Count -ne 1) { throw 'Expected exactly one NSIS installer' }
$installer = $packages[0]
$beforeHash = (Get-FileHash $installer.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
$expectedVersion = (Get-Content src-tauri/tauri.conf.json -Raw | ConvertFrom-Json).version
$install = Join-Path $env:RUNNER_TEMP 'nutbook-installed'
if (Test-Path $install) { throw 'Refusing to overlay an existing installation' }
New-Item -ItemType Directory -Force $ReportDirectory | Out-Null
$process = Start-Process $installer.FullName -ArgumentList "/S /D=$install" -Wait -PassThru
if ($process.ExitCode -ne 0) { throw "NSIS install failed: $($process.ExitCode)" }
$app = Get-Item (Join-Path $install 'NUTBOOK.exe')
$actualVersion = $app.VersionInfo.ProductVersion
if ($actualVersion -notmatch ('^' + [regex]::Escape($expectedVersion) + '(\.0)?$')) {
  throw "Installed application version mismatch: $actualVersion != $expectedVersion"
}
$record = [ordered]@{
  commit = $env:GITHUB_SHA
  version = $expectedVersion
  installer = $installer.Name
  installerSha256 = $beforeHash
  installerBytes = $installer.Length
  installedAppSha256 = (Get-FileHash $app.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
  installedAppVersion = $actualVersion
  installedBytes = (Get-ChildItem $install -Recurse -File | Measure-Object Length -Sum).Sum
}
$record | ConvertTo-Json | Set-Content (Join-Path $ReportDirectory 'installer.json') -Encoding utf8
$env:NUTBOOK_SMOKE_APP = $app.FullName
$env:NUTBOOK_SMOKE_REPORT = (Resolve-Path $ReportDirectory).Path
node scripts/windows-runtime-smoke.mjs
if ($LASTEXITCODE -ne 0) { throw 'Installed Windows application smoke failed' }
if ((Get-FileHash $installer.FullName -Algorithm SHA256).Hash.ToLowerInvariant() -ne $beforeHash) {
  throw 'Installer bytes changed during acceptance'
}
if ((Get-FileHash $app.FullName -Algorithm SHA256).Hash.ToLowerInvariant() -ne $record.installedAppSha256) {
  throw 'Installed application bytes changed during acceptance'
}
