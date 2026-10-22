$ErrorActionPreference = "Stop"
$env:ANDROID_HOME = "C:\Android\Sdk"
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.17.10-hotspot"
$env:Path = "C:\Android\Sdk\platform-tools;C:\Android\Sdk\emulator;$env:Path"
$env:EXPO_PUBLIC_API_URL = "https://api.tuannguyenkiet0612.dpdns.org/api"
$env:NODE_ENV = "production"

Write-Host "Bắt đầu build Release APK với API URL: $env:EXPO_PUBLIC_API_URL"
Set-Location "d:\DATN\Code\road-damage-gis\android"
Remove-Item -Recurse -Force "app\build\generated\assets\createBundleReleaseJsAndAssets" -ErrorAction SilentlyContinue
.\gradlew.bat assembleRelease
if ($LASTEXITCODE -ne 0) {
    throw "Gradle build failed with exit code $LASTEXITCODE"
}
Copy-Item "d:\DATN\Code\road-damage-gis\android\app\build\outputs\apk\release\app-release.apk" -Destination "d:\DATN\Code\road-damage-gis\road-damage-gis.apk" -Force
Write-Host "Build thành công và đã xuất ra file road-damage-gis.apk!"
