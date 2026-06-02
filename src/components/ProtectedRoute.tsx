import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { PendingApprovalView } from "@/components/onboarding/PendingApprovalView";
import { useAuth } from "@/hooks/useAuth";
import type { TenantStatus } from "@/lib/onboarding";
import { RoleRequiredMessage } from "./RoleRequiredMessage";

export type ProtectedRouteRole = "staff" | "organization" | "super_admin" | "any";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: ProtectedRouteRole;
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  requiredRole = "any",
  redirectTo = "/login/institution",
}: ProtectedRouteProps) {
  const auth = useAuth();

  // Still loading auth state
  if (auth.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!auth.session) {
    return <Navigate to={redirectTo} replace />;
  }

  const blocked =
    requiredRole !== "super_admin" &&
    auth.tenantStatus &&
    auth.tenantStatus !== "active"
      ? (auth.tenantStatus as Exclude<TenantStatus, "active">)
      : null;

  if (blocked) {
    const tenantLabel =
      requiredRole === "organization" || auth.accountType === "organization"
        ? "Organization"
        : "Institution";
    return (
      <PendingApprovalView
        tenantLabel={tenantLabel}
        tenantName={auth.tenantName}
        status={blocked}
        onSignOut={() => void auth.signOut()}
      />
    );
  }

  // Check role if required
  if (requiredRole !== "any") {
    if (!auth.role || auth.role !== requiredRole) {
      return <RoleRequiredMessage expectedRole={requiredRole} userRole={auth.role ?? undefined} />;
    }
  }

  // All checks passed
  return <>{children}</>;
}
