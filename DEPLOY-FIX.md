# TU Notice Sentinel backend fix 3.3.3

Deploy this project to the existing Render service using the same environment variables.

This release fixes misleading HTTP 404 responses caused by upstream GitHub 404s:

- `POST /api/tests/run` now returns diagnostics even when `data/state.json` cannot be read.
- `POST /api/bot/enabled` falls back to GitHub workflow enable/disable when repository Variables access is unavailable.
- `GET /api/status` remains online when the workflow API is reachable and reports state storage as degraded separately.
- GitHub environment values are trimmed before constructing requests.
- `data/state.json` is tracked and force-added by the workflow; it is the data source for dashboard counters, notices, logs, notifications and component health.

For complete notices, logs and counters, the Render `GITHUB_TOKEN` still needs Contents read/write access and `data/state.json` must exist on `GITHUB_REF`.
## Docker build fix

The `data` directory must be included in the Docker build context because the Dockerfile copies it into the image. Do not add `data` to `.dockerignore`. The repository contains `data/.gitkeep` and the initial `data/state.json`.

For Render persistent storage, set `STATE_FILE=/var/data/state.json` and mount the persistent disk at `/var/data`. The image's `/app/data/state.json` is only the fallback/initial state.

