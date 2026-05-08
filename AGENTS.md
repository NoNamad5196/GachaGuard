# GachaGuard Agent Notes

- This project uses Next.js 16 App Router and React 19.
- Prefer Server Components for reads and Server Actions for mutations.
- Keep Supabase clients lazy and never expose service role keys in browser code.
- User-owned tables are protected by RLS; check `supabase/migrations` before changing data access.
