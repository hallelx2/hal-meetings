# Push Hal agent secrets to SSM /hal/agent/*. Never prints values.
param(
  [string]$Region = "eu-central-1",
  [string]$EnvFile = ""
)

$ErrorActionPreference = "Stop"
$keys = @(
  "DATABASE_URL",
  "HAL_LOCAL_KMS_KEY",
  "GEMINI_API_KEY",
  "DEEPGRAM_API_KEY",
  "RESEND_API_KEY",
  "HAL_FROM_EMAIL"
)

if (-not $EnvFile) {
  $candidates = @(
    (Join-Path $PSScriptRoot "..\apps\web\.env"),
    (Join-Path $PSScriptRoot "..\apps\agent\.env")
  )
  $EnvFile = $candidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
}
if (-not $EnvFile) { throw "No .env found. Pass -EnvFile." }

$map = @{}
Get-Content -LiteralPath $EnvFile | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -notmatch '=') { return }
  $k, $v = $_.Trim() -split '=', 2
  $map[$k] = $v.Trim().Trim('"').Trim("'")
}

if (-not $map["HAL_FROM_EMAIL"]) { $map["HAL_FROM_EMAIL"] = "founder@hallelx2.com" }

# The source of these values is usually apps/web/.env, which legitimately holds
# the Neon *pooler* URL because the web app runs on serverless. The agent is a
# long-lived worker with its own pool and must use the direct endpoint —
# docs/deploy-oracle.md calls double-pooling out as a known failure mode. Strip
# the -pooler segment rather than trusting whoever wrote the .env to remember.
if ($map["DATABASE_URL"] -match '-pooler\.') {
  $map["DATABASE_URL"] = $map["DATABASE_URL"] -replace '-pooler(\.[^@]*)$', '$1'
  "normalised DATABASE_URL to the direct Neon host (agent must not use the pooler)"
}

foreach ($key in $keys) {
  if (-not $map[$key]) { throw "Missing $key in $EnvFile" }
  aws ssm put-parameter --region $Region --name "/hal/agent/$key" --type SecureString --value $map[$key] --overwrite | Out-Null
  "put /hal/agent/$key"
}
"done"
