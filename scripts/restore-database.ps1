# =============================================================================
# AUTOMATED DATABASE RESTORE SCRIPT (TOKO+RAG)
# =============================================================================

param (
    [Parameter(Mandatory=$false)]
    [string]$BackupFile
)

$ProjectRoot = Resolve-Path "$PSScriptRoot\.."
$BackupDir = Join-Path $ProjectRoot "backups"

if (-not $BackupFile) {
    $Latest = Get-ChildItem -Path $BackupDir -Filter "toko_backup_*.sql" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $Latest) {
        Write-Host "❌ Tidak ada berkas backup di folder $BackupDir!" -ForegroundColor Red
        exit 1
    }
    $BackupFile = $Latest.FullName
}

$ContainerName = "postgres-toko-rag"
$DbUser = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "adam_dev" }
$DbName = if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { "toko_online_adam" }

Write-Host "🔄 [RESTORE] Memulihkan database $DbName dari $BackupFile..." -ForegroundColor Cyan
Get-Content $BackupFile | docker exec -i $ContainerName psql -U $DbUser -d $DbName

Write-Host "✅ [RESTORE SUKSES] Database $DbName berhasil dipulihkan." -ForegroundColor Green
