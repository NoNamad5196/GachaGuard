import JSZip from "jszip";
import Papa from "papaparse";

import type { UserGame } from "@/lib/domain/dashboard";
import type { PaymentType } from "@/types/database";

export type GoogleImportSource = "google_play" | "google_pay";
export type GoogleImportStatus =
  | "ready"
  | "duplicate"
  | "needs_review"
  | "unsupported";
export type GoogleImportMatchConfidence = "high" | "medium" | "low" | "none";

export interface GoogleImportCandidate {
  id: string;
  source: GoogleImportSource;
  externalOrderId: string | null;
  importFingerprint: string;
  paidAt: string;
  amount: number;
  currency: string;
  merchant: string | null;
  rawDescription: string;
  appName: string | null;
  productName: string | null;
  suggestedUserGameId: string | null;
  suggestedGameName: string | null;
  matchConfidence: GoogleImportMatchConfidence;
  type: PaymentType;
  status: GoogleImportStatus;
  statusReason: string | null;
}

interface ParseContext {
  userGames: UserGame[];
  existingImportFingerprints?: string[];
}

interface RawPaymentRecord {
  source: GoogleImportSource;
  sourceFile: string;
  externalOrderId: string | null;
  paidAt: string | null;
  moneyText: string | null;
  amountText: string | null;
  currencyText: string | null;
  merchant: string | null;
  appName: string | null;
  productName: string | null;
  statusText: string | null;
  rawDescription: string;
}

type UnknownRecord = Record<string, unknown>;

const KRW_SYMBOLS = ["KRW", "₩", "원"];
const UNSUPPORTED_STATUS_PATTERN = /cancel|refund|void|fail|취소|환불|실패/i;

const FIELD_NAMES = {
  date: [
    "purchaseTime",
    "purchase_time",
    "transactionTime",
    "transaction_time",
    "transactionDate",
    "transaction_date",
    "purchase date",
    "date",
    "time",
  ],
  price: [
    "invoicePrice",
    "invoice_price",
    "formattedMoney",
    "formatted_money",
    "amount",
    "price",
    "total",
    "cost",
  ],
  currency: ["currency", "currencyCode", "currency_code"],
  orderId: [
    "orderId",
    "order_id",
    "transactionId",
    "transaction_id",
    "purchaseId",
    "purchase_id",
    "invoiceId",
    "invoice_id",
    "id",
  ],
  merchant: [
    "merchant",
    "merchantName",
    "merchant_name",
    "seller",
    "store",
    "paymentMethodTitle",
    "payment_method_title",
  ],
  app: ["app", "appName", "app_name", "application", "service", "doc", "document"],
  product: [
    "purchaseDetail",
    "purchase_detail",
    "productName",
    "product_name",
    "item",
    "itemName",
    "item_name",
    "title",
    "name",
    "description",
    "details",
  ],
  status: ["purchaseState", "purchase_state", "status", "state"],
};

const GAME_ALIASES: Record<string, string[]> = {
  "blue-archive": ["blue archive", "bluearchive", "블루 아카이브", "블아"],
  "genshin-impact": ["genshin", "genshin impact", "원신"],
  "wuthering-waves": ["wuthering waves", "wuwa", "명조", "명조 워더링 웨이브"],
};

export async function parseGooglePaymentFile(
  file: File,
  context: ParseContext,
): Promise<GoogleImportCandidate[]> {
  const fileName = file.name.toLowerCase();
  const rawRecords = fileName.endsWith(".zip")
    ? await parseZipFile(file)
    : await parsePaymentText(await file.text(), file.name);

  return normalizeRawRecords(rawRecords, context);
}

export function normalizeRawRecords(
  rawRecords: RawPaymentRecord[],
  context: ParseContext,
): GoogleImportCandidate[] {
  const existing = new Set(context.existingImportFingerprints ?? []);
  const seen = new Set<string>();

  return rawRecords
    .map((record) => toCandidate(record, context.userGames))
    .filter((candidate): candidate is GoogleImportCandidate => Boolean(candidate))
    .map((candidate, index) => ({ ...candidate, id: `${candidate.importFingerprint}-${index}` }))
    .map((candidate) => {
      const duplicate = existing.has(candidate.importFingerprint) || seen.has(candidate.importFingerprint);
      seen.add(candidate.importFingerprint);

      if (candidate.status === "unsupported") {
        return candidate;
      }

      if (duplicate) {
        return {
          ...candidate,
          status: "duplicate",
          statusReason: "이미 가져온 결제입니다.",
        };
      }

      if (!candidate.suggestedUserGameId) {
        return {
          ...candidate,
          status: "needs_review",
          statusReason: "게임 매핑을 확인해야 합니다.",
        };
      }

      return candidate;
    });
}

