@echo off
REM Generates the native Android/iOS runner folders using the installed Flutter SDK.
REM Your Dart code in lib/ and pubspec.yaml are left untouched.
REM Prerequisite: Flutter SDK installed and on PATH (https://docs.flutter.dev/get-started/install/windows)

where flutter >nul 2>nul
if errorlevel 1 (
  echo Flutter SDK not found on PATH. Install it first, then re-run this file.
  exit /b 1
)

cd /d %~dp0
if exist android (
  echo android/ already exists, skipping generation.
) else (
  echo Generating android runner...
  flutter create --platforms=android --project-name mp_online --org gov.mp.online _shell_tmp
  move _shell_tmp\android android >nul
  rmdir /s /q _shell_tmp
)

if exist ios (
  echo ios/ already exists, skipping generation.
) else (
  echo Generating ios runner...
  flutter create --platforms=ios --project-name mp_online --org gov.mp.online _shell_tmp
  move _shell_tmp\ios ios >nul
  rmdir /s /q _shell_tmp
)

echo Done. Now run: flutter pub get ^&^& flutter run
