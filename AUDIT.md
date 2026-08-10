# Audit of the uploaded v3.2.0 project

This report records what was found in the uploaded archive and what was changed in the integrated v3.3.0 result.

| Area | Uploaded v3.2.0 finding | v3.3.0 correction |
| --- | --- | --- |
| Android connection | No REST server or authentication dependency/code | Added the complete authenticated API required by the Android app |
| Workflow state | `.gitignore` excluded `data/state.json`, while the workflow attempted to add it normally | State is tracked and committed by the workflow |
| Duplicate prevention | Each run replaced `seenIds` with only the currently scraped page | Current and historical IDs are merged and capped safely |
| Pagination | Parser always returned `nextPage: null` | Explicit next-page links are followed with loop protection |
| Failed status | A failed scrape/email exited without saving failure state | Failure timestamp, error, status, and logs are persisted |
| First-run digest | Present | Preserved and tested: latest 10 notices are emailed once |
| Gmail | Nodemailer integration present | Preserved, App Password whitespace handled, test-email API added |
| Email HTML safety | Notice title/URL were inserted without escaping | HTML content is escaped before email generation |
| Workflow install | Used `npm install` | Uses reproducible `npm ci` |
| Workflow concurrency | Not configured | Prevents overlapping scheduled/manual workflow runs |
| Bot enable/disable | Not present | Uses the GitHub Actions `BOT_ENABLED` repository variable |
| App status/notices/logs | Not available | API reads canonical GitHub state and exposes real data only |
| Dependency security | Uploaded Nodemailer range resolved to a release with a high advisory | Updated to Nodemailer 9.0.5; production audit reports zero vulnerabilities |
| Tests | Seven small unit assertions | Added bot lifecycle, failure persistence, pagination, escaping, state merging, API authentication, Android response contract, and workflow trigger tests |

The Android APK itself does not require a code change for this integration because the new server implements the endpoint and response contract already compiled into the app.
