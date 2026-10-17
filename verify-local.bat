@echo off
echo =======================================================
echo    MEMULAI VERIFIKASI LOKAL CI (Toko+RAG Beverage POS)
echo =======================================================
echo.
echo [1/3] Menjalankan Automated Unit Tests Backend (Profanity, Kiosk Logic, dan Soft Delete)...
cd be
call npx.cmd ts-node src/__tests__/profanity.test.ts
if %errorlevel% neq 0 (
    echo.
    echo ❌ [ERROR] Profanity unit test gagal!
    cd ..
    exit /b %errorlevel%
)

call npx.cmd ts-node src/__tests__/kiosk.logic.test.ts
if %errorlevel% neq 0 (
    echo.
    echo ❌ [ERROR] Kiosk logic test gagal!
    cd ..
    exit /b %errorlevel%
)

call npx.cmd ts-node src/__tests__/softDelete.test.ts
if %errorlevel% neq 0 (
    echo.
    echo ❌ [ERROR] Soft Delete unit test gagal!
    cd ..
    exit /b %errorlevel%
)

echo.
echo [2/3] Menguji Kompilasi TypeScript Backend...
call npm.cmd run build
if %errorlevel% neq 0 (
    echo.
    echo ❌ [ERROR] Kompilasi TypeScript backend gagal!
    cd ..
    exit /b %errorlevel%
)
cd ..

echo.
echo [3/3] Menguji Typecheck TypeScript Frontend...
cd fe
call npx.cmd tsc --noEmit
if %errorlevel% neq 0 (
    echo.
    echo ❌ [ERROR] Typecheck TypeScript frontend gagal!
    cd ..
    exit /b %errorlevel%
)
cd ..

echo.
echo =======================================================
echo ✅ [SUKSES BESAR] Seluruh pemeriksaan lokal berhasil 100%!
echo    Sistem Beverage Kiosk Toko+RAG siap produksi!
echo =======================================================
