#!/bin/bash
set -e

echo "======================================================="
echo "   MEMULAI VERIFIKASI LOKAL CI (Toko+RAG Beverage POS)  "
echo "======================================================="
echo ""

echo "[1/3] Menjalankan Automated Unit Tests Backend..."
(cd be && npx ts-node src/__tests__/profanity.test.ts)
(cd be && npx ts-node src/__tests__/kiosk.logic.test.ts)

echo ""
echo "[2/3] Menguji Kompilasi TypeScript Backend..."
(cd be && npm run build)

echo ""
echo "[3/3] Menguji Typecheck TypeScript Frontend..."
(cd fe && npx tsc --noEmit)

echo ""
echo "======================================================="
echo "✅ [SUKSES BESAR] Seluruh pemeriksaan lokal berhasil 100%!"
echo "   Sistem Beverage Kiosk Toko+RAG siap produksi!"
echo "======================================================="
