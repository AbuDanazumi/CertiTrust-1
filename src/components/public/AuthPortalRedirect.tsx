import { Navigate, useSearchParams } from "react-router-dom";

/**
 * Sends /login and /signup to dedicated portal routes.
 * Supports legacy ?role=institution|organization.
 */
export function AuthPortalRedirect({ kind }: { kind: "login" | "signup" }) {
  const [params] = useSearchParams();
  const role = params.get("role");
  const portal = role === "organization" ? "organization" : "institution";
  const target = kind === "login" ? `/login/${portal}` : `/signup/${portal}`;
  return <Navigate to={target} replace />;
}
