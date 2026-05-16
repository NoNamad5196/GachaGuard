import { redirect } from "next/navigation";

import { getAuthRedirectPath, sanitizeNextPath } from "@/lib/auth/redirects";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ auth?: string; next?: string }>;
}) {
  const params = await searchParams;
  const nextPath = sanitizeNextPath(params.next);
  const destination = nextPath.startsWith("/login") ? "/dashboard" : nextPath;

  redirect(
    getAuthRedirectPath({
      auth: params.auth ?? "required",
      next: destination,
    }),
  );
}
