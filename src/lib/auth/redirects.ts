export const DEFAULT_AUTH_NEXT = "/dashboard";

export function sanitizeNextPath(value: unknown, fallback = DEFAULT_AUTH_NEXT) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();

  if (!trimmed || !trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return fallback;
  }

  try {
    const parsed = new URL(trimmed, "https://gachaguard.local");
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function getAuthRedirectPath({
  auth,
  next,
}: {
  auth?: string;
  next?: string;
} = {}) {
  const target = sanitizeNextPath(next);
  const url = new URL(target, "https://gachaguard.local");

  if (auth) {
    url.searchParams.set("auth", auth);
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

export function getAuthOrigin({
  requestOrigin,
  siteUrl,
  vercelUrl,
}: {
  requestOrigin?: string | null;
  siteUrl?: string | null;
  vercelUrl?: string | null;
}) {
  const normalizedRequestOrigin = normalizeOrigin(requestOrigin);
  const normalizedSiteUrl = normalizeOrigin(siteUrl);
  const normalizedVercelUrl = normalizeOrigin(
    vercelUrl
      ? vercelUrl.startsWith("http")
        ? vercelUrl
        : `https://${vercelUrl}`
      : null,
  );

  if (normalizedRequestOrigin && isLocalOrigin(normalizedRequestOrigin)) {
    return normalizedRequestOrigin;
  }

  if (normalizedSiteUrl && !isLocalOrigin(normalizedSiteUrl)) {
    return normalizedSiteUrl;
  }

  return (
    normalizedRequestOrigin ??
    normalizedVercelUrl ??
    normalizedSiteUrl ??
    "http://localhost:3000"
  );
}

function normalizeOrigin(value?: string | null) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function isLocalOrigin(origin: string) {
  return (
    origin.startsWith("http://localhost") ||
    origin.startsWith("http://127.0.0.1")
  );
}
