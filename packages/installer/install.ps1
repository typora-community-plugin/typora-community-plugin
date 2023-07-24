#
# @example &'install.ps1'
# @example &'install.ps1' -root <custom_install_path>
#

[CmdletBinding()]
Param(
  [string] $root
)

If ($root -eq "") {
  $root = If (Test-Path "C:\Program Files\Typora") {
    "C:\Program Files\Typora"
  } Else {
    "C:\Program Files (x86)\Typora"
  }
}

$htmlPath = "$root\resources\window.html"

$userDataPath = "typora://app/userData"

$html = Get-Content $htmlPath -Encoding 'UTF8'

if ($html -nomatch '/plugins/loader.js" type="module"></script>$') {
  echo "Editing File: $htmlPath"

  $html = $html -replace '</body></html>$', "<script src=""$userDataPath/plugins/loader.js"" type=""module""></script>$&"

  $utf8NoBom = New-Object System.Text.UTF8Encoding $False
  [System.IO.File]::WriteAllLines($htmlPath, $html, $utf8NoBom)
}

If (-not Test-Path "%UserProfile%\\AppData\\Roaming\\Typora\\plugins") {
  Invoke-Expression "cmd /c mklink /d %UserProfile%\\AppData\\Roaming\\Typora\\plugins %UserProfile%\\.typora\\community-plugins"
}
