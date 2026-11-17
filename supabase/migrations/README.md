> **Historical reference only.** The SQL files in this folder describe the legacy Supabase schema and are no longer applied by the app. They are kept in place (not moved) so the migration script's source mapping and old RLS intent stay reviewable next to the original files.

# GachaGuard: Supabase PostgreSQL to Firebase Firestore Migration Guide

This document specifies the migration path from legacy Supabase PostgreSQL tables to Firebase Firestore under the **OtakuS Firestore Contract v1**.

The migration is implemented as a modular CLI tool:
- Core transformation & validation: `scripts/lib/migration-core.mjs`
- Modular subsystems: `scripts/lib/*.mjs` (<= 250 pure LOC per module)
- CLI runner: `scripts/migrate-from-supabase.mjs`
- Safety & regression test suite: `scripts/migrate-from-supabase.test.mjs`
- Comprehensive architecture specification: `docs/firebase-migration.md`

---

## 1. Authoritative Contract & Architectural Overview

The OtakuS ecosystem connects three applications (**SipSungJang**, **GachaGuard**, and **OtakuHub**) into a single Firebase project sharing one Google Auth identity realm (`users/{uid}`).

Key architectural constraints:
1. **Shared User Root**: All user data resides under `users/{uid}`.
2. **Namespace Isolation**:
   - GachaGuard-specific user data lives exclusively under `users/{uid}/gacha/main/{kind}/{id}`.
   - The document `users/{uid}/gacha/main` itself is never created.
   - Global catalog entries live in `games/{gameId}`, while GachaGuard-specific settings live in `modules/gacha/gameConfigs/{gameId}`.
   - Public banners live in `modules/gacha/banners/{bannerId}`, whereas private banners live in `users/{uid}/gacha/main/banners/{bannerId}`.
3. **Common Metadata**:
   - New server documents (`gacha/main/*`, `modules/gacha/*`, `identityMappings/*`) include:
     - `schema_version: 1`
     - `created_at: Firestore Timestamp`
     - `updated_at: Firestore Timestamp`
   - **Exception**: Common `users/{uid}/games/{entryId}` documents maintain ISO strings for `created_at` and `updated_at`, without `schema_version`, to preserve backward compatibility with SipSungJang.
4. **Server-Managed Security Boundaries**:
   - Client writes to `users/{uid}/gacha/main/*` and `modules/*` are disallowed by security rules (`allow write: if false`).
   - All mutations must be executed server-side via `firebase-admin` (Next.js Server Actions / Route Handlers).

---

## 2. Table-to-Firestore Mapping Specification

| Supabase Source Table | Firestore Target Path | ID / Key Rule | Field Transformation & Business Rules |
| :--- | :--- | :--- | :--- |
| `profiles` | `users/{uid}` | `uid` (Firebase Google Auth UID) | Merged: `profile` object (`user_id`, `display_name`, `timezone`, default reset day/hour/reminders) and `account` mirror (`email`, `avatar_url: null`, `providers: ["google"]`). Existing profiles are preserved unchanged. |
| `profiles.session_warning_amount` | `users/{uid}/gacha/main/settings/preferences` | Fixed doc ID: `preferences` | Stores `session_warning_amount` (integer >= 0) with common metadata. |
| `games` (Global Master) | `games/{gameId}` | Catalog fixed ID (`genshin-impact`, etc.) or reversible UTF-8 hex `custom-<hex>` | Contains `name`, `aliases`, `franchise_id`, `color`. **Pity, budget, cost, developer, and genre fields are prohibited here.** |
| `games` (Gacha Config) | `modules/gacha/gameConfigs/{gameId}` | Same `gameId` | Stores `developer`, `genre`, `soft_pity`, `hard_pity`, `base_cost`, `has_guarantee` with common metadata. |
| `user_games` (Shared Entry) | `users/{uid}/games/{entryId}` | `entryId`: Reuses existing target entry if user already has game; otherwise `gameId` | Common fields (`id`, `user_id`, `game_id`, `intensity`, `created_at` ISO, `updated_at` ISO) + SipSungJang extension defaults (`quests`, `parties`, etc.). When entry exists, shared data and SipSungJang extensions are preserved unchanged. |
| `user_games` (Gacha State) | `users/{uid}/gacha/main/gameStates/{entryId}` | `entryId` | Stores `user_game_id: entryId`, `game_id`, `nickname`, `current_pity`, `monthly_budget`, `warning_threshold_percent`, `is_active`, `revision: 1`. |
| `budgets` | `users/{uid}/gacha/main/budgets/{YYYY-MM}` | `year_month` (e.g. `2026-05`) | `year_month`, `total_budget`, `warning_at`. |
| `banners` (Public) | `modules/gacha/banners/{bannerId}` | Preserved UUID or deterministic hash | `is_public: true`, `created_by: null`, `game_id`, `name`, `banner_type`, `featured`, `starts_at`, `ends_at`, pity/rate fields. |
| `banners` (Private) | `users/{uid}/gacha/main/banners/{bannerId}` | Preserved UUID or deterministic hash | `is_public: false`, `created_by: uid`, pity/rate fields. |
| `user_banners` | `users/{uid}/gacha/main/userBanners/{trackingId}` | `trackingId`: `(banner_scope + "-" + bannerId)` | `user_game_id: entryId`, `game_id`, `banner_id`, `banner_scope`, `initial_pity`, `current_pity`, `pulls_total`, `pulls_5_star`, `is_tracking`, `revision: 1`. |
| `pull_sessions` | `users/{uid}/gacha/main/pullSessions/{sessionId}` | Preserved UUID (`sessionId`) | `user_banner_id: trackingId`, `user_game_id: entryId`, `pulls_count`, `total_cost`, `currency`, `memo`, `pulled_at`. |
| `pulls` | `users/{uid}/gacha/main/pulls/{pullId}` | Deterministic: `<sessionId>-<pull_number>` | Session-unique pull number, `pity_before`, `rarity`, `item_name`, `cost`, `is_rate_up`, `pulled_at`. |
| `payments` (Imported) | `users/{uid}/gacha/main/payments/{paymentId}` | Deterministic: `import-` + SHA-256(`import_fingerprint`) | Idempotent payment import ID based on fingerprint. |
| `payments` (Template) | `users/{uid}/gacha/main/payments/{paymentId}` | `template-<templateId>-<YYYY-MM>` | Monthly recurring template payment. |
| `payments` (Manual) | `users/{uid}/gacha/main/payments/{paymentId}` | Preserved UUID | Manual user entries. |
| `payment_templates` | `users/{uid}/gacha/main/paymentTemplates/{id}` | Preserved UUID | `user_game_id: entryId`, `name`, `amount`, `type`, `day_of_month`, `is_active`, `last_applied_year_month`. |
| `gacha_logs` | `users/{uid}/gacha/main/gachaLogs/{id}` | Preserved UUID | Legacy summary log: `pulls`, `result`, `pity_at_pull`, `pulled_at`. |
| `guardrail_rules` | `users/{uid}/gacha/main/guardrailRules/{id}` | Preserved UUID | `kind`, `name`, `threshold_amount`, `threshold_percent`, `cooldown_days`, `enabled`. |
| Identity Audit | `identityMappings/{id}` | SHA-256(`[source, entity, source_id, uid]`) | Server-only migration ledger linking Supabase IDs to Firestore targets. |

