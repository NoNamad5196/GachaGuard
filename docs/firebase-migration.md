# GachaGuard: Firebase Migration & Safety Architecture

## 1. Executive Summary & OtakuS Contract v1

The OtakuS ecosystem connects three distinct applications (**SipSungJang**, **GachaGuard**, and **OtakuHub**) into a unified Firebase project sharing a single Google Auth identity realm (`users/{uid}`).

The Supabase PostgreSQL to Firebase Firestore migration tool provides a deterministic, zero-data-loss pipeline that transitions legacy relational data into the Firestore document model while enforcing strict multi-app tenancy and data safety boundaries.

### Core Architectural Invariants
1. **Shared User Root**: All user data resides under `users/{uid}`.
2. **Namespace Isolation**:
   - GachaGuard-specific user documents reside strictly under `users/{uid}/gacha/main/{kind}/{id}`.
   - The intermediate document `users/{uid}/gacha/main` itself is **never created**.
   - Global catalog entries live in `games/{gameId}`. Pity, budget, cost, developer, and genre fields are prohibited here.
   - GachaGuard-specific game settings live in `modules/gacha/gameConfigs/{gameId}`.
   - Public banners live in `modules/gacha/banners/{bannerId}`, while private custom banners live in `users/{uid}/gacha/main/banners/{bannerId}`.
3. **Common Metadata Contract**:
   - New server documents (`gacha/main/*`, `modules/gacha/*`, `identityMappings/*`) include:
     - `schema_version: 1`
     - `created_at`: Firestore Timestamp
     - `updated_at`: Firestore Timestamp
   - **Exception**: Common `users/{uid}/games/{entryId}` documents maintain ISO 8601 strings for `created_at` and `updated_at`, without `schema_version`, to preserve backward compatibility with SipSungJang.
4. **Server-Managed Security Boundaries**:
   - Direct client writes to `users/{uid}/gacha/main/*` and `modules/*` are disallowed by security rules (`allow write: if false`).
   - All mutations execute server-side via `firebase-admin` (Next.js Server Actions / Route Handlers).

---

## 2. Table-to-Firestore Mapping Matrix

| Supabase Source Table | Firestore Target Path | ID / Key Strategy | Business Logic & Rules |
| :--- | :--- | :--- | :--- |
| `profiles` | `users/{uid}` | `uid` (Firebase Google Auth UID) | Shared user document: merges `profile` object (`user_id`, `display_name`, `timezone`, default reset day/hour/reminders) and `account` mirror (`email`, `avatar_url: null`, `providers: ["google"]`). Leaves existing profile/account unchanged. |
| `profiles.session_warning_amount` | `users/{uid}/gacha/main/settings/preferences` | Fixed doc ID: `preferences` | Stores `session_warning_amount` with common metadata. |
| `games` (Global Master) | `games/{gameId}` | Catalog canonical ID (`genshin-impact`, etc.) or reversible UTF-8 hex `custom-<hex>` | Master catalog with `name`, `aliases`, `franchise_id`, `color`. Pity, budget, cost, developer, and genre are strictly excluded. |
| `games` (Gacha Config) | `modules/gacha/gameConfigs/{gameId}` | Same `gameId` | Stores `developer`, `genre`, `soft_pity`, `hard_pity`, `base_cost`, `has_guarantee` with common metadata. |
| `user_games` (Shared Entry) | `users/{uid}/games/{entryId}` | `entryId`: Reuses existing target entry if user already has game; otherwise `gameId` | Common fields + SipSungJang extension defaults (`quests`, `parties`, etc.). When entry already exists, shared fields and SipSungJang extensions are preserved unchanged. |
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

## 3. Strict Safety Guards & Data Protection

### 3.1. Input Sources (No Silent Pagination Truncation)
Supabase PostgREST caps responses (default 1,000 rows). The tool therefore supports:
- Local exports via `--input-json <path>` or `--input-dir <path>` (JSON or CSV per table), or
- `--source-supabase` with `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` env vars. This is **read-only** (GET only),
  pages every table with `order=id.asc&limit=1000&offset=N`, requests `Prefer: count=exact`, and aborts if the
  fetched row count differs from the exact `Content-Range` total or the total changes mid-export.
- Exactly one input source is accepted. The service-role key is only read from the environment and never written.

### 3.2. CLI Flag Validation & Contradiction Rejection
- Contradictory flag combinations (`--apply` with `--dry-run`) are rejected with an explicit error.
- Any unrecognized flags or unexpected positional arguments are rejected.
- Default execution mode (without `--apply`) is strictly **dry-run**:
  - No network writes are executed.
  - `firebase-admin` is **not** initialized.
  - No GCP/Firebase service account credentials are required.

