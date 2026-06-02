import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { provisionAccountAccess } from "@/hooks/useAuthValidation";
import type { TenantStatus } from "@/lib/onboarding";

export type AppRole = "super_admin" | "staff" | "verifier" | "organization";

export type AuthState = {
  session: Session | null;
  loading: boolean;
  role: AppRole | null;
  accountType: "institution" | "organization" | null;
  institutionId: string | null;
  organizationId: string | null;
  displayName: string | null;
  email: string | null;
  tenantStatus: TenantStatus | null;
  tenantName: string | null;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const ROLE_PRIORITY: AppRole[] = ["super_admin", "staff", "organization", "verifier"];

function resolveRole(roles: AppRole[]): AppRole | null {
  return ROLE_PRIORITY.find((role) => roles.some((entry) => entry === role)) ?? null;
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<AppRole | null>(null);
  const [accountType, setAccountType] = useState<"institution" | "organization" | null>(null);
  const [institutionId, setInstitutionId] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [tenantStatus, setTenantStatus] = useState<TenantStatus | null>(null);
  const [tenantName, setTenantName] = useState<string | null>(null);

  const hydrate = useCallback(async (activeSession: Session | null) => {
    if (!activeSession?.user) {
      setRole(null);
      setAccountType(null);
      setInstitutionId(null);
      setOrganizationId(null);
      setDisplayName(null);
      setEmail(null);
      setTenantStatus(null);
      setTenantName(null);
      return;
    }

    setEmail(activeSession.user.email ?? null);

    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase
        .from("profiles")
        .select("display_name,institution_id,organization_id,email,account_type,organization_name")
        .eq("user_id", activeSession.user.id)
        .maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", activeSession.user.id),
    ]);

    let nextProfile = profile;
    let nextRoles = (roles ?? []) as { role: AppRole }[];

    if (!nextProfile?.account_type && !nextProfile?.institution_id && !nextProfile?.organization_id) {
      const provisioned = await provisionAccountAccess("institution", {
        displayName: nextProfile?.display_name ?? undefined,
      });
      if (!provisioned.success) {
        toast.error(provisioned.message);
      } else {
        const [{ data: refreshedProfile }, { data: refreshedRoles }] = await Promise.all([
          supabase
            .from("profiles")
            .select("display_name,institution_id,organization_id,email,account_type,organization_name")
            .eq("user_id", activeSession.user.id)
            .maybeSingle(),
          supabase.from("user_roles").select("role").eq("user_id", activeSession.user.id),
        ]);
        nextProfile = refreshedProfile;
        nextRoles = (refreshedRoles ?? []) as { role: AppRole }[];
      }
    }

    setDisplayName(nextProfile?.display_name ?? null);
    setInstitutionId(nextProfile?.institution_id ?? null);
    setOrganizationId(nextProfile?.organization_id ?? null);
    setAccountType(
      nextProfile?.account_type === "institution" || nextProfile?.account_type === "organization"
        ? nextProfile.account_type
        : null
    );

    setRole(resolveRole(nextRoles.map((entry) => entry.role)));

    let status: TenantStatus | null = null;
    let name: string | null = null;
    if (nextProfile?.institution_id) {
      const { data: inst } = await supabase
        .from("institutions")
        .select("name,status")
        .eq("id", nextProfile.institution_id)
        .maybeSingle();
      status = (inst?.status as TenantStatus) ?? null;
      name = inst?.name ?? null;
    } else if (nextProfile?.organization_id) {
      const { data: org } = await supabase
        .from("organizations")
        .select("name,status")
        .eq("id", nextProfile.organization_id)
        .maybeSingle();
      status = (org?.status as TenantStatus) ?? null;
      name = org?.name ?? null;
    }
    setTenantStatus(status);
    setTenantName(name);
  }, []);

  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      void hydrate(nextSession);
    });

    void supabase.auth.getSession().then(({ data: { session: nextSession } }) => {
      setSession(nextSession);
      void hydrate(nextSession).finally(() => setLoading(false));
    });

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, [hydrate]);

  return {
    session,
    loading,
    role,
    accountType,
    institutionId,
    organizationId,
    displayName,
    email,
    tenantStatus,
    tenantName,
    signOut: async () => {
      await supabase.auth.signOut();
      toast.success("Signed out");
    },
    refresh: useCallback(async () => {
      await hydrate(session);
    }, [session, hydrate]),
  };
}