---

## 3. Strict UID Mapping Policy

**Contract Requirement**: Automatic email-based user matching is **strictly prohibited**.
- The script requires an explicit, verified mapping file via `--uid-mapping <path>`.
- Any unverified user ID halts execution immediately.

---

## 4. Migration Tool Usage Guide

### Prerequisites
- Node.js >= 20 (Node 24 recommended)
- Dependencies installed: `npm ci`

### Step 1: Export Data from Supabase
Export table data as a single JSON file (`supabase-export.json`) or a directory containing individual JSON/CSV files:
- `profiles`
- `games`
- `user_games`
- `budgets`
- `payments`
- `payment_templates`
- `banners`
- `user_banners`
- `pull_sessions`
- `pulls`
- `gacha_logs`
- `guardrail_rules`

*(Alternative: `--source-supabase` with `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` reads the tables directly — GET only, paginated by `id`, and aborts unless the fetched count equals the exact `Content-Range` total.)*

### Step 2: Perform Dry-Run Validation (Default Mode)
Dry-run is the default execution mode. In dry-run mode:
- **No network calls to Firebase are made**.
- **No administrative credentials are required**.
- All referential integrity, catalog lookups, and deterministic ID collisions are analyzed.

```bash
node scripts/migrate-from-supabase.mjs \
  --input-json ./data/supabase-export.json \
  --uid-mapping ./data/uid-mapping.json
```

### Step 3: Verify Against Local Firestore Emulator
To test actual database writes with the emulator:
```bash
FIREBASE_PROJECT_ID=demo-otakus \
FIRESTORE_EMULATOR_HOST=localhost:8080 \
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099 \
node scripts/migrate-from-supabase.mjs \
  --input-json ./data/supabase-export.json \
  --uid-mapping ./data/uid-mapping.json \
  --apply
```

### Step 4: Apply to Production Firebase Project
Apply with explicit service account credentials (no ADC fallback):
```bash
FIREBASE_PROJECT_ID=your-firebase-project-id \
FIREBASE_CLIENT_EMAIL=service-account@your-firebase-project-id.iam.gserviceaccount.com \
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n" \
node scripts/migrate-from-supabase.mjs \
  --input-json ./data/supabase-export.json \
  --uid-mapping ./data/uid-mapping.json \
  --apply
```

---

## 5. Safety Guards, Preflight & Overwrite Prevention

1. **Flag Safety**:
   - Conflicting flags (`--apply` with `--dry-run`) are rejected.
   - Unknown flags are rejected.
   - Default mode is dry-run without network writes.

2. **Explicit Credentials & No ADC**:
   - `--apply` requires explicit `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY`.
   - ADC fallback is disabled to prevent accidental writes to developer accounts.
   - Emulator requires `FIREBASE_PROJECT_ID=demo-otakus` and both `FIRESTORE_EMULATOR_HOST` and `FIREBASE_AUTH_EMULATOR_HOST`.

3. **Target Discovery & Shared Document Protection**:
   - Before planning apply, the script discovers existing `users/{uid}/games` to reuse legacy `entryId`s.
   - Shared user documents (`users/{uid}`, `users/{uid}/games/{entryId}`) are created only if absent; existing profiles and SipSungJang extensions (`quests`, `parties`, etc.) are left unchanged.
   - Mismatched catalog IDs trigger immediate conflict rejection rather than overwriting.

4. **Create-Only Nonshared Docs & Conflict Preflight**:
   - Nonshared documents (`gacha/main/*`, `modules/gacha/*`) are create-only.
   - If an existing target document is identical, it is skipped.
   - If an existing target document has conflicting data, migration is aborted.
   - Batch writes use `batch.create` preconditions in chunks <= 400 documents (Spark quota safe).

5. **Initial Pity Legacy Truth**:
   - Derives baseline pity from earliest pull history when `initial_pity` is null.
   - If impossible to derive from history (e.g. 5-stars pulled without granular logs), reports error and rejects rather than silently defaulting to 0.
