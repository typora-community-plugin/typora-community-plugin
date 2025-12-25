# {{ FIND_TYPORA_HOME }}
# {{ FIND_WINDOW_HTML }}
# {{ FIND_USERDATA_DIR }}

If ($html -notmatch '/plugins/loader.js" type="module"></script>$') {
  Write-Host "Editing File: $htmlPath"

  $html = $html -replace '</body></html>$', "<script src=""$userDataPath/plugins/loader.js"" type=""module""></script>$&"

  $utf8NoBom = New-Object System.Text.UTF8Encoding $False
  [System.IO.File]::WriteAllLines($htmlPath, $html, $utf8NoBom)
}

If (-not (Test-Path "$env:USERPROFILE\AppData\Roaming\Typora\plugins")) {
  Invoke-Expression "cmd /c mklink /d %UserProfile%\\AppData\\Roaming\\Typora\\plugins %UserProfile%\\.typora\\community-plugins"
}

If (-not (Test-Path "$env:USERPROFILE\.typora\community-plugins")) {
  Copy-Item ./* -Destination "$env:UserProfile\.typora\community-plugins" -Recurse
}

Write-Host "`nInstallation succeeded."
Write-Host "`Press any key to exit..."
[void][System.Console]::ReadKey($true)
