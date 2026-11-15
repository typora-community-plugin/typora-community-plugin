# TEST_START
$typoraHome = "$env:USERPROFILE\scoop\apps\typora\current"
$htmlPath = "$typoraHome\resources\window.html"
# TEST_END

# Read the document as ONE string. `Get-Content` without `-Raw` returns an array
# of lines, which breaks `-match` / `-notmatch` idempotency checks and makes
# `Select-String` return a list of matches (later joined with spaces).
$html = Get-Content $htmlPath -Raw -Encoding 'UTF8'

# 1.1~1.2 typora://userData
# 1.4~1.12 typora://app/userData
$userDataMatch = [regex]::Match($html, 'typora://(?:app/)?userData')

if (-not $userDataMatch.Success) {
  Write-Host "Could not detect the Typora userData URL scheme in: $htmlPath" -ForegroundColor Red
  exit 1
}

$userDataPath = $userDataMatch.Value

# TEST_START
Write-Host "Detected userData path: $userDataPath"
# TEST_END
