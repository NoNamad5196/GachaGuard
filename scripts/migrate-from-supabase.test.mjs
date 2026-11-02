import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import {
  resolveGame,
  getIdentityMappingId,
  getPaymentId,
  getTrackingId,
  getPullId,
  normalizeUidMapping,
  transformSupabaseData,
  deriveInitialPity,
} from "./lib/migration-core.mjs";

import { parseArgs } from "./lib/cli-args.mjs";
import { initFirebaseAdmin } from "./lib/firebase-admin-init.mjs";
import { discoverTargetUserGames, preflightOperations } from "./lib/target-preflight.mjs";
import { applyBatches } from "./lib/apply-runner.mjs";
import { runMigration } from "./migrate-from-supabase.mjs";
import { createMockFirestore } from "./lib/test-mock-firestore.mjs";

test("Catalog resolution maps known games and generates reversible custom-<hex>", () => {
  const genshin = resolveGame("원신");
  assert.equal(genshin.id, "genshin-impact");
  assert.equal(genshin.franchise_id, "genshin");
  assert.equal(genshin.isCustom, false);

  const starrail = resolveGame("스타레일");
  assert.equal(starrail.id, "honkai-star-rail");
  assert.equal(starrail.isCustom, false);

  const blueArchive = resolveGame("블루아카이브", "blue-archive");
  assert.equal(blueArchive.id, "blue-archive");
  assert.equal(blueArchive.isCustom, false);

  const custom = resolveGame("Custom Gacha: Title · Alpha");
  const expectedNorm = "customgachatitlealpha";
  const expectedHex = Buffer.from(expectedNorm, "utf8").toString("hex");
  assert.equal(custom.id, "custom-" + expectedHex);
  assert.equal(custom.isCustom, true);
  assert.equal(custom.franchise_id, null);
  assert.equal(custom.color, "#c9a84c");
});

test("UID mapping rejects unverified mappings and email heuristics", () => {
  const validMap = normalizeUidMapping({
    "supabase-uuid-1": "firebase-uid-1",
    "supabase-uuid-2": { uid: "firebase-uid-2", verified_at: "2026-05-10T00:00:00Z" },
  });
  assert.equal(validMap.get("supabase-uuid-1").uid, "firebase-uid-1");
  assert.equal(validMap.get("supabase-uuid-2").uid, "firebase-uid-2");

  const arrayMap = normalizeUidMapping([
    { source_user_id: "sup-1", firebase_uid: "fb-1" },
  ]);
  assert.equal(arrayMap.get("sup-1").uid, "fb-1");

  assert.throws(() => normalizeUidMapping({}), /contains no valid mappings/);
  assert.throws(() => normalizeUidMapping(null), /non-null object or array/);
});

test("Deterministic ID generators comply with OtakuS contract", () => {
  const fingerprint = "google-12345678";
  const expectedPaymentId = "import-" + crypto.createHash("sha256").update(fingerprint).digest("hex");
  assert.equal(getPaymentId({ import_fingerprint: fingerprint }), expectedPaymentId);

  assert.equal(
    getPaymentId({ external_order_id: "template-tmpl1-2026-05" }),
    "template-tmpl1-2026-05"
  );

  assert.equal(getTrackingId("public", "banner-1"), "public-banner-1");
  assert.equal(getTrackingId("private", "banner-2"), "private-banner-2");
  assert.equal(getPullId("session-abc", 1), "session-abc-1");

  const mapId = getIdentityMappingId("gachaguard", "account", "sup-uid", "fb-uid");
  const expectedMapId = crypto
    .createHash("sha256")
    .update(JSON.stringify(["gachaguard", "account", "sup-uid", "fb-uid"]))
    .digest("hex");
  assert.equal(mapId, expectedMapId);
});

