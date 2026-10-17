@echo off
echo =======================================================
echo    CADANGKAN DATABASE POSTGRESQL (TOKO+RAG BEVERAGE)
echo =======================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\backup-database.ps1"
if %errorlevel% neq 0 (
    echo.
    echo ❌ Gagal melakukan pencadangan database!
    pause
    exit /b %errorlevel%
)
echo.
pause
