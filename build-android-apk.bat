@echo off
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\build-android-apk.ps1"
if errorlevel 1 (
  echo.
  echo [Geovanta Android] Build APK gagal.
  exit /b 1
)
echo.
echo [Geovanta Android] Selesai! APK tersedia di dist\android\Geovanta-v1.2.0-android.apk
endlocal
