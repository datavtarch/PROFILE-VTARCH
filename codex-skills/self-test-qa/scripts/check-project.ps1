param(
  [string]$Root = "."
)

$ErrorActionPreference = "Stop"
$rootPath = Resolve-Path -LiteralPath $Root
$failed = $false

$requiredDocs = @(
  "docs/product-requirements.md",
  "docs/architecture.md",
  "docs/database-design.md",
  "docs/supabase-security.md",
  "docs/ui-guidelines.md",
  "docs/test-checklist.md",
  "docs/deploy-guide.md",
  "docs/telegram-report.md"
)

$requiredSkills = @(
  "codex-skills/project-memory/SKILL.md",
  "codex-skills/frontend-ui-design/SKILL.md",
  "codex-skills/supabase-security/SKILL.md",
  "codex-skills/self-test-qa/SKILL.md",
  "codex-skills/bug-fixing/SKILL.md",
  "codex-skills/vercel-deploy/SKILL.md",
  "codex-skills/telegram-report/SKILL.md"
)

foreach ($relative in $requiredDocs + $requiredSkills) {
  $full = Join-Path $rootPath $relative
  if (-not (Test-Path -LiteralPath $full)) {
    Write-Host "[FAIL] Missing $relative"
    $failed = $true
  }
}

$secretPatterns = @(
  "SUPABASE_SERVICE_ROLE_KEY\s*=\s*\S+",
  "TELEGRAM_BOT_TOKEN\s*=\s*\S+",
  "sb_secret_",
  "xoxb-"
)

$searchFiles = Get-ChildItem -LiteralPath $rootPath -Recurse -File |
  Where-Object {
    $_.FullName -notmatch "\\.git\\" -and
    $_.FullName -notmatch "\\node_modules\\" -and
    $_.FullName -notmatch "\\.next\\" -and
    $_.FullName -notmatch "\\codex-skills\\self-test-qa\\scripts\\check-project\.ps1$"
  }

foreach ($file in $searchFiles) {
  $content = Get-Content -Raw -LiteralPath $file.FullName -ErrorAction SilentlyContinue
  foreach ($pattern in $secretPatterns) {
    if ($content -match $pattern) {
      Write-Host "[FAIL] Possible secret in $($file.FullName)"
      $failed = $true
    }
  }
}

if ($failed) {
  exit 1
}

Write-Host "Project baseline check passed."
