if (Get-Process -Name Typora -ErrorAction SilentlyContinue) {
  Write-Host "Close all Typora windows and try again." -ForegroundColor Red
  [void][System.Console]::ReadKey($true)
  exit 1
}
