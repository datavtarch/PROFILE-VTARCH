param(
  [string]$PagesUrl = "https://datavtarch.github.io/PROFILE-VTARCH/",
  [string]$WorkerUrl = "https://task-tele-worker.vtarch99.workers.dev",
  [string]$CronSecret = $env:CRON_SECRET,
  [string]$TelegramBotToken = $env:TELEGRAM_BOT_TOKEN
)

$ErrorActionPreference = "Stop"

function Assert-True($Condition, $Message) {
  if (-not $Condition) {
    throw $Message
  }
  Write-Host "[OK] $Message"
}

$pages = Invoke-WebRequest -Uri $PagesUrl -UseBasicParsing
Assert-True ($pages.StatusCode -eq 200) "GitHub Pages responds"
Assert-True ($pages.Content -match "Task Tele") "GitHub Pages contains app shell"

$worker = Invoke-RestMethod -Uri "$WorkerUrl/"
Assert-True ($worker.ok -eq $true) "Cloudflare Worker health endpoint responds"

if ($CronSecret) {
  $cron = Invoke-RestMethod -Uri "$WorkerUrl/cron" -Headers @{ Authorization = "Bearer $CronSecret" }
  Assert-True ($cron.ok -eq $true) "Cloudflare Worker cron endpoint responds"
} else {
  Write-Host "[SKIP] CRON_SECRET is not set; skipped authorized cron check."
}

if ($TelegramBotToken) {
  $webhook = Invoke-RestMethod -Uri "https://api.telegram.org/bot$TelegramBotToken/getWebhookInfo"
  Assert-True ($webhook.ok -eq $true) "Telegram webhook info is readable"
  Assert-True ($webhook.result.url -eq "$WorkerUrl/webhook") "Telegram webhook points to Worker"
  Assert-True (-not $webhook.result.last_error_message) "Telegram webhook has no last error"
} else {
  Write-Host "[SKIP] TELEGRAM_BOT_TOKEN is not set; skipped Telegram webhook check."
}

Write-Host "Production check completed."
