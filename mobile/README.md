# MPOnline — Flutter Mobile App

Citizen grievance redressal + Yojana Sathi schemes, powered by the same unified backend (`backend/`).

## Screens

| # | Screen | File |
|---|--------|------|
| 1 | Home (services grid, live counts, helpline 181) | `lib/screens/home_screen.dart` |
| 2 | File Complaint (4-step: dept → identity → details+voice+photo → review+receipt) | `lib/screens/file_complaint_screen.dart` |
| 3 | Find by Mobile (complaint dossiers by 10-digit number) | `lib/screens/tracking_screens.dart` |
| 4 | Track by Ticket (3-tier stepper, timeline, email log) | `lib/screens/tracking_screens.dart` |
| 5 | Hotspot Heatmap (interactive MP map + district cards, auto-refresh) | `lib/screens/hotspots_screen.dart` |
| 6 | Authority Login (RAM / Shyam / Jay one-tap cards) | `lib/screens/authority_login_screen.dart` |
| 7 | Officer Desk (L1 desk-scoped queue, L2/L3 all-dept, forward/approve/resolve) | `lib/screens/officer_desk_screen.dart` |
| 8 | Yojana Sathi (eligibility form + matched schemes + document pre-screen) | `lib/screens/yojana_screen.dart` |
| 9 | Settings (backend URL, language, connection + email status) | `lib/screens/settings_screen.dart` |

Shared: `lib/widgets/common.dart` (pills, timeline, ticket cards), `lib/api/api_client.dart` (all backend endpoints incl. photo upload), bilingual `lib/l10n/strings.dart` (EN/HI), persisted session + language (`lib/state/app_state.dart`).

## Run (one-time setup)

1. Install the Flutter SDK: https://docs.flutter.dev/get-started/install/windows — then `flutter doctor`.
2. Generate the native runners (this folder ships Dart-only on purpose):
   ```
   cd mobile
   tool\bootstrap.bat
   ```
3. Install packages and launch:
   ```
   flutter pub get
   flutter run
   ```

## Backend connection

- The backend must be running (`backend/`: `python -m uvicorn main:app --port 8000`).
- **Android emulator** → default URL `http://10.0.2.2:8000` works out of the box.
- **Physical device** → run backend with `uvicorn main:app --host 0.0.0.0 --port 8000`, find your PC LAN IP (`ipconfig`), and set `http://<LAN-IP>:8000` in the app's Settings screen. Or pass `--dart-define=API_BASE_URL=http://<LAN-IP>:8000` to `flutter run`.
- Same authority logins as the portal: L1 `kumardp2707@gmail.com` / `nodal123` (RAM), L2 `manilal2357@gmail.com` / `collector123` (Shyam), L3 `0585mt241001@pimrbhopal.ac.in` / `cmo123` (Jay).

## Required platform permissions (add after `bootstrap.bat`)

The generated runners need 3 small additions, otherwise camera/mic/HTTP break on real devices:

- **Android** (`android/app/src/main/AndroidManifest.xml`, inside `<manifest>`):
  ```xml
  <uses-permission android:name="android.permission.RECORD_AUDIO" />
  <uses-permission android:name="android.permission.CAMERA" />
  ```
  (Internet + cleartext HTTP are already allowed by the default template.)
- **iOS** (`ios/Runner/Info.plist`, inside `<dict>`):
  ```xml
  <key>NSCameraUsageDescription</key>
  <string>Capture issue photo proof</string>
  <key>NSPhotoLibraryUsageDescription</key>
  <string>Attach issue photo proof</string>
  <key>NSMicrophoneUsageDescription</key>
  <string>Record voice complaints</string>
  <key>NSAppTransportSecurity</key>
  <dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
  </dict>
  ```
  (Last block only needed while the backend URL is plain `http`.)
