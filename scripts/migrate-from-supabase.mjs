#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { parseArgs } from "./lib/cli-args.mjs";
import { loadSourceData } from "./lib/data-loader.mjs";
import {
  transformSupabaseData,
  normalizeUidMapping,
} from "./lib/migration-core.mjs";
import { initFirebaseAdmin } from "./lib/firebase-admin-init.mjs";
import { discoverTargetUserGames, preflightOperations } from "./lib/target-preflight.mjs";
import { applyBatches } from "./lib/apply-runner.mjs";

export function printHelp() {
  console.log(`
OtakuS GachaGuard - Supabase to Firestore Migration Tool

Usage:
  node scripts/migrate-from-supabase.mjs [options]

Required Options:
  --uid-mapping <path>       Path to verified JSON UID mapping file (Supabase user UUID -> Firebase UID)
                             Email heuristics are strictly prohibited by the OtakuS contract.

Input Options (exactly one required):
  --input-json <path>        Path to exported JSON file containing table arrays
  --input-dir <path>         Path to directory containing table JSON/CSV files
  --source-supabase          Read tables directly (read-only, paginated, exact-count checked)
                             using SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY env vars

Execution Mode:
  --dry-run                  (Default) Validate and report planned changes without network writes
  --apply                    Execute writes to target Firestore (Batch writes <= 400 items per Spark quota)

Other Options:
  --existing-target <path>   Optional JSON containing existing target data for entryId reuse
  --output-report <path>     Write detailed JSON migration report to specified file
  --help, -h                 Show this help message
`);
}

export async function runMigration(options) {
  if (options.help) {
    printHelp();
    return { success: true, mode: "help" };
  }

  if (options.apply && options.dryRun) {
    throw new Error("Contradictory flags: Cannot specify both --apply and --dry-run.");
  }

  // 1. Validate UID Mapping
  if (!options.uidMapping) {
    throw new Error("Missing required option: --uid-mapping <path>");
  }
  if (!fs.existsSync(options.uidMapping)) {
    throw new Error("UID mapping file not found: " + options.uidMapping);
  }

  let rawUidMapping;
  try {
    rawUidMapping = JSON.parse(fs.readFileSync(options.uidMapping, "utf8"));
  } catch (err) {
    throw new Error("Failed to parse UID mapping JSON: " + err.message);
  }
  const uidMap = normalizeUidMapping(rawUidMapping);
  console.log("Loaded " + uidMap.size + " verified user mappings.");

  // 2. Load Source Data (local JSON/CSV export or read-only Supabase REST)
  const sourceData = await loadSourceData(options);

  // 3. Existing Target State handling
  let existingTarget = {};
  if (options.existingTarget && fs.existsSync(options.existingTarget)) {
    console.log("Loading existing target state from: " + options.existingTarget);
    const rawTarget = JSON.parse(fs.readFileSync(options.existingTarget, "utf8"));
    const userGamesMap = new Map();
    if (rawTarget.userGames) {
      for (const [uid, games] of Object.entries(rawTarget.userGames)) {
        const gameMap = new Map();
        for (const [gameId, entryId] of Object.entries(games)) {
          gameMap.set(gameId, entryId);
        }
        userGamesMap.set(uid, gameMap);
      }
    }
    existingTarget.userGames = userGamesMap;
  }

  let db = null;
  let admin = null;

  // 4. In --apply mode: initialize Firebase explicitly and discover target state
  if (options.apply) {
    admin = await import("firebase-admin");
    const app = initFirebaseAdmin(admin.default);
    db = admin.default.firestore(app);

    console.log("Discovering existing user games from target Firestore...");
    const discovered = await discoverTargetUserGames(db, uidMap);
    const mergedUserGames = existingTarget.userGames || new Map();
    for (const [uid, gameMap] of discovered.userGames) {
      if (!mergedUserGames.has(uid)) {
        mergedUserGames.set(uid, gameMap);
      } else {
        const existingMap = mergedUserGames.get(uid);
        for (const [gameId, entryId] of gameMap) {
          existingMap.set(gameId, entryId);
        }
      }
    }
    existingTarget.userGames = mergedUserGames;
  }

  // 5. Transform & Validate
  console.log("Transforming data according to OtakuS Firestore Contract v1...");
  const transformResult = transformSupabaseData(sourceData, {
    uidMapping: uidMap,
    existingTarget,
  });

  const { errors, warnings, operations, stats } = transformResult;

  if (warnings.length > 0) {
    console.log("\nWarnings (" + warnings.length + "):");
    for (const w of warnings) console.log("  [!] " + w);
  }

  if (errors.length > 0) {
    console.error("\nValidation Errors (" + errors.length + "):");
    for (const e of errors) console.error("  [x] " + e);
    if (options.outputReport) {
      fs.writeFileSync(
        options.outputReport,
        JSON.stringify({ valid: false, errors, warnings, stats }, null, 2),
        "utf8"
      );
    }
    throw new Error("Migration validation failed with " + errors.length + " errors.");
  }

  if (options.outputReport) {
    fs.writeFileSync(
      options.outputReport,
      JSON.stringify({ valid: true, stats, warnings, sampleOperations: operations.slice(0, 50) }, null, 2),
      "utf8"
    );
  }

  if (!options.apply) {
    console.log("DRY-RUN COMPLETE: Default mode. No network writes performed.");
    return {
      success: true,
      mode: "dry-run",
      operationsCount: operations.length,
      stats,
    };
  }

  // 6. Preflight checks in --apply mode
  console.log("Preflighting operations against target Firestore...");
  const preflightPlan = await preflightOperations(db, operations);

  // 7. Apply chunked batch writes
  console.log("Applying changes to Firestore...");
  const applyResult = await applyBatches(db, preflightPlan, admin.default);
  console.log("MIGRATION COMPLETE: Committed " + applyResult.totalCommitted + " documents (Skipped " + applyResult.skippedCount + ").");

  return {
    success: true,
    mode: "apply",
    committed: applyResult.totalCommitted,
    skipped: applyResult.skippedCount,
    stats,
  };
}

const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (isMainModule) {
  try {
    const parsedOptions = parseArgs(process.argv.slice(2));
    runMigration(parsedOptions).catch((err) => {
      console.error("Fatal Error:", err.message);
      process.exit(1);
    });
  } catch (err) {
    console.error("Fatal Error:", err.message);
    process.exit(1);
  }
}