test("transformSupabaseData splits games/config and profiles/preferences correctly", () => {
  const sourceData = {
    profiles: [
      {
        id: "sup-user-1",
        email: "user@example.com",
        display_name: "여행자",
        timezone: "Asia/Seoul",
        session_warning_amount: 100000,
        created_at: "2026-05-01T00:00:00Z",
        updated_at: "2026-05-01T00:00:00Z",
      },
    ],
    games: [
      {
        id: "sup-game-genshin",
        slug: "genshin-impact",
        name: "원신",
        developer: "HoYoverse",
        genre: "오픈월드 RPG",
        soft_pity: 75,
        hard_pity: 90,
        base_cost: 3300,
        has_guarantee: true,
        created_at: "2026-05-01T00:00:00Z",
      },
    ],
    user_games: [
      {
        id: "sup-ug-1",
        user_id: "sup-user-1",
        game_id: "sup-game-genshin",
        nickname: "모험가1",
        current_pity: 45,
        monthly_budget: 200000,
        warning_threshold_percent: 80,
        is_active: true,
        created_at: "2026-05-01T00:00:00Z",
        updated_at: "2026-05-01T00:00:00Z",
      },
    ],
    budgets: [
      {
        id: "sup-budget-1",
        user_id: "sup-user-1",
        year_month: "2026-05",
        total_budget: 200000,
        warning_at: 80,
        created_at: "2026-05-01T00:00:00Z",
        updated_at: "2026-05-01T00:00:00Z",
      },
    ],
    banners: [
      {
        id: "sup-banner-public",
        game_id: "sup-game-genshin",
        name: "푸른 서약",
        banner_type: "character",
        featured: "마리나",
        starts_at: "2026-05-01T00:00:00Z",
        ends_at: "2026-05-28T23:59:59Z",
        soft_pity: 75,
        hard_pity: 90,
        base_rate: 0.006,
        rate_up: 0.5,
        is_active: true,
        is_public: true,
        created_by: null,
        created_at: "2026-05-01T00:00:00Z",
        updated_at: "2026-05-01T00:00:00Z",
      },
    ],
    user_banners: [
      {
        id: "sup-ub-1",
        user_id: "sup-user-1",
        user_game_id: "sup-ug-1",
        banner_id: "sup-banner-public",
        current_pity: 45,
        pulls_total: 45,
        pulls_5_star: 0,
        is_tracking: true,
        created_at: "2026-05-01T00:00:00Z",
        updated_at: "2026-05-01T00:00:00Z",
      },
    ],
    pull_sessions: [
      {
        id: "sup-session-1",
        user_id: "sup-user-1",
        user_banner_id: "sup-ub-1",
        pulls_count: 10,
        total_cost: 33000,
        currency: "KRW",
        memo: "첫 10연차",
        pulled_at: "2026-05-02T10:00:00Z",
        created_at: "2026-05-02T10:00:00Z",
      },
    ],
    pulls: [
      {
        id: "sup-pull-1",
        user_id: "sup-user-1",
        pull_session_id: "sup-session-1",
        user_banner_id: "sup-ub-1",
        pull_number: 1,
        pity_before: 0,
        rarity: 3,
        item_name: "푸른 창",
        cost: 3300,
        is_rate_up: false,
        pulled_at: "2026-05-02T10:00:00Z",
        created_at: "2026-05-02T10:00:00Z",
      },
    ],
    payments: [
      {
        id: "sup-payment-1",
        user_id: "sup-user-1",
        user_game_id: "sup-ug-1",
        amount: 33000,
        type: "coin",
        source: "google_play",
        import_fingerprint: "google-test1234",
        paid_at: "2026-05-02T09:00:00Z",
        created_at: "2026-05-02T09:00:00Z",
        updated_at: "2026-05-02T09:00:00Z",
      },
    ],
    payment_templates: [],
    gacha_logs: [],
    guardrail_rules: [],
  };

  const uidMapping = {
    "sup-user-1": "fb-user-1",
  };

  const result = transformSupabaseData(sourceData, { uidMapping });
  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);

  const opsByPath = new Map(result.operations.map((op) => [op.path, op]));

  const gameMaster = opsByPath.get("games/genshin-impact");
  assert.ok(gameMaster);
  assert.equal(gameMaster.data.name, "원신");
  assert.equal(gameMaster.data.franchise_id, "genshin");
  assert.equal(gameMaster.data.soft_pity, undefined);

  const gameConfig = opsByPath.get("modules/gacha/gameConfigs/genshin-impact");
  assert.ok(gameConfig);
  assert.equal(gameConfig.data.developer, "HoYoverse");
  assert.equal(gameConfig.data.soft_pity, 75);

  const userProfile = opsByPath.get("users/fb-user-1");
  assert.ok(userProfile);
  assert.equal(userProfile.data.profile.user_id, "fb-user-1");

  const userGame = opsByPath.get("users/fb-user-1/games/genshin-impact");
  assert.ok(userGame);
  assert.equal(userGame.data.id, "genshin-impact");

  const gameState = opsByPath.get("users/fb-user-1/gacha/main/gameStates/genshin-impact");
  assert.ok(gameState);
  assert.equal(gameState.data.current_pity, 45);
});

