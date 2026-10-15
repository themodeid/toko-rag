# =============================================================================
# AUTOMATED DATABASE BACKUP SCRIPT FOR WINDOWS (TOKO+RAG)
# =============================================================================

$ProjectRoot = Resolve-Path "$PSScriptRoot\.."
$BackupDir = Join-Path $ProjectRoot "backups"

if (!(Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

$ContainerName = "postgres-toko-rag"
$Running = docker ps --format '{{.Names}}' | Select-String "^$ContainerName$"

if (!$Running) {
    Write-Host "❌ Container $ContainerName tidak sedang berjalan!" -ForegroundColor Red
    exit 1
}

$DbUser = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "adam_dev" }
$DbName = if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { "toko_online_adam" }
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$OutputFile = Join-Path $BackupDir "toko_backup_$Timestamp.sql"

Write-Host "🔄 [BACKUP] Mencadangkan database $DbName dari $ContainerName..." -ForegroundColor Cyan
docker exec $ContainerName pg_dump -U $DbUser -d $DbName --clean --if-exists --no-owner --no-privileges | Out-File -FilePath $OutputFile -Encoding utf8

if (Test-Path $OutputFile) {
    $Size = (Get-Item $OutputFile).Length / 1KB
    Write-Host "✅ [BACKUP SUKSES] Berkas tersimpan di: $OutputFile ($([math]::Round($Size, 2)) KB)" -ForegroundColor Green
} else {
    Write-Host "❌ [GAGAL] Berkas backup tidak tercipta." -ForegroundColor Red
    exit 1
}
