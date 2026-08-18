# TU Notice Sentinel 3.4.0 — Render, no GitHub Actions bot

This version removes the bot's dependency on GitHub Actions. Render runs the Express API and the notice bot in the same Node process.

## Render

Use the repository as before.

- Build Command: `npm ci`
- Start Command: `npm start`
- Runtime: Node 20+ (Dockerfile is also included)

Environment variables:

```env
API_SECRET=your_long_random_secret
GMAIL_USER=your_gmail_address
GMAIL_APP_PASSWORD=your_google_app_password
EMAIL_TO=recipient@example.com
SOURCE_URL=https://exam.tu.edu.np/notices
MAX_PAGES=20
FIRST_RUN_LIMIT=10
STATE_CAP=1000
BOT_INTERVAL_MS=300000
BOT_SCHEDULER=true
BOT_ENABLED=true
STATE_FILE=/var/data/state.json
```

### Persistent state

Attach a Render persistent disk and mount it at `/var/data` if you want notice history and notification history to survive instance replacement/redeploys. Without persistent storage, the bot can still run, but its local state can be lost when the instance is replaced.

## GitHub

There is deliberately **no `.github/workflows/bot.yml`** in this release.

If the old `bot.yml` still exists in your existing repository, delete it manually after extracting this ZIP. Keep the Android workflows if you still use them.

## Realtime refresh

The API no longer reads GitHub state or waits on a 30-second adapter cache. Every protected read reads the current local state file, and responses are marked `no-store` for browser/proxy caching. `POST /api/check` runs the existing bot immediately instead of queueing GitHub Actions.

The bot also checks automatically at startup and every `BOT_INTERVAL_MS` (default 5 minutes), while preventing overlapping runs.
