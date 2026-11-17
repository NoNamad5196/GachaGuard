// Read-only Supabase PostgREST export used only when --source-supabase is given.
// Pages explicitly (order=id, limit/offset) and checks the exact row count so the
// default 1,000-row response cap can never silently truncate a table.
import { TABLE_NAMES } from "./data-loader.mjs";

export const SUPABASE_PAGE_SIZE = 1000;

export function getSupabaseSourceEnv(env = process.env) {
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE;
  if (!url || !key) {
    throw new Error("--source-supabase requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.");
  }
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(parsed.hostname)) {
    throw new Error("SUPABASE_URL must use https (http is allowed only for localhost).");
  }
  return { url: parsed.origin, key };
}

function parseTotal(contentRange) {
  const total = contentRange?.split("/")[1];
  if (!total || total === "*") throw new Error("Supabase did not return an exact row count (Content-Range).");
  const value = Number(total);
  if (!Number.isInteger(value) || value < 0) throw new Error("Invalid Content-Range total: " + contentRange);
  return value;
}

export async function fetchSupabaseTable(table, { url, key, fetchImpl = fetch, pageSize = SUPABASE_PAGE_SIZE }) {
  const rows = [];
  let expected = null;
  for (let offset = 0; ; offset += pageSize) {
    const endpoint = new URL(`/rest/v1/${table}`, url);
    endpoint.searchParams.set("select", "*");
    endpoint.searchParams.set("order", "id.asc");
    endpoint.searchParams.set("limit", String(pageSize));
    endpoint.searchParams.set("offset", String(offset));
    const response = await fetchImpl(endpoint, {
      method: "GET",
      headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json", Prefer: "count=exact" },
    });
    if (!response.ok) {
      throw new Error(`Supabase read failed for ${table} (HTTP ${response.status}).`);
    }
    const total = parseTotal(response.headers.get("content-range"));
    if (expected === null) expected = total;
    else if (expected !== total) throw new Error(`Row count of ${table} changed during export; retry on a quiescent database.`);
    const page = await response.json();
    if (!Array.isArray(page)) throw new Error(`Unexpected response shape for ${table}.`);
    rows.push(...page);
    if (page.length < pageSize || rows.length >= expected) break;
  }
  if (rows.length !== expected) {
    throw new Error(`Incomplete export for ${table}: fetched ${rows.length} of ${expected} rows.`);
  }
  return rows;
}

export async function loadFromSupabase({ env = process.env, fetchImpl = fetch, pageSize } = {}) {
  const source = getSupabaseSourceEnv(env);
  const data = {};
  for (const table of TABLE_NAMES) {
    data[table] = await fetchSupabaseTable(table, { ...source, fetchImpl, pageSize });
  }
  return data;
}