test("Reuses existing entryId when target already has an entry for the game", () => {
  const sourceData = {
    profiles: [{ id: "sup-user-1", display_name: "Player" }],
    games: [{ id: "g-nikke", slug: "nikke", name: "승리의 여신: 니케" }],
    user_games: [
      {
        id: "sup-ug-nikke",
        user_id: "sup-user-1",
        game_id: "g-nikke",
        current_pity: 20,
        monthly_budget: 50000,
        warning_threshold_percent: 70,
        is_active: true,
        created_at: "2026-05-01T00:00:00Z",
        updated_at: "2026-05-01T00:00:00Z",
      },
    ],
    budgets: [],
    banners: [],
    user_banners: [],
    pull_sessions: [],
    pulls: [],
    payments: [],
    payment_templates: [],
    gacha_logs: [],
    guardrail_rules: [],
  };

  const uidMapping = { "sup-user-1": "fb-user-1" };
  const existingUserGames = new Map();
  const userMap = new Map();
  userMap.set("nikke", "custom-entry-nikke-99");
  existingUserGames.set("fb-user-1", userMap);

  const result = transformSupabaseData(sourceData, {
    uidMapping,
    existingTarget: { userGames: existingUserGames },
  });

  assert.equal(result.valid, true);
  const opsByPath = new Map(result.operations.map((op) => [op.path, op]));
  const sharedOp = opsByPath.get("users/fb-user-1/games/custom-entry-nikke-99");
  assert.ok(sharedOp);
  assert.equal(sharedOp.op, "merge");
});

