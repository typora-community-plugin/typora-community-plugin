# @import "./find-home.ps1"
# @import "./find-window-html.ps1"

if (-not $htmlPath) {
  Write-Host "Could not find window.html under: $typoraHome" -ForegroundColor Red
  [void][System.Console]::ReadKey($true)
  exit 1
}

$html = Get-Content $htmlPath -Raw -Encoding 'UTF8'
$originalHtml = $html

# Remove every loader tag, including malformed duplicates left by the old
# installer (their `src` contained a space-joined array of userData URLs).
$anyLoaderJsPattern = '(?is)<script\b[^>]*\bsrc\s*=\s*["''][^"'']*userData[^"'']*plugins/loader\.js["''][^>]*>\s*</script>\s*'
$html = [regex]::Replace($html, $anyLoaderJsPattern, '')

if ($html -ne $originalHtml) {
  echo "Editing File: $htmlPath"

  $utf8NoBom = New-Object System.Text.UTF8Encoding $False
  [System.IO.File]::WriteAllText($htmlPath, $html, $utf8NoBom)
}

If (Test-Path "$env:USERPROFILE/AppData/Roaming/Typora/plugins") {
  Remove-Item "$env:USERPROFILE/AppData/Roaming/Typora/plugins"
}

Write-Host "`nUninstallation succeeded."
Write-Host "`Press any key to exit..."
[void][System.Console]::ReadKey($true)
