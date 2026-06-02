import type { Database } from "@/integrations/supabase/types";

export type TenantReviewStatus = Database["public"]["Enums"]["org_status"];

export function institutionReviewPatch(status: TenantReviewStatus) {
  if (status === "active") {
    return { status, is_active: true, verification_enabled: true };
  }
  if (status === "suspended" || status === "rejected") {
    return { status, is_active: false, verification_enabled: false };
  }
  return { status };
}

export function organizationReviewPatch(status: TenantReviewStatus) {
  if (status === "active") {
    return { status, is_active: true };
  }
  if (status === "suspended" || status === "rejected") {
    return { status, is_active: false };
  }
  return { status };
}

export function orgStatusBadgeClass(status: string): string {
  if (status === "active") return "border-success/30 bg-success/15 text-success";
  if (status === "suspended") return "border-destructive/30 bg-destructive/15 text-destructive";
  if (status === "rejected") return "border-destructive/30 bg-destructive/10 text-destructive";
  return "border-warning/40 bg-warning/20 text-warning-foreground";
}