async function parseZipFile(file: File) {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const candidates: RawPaymentRecord[] = [];

  for (const entry of Object.values(zip.files)) {
    if (entry.dir) {
      continue;
    }

    const name = entry.name.toLowerCase();
    if (!name.endsWith(".json") && !name.endsWith(".csv")) {
      continue;
    }

    const text = await entry.async("string");
    candidates.push(...(await parsePaymentText(text, entry.name)));
  }

  return candidates;
}

async function parsePaymentText(text: string, fileName: string) {
  const trimmed = text.trim();

  if (!trimmed) {
    return [];
  }

  if (fileName.toLowerCase().endsWith(".json") || trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return parseJsonPayments(trimmed, fileName);
  }

  return parseCsvPayments(trimmed, fileName);
}

function parseJsonPayments(text: string, fileName: string) {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    return [];
  }

  const purchaseHistoryRecords = parsePurchaseHistoryPayments(parsed, fileName);
  if (purchaseHistoryRecords.length > 0) {
    return purchaseHistoryRecords;
  }

  const records: RawPaymentRecord[] = [];

  walkJson(parsed, (record) => {
    const paidAt = stringValue(getField(record, FIELD_NAMES.date));
    const moneyText = stringValue(getField(record, FIELD_NAMES.price));
    const productName = describeValue(getField(record, FIELD_NAMES.product));
    const appName = describeApp(getField(record, FIELD_NAMES.app)) ?? productName;
    const statusText = stringValue(getField(record, FIELD_NAMES.status));
    const merchant = stringValue(getField(record, FIELD_NAMES.merchant));
    const externalOrderId = stringValue(getField(record, FIELD_NAMES.orderId));
    const rawDescription = compactJoin([
      appName,
      productName,
      merchant,
      statusText,
      fileName,
    ]);

    if (!paidAt || !moneyText || !rawDescription) {
      return;
    }

    records.push({
      source: isGooglePlayRecord(record, fileName) ? "google_play" : "google_pay",
      sourceFile: fileName,
      externalOrderId,
      paidAt,
      moneyText,
      amountText: null,
      currencyText: null,
      merchant,
      appName,
      productName,
      statusText,
      rawDescription,
    });
  });

  return records;
}

function parsePurchaseHistoryPayments(value: unknown, fileName: string) {
  const records: UnknownRecord[] = [];
  collectPurchaseHistoryRecords(value, records);

  return records
    .map((record): RawPaymentRecord | null => {
      const paidAt = stringValue(getField(record, ["purchaseTime"]));
      const moneyText = stringValue(getField(record, ["invoicePrice"]));
      const doc = getField(record, ["doc", "document"]);
      const docTitle = describeApp(doc);
      const documentType = isRecord(doc)
        ? stringValue(getField(doc, ["documentType", "document_type"]))
        : null;
      const paymentMethodTitle = stringValue(getField(record, ["paymentMethodTitle"]));
      const userCountry = stringValue(getField(record, ["userCountry"]));
      const userLanguageCode = stringValue(getField(record, ["userLanguageCode"]));
      const rawDescription = compactJoin([
        docTitle,
        documentType ? `문서 유형: ${documentType}` : null,
        paymentMethodTitle ? `결제 수단: ${paymentMethodTitle}` : null,
        userCountry ? `국가: ${userCountry}` : null,
        userLanguageCode ? `언어: ${userLanguageCode}` : null,
      ]);

      if (!paidAt || !moneyText || !rawDescription) {
        return null;
      }

      return {
        source: "google_play",
        sourceFile: fileName,
        externalOrderId: null,
        paidAt,
        moneyText,
        amountText: null,
        currencyText: null,
        merchant: "Google Play",
        appName: docTitle,
        productName: docTitle,
        statusText: null,
        rawDescription,
      };
    })
    .filter((record): record is RawPaymentRecord => Boolean(record));
}

