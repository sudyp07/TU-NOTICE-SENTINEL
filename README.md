````markdown
# TU Notice Sentinel

**TU Notice Sentinel** is a private Android application for monitoring Tribhuvan University notices.

> **Status:** Private project. The previous hosted API is no longer active.

## Features

- 📢 TU notice monitoring
- 🔎 Notice search and filtering
- 🔔 Background notice notifications
- ⭐ Bookmark notices for offline access
- 📱 Kotlin + Jetpack Compose Android app
- 🖥️ Node.js + Express backend
- 📊 Bot and server status
- 🧪 Backend testing tools
- 🎓 TU result portal
- 💾 Local profile, results, and preferences
- 🚫 No Firebase dependency

## Tech Stack

- **Android:** Kotlin + Jetpack Compose
- **Backend:** Node.js + Express
- **Database:** Room
- **Background Tasks:** WorkManager
- **CI/CD:** GitHub Actions

## Project Structure

```text
tu-notice-sentinel/
├── android/
├── src/
├── tests/
├── data/
├── .github/workflows/
├── Dockerfile
├── package.json
└── README.md
````

## Build APK

### Windows

```powershell
cd android
.\gradlew.bat test assembleDebug
```

### Linux/macOS

```bash
cd android
./gradlew test assembleDebug
```

APK:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## Backend

```bash
npm ci
npm test
npm start
```

Health check:

```bash
curl http://localhost:3000/health
```

## Environment Variables

```env
API_SECRET=your_secret
GMAIL_USER=your_email
GMAIL_APP_PASSWORD=your_app_password
EMAIL_TO=recipient
```

Generate a secret:

```bash
openssl rand -hex 32
```

**Never commit `.env`, API secrets, passwords, tokens, or signing keys to GitHub.**

## Version

* Android: `4.0.0`
* Backend API: `3.3.3`

## Disclaimer

TU Notice Sentinel is an independent student project and is **not an official Tribhuvan University application**.

---

**Built for private TU notice monitoring.**

```
```
