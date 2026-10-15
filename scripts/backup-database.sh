#!/bin/sh
set -e

# =============================================================================
# AUTOMATED DATABASE BACKUP SCRIPT (TOKO+RAG BEVERAGE POS)
# =============================================================================

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="${PROJECT_ROOT}/backups"
mkdir -p "${BACKUP_DIR}"

CONTAINER_NAME="postgres-toko-rag"
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "❌ Container ${CONTAINER_NAME} tidak sedang berjalan!"
  exit 1
fi

DB_USER="${POSTGRES_USER:-adam_dev}"
DB_NAME="${POSTGRES_DB:-toko_online_adam}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
OUTPUT_FILE="${BACKUP_DIR}/toko_backup_${TIMESTAMP}.sql.gz"

echo "🔄 [BACKUP] Memulai pencadangan database ${DB_NAME} dari ${CONTAINER_NAME}..."
docker exec -i "${CONTAINER_NAME}" pg_dump -U "${DB_USER}" -d "${DB_NAME}" --clean --if-exists --no-owner --no-privileges | gzip > "${OUTPUT_FILE}"

# Hapus backup lebih dari 7 hari (rotasi berkas)
find "${BACKUP_DIR}" -name "toko_backup_*.sql.gz" -type f -mtime +7 -delete

echo "✅ [BACKUP SUKSES] Berkas tersimpan di: ${OUTPUT_FILE}"
ls -lh "${OUTPUT_FILE}"
