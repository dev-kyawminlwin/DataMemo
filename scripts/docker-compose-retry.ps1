# Retry docker compose pull/up when registry returns transient EOF / network errors.
# Usage (from repo root): powershell -ExecutionPolicy Bypass -File scripts/docker-compose-retry.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$max = 5
for ($i = 1; $i -le $max; $i++) {
  Write-Host "Attempt $i of $max: docker compose pull ..."
  docker compose pull
  if ($LASTEXITCODE -eq 0) {
    Write-Host "Pull OK. Starting stack..."
    docker compose up -d
    exit $LASTEXITCODE
  }
  $delay = [Math]::Min(60, 5 * $i)
  Write-Host "Pull failed (exit $LASTEXITCODE). Waiting ${delay}s before retry..."
  Start-Sleep -Seconds $delay
}

Write-Error "docker compose pull failed after $max attempts. See scripts/docker-network-notes.txt"
exit 1