function collectPurchaseHistoryRecords(value: unknown, records: UnknownRecord[]) {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectPurchaseHistoryRecords(item, records);
    }
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  const purchaseHistory = getField(value, ["purchaseHistory", "purchase_history"]);
  if (isRecord(purchaseHistory)) {
    records.push(purchaseHistory);
    return;
  }

  for (const child of Object.values(value)) {
    collectPurchaseHistoryRecords(child, records);
  }
}

function parseCsvPayments(text: string, fileName: string) {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  return result.data
    .map((row): RawPaymentRecord | null => {
      const paidAt = stringValue(getField(row, FIELD_NAMES.date));
      const moneyText = stringValue(getField(row, FIELD_NAMES.price));
      const currencyText = stringValue(getField(row, FIELD_NAMES.currency));
      const productName = stringValue(getField(row, FIELD_NAMES.product));
      const appName = stringValue(getField(row, FIELD_NAMES.app)) ?? productName;
      const merchant = stringValue(getField(row, FIELD_NAMES.merchant));
      const statusText = stringValue(getField(row, FIELD_NAMES.status));
      const externalOrderId = stringValue(getField(row, FIELD_NAMES.orderId));
      const rawDescription = compactJoin([
        appName,
        productName,
        merchant,
        statusText,
        fileName,
      ]);

      if (!paidAt || (!moneyText && !currencyText) || !rawDescription) {
        return null;
      }

      return {
        source: fileName.toLowerCase().includes("play") ? "google_play" : "google_pay",
        sourceFile: fileName,
        externalOrderId,
        paidAt,
        moneyText,
        amountText: moneyText,
        currencyText,
        merchant,
        appName,
        productName,
        statusText,
        rawDescription,
      };
    })
    .filter((record): record is RawPaymentRecord => Boolean(record));
}

