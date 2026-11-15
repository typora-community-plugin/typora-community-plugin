# @import "./find-home.ps1"
# @import "./find-window-html.ps1"
# @import "./find-userdata.ps1"

if (-not $htmlPath) {
  Write-Host "Could not find window.html under: $typoraHome" -ForegroundColor Red
  [void][System.Console]::ReadKey($true)
  exit 1
}

$originalHtml = $html

# Remove every previously injected loader tag before inserting a fresh one.
# The broad pattern also catches the malformed duplicates produced by the old
# installer, whose `src` contained a space-joined array of userData URLs.
$anyLoaderJsPattern = '(?is)<script\b[^>]*\bsrc\s*=\s*["''][^"'']*userData[^"'']*plugins/loader\.js["''][^>]*>\s*</script>\s*'
$html = [regex]::Replace($html, $anyLoaderJsPattern, '')

$pluginScript = "<script src=""$userDataPath/plugins/loader.js"" type=""module""></script>"

# Insert exactly once, right before the closing body/html pair.
$closingMatch = [regex]::Match($html, '(?is)</body>\s*</html>\s*$')
if ($closingMatch.Success) {
  $before = $html.Substring(0, $closingMatch.Index)
  $closing = $closingMatch.Value
  $html = "$before$pluginScript$closing"
}
elseif ($html -match '(?is)</body>') {
  $html = [regex]::Replace($html, '(?is)</body>', "$pluginScript</body>")
}
else {
  $html = "$html`r`n$pluginScript"
}

if ($html -ne $originalHtml) {
  Write-Host "Editing File: $htmlPath"

  $utf8NoBom = New-Object System.Text.UTF8Encoding $False
  [System.IO.File]::WriteAllText($htmlPath, $html, $utf8NoBom)
}

$pluginsPath = "$env:USERPROFILE/AppData/Roaming/Typora/plugins"
$communityPath = "$env:USERPROFILE/.typora/community-plugins"
If (-not (Test-Path $pluginsPath)) {
  New-Item -ItemType Junction -Path $pluginsPath -Target $communityPath | Out-Null
}
# Copy files (always, so re-running the installer also upgrades an existing install)
$scriptDir = if ($PSScriptRoot) { (Resolve-Path $PSScriptRoot).Path } else { (Resolve-Path '.').Path }
$communityDir = if (Test-Path $communityPath) { (Resolve-Path $communityPath).Path } else { $communityPath }
If ($scriptDir -ne $communityDir) {
  Write-Host "Copying plugin files to `"$communityPath`"..."
  New-Item -ItemType Directory -Path $communityPath -Force | Out-Null
  Get-ChildItem -Path $scriptDir -Force | Copy-Item -Destination $communityPath -Recurse -Force
}

Write-Host "`nInstallation succeeded."
Write-Host "`Press any key to exit..."
[void][System.Console]::ReadKey($true)
