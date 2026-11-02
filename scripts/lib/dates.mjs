export function parseDate(val) {
  if (!val) return null;
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export function toIsoString(val, fallback = new Date().toISOString()) {
  const d = parseDate(val);
  return d ? d.toISOString() : fallback;
}

export function toTimestampObj(val, fallback = new Date()) {
  const d = parseDate(val) || fallback;
  const seconds = Math.floor(d.getTime() / 1000);
  const nanoseconds = (d.getTime() % 1000) * 1000000;
  return {
    _firestoreTimestamp: true,
    seconds,
    nanoseconds,
    toDate: () => d,
    toISOString: () => d.toISOString(),
  };
}

export function convertToFirestoreValue(val, admin) {
  if (val === null || val === undefined) return null;
  if (val && typeof val === "object") {
    if (val._firestoreTimestamp) {
      if (admin && admin.firestore && admin.firestore.Timestamp) {
        return new admin.firestore.Timestamp(val.seconds, val.nanoseconds);
      }
      return val.toISOString();
    }
    if (Array.isArray(val)) {
      return val.map((item) => convertToFirestoreValue(item, admin));
    }
    const res = {};
    for (const [k, v] of Object.entries(val)) {
      res[k] = convertToFirestoreValue(v, admin);
    }
    return res;
  }
  return val;
}
