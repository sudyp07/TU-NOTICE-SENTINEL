# TU Notice Sentinel v3.3.0

TU Notice Sentinel monitors Tribhuvan University Exam notices, prevents duplicate alerts, sends Gmail notifications, runs automatically through GitHub Actions, and exposes a private HTTPS API for the TU Notice Sentinel Android control-panel app.

## What this integrated version provides

- TU notice scraping with pagination and duplicate removal
- Nepali digit and Bikram Sambat date handling
- First-run email containing the latest 10 notices
- Email only when a genuinely new notice is detected
- Persistent state in `data/state.json`
- Scheduled GitHub Actions run every 30 minutes
- Manual `workflow_dispatch` support
- Successful and failed run status, logs, notices, and email history
- Authenticated Android API with short-lived bearer sessions
- Android **Run Bot**, workflow status, test-email, enable/disable, logs, and notices support
- GitHub-backed state so the Android app does not require your PC to remain on
- No committed passwords, API secrets, or GitHub tokens

## Architecture

```text
TU website → GitHub Actions bot → data/state.json → HTTPS Node API → Android app
                         └──────→ Gmail/Nodemailer
Android Run Bot ─────────────────→ GitHub workflow dispatch
```

The bot and API have different commands:

- `npm run bot` runs one real notice check. GitHub Actions uses this command.
- `npm start` starts the Android control API. Your hosting service uses this command.
- `npm run dry-run` checks scraping without sending email or changing state.
- `npm test` runs the automated test suite.

## 1. Put the project in GitHub

Extract the ZIP and place all its contents at the root of your TU Notice Sentinel repository. Confirm that these files exist on the `main` branch:

```text
.github/workflows/bot.yml
data/state.json
src/
package.json
package-lock.json
```

Do not upload `.env` or `node_modules`.

## 2. Configure Gmail for GitHub Actions

In GitHub, open:

**Repository → Settings → Secrets and variables → Actions → Secrets**

Create these repository secrets:

| Secret | Value |
| --- | --- |
| `GMAIL_USER` | Gmail address used by the bot |
| `GMAIL_APP_PASSWORD` | Google 16-character App Password |
| `EMAIL_TO` | Address that receives TU notice emails |

Use a Google App Password, not the normal Gmail password. Do not put these values in `.env.example`, the Android app, or a commit.

Under **Actions → Variables**, optionally create:

| Variable | Value |
| --- | --- |
| `BOT_ENABLED` | `true` |
| `SOURCE_URL` | `https://exam.tu.edu.np/notices` |

If `SOURCE_URL` is absent or blank, the bot uses the same TU URL by default. Setting `BOT_ENABLED` to `false` skips scheduled runs; manually dispatched runs are still allowed.

## 3. Test the GitHub bot

1. Open **GitHub → Actions → TU Notice Sentinel**.
2. Select **Run workflow** on the `main` branch.
3. Wait for the run to complete successfully.
4. Confirm that `data/state.json` was updated by the workflow.
5. On the first successful run, confirm receipt of an email containing up to 10 latest notices.

The workflow needs permission to commit `data/state.json`. If the repository protects `main`, allow GitHub Actions to push this state update or use a branch policy that permits the bot commit.

## 4. Create the backend GitHub token

Create a fine-grained personal access token limited to this repository. It needs:

- **Actions: Read and write** — queue the workflow and read its status
- **Contents: Read and write** — read/update `data/state.json`
- **Variables: Read and write** — enable or disable scheduled bot runs

Keep this token only in your HTTPS hosting service's secret environment settings. Never commit it.

## 5. Deploy the HTTPS Node API

Deploy this repository as a Node.js web service on an always-available host.

- Build command: `npm ci`
- Start command: `npm start`
- Health-check path: `/health`
- Required Node version: 20 or newer

Set these secret environment variables on the hosting service:

```dotenv
API_SECRET=generate-a-random-secret-with-at-least-24-characters
GITHUB_TOKEN=your-fine-grained-token
GITHUB_OWNER=your-github-username-or-organization
GITHUB_REPO=your-repository-name-without-dot-git
GITHUB_WORKFLOW=bot.yml
GITHUB_REF=main
GITHUB_STATE_PATH=data/state.json
GMAIL_USER=yourgmail@gmail.com
GMAIL_APP_PASSWORD=your-google-app-password
EMAIL_TO=recipient@example.com
TOKEN_TTL_SECONDS=900
```

