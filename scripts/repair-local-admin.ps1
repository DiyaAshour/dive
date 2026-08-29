param(
    [Parameter(Mandatory = $true)]
    [string]$Email,

    [Parameter(Mandatory = $true)]
    [string]$Password,

    [string]$Name = "HandMeKey Admin"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $Root

Write-Host "[admin-repair] Project: $Root"

if (-not (Test-Path ".\.env")) {
    if (-not (Test-Path ".\.env.example")) {
        throw ".env.example was not found."
    }
    Copy-Item ".\.env.example" ".\.env"
    Write-Host "[admin-repair] Created .env from .env.example"
}

Write-Host "[admin-repair] Starting PostgreSQL..."
docker compose up -d postgres

$PrismaJs = @(
    ".\node_modules\prisma\build\index.js",
    ".\packages\database\node_modules\prisma\build\index.js"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $PrismaJs) {
    throw "Prisma CLI was not found. Run npm install once from the project root."
}
$PrismaJs = (Resolve-Path $PrismaJs).Path

Write-Host "[admin-repair] Generating Prisma client..."
node $PrismaJs generate --config ".\packages\database\prisma.config.ts"
if ($LASTEXITCODE -ne 0) { throw "Prisma generate failed." }

Write-Host "[admin-repair] Applying migrations..."
node $PrismaJs migrate deploy --config ".\packages\database\prisma.config.ts"
if ($LASTEXITCODE -ne 0) { throw "Prisma migrate deploy failed." }

if (Test-Path ".\packages\database\scripts\setup-search-extension.mjs") {
    Write-Host "[admin-repair] Verifying PostgreSQL search extension..."
    node ".\packages\database\scripts\setup-search-extension.mjs"
    if ($LASTEXITCODE -ne 0) { throw "Search extension setup failed." }
}

$TsxCli = @(
    ".\node_modules\tsx\dist\cli.mjs",
    ".\packages\server\node_modules\tsx\dist\cli.mjs"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $TsxCli) {
    throw "tsx CLI was not found. Run npm install once from the project root."
}
$TsxCli = (Resolve-Path $TsxCli).Path

Write-Host "[admin-repair] Creating/resetting local administrator..."
node $TsxCli ".\packages\server\scripts\provision-local-admin.ts" --email $Email --password $Password --name $Name
if ($LASTEXITCODE -ne 0) { throw "Local administrator provisioning failed." }

Write-Host ""
Write-Host "[admin-repair] READY"
Write-Host "Admin URL: http://localhost:3000/admin/login"
Write-Host "Email: $Email"
Write-Host "Start the web app with your normal local startup command."
