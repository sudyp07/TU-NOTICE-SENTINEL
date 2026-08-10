# TU Notice Sentinel v3.2.0

Working Node.js TU Exam notice monitor reconstructed from the confirmed v3.2 behavior.

## Local
1. Copy `.env.example` to `.env`
2. Fill Gmail settings.
3. `npm install`
4. `npm test`
5. `npm run dry-run`
6. `npm start`

## GitHub Actions
Add repository secrets:
- GMAIL_USER
- GMAIL_APP_PASSWORD
- EMAIL_TO

Workflow runs every 30 minutes and supports manual dispatch.

The bot stores seen notice IDs in `data/state.json` and the workflow commits that state back to the repository.

Do not commit `.env` or credentials.