Generate a strong API secret locally with Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Do not paste that secret into chat or commit it. The hosting service normally supplies `PORT`; otherwise the API uses port `8787`.

After deployment, open:

```text
https://YOUR-SERVER/health
```

The expected response includes:

```json
{"ok":true,"service":"tu-notice-sentinel-api","version":"3.3.0"}
```

The public app connection must use HTTPS. The included `Dockerfile` can be used by hosts that deploy containers.

## 6. Connect the Android app

The app does not have a username/password account. It authenticates with the private server URL and `API_SECRET`.

1. Install and open the TU Notice Sentinel APK.
2. Open **Settings → Sentinel Server**.
3. Enter the deployed base URL, such as `https://your-service.example.com`.
4. Do not add `/api`, `/health`, or another path.
5. Enter the exact same `API_SECRET` configured on the server.
6. Tap **Save settings**, return to the dashboard, and refresh.

The app automatically exchanges the API secret for a signed 15-minute session token. The API secret remains in Android encrypted storage.

For the optional direct GitHub controls under Android **Settings → GitHub Actions**, enter the owner, repository, `bot.yml`, and a fine-grained token. The normal dashboard **Run Bot** control already queues the GitHub workflow through the secured backend.

You may enable a 4–8 digit app-lock PIN under **Settings → Security & appearance**. The PIN protects the app locally and is separate from API authentication.

## API contract used by the Android app

`POST /api/auth/token` accepts `X-API-Key: <API_SECRET>`. Every other `/api` endpoint requires `Authorization: Bearer <session-token>`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/status` | Bot, website, scraper, Gmail, GitHub, and run status |
| GET | `/api/notices` | Stored normalized notices |
| GET | `/api/notices/latest` | Latest stored notice |
| GET | `/api/logs` | Persistent bot logs |
| DELETE | `/api/logs` | Clear logs |
| GET | `/api/notifications` | Notice-email and test-email history |
| POST | `/api/check` | Queue the real GitHub workflow |
| POST | `/api/test-email` | Send a real Nodemailer/Gmail test |
| POST | `/api/bot/enable` | Enable scheduled workflow runs |
| POST | `/api/bot/disable` | Disable scheduled workflow runs |
| POST | `/api/bot/test` | Verify GitHub state/workflow access |
| POST | `/api/github/workflow` | Queue the configured workflow |
| GET | `/api/github/status` | Read the latest workflow run |

## Local development

```bash
cp .env.example .env
npm ci
npm test
npm run dry-run
```

To run the API locally, fill all required `.env` values and use `npm start`. Local HTTP is suitable for development tools, but the production Android app requires an HTTPS URL.

## Troubleshooting

| Problem | Cause or fix |
| --- | --- |
| Android shows `Invalid API key` | `API_SECRET` differs between the app and server |
| Android cannot connect | Check the HTTPS base URL and `/health` response |
| `GITHUB_NOT_CONFIGURED` | One or more `GITHUB_*` server variables are missing |
| GitHub returns `Resource not accessible` | Token lacks Actions, Contents, or Variables permission |
| `INVALID_STATE_FILE` | `data/state.json` is absent or invalid JSON on `main` |
| Test email says Gmail is not configured | Set all three Gmail environment variables on the API host |
| Workflow cannot commit state | Enable workflow `contents: write` and review branch protection |
| Every run emails the same notices | Confirm `data/state.json` is tracked and workflow commits succeed |
| No notices are detected | Run `npm run dry-run` and inspect whether TU changed its HTML structure |

## Security notes

- Never commit `.env`, Gmail App Passwords, GitHub tokens, or `API_SECRET`.
- Restrict the GitHub token to only the Sentinel repository and required permissions.
- Rotate the API secret and GitHub token if the phone or server is lost.
- Keep the API behind HTTPS and use the hosting platform's secret manager.
- The application stores notice state in GitHub, but credentials remain only in GitHub/hosting secrets and encrypted Android storage.
