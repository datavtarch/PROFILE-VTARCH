param(
  [string]$Root = "."
)

$ErrorActionPreference = "Stop"
$rootPath = Resolve-Path -LiteralPath $Root
$failed = $false

$gitignore = Join-Path $rootPath ".gitignore"
if (Test-Path -LiteralPath $gitignore) {
  $gitignoreContent = Get-Content -Raw -LiteralPath $gitignore
  if ($gitignoreContent -notmatch "(?m)^\.env(\..*)?$|^\.env\.local$") {
    Write-Host "[WARN] .gitignore may not ignore local env files."
  }
} else {
  Write-Host "[WARN] .gitignore not found."
}

$envExample = Join-Path $rootPath ".env.example"
if (Test-Path -LiteralPath $envExample) {
  $envContent = Get-Content -Raw -LiteralPath $envExample
  foreach ($name in @("NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY")) {
    if ($envContent -notmatch $name) {
      Write-Host "[FAIL] .env.example missing $name"
      $failed = $true
    }
  }
  if ($envContent -match "=\S{12,}") {
    Write-Host "[FAIL] .env.example appears to contain real values."
    $failed = $true
  }
} else {
  Write-Host "[WARN] .env.example not found yet."
}

$packageJson = Join-Path $rootPath "package.json"
if (Test-Path -LiteralPath $packageJson) {
  $package = Get-Content -Raw -LiteralPath $packageJson | ConvertFrom-Json
  if (-not $package.scripts.build) {
    Write-Host "[FAIL] package.json missing build script."
    $failed = $true
  }
} else {
  Write-Host "[WARN] package.json not found yet."
}

if ($failed) {
  exit 1
}

Write-Host "Predeploy baseline check passed."
