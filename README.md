# TU Pulse — New Android System for TU Notice Sentinel

TU Pulse is a fresh Android client for the existing TU Notice Sentinel backend. The backend remains Node.js + Express on Render; the Android application is a completely redesigned client with a live-first dashboard, instant manual refresh, foreground polling, local cache, notice search, alerts, and result/profile tools.

## Architecture

```text
Tribhuvan University
        │
        ▼
TU Notice Sentinel Bot ──► Gmail
        │
        ▼
Render API
        │
        ▼
     TU Pulse
        │
        ├── Live dashboard
        ├── Notices
        ├── Alerts
        ├── Results
        ├── Profile
        └── Settings
```

### Important separation

There is **no GitHub Actions workflow for the backend bot**. Render runs the Node scheduler directly.

GitHub Actions is used only as an optional Android self-build machine. It does not run the TU notice bot.

## App identity

- App name: **TU Pulse**
- Application ID: `com.tupulse.app`
- Android version: `5.0.0`
- Min SDK: 26
- Target SDK: 35
- Backend: existing TU Notice Sentinel API

## Live refresh model

The app uses three layers:

1. **Pull-to-refresh / Refresh button:** immediately calls the backend.
2. **Foreground live loop:** refreshes while the app is open, by default every 15 seconds.
3. **Background WorkManager:** keeps periodic notification checks when Android allows background work.

The Android app cannot make the TU website itself update faster than the backend bot's configured scan interval. The live loop therefore means **live API state and notice synchronization**, not a fake local timer.

## Build yourself

### Local

```bash
cd android
./gradlew assembleDebug
```

Windows:

```powershell
cd android
.\gradlew.bat assembleDebug
```

APK:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

### GitHub Actions

The repository contains exactly one Android workflow:

```text
.github/workflows/android-self-build.yml
```

It:

- builds the debug APK
- runs unit tests
- uploads the APK as an artifact
- does **not** start or schedule the backend bot

Open GitHub → Actions → **TU Pulse Android Self Build** → **Run workflow**.

## Backend setup

Keep your existing Render service and environment variables. The app connects to:

```text
https://tu-notice-sentinel-api.onrender.com
```

Configure the same API secret in the app's Settings screen.

Never commit `.env` or production API secrets.

## Render

Render should continue running:

```text
npm start
```

The Node server starts the bot scheduler itself. The backend workflow file must remain absent:

```text
.github/workflows/bot.yml   # DO NOT CREATE
```

## Project layout

```text
tu-pulse/
├── .github/workflows/
│   └── android-self-build.yml
├── android/
│   └── app/
├── data/
├── src/
├── tests/
├── Dockerfile
├── package.json
└── README.md
```
