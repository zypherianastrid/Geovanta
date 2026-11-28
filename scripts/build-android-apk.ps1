$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not $env:JAVA_HOME -or -not (Test-Path (Join-Path $env:JAVA_HOME 'bin\java.exe'))) {
  $jdkCandidate = Get-ChildItem 'C:\Users\Administrator\AppData\Local\Android\jdk' -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($jdkCandidate) {
    $env:JAVA_HOME = $jdkCandidate.FullName
  }
}

if (-not $env:ANDROID_HOME -or -not (Test-Path $env:ANDROID_HOME)) {
  $sdkCandidate = 'C:\Users\Administrator\AppData\Local\Android\Sdk'
  if (Test-Path $sdkCandidate) {
    $env:ANDROID_HOME = $sdkCandidate
  }
}

if (-not $env:JAVA_HOME -or -not (Test-Path (Join-Path $env:JAVA_HOME 'bin\java.exe'))) {
  throw 'JAVA_HOME tidak ditemukan. Pastikan JDK 21 terpasang di AppData\Local\Android\jdk.'
}
if (-not $env:ANDROID_HOME -or -not (Test-Path $env:ANDROID_HOME)) {
  throw 'ANDROID_HOME tidak ditemukan. Pastikan Android SDK terpasang di AppData\Local\Android\Sdk.'
}

$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:PATH = (Join-Path $env:JAVA_HOME 'bin') + ';' + (Join-Path $env:ANDROID_HOME 'platform-tools') + ';' + (Join-Path $env:ANDROID_HOME 'cmdline-tools\latest\bin') + ';' + $env:PATH

Write-Host "[Geovanta Android] JAVA_HOME = $env:JAVA_HOME"
Write-Host "[Geovanta Android] ANDROID_HOME = $env:ANDROID_HOME"

Write-Host '[Geovanta Android] Building offline web assets...'
& node scripts/build-offline-bundle.js
if ($LASTEXITCODE -ne 0) { throw 'build-offline-bundle.js failed' }

Write-Host '[Geovanta Android] Syncing Capacitor Android project...'
& npx cap sync android
if ($LASTEXITCODE -ne 0) { throw 'npx cap sync android failed' }

$localPropsPath = Join-Path $root 'android\local.properties'
$escapedSdk = $env:ANDROID_HOME.Replace('\', '\\').Replace(':', '\:')
Set-Content -Path $localPropsPath -Value "sdk.dir=$escapedSdk" -Encoding ASCII

Write-Host '[Geovanta Android] Building APK with Gradle...'
Push-Location (Join-Path $root 'android')
try {
  & .\gradlew.bat assembleDebug --no-daemon
  if ($LASTEXITCODE -ne 0) { throw 'Gradle assembleDebug failed' }
} finally {
  Pop-Location
}

$srcApk = Join-Path $root 'android\app\build\outputs\apk\debug\app-debug.apk'
if (-not (Test-Path $srcApk)) {
  throw "APK output tidak ditemukan di $srcApk"
}

$outDir = Join-Path $root 'dist\android'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$outApk = Join-Path $outDir 'Geovanta-v1.4.0-android.apk'
Copy-Item -Path $srcApk -Destination $outApk -Force

$sizeMb = [Math]::Round((Get-Item $outApk).Length / 1MB, 2)
Write-Host "[Geovanta Android] APK siap: $outApk ($sizeMb MB)"
