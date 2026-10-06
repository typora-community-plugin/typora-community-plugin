# @import "./find-home.ps1"
# @import "./find-window-html.ps1"
# @import "./find-loader-js.ps1"

If ([regex]::IsMatch($html, $loaderJsPattern)) {
  echo "Editing File: $htmlPath"

  $html = [regex]::Replace($html, $loaderJsPattern, '')

  $utf8NoBom = New-Object System.Text.UTF8Encoding $False
  [System.IO.File]::WriteAllLines($htmlPath, $html, $utf8NoBom)
}

If (Test-Path "$env:USERPROFILE/AppData/Roaming/Typora/plugins") {
  Remove-Item "$env:USERPROFILE/AppData/Roaming/Typora/plugins"
}

Write-Host "`nUninstallation succeeded."
Write-Host "`Press any key to exit..."
[void][System.Console]::ReadKey($true)
