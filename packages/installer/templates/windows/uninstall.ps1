# {{ FIND_TYPORA_HOME }}
# {{ FIND_WINDOW_HTML }}
# {{ FIND_USERDATA_DIR }}

If ($html -match '/plugins/loader.js" type="module"></script>') {
  echo "Editing File: $htmlPath"

  $html = $html -replace "<script src=""$userDataPath/plugins/loader.js"" type=""module""></script>", ''

  $utf8NoBom = New-Object System.Text.UTF8Encoding $False
  [System.IO.File]::WriteAllLines($htmlPath, $html, $utf8NoBom)
}

If (Test-Path "$env:USERPROFILE\AppData\Roaming\Typora\plugins") {
  Remove-Item "$env:USERPROFILE\AppData\Roaming\Typora\plugins"
}

Write-Host "`nUninstallation succeeded."
Write-Host "`Press any key to exit..."
[void][System.Console]::ReadKey($true)
