# Smoke tests

Integration tests that talk to a **running local API** over HTTP. They refuse to run against anything
but `localhost`, and they never need production credentials.

## Run

1. Start the API on a local database with `NODE_ENV=test` (this skips the auth rate limiter, which
   otherwise answers `429` after about 20 logins):

   ```bash
   cd artifacts/api-server
   node ./build.mjs
   NODE_ENV=test PORT=3100 DATABASE_URL=postgres://... node --enable-source-maps ./dist/index.mjs
   ```

2. Create these accounts (register them, then set `email_verified = true` in the local DB). They all use
   the same test password, passed as `TEST_PASSWORD`:

   | Variable         | Role        | Notes                       |
   |------------------|-------------|-----------------------------|
   | `STUDIO_EMAIL`   | `gym_owner` | register via `/api/gym/register` |
   | `TRAINER_EMAIL`  | `trainer`   |                             |
   | `CLIENT_EMAIL`   | `client`    | must have no trainer yet    |
   | `TRAINER2_EMAIL` | `trainer`   | a second, unrelated trainer |
   | `CLIENT2_EMAIL`  | `client`    | must have no trainer yet    |

3. Run:

   ```bash
   API_URL=http://localhost:3100 TEST_PASSWORD=... \
   STUDIO_EMAIL=... TRAINER_EMAIL=... CLIENT_EMAIL=... TRAINER2_EMAIL=... CLIENT2_EMAIL=... \
   node --test --test-concurrency=1 scripts/smoke-*.mjs
   ```

   `--test-concurrency=1` matters: the suites share accounts and would interfere when run in parallel.

## What is covered

| File                        | Checks                                                                 |
|-----------------------------|------------------------------------------------------------------------|
| `smoke-studio.mjs`          | studio registration, invitations, joining, analytics, editing, leaving |
| `smoke-core.mjs`            | plans, workouts, exercises, assignment, what a client may change, session push + reminders (reminders need `CRON_JOB_TOKEN` = the API's value) |
| `smoke-idor.mjs`            | a second trainer/client cannot reach another pair's plans and data     |
| `smoke-idor-data.mjs`       | same for payments, diets, reports, chat and sessions                   |
| `smoke-upload.mjs`          | uploads: allow-list, content check, nothing served as active content   |
| `personal-record.test.mjs`, `exercise-history.test.mjs`, `attention.test.mjs`, `account-export.test.mjs`, `report-reminder.test.mjs`, `notification-preferences.test.mjs` | unit tests of the records, strength-history, attention-list and data-export logic (no server needed: `pnpm test:unit`) |
| `smoke-stripe-webhook.mjs`  | webhook signatures, activation, past due, cancellation, double checkout (`STRIPE_WEBHOOK_SECRET` must equal the API's value; run it separately: `pnpm test:stripe`) |

Every suite cleans up after itself, so they can be run repeatedly.
