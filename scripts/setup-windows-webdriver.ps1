$ErrorActionPreference = 'Stop'
$runtimePaths = @(
  "${env:ProgramFiles(x86)}\Microsoft\EdgeWebView\Application\*\msedgewebview2.exe",
  "$env:ProgramFiles\Microsoft\EdgeWebView\Application\*\msedgewebview2.exe",
  "$env:LOCALAPPDATA\Microsoft\EdgeWebView\Application\*\msedgewebview2.exe"
)
$runtime = Get-ChildItem $runtimePaths -ErrorAction SilentlyContinue |
  Sort-Object { [version]$_.VersionInfo.ProductVersion } -Descending | Select-Object -First 1
if (!$runtime) { throw 'WebView2 runtime is missing; Windows smoke cannot run' }
$version = $runtime.VersionInfo.ProductVersion
$destination = Join-Path $env:RUNNER_TEMP "nutbook-webdriver-$version"
New-Item -ItemType Directory -Force $destination | Out-Null
$driver = Join-Path $destination 'msedgedriver.exe'
if (!(Test-Path $driver)) {
  $archive = Join-Path $destination 'driver.zip'
  Invoke-WebRequest "https://msedgedriver.microsoft.com/$version/edgedriver_win64.zip" -OutFile $archive
  Expand-Archive $archive -DestinationPath $destination -Force
}
if ((Get-AuthenticodeSignature $driver).Status -ne 'Valid') { throw 'Edge WebDriver signature validation failed' }
$actual = & $driver --version
if (!$actual.Contains(($version.Split('.')[0..2] -join '.'))) { throw 'WebDriver and WebView2 versions differ' }
"NUTBOOK_WEBDRIVER=$driver" | Out-File -FilePath $env:GITHUB_ENV -Append
"WebView2=$version; Driver=$actual" | Write-Output
