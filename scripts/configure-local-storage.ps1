$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $repoRoot ".env"
$examplePath = Join-Path $repoRoot ".env.example"

if (-not (Test-Path $envPath)) {
    if (-not (Test-Path $examplePath)) {
        throw "Neither .env nor .env.example exists in $repoRoot"
    }
    Copy-Item $examplePath $envPath
    Write-Host "Created .env from .env.example"
}

$text = Get-Content $envPath -Raw
$settings = [ordered]@{
    STORAGE_PROVIDER = "s3"
    S3_ENDPOINT = "http://localhost:9000"
    S3_REGION = "us-east-1"
    S3_BUCKET = "hotel-platform-media"
    S3_ACCESS_KEY_ID = "handmekey"
    S3_SECRET_ACCESS_KEY = "handmekey-local-storage"
    S3_PATH_STYLE = "true"
    STORAGE_PUBLIC_BASE_URL = "http://localhost:9000/hotel-platform-media/"
}

foreach ($key in $settings.Keys) {
    $line = "$key=$($settings[$key])"
    $pattern = "(?m)^" + [regex]::Escape($key) + "=.*$"
    if ([regex]::IsMatch($text, $pattern)) {
        $text = [regex]::Replace($text, $pattern, [System.Text.RegularExpressions.MatchEvaluator]{ param($match) $line })
    } else {
        if ($text.Length -gt 0 -and -not $text.EndsWith("`n")) { $text += "`r`n" }
        $text += "$line`r`n"
    }
}

$utf8WithoutBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($envPath, $text, $utf8WithoutBom)

Write-Host "Local HandMeKey media storage is configured in .env"
Write-Host "Next: docker compose up -d postgres minio minio-init"
Write-Host "MinIO API: http://localhost:9000"
Write-Host "MinIO console: http://localhost:9001"
