# GachaGuard

GachaGuard is a practical dashboard for tracking gacha-game spending, monthly budgets, pity progress, and pre-payment friction prompts.

Production: https://gachaguard.vercel.app
Supabase project ref: `ydxccaehfkqhlqumyyup`

## Stack

- Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui
- Supabase Auth, Postgres, Row Level Security
- Recharts, React Hook Form/Zod-ready domain validation
- Vitest unit tests and Playwright smoke E2E

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
3. Apply `supabase/migrations/20260508043908_init_gachaguard_schema.sql`.
4. Seed the master game list with `supabase/seed.sql`.
5. Enable Email Magic Link in Supabase Auth.
6. Add redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `https://<your-vercel-production-domain>/auth/callback`

All user-owned tables use RLS with `auth.uid()` ownership checks. `games` is public read-only master data.

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

Playwright may need browser binaries installed with `npx.cmd playwright install` on a fresh machine.
