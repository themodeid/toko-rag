@echo off
echo =======================================================
echo    PULIHKAN DATABASE POSTGRESQL (TOKO+RAG BEVERAGE)
echo =======================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\restore-database.ps1" %*
if %errorlevel% neq 0 (
    echo.
    echo ❌ Gagal memulihkan database!
    pause
    exit /b %errorlevel%
)
echo.
pause
