$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path $PSScriptRoot -Parent
$chromeCandidates = @(
  "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)
$chromePath = $chromeCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $chromePath) { throw 'Google Chrome est introuvable.' }
$profilePath = Join-Path $taskRoot '.local\leclerc-chrome'
New-Item -ItemType Directory -Path $profilePath -Force | Out-Null
$chromeArguments = @(
  '--remote-debugging-address=127.0.0.1',
  '--remote-debugging-port=9222',
  ('--user-data-dir="' + $profilePath + '"'),
  '--no-first-run',
  'https://www.leclercdrive.fr/?mag=010111-010111&sRedirect=false'
)
Start-Process -FilePath $chromePath -ArgumentList $chromeArguments
Write-Host 'Chrome Leclerc ouvert. Connectez-vous et cliquez sur Commencer mes courses.'
