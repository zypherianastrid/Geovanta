@echo off
REM ============================================================================
REM Geovanta — compile.bat
REM Build versi web lalu buka web\index.html di browser bawaan.
REM   1. npm ci            (pasang dependensi bersih)
REM   2. npm run web       (alias build:web — rakit bundle offline ke web\)
REM   3. buka web\index.html
REM Jalankan dengan double-click dari folder proyek ini. Butuh Node.js + npm.
REM ============================================================================
setlocal
cd /d "%~dp0"

echo [Geovanta] npm ci ...
call npm ci
if errorlevel 1 (
  echo [Geovanta] GAGAL: npm ci tidak berhasil. Periksa Node.js / npm dan koneksi internet.
  pause
  exit /b 1
)

echo [Geovanta] npm run web ...
call npm run web
if errorlevel 1 (
  echo [Geovanta] GAGAL: build tidak berhasil. Lihat pesan error di atas.
  pause
  exit /b 1
)

echo [Geovanta] Membuka web\index.html ...
start "" "%~dp0web\index.html"
endlocal
