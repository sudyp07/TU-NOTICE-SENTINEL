# TU Pulse System Blueprint

## New mindset

TU Pulse is not a thin wrapper around the old dashboard. It is a **live university signal client**.

### Product rules

- Live first: foreground sync every 15 seconds while configured.
- One-tap refresh: manual refresh always calls the API immediately.
- Local-first: cached notices remain readable offline.
- Quiet UI: status, latest notices, and action are the first things users see.
- No GitHub dependency for runtime.
- No Firebase dependency.
- Backend remains responsible for TU scraping and Gmail.
- Android remains responsible for local experience and notifications.

## Runtime responsibilities

### Render / Node

- scrape TU
- normalize notices
- persist server state
- send Gmail
- expose authenticated API
- schedule backend checks

### Android

- display live status
- pull current notices
- cache locally
- notify on newly discovered notices
- search/filter/read/bookmark locally
- manage results/profile

### GitHub Actions

- Android build only
- unit tests only
- APK artifact only

Never use GitHub Actions as the TU notice scheduler.
