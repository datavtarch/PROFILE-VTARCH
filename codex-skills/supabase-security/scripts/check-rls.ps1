param(
  [string]$Path = "."
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $Path)) {
  Write-Error "Path not found: $Path"
}

$files = @()
$item = Get-Item -LiteralPath $Path
if ($item.PSIsContainer) {
  $files = Get-ChildItem -LiteralPath $Path -Recurse -Filter *.sql
} else {
  $files = @($item)
}

if ($files.Count -eq 0) {
  Write-Host "No SQL files found."
  exit 0
}

$failed = $false
foreach ($file in $files) {
  $content = Get-Content -Raw -LiteralPath $file.FullName
  $createsUserTable = $content -match "(?is)create\s+table\s+.*\b(user_id)\b"
  if ($createsUserTable) {
    if ($content -notmatch "(?is)enable\s+row\s+level\s+security") {
      Write-Host "[FAIL] Missing RLS enable statement near user-owned table: $($file.FullName)"
      $failed = $true
    }
    if ($content -notmatch "(?is)auth\.uid\(\)\s*=\s*user_id|user_id\s*=\s*auth\.uid\(\)") {
      Write-Host "[FAIL] Missing auth.uid() = user_id policy pattern: $($file.FullName)"
      $failed = $true
    }
  }
}

if ($failed) {
  exit 1
}

Write-Host "RLS baseline check passed."