function walkJson(value: unknown, onRecord: (record: UnknownRecord) => void) {
  if (Array.isArray(value)) {
    for (const item of value) {
      if (isRecord(item) && isPaymentLikeRecord(item)) {
        onRecord(item);
      } else {
        walkJson(item, onRecord);
      }
    }
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  if (isPaymentLikeRecord(value)) {
    onRecord(value);
    return;
  }

  for (const child of Object.values(value)) {
    walkJson(child, onRecord);
  }
}

function isPaymentLikeRecord(record: UnknownRecord) {
  return Boolean(getField(record, FIELD_NAMES.date) && getField(record, FIELD_NAMES.price));
}

function isGooglePlayRecord(record: UnknownRecord, fileName: string) {
  return (
    fileName.toLowerCase().includes("play") ||
    Boolean(record.invoicePrice || record.purchaseTime || record.purchaseState)
  );
}

function toCandidate(
  record: RawPaymentRecord,
  userGames: UserGame[],
): GoogleImportCandidate | null {
  const date = parseDate(record.paidAt);
  const money = parseMoney(record.moneyText ?? record.amountText, record.currencyText);

  if (!date || !money) {
    return null;
  }

  const appName = cleanOptional(record.appName);
  const productName = cleanOptional(record.productName);
  const rawDescription = record.rawDescription.slice(0, 600);
  const match = matchUserGame(userGames, [appName, productName, rawDescription]);
  const statusUnsupported =
    money.currency !== "KRW" ||
    money.amount <= 0 ||
    Boolean(record.statusText && UNSUPPORTED_STATUS_PATTERN.test(record.statusText));
  const importFingerprint = createFingerprint([
    record.source,
    record.externalOrderId,
    date.toISOString(),
    money.amount,
    money.currency,
    appName,
    productName,
    rawDescription,
  ]);

  return {
    id: importFingerprint,
    source: record.source,
    externalOrderId: cleanOptional(record.externalOrderId),
    importFingerprint,
    paidAt: date.toISOString(),
    amount: money.amount,
    currency: money.currency,
    merchant: cleanOptional(record.merchant),
    rawDescription,
    appName,
    productName,
    suggestedUserGameId: match.userGame?.id ?? null,
    suggestedGameName: match.userGame?.games.name ?? null,
    matchConfidence: match.confidence,
    type: inferPaymentType([productName, rawDescription]),
    status: statusUnsupported ? "unsupported" : "ready",
    statusReason: statusUnsupported
      ? money.currency !== "KRW"
        ? "KRW 결제만 자동 저장할 수 있습니다."
        : "취소, 환불, 실패로 보이는 결제입니다."
      : null,
  };
}

function parseMoney(value: unknown, currencyHint?: unknown) {
  const text = compactJoin([stringValue(value), stringValue(currencyHint)]);

  if (!text) {
    return null;
  }

  const currency = detectCurrency(text);
  const numeric = text
    .replace(/[^\d.,-]/g, "")
    .replace(/,/g, "")
    .trim();
  const amount = Number.parseFloat(numeric);

  if (!Number.isFinite(amount)) {
    return null;
  }

  return {
    currency,
    amount: currency === "KRW" ? Math.round(amount) : Math.round(amount * 100) / 100,
  };
}

function detectCurrency(text: string) {
  if (KRW_SYMBOLS.some((symbol) => text.toUpperCase().includes(symbol))) {
    return "KRW";
  }

  if (/\bUSD\b|\$/i.test(text)) {
    return "USD";
  }

  if (/\bJPY\b|¥/i.test(text)) {
    return "JPY";
  }

  if (/\bEUR\b|€/i.test(text)) {
    return "EUR";
  }

  return "KRW";
}

function parseDate(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function inferPaymentType(values: Array<string | null>): PaymentType {
  const text = normalizeSearch(values.filter(Boolean).join(" "));

  if (/pass|subscription|monthly|월간|패스|구독/.test(text)) {
    return "pass";
  }

  if (/coin|gem|crystal|stone|jewel|원석|청휘석|수정|보석|코인/.test(text)) {
    return "coin";
  }

  if (/event|pack|bundle|패키지|팩/.test(text)) {
    return "event";
  }

  return "gacha";
}

function matchUserGame(userGames: UserGame[], values: Array<string | null>) {
  const haystack = normalizeSearch(values.filter(Boolean).join(" "));
  let best: {
    userGame: UserGame | null;
    confidence: GoogleImportMatchConfidence;
    score: number;
  } = { userGame: null, confidence: "none", score: 0 };

  for (const userGame of userGames) {
    const aliases = [
      userGame.games.name,
      userGame.games.slug,
      userGame.nickname,
      ...(GAME_ALIASES[userGame.games.slug] ?? []),
    ]
      .filter(Boolean)
      .map((alias) => normalizeSearch(String(alias)));

    for (const alias of aliases) {
      if (!alias) {
        continue;
      }

      const exact = haystack === alias;
      const contains = haystack.includes(alias) || alias.includes(haystack);
      const score = exact ? 100 : contains ? Math.min(90, alias.length * 4) : 0;

      if (score > best.score) {
        best = {
          userGame,
          confidence: exact || score >= 70 ? "high" : score >= 40 ? "medium" : "low",
          score,
        };
      }
    }
  }

  if (best.score <= 0) {
    return { userGame: null, confidence: "none" as const };
  }

  return { userGame: best.userGame, confidence: best.confidence };
}

function createFingerprint(parts: unknown[]) {
  const seed = parts.map((part) => String(part ?? "")).join("|");
  let hash = 0x811c9dc5;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return `google-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function getField(record: UnknownRecord, names: string[]) {
  const entries = Object.entries(record);

  for (const name of names) {
    const normalized = normalizeFieldName(name);
    const found = entries.find(([key]) => normalizeFieldName(key) === normalized);

    if (found) {
      return found[1];
    }
  }

  return undefined;
}

function describeApp(value: unknown) {
  if (!isRecord(value)) {
    return stringValue(value);
  }

  return (
    stringValue(getField(value, ["title", "name", "appName", "documentTitle"])) ??
    describeValue(value)
  );
}

function describeValue(value: unknown): string | null {
  if (Array.isArray(value)) {
    return compactJoin(value.map((item) => describeValue(item))).slice(0, 240) || null;
  }

  if (isRecord(value)) {
    return (
      stringValue(getField(value, ["title", "name", "displayName", "description"])) ??
      compactJoin(Object.values(value).map((item) => stringValue(item))).slice(0, 240) ??
      null
    );
  }

  return stringValue(value);
}

function stringValue(value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return null;
}

function cleanOptional(value: string | null) {
  return value?.trim() ? value.trim() : null;
}

function compactJoin(values: Array<unknown>) {
  return values
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean)
    .join(" · ");
}

function normalizeFieldName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s:：._()[\]\-–—]+/g, "");
}

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
