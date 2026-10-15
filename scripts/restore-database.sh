#!/bin/sh
set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="${PROJECT_ROOT}/backups"

BACKUP_FILE="$1"
if [ -z "${BACKUP_FILE}" ]; then
  BACKUP_FILE=$(ls -t "${BACKUP_DIR}"/toko_backup_*.sql.gz 2>/dev/null | head -n 1)
fi

if [ -z "${BACKUP_FILE}" ] || [ ! -f "${BACKUP_FILE}" ]; then
  echo "❌ Tidak ada berkas backup yang ditemukan!"
  exit 1
fi

CONTAINER_NAME="postgres-toko-rag"
DB_USER="${POSTGRES_USER:-adam_dev}"
DB_NAME="${POSTGRES_DB:-toko_online_adam}"

echo "🔄 [RESTORE] Memulihkan database ${DB_NAME} dari ${BACKUP_FILE}..."
gzip -dc "${BACKUP_FILE}" | docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}"

echo "✅ [RESTORE SUKSES] Database ${DB_NAME} berhasil dipulihkan."