test("Robustly rejects unknown references and unverified users", () => {
  const unverifiedData = {
    profiles: [{ id: "unmapped-user", display_name: "Ghost" }],
    games: [],
    user_games: [],
    budgets: [],
    banners: [],
    user_banners: [],
    pull_sessions: [],
    pulls: [],
    payments: [],
    payment_templates: [],
    gacha_logs: [],
    guardrail_rules: [],
  };

  const result = transformSupabaseData(unverifiedData, {
    uidMapping: { "valid-user": "fb-valid" },
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((err) => err.includes("Unverified user mapping")));
});

test("CLI flag safety: rejects contradictory, unknown, and removed flags", () => {
  // Contradictory flags --apply + --dry-run
  assert.throws(
    () => parseArgs(["--apply", "--dry-run", "--uid-mapping", "u.json", "--input-json", "d.json"]),
    /Contradictory flags: Cannot specify both --apply and --dry-run/
  );

  // Unknown flag
  assert.throws(
    () => parseArgs(["--unknown-flag", "--uid-mapping", "u.json", "--input-json", "d.json"]),
    /Unknown or unexpected argument: '--unknown-flag'/
  );

  // Missing flag value
  assert.throws(
    () => parseArgs(["--uid-mapping"]),
    /Option '--uid-mapping' requires a value/
  );

  // --source-supabase is an input source and cannot be combined with files
  assert.throws(
    () => parseArgs(["--uid-mapping", "u.json", "--source-supabase", "--input-json", "a.json"]),
    /Cannot specify more than one of --input-json, --input-dir and --source-supabase/
  );
  assert.equal(parseArgs(["--uid-mapping", "u.json", "--source-supabase"]).sourceSupabase, true);

  // Missing required input source
  assert.throws(
    () => parseArgs(["--uid-mapping", "u.json"]),
    /Missing required input source: specify either --input-json <path>, --input-dir <path> or --source-supabase/
  );

  // Both input sources specified
  assert.throws(
    () => parseArgs(["--uid-mapping", "u.json", "--input-json", "a.json", "--input-dir", "./dir"]),
    /Cannot specify more than one of --input-json, --input-dir and --source-supabase/
  );

  // Default mode sets dryRun: true
  const parsed = parseArgs(["--uid-mapping", "u.json", "--input-json", "a.json"]);
  assert.equal(parsed.dryRun, true);
  assert.equal(parsed.apply, false);
});

test("CLI safety: dry-run mode performs no network writes or Firestore init", async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gacha-test-"));
  const uidFile = path.join(tmpDir, "uids.json");
  const dataFile = path.join(tmpDir, "data.json");

  fs.writeFileSync(uidFile, JSON.stringify({ "sup-1": "fb-1" }));
  fs.writeFileSync(
    dataFile,
    JSON.stringify({
      profiles: [{ id: "sup-1", display_name: "Hero" }],
      games: [],
      user_games: [],
      budgets: [],
      banners: [],
      user_banners: [],
      pull_sessions: [],
      pulls: [],
      payments: [],
      payment_templates: [],
      gacha_logs: [],
      guardrail_rules: [],
    })
  );

  // Run dry-run without credentials or emulator environment
  const originalEnv = { ...process.env };
  delete process.env.FIREBASE_PROJECT_ID;
  delete process.env.FIREBASE_CLIENT_EMAIL;
  delete process.env.FIREBASE_PRIVATE_KEY;
  delete process.env.FIRESTORE_EMULATOR_HOST;

  try {
    const result = await runMigration({
      uidMapping: uidFile,
      inputJson: dataFile,
      dryRun: true,
      apply: false,
    });

    assert.equal(result.success, true);
    assert.equal(result.mode, "dry-run");
    assert.ok(result.operationsCount > 0);
  } finally {
    process.env = originalEnv;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("Firebase Admin initialization enforces explicit credentials and rejects ADC fallback", () => {
  const originalEnv = { ...process.env };
  delete process.env.FIREBASE_PROJECT_ID;
  delete process.env.FIREBASE_CLIENT_EMAIL;
  delete process.env.FIREBASE_PRIVATE_KEY;
  delete process.env.FIRESTORE_EMULATOR_HOST;
  delete process.env.FIREBASE_AUTH_EMULATOR_HOST;

  const fakeAdmin = {
    apps: [],
    initializeApp: () => ({ name: "app" }),
    credential: { cert: () => ({}) },
  };

  // Missing credentials reject (no ADC fallback)
  assert.throws(
    () => initFirebaseAdmin(fakeAdmin),
    /Explicit Firebase service account credentials required for --apply: missing FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY/
  );

  // Partial emulator configuration rejects
  process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";
  // FIREBASE_AUTH_EMULATOR_HOST is missing and project is not demo-otakus
  assert.throws(
    () => initFirebaseAdmin(fakeAdmin),
    /Emulator configuration invalid: Emulator is only permitted with FIREBASE_PROJECT_ID='demo-otakus' and BOTH FIRESTORE_EMULATOR_HOST and FIREBASE_AUTH_EMULATOR_HOST set/
  );

  // Full emulator configuration succeeds
  process.env.FIREBASE_PROJECT_ID = "demo-otakus";
  process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";
  process.env.FIREBASE_AUTH_EMULATOR_HOST = "localhost:9099";

  const app = initFirebaseAdmin(fakeAdmin);
  assert.ok(app);

  process.env = originalEnv;
});

test("Initial pity derivation calculates truth from history or rejects if impossible", () => {
  // Case 1: Explicit initial_pity present
  const explicit = deriveInitialPity({ id: "ub-1", initial_pity: 30, pulls_total: 10 });
  assert.equal(explicit.value, 30);
  assert.equal(explicit.derived, false);

  // Case 2: Zero pulls done yet -> baseline equals current_pity
  const zeroPulls = deriveInitialPity({ id: "ub-2", initial_pity: null, pulls_total: 0, current_pity: 15 });
  assert.equal(zeroPulls.value, 15);
  assert.equal(zeroPulls.derived, true);

  // Case 3: Pull history available -> derives from earliest pull pity_before
  const withHistory = deriveInitialPity(
    { id: "ub-3", initial_pity: null, pulls_total: 20, current_pity: 45 },
    [
      { pull_number: 1, pity_before: 25, pulled_at: "2026-05-01T00:00:00Z" },
      { pull_number: 2, pity_before: 26, pulled_at: "2026-05-01T00:01:00Z" },
    ]
  );
  assert.equal(withHistory.value, 25);
  assert.equal(withHistory.derived, true);

  // Case 4: No pull records, but 0 5-stars -> linear current_pity - pulls_total
  const noResets = deriveInitialPity(
    { id: "ub-4", initial_pity: null, pulls_total: 10, current_pity: 20, pulls_5_star: 0 },
    []
  );
  assert.equal(noResets.value, 10);
  assert.equal(noResets.derived, true);

  // Case 5: Impossible to derive -> pulls_total > 0 and pulls_5_star > 0 without pull history
  const impossible = deriveInitialPity(
    { id: "ub-5", initial_pity: null, pulls_total: 80, current_pity: 10, pulls_5_star: 1 },
    []
  );
  assert.ok(impossible.error);
  assert.match(impossible.error, /Cannot derive initial_pity for user_banner 'ub-5'/);
});

test("Target discovery and overwrite prevention: preflight skips identical, preserves shared, and rejects conflicts", async () => {
  // Initialize mock Firestore with existing target data
  const mockDb = createMockFirestore({
    // Existing shared user game with S extensions
    "users/fb-user-1/games/entry-genshin": {
      id: "entry-genshin",
      user_id: "fb-user-1",
      game_id: "genshin-impact",
      intensity: "main",
      quests: ["quest-1"],
      parties: [{ name: "Main Team" }],
      memo: "SipSungJang memo",
    },
    // Existing nonshared payment with identical data
    "users/fb-user-1/gacha/main/payments/pay-1": {
      schema_version: 1,
      amount: 10000,
      currency: "KRW",
      user_game_id: "entry-genshin",
    },
    // Existing nonshared payment with conflicting data
    "users/fb-user-1/gacha/main/payments/pay-conflict": {
      schema_version: 1,
      amount: 99999,
      currency: "USD",
      user_game_id: "entry-genshin",
    },
    // Existing game with mismatched catalog id
    "users/fb-user-1/games/entry-mismatch": {
      id: "entry-mismatch",
      user_id: "fb-user-1",
      game_id: "different-game",
    },
  });

  // 1. Discover target user games
  const uidMap = new Map([["sup-1", { uid: "fb-user-1" }]]);
  const discovered = await discoverTargetUserGames(mockDb, uidMap);
  const userMap = discovered.userGames.get("fb-user-1");
  assert.equal(userMap.get("genshin-impact"), "entry-genshin");

  // 2. Preflight shared doc preservation
  const sharedOps = [
    {
      path: "users/fb-user-1/games/entry-genshin",
      entity: "userGame",
      data: { id: "entry-genshin", game_id: "genshin-impact", intensity: "main" },
    },
  ];
  const sharedPlan = await preflightOperations(mockDb, sharedOps);
  assert.equal(sharedPlan[0].action, "skip");
  assert.equal(sharedPlan[0].reason, "Existing shared userGame preserved unchanged");

  // 3. Preflight nonshared identical doc skip
  const identicalOps = [
    {
      path: "users/fb-user-1/gacha/main/payments/pay-1",
      entity: "payment",
      data: { schema_version: 1, amount: 10000, currency: "KRW", user_game_id: "entry-genshin" },
    },
  ];
  const identicalPlan = await preflightOperations(mockDb, identicalOps);
  assert.equal(identicalPlan[0].action, "skip");
  assert.equal(identicalPlan[0].reason, "Existing document is identical");

  // 4. Preflight nonshared conflict rejection
  const conflictOps = [
    {
      path: "users/fb-user-1/gacha/main/payments/pay-conflict",
      entity: "payment",
      data: { schema_version: 1, amount: 50000, currency: "KRW", user_game_id: "entry-genshin" },
    },
  ];
  await assert.rejects(
    () => preflightOperations(mockDb, conflictOps),
    /Target conflict at 'users\/fb-user-1\/gacha\/main\/payments\/pay-conflict': Nonshared document already exists with conflicting data/
  );

  // 5. Preflight mismatched catalog ID rejection
  const mismatchOps = [
    {
      path: "users/fb-user-1/games/entry-mismatch",
      entity: "userGame",
      data: { id: "entry-mismatch", game_id: "expected-game" },
    },
  ];
  await assert.rejects(
    () => preflightOperations(mockDb, mismatchOps),
    /Target conflict at 'users\/fb-user-1\/games\/entry-mismatch': Existing game entry has game_id 'different-game', but migration expects 'expected-game'/
  );

  // 6. Apply runner uses create preconditions
  const createPlan = [
    {
      action: "create",
      op: {
        path: "users/fb-user-1/gacha/main/payments/pay-new",
        entity: "payment",
        data: { amount: 5000, currency: "KRW" },
      },
    },
  ];
  const fakeAdmin = { firestore: null };
  const applyRes = await applyBatches(mockDb, createPlan, fakeAdmin);
  assert.equal(applyRes.totalCommitted, 1);
  assert.equal(mockDb._store.get("users/fb-user-1/gacha/main/payments/pay-new").amount, 5000);
});

test("Supabase REST source pages with exact counts and rejects truncation", async () => {
  const { fetchSupabaseTable, getSupabaseSourceEnv } = await import("./lib/supabase-source.mjs");
  assert.throws(() => getSupabaseSourceEnv({}), /SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/);
  assert.throws(() => getSupabaseSourceEnv({ SUPABASE_URL: "http://example.test", SUPABASE_SERVICE_ROLE_KEY: "k" }), /https/);

  const all = Array.from({ length: 5 }, (_, i) => ({ id: `row-${i}` }));
  const calls = [];
  const fakeFetch = (total) => async (endpoint, init) => {
    calls.push({ url: String(endpoint), method: init.method });
    const offset = Number(endpoint.searchParams.get("offset"));
    const limit = Number(endpoint.searchParams.get("limit"));
    const page = all.slice(offset, offset + limit);
    return new Response(JSON.stringify(page), { status: 200, headers: { "content-range": `${offset}-${offset + page.length - 1}/${total}` } });
  };
  const rows = await fetchSupabaseTable("payments", { url: "https://example.test", key: "k", fetchImpl: fakeFetch(5), pageSize: 2 });
  assert.equal(rows.length, 5);
  assert.equal(calls.length, 3);
  assert.ok(calls.every((call) => call.method === "GET" && call.url.includes("order=id.asc")));

  await assert.rejects(
    fetchSupabaseTable("payments", { url: "https://example.test", key: "k", fetchImpl: fakeFetch(7), pageSize: 2 }),
    /Incomplete export for payments: fetched 5 of 7 rows/
  );
});
