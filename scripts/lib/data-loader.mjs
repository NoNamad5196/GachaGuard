import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";

export const TABLE_NAMES = [
  "profiles",
  "games",
  "user_games",
  "budgets",
  "payments",
  "payment_templates",
  "banners",
  "user_banners",
  "pull_sessions",
  "pulls",
  "gacha_logs",
  "guardrail_rules",
];

export async function loadFromDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    throw new Error("Input directory not found: " + dirPath);
  }
  const data = {};
  for (const table of TABLE_NAMES) {
    const jsonPath = path.join(dirPath, table + ".json");
    const csvPath = path.join(dirPath, table + ".csv");

    if (fs.existsSync(jsonPath)) {
      try {
        const raw = fs.readFileSync(jsonPath, "utf8");
        data[table] = JSON.parse(raw);
      } catch (err) {
        throw new Error("Failed to parse JSON file " + jsonPath + ": " + err.message);
      }
    } else if (fs.existsSync(csvPath)) {
      try {
        const raw = fs.readFileSync(csvPath, "utf8");
        const parsed = Papa.parse(raw, { header: true, dynamicTyping: true, skipEmptyLines: true });
        data[table] = parsed.data;
      } catch (err) {
        throw new Error("Failed to parse CSV file " + csvPath + ": " + err.message);
      }
    } else {
      data[table] = [];
    }
  }
  return data;
}

export async function loadSourceData(options) {
  if (options.inputJson) {
    if (!fs.existsSync(options.inputJson)) {
      throw new Error("Input JSON file not found: " + options.inputJson);
    }
    try {
      const raw = fs.readFileSync(options.inputJson, "utf8");
      return JSON.parse(raw);
    } catch (err) {
      throw new Error("Failed to parse input JSON: " + err.message);
    }
  }
  if (options.inputDir) {
    return loadFromDirectory(options.inputDir);
  }
  if (options.sourceSupabase) {
    const { loadFromSupabase } = await import("./supabase-source.mjs");
    return loadFromSupabase();
  }
  throw new Error("No input source specified. Provide --input-json, --input-dir or --source-supabase.");
}
