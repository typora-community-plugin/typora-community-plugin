$uninstallPaths = @(
    "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall",
    "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall"
)

$typoraPath = $null

foreach ($path in $uninstallPaths) {
    Get-ChildItem $path -ErrorAction SilentlyContinue | ForEach-Object {
        $props = Get-ItemProperty $_.PSPath -ErrorAction SilentlyContinue
        if ($props.DisplayName -like "*Typora*") {
            $typoraPath = $props.InstallLocation
            break 2
        }
    }
}

if ($typoraPath -and (Test-Path $typoraPath)) {
    Write-Output "Detected Typora installation path: $typoraPath"
    $confirm = Read-Host "Use this path? (Y/N)"
    if ($confirm -match '^[Yy]$') {
        $root = $typoraPath
    } else {
        $root = Read-Host "Please enter the Typora installation path"
    }
} else {
    Write-Output "Could not find Typora installation path from registry"
    $root = Read-Host "Please enter the Typora installation path"
}

$htmlPath = "$root\resources\window.html"

$userDataPath = "typora://app/userData"

$html = Get-Content $htmlPath -Encoding 'UTF8'

if ($html -notmatch '/plugins/loader.js" type="module"></script>$') {
  echo "Editing File: $htmlPath"

  $html = $html -replace '</body></html>$', "<script src=""$userDataPath/plugins/loader.js"" type=""module""></script>$&"

  $utf8NoBom = New-Object System.Text.UTF8Encoding $False
  [System.IO.File]::WriteAllLines($htmlPath, $html, $utf8NoBom)
}

If (-not (Test-Path "%UserProfile%\\AppData\\Roaming\\Typora\\plugins")) {
  Invoke-Expression "cmd /c mklink /d %UserProfile%\\AppData\\Roaming\\Typora\\plugins %UserProfile%\\.typora\\community-plugins"
}

Copy-Item ./* -Destination $env:UserProfile/.typora/community-plugins -Recurse

Write-Host "`nInstallation succeeded."
Write-Host "`Press any key to exit..."
[void][System.Console]::ReadKey($true)
