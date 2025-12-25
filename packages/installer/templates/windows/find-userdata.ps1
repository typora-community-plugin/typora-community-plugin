# TEST_START
$typoraHome = "$env:USERPROFILE\scoop\apps\typora\current"
$htmlPath = "$typoraHome\resources\window.html"
# TEST_END

$html = Get-Content $htmlPath -Encoding 'UTF8'

# 1.1~1.2 typora://userData
# 1.4~1.12 typora://app/userData
$userDataPath = ($html | Select-String -Pattern 'typora:/(/app)?/userData').Matches.Value[0]

# TEST_START
Write-Host "Detected userData path: $userDataPath"
# TEST_END
