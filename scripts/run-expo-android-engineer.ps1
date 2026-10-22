$env:ANDROID_HOME = 'C:\Android\sdk'
$env:Path = 'C:\Android\sdk\platform-tools;C:\Android\Sdk\emulator;' + $env:Path
$env:EXPO_PUBLIC_APP_TARGET = 'engineer'
npx expo start --android
