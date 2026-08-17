# GitHub Actions setup

GitHub only detects workflow files inside `.github/workflows/` at the repository root.

1. Put the included `android/` folder at the root of your GitHub repository.
2. Create `.github/workflows/`.
3. Copy `android-ci.yml` and `android-release.yml` from this folder into `.github/workflows/`.
4. Push to `main` or run **Android CI** manually to receive a debug APK artifact.

For a signed release, add these repository secrets and then run **Signed Android Release**:

- `ANDROID_KEYSTORE_BASE64` — base64 text of your `.jks` keystore
- `ANDROID_STORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

The backend bot workflow remains in the v3.3 backend repository. Do not move backend Gmail or GitHub credentials into this Android repository.
