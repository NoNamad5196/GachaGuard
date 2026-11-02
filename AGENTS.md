# GachaGuard Agent Notes

- This project uses Next.js 16 App Router and React 19.
- Prefer Server Components for reads and Server Actions for mutations.
- Firebase clients are lazy; never expose Admin credentials in browser code.
- Admin bypasses rules: derive UID from verified session cookies and validate owned references.
- Follow the OtakuS contract on SipSungJang `feat/otakus-firebase`; SQL migrations are historical only.
