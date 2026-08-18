# TU Sentinel Pro 4.0

Native Android student companion for the TU Notice Sentinel v3.3.0 backend. Built with Kotlin, Jetpack Compose, Material 3, Room, WorkManager, Retrofit, Android Keystore, and a hardened official-results WebView.

## Open and build

1. Open this `android/` folder in Android Studio.
2. Use JDK 17 and allow Gradle to sync.
3. Run the `app` configuration on Android 8.0 (API 26) or newer.
4. In the app, open **Profile → Settings** and enter:
   - the HTTPS base URL of the deployed v3.3.0 backend, without `/api` at the end;
   - the same `API_SECRET` configured on that backend (minimum 24 characters).
5. Save settings. The app exchanges the secret for a short-lived bearer token automatically.

Command-line debug build:

```bash
chmod +x gradlew
./gradlew testDebugUnitTest lintDebug assembleDebug
```

APK output: `app/build/outputs/apk/debug/app-debug.apk`

## Included features

- Live bot health, workflow state, Gmail state, scraper state, metrics, and failure details
- Correct v3.3 actions: check now, test email, enable/disable, self-test, workflow trigger, workflow status, logs, and notification history
- Search, category filters, unread filter, bookmarks, read state, and offline notice cache
- Background synchronization and high-priority device alerts for newly discovered notices
- Official TU, Exam Office, Exam Notices, and Results quick links
- Official results portal with optional private symbol/DOB autofill and a local result archive
- Profile, faculty personalization, download history, dark/light theme, PIN lock, and screenshot blocking
- AES-GCM Android Keystore protection for the API URL, API secret, profile, symbol number, and date of birth
- HTTPS-only API configuration, HTTPS-only notice links, no cleartext traffic, and a results WebView restricted to the official host

## Backend contract

The client integrates with these authenticated v3.3.0 routes:

`/api/auth/token`, `/api/status`, `/api/notices`, `/api/notices/latest`, `/api/logs`, `/api/notifications`, `/api/check`, `/api/test-email`, `/api/bot/enable`, `/api/bot/disable`, `/api/bot/test`, `/api/github/workflow`, and `/api/github/status`.

Gmail App Passwords and GitHub tokens stay on the backend. The Android app does not request, store, or send either credential.

## Identity note

TU Sentinel Pro is an independent, unofficial student companion and is not affiliated with or endorsed by Tribhuvan University. The university emblem is loaded at runtime from the official TU portal and has a generic offline fallback. Review TU's current brand and distribution requirements before publishing the app publicly.
