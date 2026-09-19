# Threat Model

## Project Overview

MyFitPlan / Panel Trenera — a fitness coaching platform. pnpm monorepo (Node 24, TypeScript, Express 5, PostgreSQL + Drizzle ORM, Zod validation). Production artifacts:

- **API Server** (`artifacts/api-server`) — Express 5 REST API, the primary trust boundary and attack surface. All routes in `src/routes/routes.ts` (~158 endpoints). Session-cookie auth plus a mobile Bearer-token fallback.
- **Panel Trenera** (`artifacts/panel-trenera`) — React/Vite web dashboard for trainers.
- **Panel Trenera Mobile** (`artifacts/panel-trenera-mobile`) — Expo app for trainer, client, and gym_owner roles.
- **Canvas** (`artifacts/mockup-sandbox`) — design/dev-only, not production-reachable.

Deployed publicly (autoscale) at https://paneltrenera.pl and https://MyFitPlan.replit.app. Integrates with Stripe (subscriptions/webhooks), Resend (email), Google Cloud Object Storage, and Expo push.

## Assets

- **User accounts & sessions** — bcrypt password hashes, session cookies (connect-pg-simple, 1-week TTL), mobile bearer tokens (30-day TTL, `mobile_tokens` table). Compromise = impersonation.
- **Personal data** — client email, phone, fitness goals, body measurements, progress photos, weekly reports, private trainer notes, chat messages.
- **Business data** — training plans, diet plans, client relationships, payments/billing records, subscriptions, referral events, gym rosters and analytics.
- **Application secrets** — `SESSION_SECRET`, `DATABASE_URL`, Stripe keys, `CRON_JOB_TOKEN`, `DEMO_SEED_SECRET`, Resend key, object-storage credentials.

## Trust Boundaries

- **Client → API** — all requests from web/mobile cross here; the client is untrusted. Enforced by `isAuthenticated` (session or bearer) in `src/auth.ts`.
- **API → PostgreSQL** — Drizzle ORM parameterized queries; SQL injection risk low.
- **API → Stripe / Resend / GCS / Expo** — outbound; Stripe webhook (`/api/webhooks/stripe`) verified via signature on the raw body.
- **Role boundaries** — `trainer`, `client`, `gym_owner`, plus a separate `isAdmin` flag. `/api/auth/update-role` allows self-selection of trainer|client only. Admin routes gated by `requireAdmin`; gym routes by `requireGymOwner`.
- **Tenant boundaries** — each trainer's clients/plans/payments; each gym owner's trainers. Must be enforced server-side per object.

## Scan Anchors

- **Primary entry point:** `artifacts/api-server/src/routes/routes.ts` (all HTTP routes), `src/storage.ts` (DB access layer — verify each query is scoped by owner/relationship, not raw id), `src/auth.ts` (auth middleware, session, mobile token, password hashing), `src/email.ts` (token generation), `src/objectStorage.ts` + `src/objectAcl.ts` (file ACLs).
- **Highest-risk surfaces:** bulk/relationship mutations (`/api/assignments/bulk`), payment mutations (`/api/payments/:id/*`), gym trainer enrollment (`/api/gym/trainers/invite`, `/api/gym/trainer/:trainerId/detail`), registration/invitation acceptance, password reset + mobile token lifecycle.
- **Auth boundaries:** public (register/login/lookup/webhook/cron/demo-seed), authenticated (most), admin (`requireAdmin`), gym_owner (`requireGymOwner`).
- **Dev-only (ignore unless proven reachable):** `artifacts/mockup-sandbox`, `.migration-backup/`.
- **Verified adequate controls:** plan/workout/exercise CRUD ownership checks; `/api/profile/:userId` relationship checks; object `/objects/*` and weekly-report photo ACL checks; Stripe webhook signature verification; referral idempotency; most diet/report/chat/notification/session endpoints scope by caller relationship.

## Threat Categories

### Spoofing / Improper Authentication
Mobile registration (`POST /api/auth/register`) creates accounts with `emailVerified: true` and no email-ownership proof, then auto-accepts all pending invitations for the submitted email — enabling identity/invitation takeover (see findings). Password reset does not revoke active mobile bearer tokens, so a leaked token survives account recovery. Invitation acceptance ignores invitation status, allowing replay after cancellation/use. Guarantee: identity-establishing flows MUST prove email ownership before granting verified status or attaching invitations; account recovery MUST revoke all active sessions and tokens; one-time invitations MUST be enforced single-use with a pending-status predicate.

### Elevation of Privilege / Broken Access Control
Several mutation endpoints authenticate the caller and check only role, not object ownership: `/api/payments/:id/mark-paid` and DELETE (any trainer can tamper with any payment), `/api/assignments/bulk` (any trainer can claim arbitrary client IDs and displace another trainer's assignment), and `/api/gym/trainers/invite` (a gym owner silently activates any existing trainer and then reads their private client roster via `/api/gym/trainer/:trainerId/detail`). Guarantee: every object mutation and cross-tenant read MUST verify the caller owns or has an active, consented relationship to the target object; storage-layer queries MUST be scoped by owner/tenant, not raw id.

### Denial of Service
`POST /api/auth/resend-verification` lacks the `authRateLimit` applied to other auth endpoints, allowing unbounded verification-email flooding and repeated token invalidation. Guarantee: all unauthenticated email-triggering endpoints MUST be rate-limited.

### Information Disclosure
Cross-tenant reads (gym trainer detail leaking client emails; profile/report endpoints) must be scoped. Verified-adequate ACL enforcement exists for object storage and most read endpoints; keep list/detail endpoints scoped to the caller's tenant.
