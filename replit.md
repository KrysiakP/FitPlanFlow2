# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

- **Panel Trenera** (`artifacts/panel-trenera`) — Web dashboard for trainers (React + Vite)
- **API Server** (`artifacts/api-server`) — Express 5 REST API with session-cookie auth
- **Panel Trenera Mobile** (`artifacts/panel-trenera-mobile`) — Expo mobile app (iOS + Android + web), trainer & client roles

## Mobile App (Expo)

- Auth uses **session-cookie** via `credentials: "include"` — no bearer tokens.
- `EXPO_PUBLIC_DOMAIN` — must be set to the API server's **bare domain** (e.g. `paneltrenera.pl` or `<repl>.replit.app`, **without** `https://`) for **production EAS builds**. The app prepends `https://` itself in `context/AuthContext.tsx`. In development, the app auto-detects `REPLIT_DEV_DOMAIN` at runtime.
- Biometric login uses `expo-local-authentication` + `expo-secure-store`; tracks session availability via `HAS_SESSION_KEY` flag (not a stored credential).
- CORS on the API is restricted to `*.replit.dev`, `*.replit.app`, `*.repl.co`, and `localhost`.

## Recent Features

- **Trainer private notes** — `GET/PATCH /api/trainer/clients/:clientId/notes` + web & mobile UI
- **Body measurements** — arm (`ramię`) and leg (`udo`) tracked in progress charts
- **Diet view macro totals** — daily calorie/protein/fat/carb targets shown in diet tab
- **Client phone & goal display** — shown in web clients page header and mobile trainer client detail
- **Workout sessions tab** — trainer can see client's session history via `GET /api/trainer/clients/:clientId/workout-sessions`
- **Elapsed session timer** — live timer displayed while training session is active (mobile)
- **Last session weight pre-fill** — when logging a set, load is pre-filled from last session via `GET /api/exercises/:exerciseId/latest-log`
- **Cancel invitation** — trainer can cancel pending invitations via `DELETE /api/invitations/:id`; UI in mobile invitations screen
- **Bulk remind all** — trainer can notify all clients at once via `POST /api/trainer/clients/remind-all`; button in mobile clients list
- **Weekly reports on mobile** — client can create/edit reports (`(client)/weekly-report.tsx`, hidden tab, accessible via quick-access card); trainer sees all client reports with unread badge in `(trainer)/client/[id].tsx`; unread reports marked as viewed automatically

## Notes

- **Mobile auth uses dual-auth**: session cookie (works on native iOS/Android) + Bearer token (fallback for web preview / iframe contexts where cross-site cookies are blocked). On login/register, the server generates a `mobileToken` (UUID, 30-day TTL, stored in `mobile_tokens` table) and returns it in the response body. The mobile client stores it in SecureStore/localStorage and sends it as `Authorization: Bearer <token>` on every request. `isAuthenticated` middleware checks session first, then Bearer token.
- `mobile_tokens` DB table is now actively used for mobile Bearer token auth.
- Pre-existing TypeScript errors exist in `artifacts/api-server/src` (non-blocking — esbuild bundles successfully).
- `trainer_notes` column added to `client_relationships` table via direct SQL ALTER TABLE (not drizzle-kit push).
- `apiDelete` function added to `artifacts/panel-trenera-mobile/lib/api.ts`.
