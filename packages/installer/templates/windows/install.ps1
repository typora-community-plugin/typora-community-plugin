# @import "./find-home.ps1"
# @import "./find-window-html.ps1"
# @import "./find-userdata.ps1"

If ($html -notmatch "<script src=""$userDataPath/plugins/loader\.js"" type=""module""></script>") {
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
If (-not (Test-Path $communityPath)) {
  Copy-Item '.' -Destination $communityPath -Recurse
}

Write-Host "`nInstallation succeeded."
Write-Host "`Press any key to exit..."
[void][System.Console]::ReadKey($true)
