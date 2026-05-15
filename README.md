# GachaGuard

GachaGuard is a practical dashboard for tracking gacha-game spending, monthly budgets, pity progress, and pre-payment friction prompts.

Production: https://gachaguard.vercel.app
Supabase project ref: `ydxccaehfkqhlqumyyup`

## Stack

- Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui
- Supabase Auth, Postgres, Row Level Security
- Recharts, React Hook Form/Zod-ready domain validation
- Vitest unit tests and Playwright smoke E2E

## GachaGuard v1 Baseline

The current baseline is a typed Next.js App Router rebuild of the Claude Design prototype. The JSX/`window.*` prototype code is not checked in, and the unrelated OtakuHub prototype was not applied.

### Routes

- `/dashboard` - spending, budget pace, tracked banners, quick payment entry
- `/banners` - active banner list, pity progress, estimated cost to hard pity
- `/banners/[id]` - banner detail, probability curve, recent pulls
- `/pulls` - pull log filters, add-pull sheet, inline result editing
- `/budget` - monthly budget and guardrail rules
- `/settings` - tracked games, account information, baseline settings

### Data Model

The first migration creates the original user-owned spending model:

- `profiles`
- `games`
- `user_games`
- `budgets`
- `payments`
- `gacha_logs`
- `payment_templates`

The v1 design migration adds the banner and guardrail model:

- `banners`
- `user_banners`
- `pull_sessions`
- `pulls`
- `guardrail_rules`

`payments` remains the source of truth for actual spending and budget calculations. `pulls` is used for pull-result history, pity progress, and banner statistics.

### Intentional v1 Gaps

These Settings actions are visible but intentionally disabled until a later product pass:

- CSV export
- Email reports
- Full record reset

## Local Setup

```bash
npm.cmd install
copy .env.local.example .env.local
npm.cmd run dev
```

Without Supabase environment variables, `/dashboard` runs with read-only demo data so the UI can still be reviewed.

## Supabase Setup

1. Create a dedicated Supabase project for GachaGuard.
2. Copy `.env.local.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_SITE_URL`
3. Apply migrations in filename order:
   - `20260508043908_init_gachaguard_schema.sql`
   - `20260508094959_optimize_rls_and_indexes.sql`
   - `20260515124603_add_gacha_design_model.sql`
4. Seed the master game list with `supabase/seed.sql`.
5. Enable Email Magic Link in Supabase Auth.
6. Add redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3100/auth/callback` if testing against the e2e dev server
   - `https://<your-vercel-production-domain>/auth/callback`

All public schema tables have RLS enabled. `games` and `banners` are public read master data. User-owned tables use `auth.uid()` ownership checks, and cross-table writes use ownership checks against the related user records.

### RLS Smoke Test

The RLS smoke test lives at `supabase/tests/rls_verification.sql`. The Supabase CLI is not required for the app build, but it is required to run the database smoke test locally.

If `supabase` is not installed globally, use `npx`:

```bash
npx supabase@latest --help
npx supabase@latest start
npx supabase@latest db reset
npx supabase@latest test db
```

The checked-in test verifies that an owner can read the new `user_banners`, `pull_sessions`, `pulls`, and `guardrail_rules` rows, while another authenticated user cannot read or insert those rows.

## Vercel Setup

Set these environment variables in Production, Preview, and Development:

```bash
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_SITE_URL
```

After the production URL is known, update both `NEXT_PUBLIC_SITE_URL` and the Supabase Auth redirect allow-list.

Preview environment variables require a connected Git repository in Vercel. For CLI-only deployments, Production and Development are configured first.

## Commands

```bash
npm.cmd run lint
npm.cmd run test
npm.cmd run build
npm.cmd run test:e2e
```

`npm.cmd run test:e2e` starts a dedicated Next.js dev server on `127.0.0.1:3100` so it does not accidentally test another local app on port 3000. Override the port when needed:

```bash
set GACHAGUARD_E2E_PORT=3200
npm.cmd run test:e2e
```

Playwright may need browser binaries installed with `npx.cmd playwright install` on a fresh machine.

## CI

GitHub Actions runs the baseline checks with `npm ci`, `npm run lint`, `npm run test`, and `npm run build`.

Playwright e2e is split into a separate job because it installs browser binaries. It runs for pull requests and manual workflow dispatches, using the same `npm run test:e2e` command as local development.
