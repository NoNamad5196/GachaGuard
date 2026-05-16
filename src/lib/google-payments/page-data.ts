import { getAppDataOrRedirect } from "@/lib/page-data";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function getGoogleImportPageData() {
  const data = await getAppDataOrRedirect();

  if (data.isDemo || !hasSupabaseEnv()) {
    return { data, existingImportFingerprints: [] };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data, existingImportFingerprints: [] };
  }

  const { data: rows, error } = await supabase
    .from("payments")
    .select("import_fingerprint")
    .eq("user_id", user.id)
    .not("import_fingerprint", "is", null);

  if (error) {
    throw error;
  }

  return {
    data,
    existingImportFingerprints: (rows ?? [])
      .map((row) => row.import_fingerprint)
      .filter((fingerprint): fingerprint is string => Boolean(fingerprint)),
  };
}
