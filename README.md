Here’s a cleaned-up **short, professional README** with the dead app/service link removed and the useful setup/security information retained.

````markdown
# TU Notice Sentinel

![Android](https://img.shields.io/badge/Android-Kotlin%20%2B%20Compose-3DDC84?logo=android&logoColor=white)
![Backend](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-339933?logo=nodedotjs&logoColor=white)
![Version](https://img.shields.io/badge/Android-v4.0.0-2563EB)
![API](https://img.shields.io/badge/API-v3.3.3-7C3AED)
![License](https://img.shields.io/badge/Use-Private%20Project-orange)

**TU Notice Sentinel** is a private Android application for monitoring Tribhuvan University notices. It uses a Kotlin + Jetpack Compose Android client and a Node.js/Express backend.

> **Status:** Private project. The previous hosted API is no longer active.

## Features

- TU notice monitoring and archive
- Search and faculty/category filtering
- Read/unread notice tracking
- Bookmarks and offline notice cache
- Background notice checking with WorkManager
- Android notifications for new notices
- TU result portal WebView
- Local result history and GPA/CGPA assistance
- Bot status and control dashboard
- Email test and notification controls
- Local profile and preferences
- No Firebase dependency
- No paid push-notification service

## Architecture

```text
TU Website
    ↓
Node.js / Express Backend
    ↓
Android App
    ↓
Room + Local Preferences
````

## Project Structure

```text
tu-notice-sentinel/
├── .github/
│   └── workflows/
├── android/
│   ├── app/
│   ├── gradle/
│   ├── build.gradle.kts
│   └── settings.gradle.kts
├── data/
├── src/
├── tests/
├── Dockerfile
├── package.json
└── README.md
```

## Android API Configuration

Open **Settings** in the app and configure:

```text
HTTP API URL: https://your-api-url.com
API Secret:   YOUR_API_SECRET
```

The API secret must match the `API_SECRET` configured on the backend.

Authentication:

```text
API Secret
    ↓
POST /api/auth/token
    ↓
Temporary JWT
    ↓
Authorization: Bearer <JWT>
    ↓
Protected API endpoints
```

## API Endpoints

| Method | Endpoint              | Purpose               |
| ------ | --------------------- | --------------------- |
| `GET`  | `/health`             | Health check          |
| `POST` | `/api/auth/token`     | Create temporary JWT  |
| `GET`  | `/api/status`         | Server/bot status     |
| `GET`  | `/api/notices`        | Notice archive        |
| `GET`  | `/api/notices/latest` | Latest notice         |
| `POST` | `/api/check`          | Check for new notices |
| `GET`  | `/api/notifications`  | Notification history  |
| `POST` | `/api/bot/enabled`    | Enable/disable bot    |
| `POST` | `/api/tests/run`      | Run backend tests     |

## Environment Variables

Configure these on your backend/server:

```env
API_SECRET=your_random_secret
GMAIL_USER=your_gmail_address
GMAIL_APP_PASSWORD=your_google_app_password
EMAIL_TO=notification_recipient
```

Generate a strong secret:

```bash
openssl rand -hex 32
```

**Never commit `.env` or real credentials to GitHub.**

## Build Android APK

### GitHub Actions

1. Push the project to GitHub.
2. Open **Actions**.
3. Select **Build APK**.
4. Click **Run workflow**.
5. Download the generated APK artifact.

### Local Build

Windows:

```powershell
cd android
.\gradlew.bat test assembleDebug
```

Linux/macOS:

```bash
cd android
./gradlew test assembleDebug
```

APK:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## Backend

Install dependencies:

```bash
npm ci
```

Run tests:

```bash
npm test
```

Run locally:

```bash
npm start
```

Health check:

```bash
curl http://localhost:3000/health
```

## Security

* Keep API secrets outside Git.
* Never commit `.env` files.
* Never expose Gmail App Passwords.
* Use HTTPS in production.
* Rotate credentials if exposed.
* Keep GitHub repositories private when necessary.
* Never publish signing keys or passwords.

Recommended `.gitignore`:

```gitignore
.env
.env.*
!.env.example
node_modules/
.idea/
*.log
*.jks
*.keystore
android/local.properties
android/.gradle/
android/**/build/
```

## Current Versions

| Component   | Version |
| ----------- | ------: |
| Android     | `4.0.0` |
| Backend API | `3.3.3` |

## Disclaimer

TU Notice Sentinel is an independent student project and is **not an official Tribhuvan University application**.

Always verify important notices and results through official TU sources.

---

**Built for private and convenient TU notice monitoring.**

```
```
