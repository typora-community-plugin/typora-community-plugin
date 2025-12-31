# use CLI parameter
param (
    [Parameter(Mandatory = $false)]
    [Alias('p')]
    [string] $Path = ''
)

$typoraHome = $Path

# use Windows Operating System Registry
if (-not ($typoraHome -and (Test-Path $typoraHome))) {
    $uninstallPaths = @(
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall",
        "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall"
    )

    :label foreach ($path in $uninstallPaths) {
        Get-ChildItem $path | ForEach-Object {
            $props = Get-ItemProperty $_.PSPath -ErrorAction SilentlyContinue
            if ($props.DisplayName -like "*Typora*") {
                $typoraHome = $props.InstallLocation
                break label
            }
        }
    }
}

# use Candidates
if (-not ($typoraHome -and (Test-Path $typoraHome))) {
    $typoraCandidates = @(
        'C:\Program Files\Typora'
        'C:\Program Files (x86)\Typora'
        "$env:LOCALAPPDATA\Programs\Typora"
        "$env:USERPROFILE\scoop\apps\typora\current"
    )

    foreach ($path in $typoraCandidates) {
        if (Test-Path "$path\Typora.exe") {
            $typoraHome = $path
            break
        }
    }
}

# use User Input
if ($typoraHome -and (Test-Path $typoraHome)) {
    Write-Output "Detected Typora installation path: $typoraHome"
    $confirm = Read-Host "Use this path? (Y/N)"
    if ($confirm -notmatch '^[Yy]$') {
        $typoraHome = Read-Host "Please enter the Typora installation path"
    }
}
else {
    Write-Output "Could not find Typora installation path from registry"
    $typoraHome = Read-Host "Please enter the Typora installation path"
}