### 3.3. Explicit Service Account Credentials (No ADC Fallback)
When running with `--apply`, Application Default Credentials (ADC) fallback is strictly prohibited to prevent accidental writes to default developer projects:
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` must be explicitly provided in environment variables.
- Emulator mode is permitted **only** when `FIREBASE_PROJECT_ID === "demo-otakus"` **and** both `FIRESTORE_EMULATOR_HOST` and `FIREBASE_AUTH_EMULATOR_HOST` are present. Dummy credentials are used exclusively in this verified state.

### 3.4. Target EntryId Discovery & Extension Preservation
Before executing an apply run, the migration script connects to target Firestore:
1. Discovers existing user games in `users/{uid}/games` for each mapped user.
2. Reuses existing legacy `entryId` identifiers instead of overwriting them with default catalog IDs.
3. Preserves existing SipSungJang extensions (`quests`, `parties`, `party_memo`, `memo`, `weekly_tasks`, etc.) and shared profiles without resetting them.
4. Detects catalog ID mismatches between existing target game entries and legacy Supabase data, rejecting conflicts rather than overwriting.

### 3.5. Overwrite Prevention & Preflight Verification
- **Shared Documents** (`users/{uid}`, `users/{uid}/games/{entryId}`, `games/{gameId}`):
  - Created only if absent.
  - If already present, existing documents are preserved unchanged (never reset).
- **Nonshared Documents** (`gacha/main/*`, `modules/gacha/*`, `identityMappings/*`):
  - Create-only rule enforced.
  - During preflight, if an existing target document is identical to planned migration data, the write is skipped.
  - If an existing target document contains conflicting data, the migration aborts immediately with a target conflict error.
- **Atomic Batches**:
  - Batch writes are chunked to <= 400 documents (strictly within the 450 Spark free-tier quota contract and 500 Firestore limit).
  - Uses `batch.create()` preconditions to guard against concurrent overwrites.

### 3.6. Initial Pity Legacy Truth Derivation
`initial_pity` reflects the baseline pity count prior to recorded pulls:
1. If `initial_pity` is explicitly present in the source row, it is validated and used.
2. If `initial_pity` is null:
   - When `pulls_total === 0`: baseline is derived as `current_pity` (no pulls occurred yet).
   - When granular `pulls` records exist: derived from the earliest pull's `pity_before` minus preceding pulls.
   - When no granular pulls exist and `pulls_5_star === 0`: derived linearly as `current_pity - pulls_total`.
   - When 5-star resets occurred without granular pull records: impossible to determine baseline truth; the migration reports an error and halts rather than silently defaulting to 0.

---

## 4. Usage Guide

### Step 1: Prepare Verified UID Mapping
Automatic email guessing is strictly prohibited. Create a verified JSON mapping file:
```json
{
  "00000000-0000-4000-8000-000000000001": "firebase-uid-alice",
  "00000000-0000-4000-8000-000000000002": {
    "uid": "firebase-uid-bob",
    "verified_at": "2026-05-15T12:00:00Z"
  }
}
```

### Step 2: Run Dry-Run Validation (Default Mode)
```bash
node scripts/migrate-from-supabase.mjs \
  --input-json ./data/supabase-export.json \
  --uid-mapping ./data/uid-mapping.json
```

### Step 3: Run Against Local Firestore Emulator
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
```bash
FIREBASE_PROJECT_ID=your-project-id \
FIREBASE_CLIENT_EMAIL=service-account@your-project-id.iam.gserviceaccount.com \
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n" \
node scripts/migrate-from-supabase.mjs \
  --input-json ./data/supabase-export.json \
  --uid-mapping ./data/uid-mapping.json \
  --apply
```

---

## 5. Modular Codebase Architecture (<= 250 pure LOC per module)

The migration logic is split into focused, single-responsibility ES modules:

| Module File | Responsibility | Pure LOC |
| :--- | :--- | :--- |
| `scripts/migrate-from-supabase.mjs` | CLI orchestration and report output | ~150 |
| `scripts/lib/cli-args.mjs` | Flag parsing, safety validation, contradictory flag rejection | ~70 |
| `scripts/lib/data-loader.mjs` | Local JSON/CSV export loading | ~55 |
| `scripts/lib/catalog.mjs` | Canonical game catalog & NFKC normalized custom game resolution | ~95 |
| `scripts/lib/identity.mjs` | Deterministic SHA-256 IDs, tracking IDs, UID mapping normalization | ~70 |
| `scripts/lib/dates.mjs` | Timestamp parsing, ISO formatting, Firestore Timestamp conversion | ~40 |
| `scripts/lib/pity.mjs` | Initial pity derivation from pull history with non-silent rejection | ~55 |
| `scripts/lib/transform-catalog-profile.mjs` | Game master, game config, user profiles, preferences, budgets | ~120 |
| `scripts/lib/transform-user-games.mjs` | User games, game states, entry ID assignment | ~100 |
| `scripts/lib/transform-banners.mjs` | Public & private banners, user banners with tracking IDs | ~115 |
| `scripts/lib/transform-activity-entities.mjs` | Pull sessions, pulls, payments, templates, gacha logs, guardrails | ~180 |
| `scripts/lib/firebase-admin-init.mjs` | Explicit credential enforcement, emulator rules, no ADC fallback | ~55 |
| `scripts/lib/target-preflight.mjs` | Target entryId discovery, shared doc preservation, conflict checks | ~110 |
| `scripts/lib/apply-runner.mjs` | Chunked batch writes (<= 400 docs) with create preconditions | ~35 |
| `scripts/lib/migration-core.mjs` | Coordinator and backward-compatible re-exports | ~110 |
