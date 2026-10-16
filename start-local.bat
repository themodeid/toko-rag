@echo off
title Toko+RAG Hybrid Dev Launcher
echo ========================================================
echo   [TOKO+RAG] Menjalankan Mode Hybrid (Host Dev + Docker DB)
echo ========================================================
echo.
echo [1/3] Memastikan Database dan Redis di Docker aktif...
docker start postgres-toko-rag redis-toko-rag >nul 2>&1
echo       PostgreSQL : Running di Port 5453
echo       Redis      : Running di Port 6381
echo.
echo [2/3] Membuka jendela terminal Backend (Express Port 5000)...
start "Toko-RAG-Backend (Port 5000)" cmd /k "cd /d %~dp0be && echo [BACKEND API AKTIF] http://localhost:5000 && npm.cmd run dev"
echo.
echo [3/3] Membuka jendela terminal Frontend (Next.js Port 4000)...
start "Toko-RAG-Frontend (Port 4000)" cmd /k "cd /d %~dp0fe && echo [FRONTEND KIOSK AKTIF] http://localhost:4000 && npm.cmd run dev"
echo.
echo ========================================================
echo   SEMUA SERVER LOKAL BERHASIL DILUNCURKAN!
echo ========================================================
echo   Customer Kiosk   : http://localhost:4000
echo   KDS Barista      : http://localhost:4000/kasir
echo   Admin Owner Hub  : http://localhost:4000/admin
echo   Backend REST API : http://localhost:5000
echo ========================================================
echo   Tips: Biarkan dua jendela terminal Backend dan Frontend
echo         tetap terbuka di taskbar agar server tetap aktif.
echo ========================================================
timeout /t 3 >nul
