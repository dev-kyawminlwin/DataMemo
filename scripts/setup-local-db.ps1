# Requires: Docker Desktop (Windows) with Compose v2, and apps/api/.env with DATABASE_URL.
# Run from repo root:  powershell -ExecutionPolicy Bypass -File scripts/setup-local-db.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Error "Docker is not installed or not on PATH. Install Docker Desktop and retry."
}

docker compose up -d

$apiEnv = Join-Path $root "apps\api\.env"
if (-not (Test-Path $apiEnv)) {
  Copy-Item (Join-Path $root "apps\api\.env.example") $apiEnv
  Write-Host "Created apps/api/.env from .env.example — review secrets before production."
}

Set-Location (Join-Path $root "apps\api")
npx prisma migrate deploy
npx prisma db seed
Write-Host "Done. Default login (if using .env.example seed defaults): admin@datamemo.local / changeme"
