# @import "./find-home.ps1"
# @import "./find-window-html.ps1"
# @import "./find-userdata.ps1"
# @import "./find-loader-js.ps1"

If ($html -notmatch $loaderJsPattern) {
  Write-Host "Editing File: $htmlPath"

  $html = $html -replace '</body></html>$', "<script src=""$userDataPath/plugins/loader.js"" type=""module""></script>$&"

  $utf8NoBom = New-Object System.Text.UTF8Encoding $False
  [System.IO.File]::WriteAllLines($htmlPath, $html, $utf8NoBom)
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
