# TEST_START
$typoraHome = "$env:USERPROFILE\scoop\apps\typora\current"
# TEST_END

$htmlPath = $null

$windowHtmlPathCandiates = @(
    "$typoraHome\resources\app\window.html"
    "$typoraHome\resources\appsrc\window.html"
    "$typoraHome\resources\window.html"
)

:labelC foreach ($path in $windowHtmlPathCandiates) {
    if (Test-Path $path) {
        $htmlPath = $path
        break labelC
    }
}

# TEST_START
Write-Host "Detected window.html path: $htmlPath"
# TEST_END
