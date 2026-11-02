import { getAppDataOrRedirect } from "@/lib/page-data";
import { getAdminDb } from "@/lib/firebase/admin";
import { getSessionUser } from "@/lib/firebase/session";

export async function getGoogleImportPageData() {
  const data = await getAppDataOrRedirect();

  if (data.isDemo) {
    return { data, existingImportFingerprints: [] };
  }

  const user = await getSessionUser();

  if (!user) {
    return { data, existingImportFingerprints: [] };
  }

  // Preview only: the transaction performs authoritative dedupe for all history.
  const rows = await getAdminDb().collection(`users/${user.uid}/gacha/main/payments`)
    .where("import_fingerprint", "!=", null).limit(1000).get();

  return {
    data,
    existingImportFingerprints: rows.docs
      .map((row) => row.get("import_fingerprint"))
      .filter((fingerprint): fingerprint is string => typeof fingerprint === "string"),
  };
}
