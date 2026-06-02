import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  registerInstitutionOnboarding,
  registerOrganizationOnboarding,
  type InstitutionOnboardingPayload,
  type OrganizationOnboardingPayload,
} from "@/lib/onboarding";

export type AccountType = "institution" | "organization";

export interface AuthValidationResult {
  success: boolean;
  message: string;
  role?: "staff" | "organization";
  requiresEmailConfirmation?: boolean;
}

type ProfileRow = {
  account_type: string | null;
  institution_id: string | null;
  organization_id: string | null;
  display_name: string | null;
  organization_name: string | null;
};

function resolveAccountType(profile: ProfileRow | null): AccountType {
  if (profile?.account_type === "organization") return "organization";
  if (profile?.account_type === "institution") return "institution";
  if (profile?.organization_id) return "organization";
  return "institution";
}

function hasExpectedRole(roles: string[], accountType: AccountType): boolean {
  if (accountType === "institution") return roles.includes("staff");
  return roles.includes("organization");
}

export async function provisionAccountAccess(
  accountType: AccountType,
  options?: { displayName?: string; organizationName?: string }
): Promise<AuthValidationResult> {
  if (accountType === "institution") {
    const { error } = await supabase.rpc("bootstrap_institution_access", {
      _institution_name: options?.displayName ?? null,
    });
    if (error) {
      return { success: false, message: error.message };
    }
    return { success: true, message: "Institution access provisioned", role: "staff" };
  }

  const { error } = await supabase.rpc("bootstrap_demo_org_access", {
    _org_name: options?.organizationName ?? options?.displayName ?? "My Organization",
  });
  if (error) {
    return { success: false, message: error.message };
  }
  return { success: true, message: "Organization access provisioned", role: "organization" };
}

export async function validateLoginCredentials(
  email: string,
  password: string,
  accountType: AccountType
): Promise<AuthValidationResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { success: false, message: "Invalid email or password" };
  }

  if (!data.session?.user.id) {
    return { success: false, message: "Failed to create session" };
  }

  const userId = data.session.user.id;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("account_type, institution_id, organization_id, display_name, organization_name")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileError) {
    await supabase.auth.signOut();
    return { success: false, message: "Failed to load user profile" };
  }

  const userAccountType = resolveAccountType(profile);

  if (userAccountType !== accountType) {
    await supabase.auth.signOut();
    const alternativeType = accountType === "institution" ? "Organization" : "University/Institution";
    return {
      success: false,
      message: `No account found for this account type. Please try switching to ${alternativeType}`,
    };
  }

  const needsProvision =
    (userAccountType === "institution" && !profile?.institution_id) ||
    (userAccountType === "organization" && !profile?.organization_id);

  if (needsProvision && profile?.account_type) {
    await supabase.auth.signOut();
    return {
      success: false,
      message: "Your registration is incomplete. Finish signup or contact support.",
    };
  }

  if (needsProvision) {
    const provisioned = await provisionAccountAccess(userAccountType, {
      displayName: profile?.display_name ?? undefined,
      organizationName: profile?.organization_name ?? undefined,
    });
    if (!provisioned.success) {
      await supabase.auth.signOut();
      return { success: false, message: provisioned.message };
    }
  }

  const { data: roles, error: rolesError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (rolesError) {
    await supabase.auth.signOut();
    return { success: false, message: "Failed to load user roles" };
  }

  const roleList = (roles ?? []).map((entry) => entry.role);

  if (roleList.includes("super_admin")) {
    await supabase.auth.signOut();
    return {
      success: false,
      message: "Super Admin accounts must sign in from the platform console",
    };
  }

  if (!hasExpectedRole(roleList, userAccountType)) {
    await supabase.auth.signOut();
    return {
      success: false,
      message: "Account is not provisioned for this portal. Contact support.",
    };
  }

  return {
    success: true,
    message: "Login successful",
    role: userAccountType === "institution" ? "staff" : "organization",
  };
}

export async function createAuthAccount(args: {
  email: string;
  password: string;
  displayName: string;
  accountType: AccountType;
  organizationName?: string;
}): Promise<AuthValidationResult> {
  const { email, password, displayName, accountType, organizationName } = args;

  if (!email || !password || !displayName) {
    return { success: false, message: "Please fill in all required fields" };
  }

  if (password.length < 6) {
    return { success: false, message: "Password must be at least 6 characters" };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}${accountType === "institution" ? "/login/institution" : "/login/organization"}`,
      data: {
        display_name: displayName,
        intended_role: accountType,
        account_type: accountType,
        organization_name: organizationName,
      },
    },
  });

  if (error) {
    if (error.message.includes("already registered")) {
      return { success: false, message: "An account with that email already exists" };
    }
    return { success: false, message: error.message };
  }

  if (!data.user?.id) {
    return { success: false, message: "Failed to create account" };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

  if (signInError) {
    return {
      success: true,
      message: "Account created! Check your email to confirm.",
      requiresEmailConfirmation: true,
    };
  }

  return { success: true, message: "Account created" };
}

export async function completeInstitutionOnboarding(payload: InstitutionOnboardingPayload) {
  await registerInstitutionOnboarding(payload);
  return { success: true, message: "Application submitted for review" };
}

export async function completeOrganizationOnboarding(payload: OrganizationOnboardingPayload) {
  await registerOrganizationOnboarding(payload);
  return { success: true, message: "Application submitted for review" };
}

export function useAuthValidation() {
  const [validating, setValidating] = useState(false);

  const validateLogin = useCallback(
    async (email: string, password: string, accountType: AccountType): Promise<AuthValidationResult> => {
      setValidating(true);
      try {
        return await validateLoginCredentials(email, password, accountType);
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : "An error occurred",
        };
      } finally {
        setValidating(false);
      }
    },
    []
  );

  const submitInstitutionOnboarding = useCallback(
    async (payload: InstitutionOnboardingPayload & { password: string }) => {
      setValidating(true);
      try {
        const auth = await createAuthAccount({
          email: payload.email,
          password: payload.password,
          displayName: payload.institution_name,
          accountType: "institution",
        });
        if (!auth.success) return auth;
        if (auth.requiresEmailConfirmation) return auth;

        await completeInstitutionOnboarding(payload);
        return { success: true, message: "Application submitted for review", role: "staff" as const };
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : "Registration failed",
        };
      } finally {
        setValidating(false);
      }
    },
    []
  );

  const submitOrganizationOnboarding = useCallback(
    async (payload: OrganizationOnboardingPayload & { password: string }) => {
      setValidating(true);
      try {
        const auth = await createAuthAccount({
          email: payload.email,
          password: payload.password,
          displayName: payload.contact_person_name ?? payload.organization_name,
          accountType: "organization",
          organizationName: payload.organization_name,
        });
        if (!auth.success) return auth;
        if (auth.requiresEmailConfirmation) return auth;

        await completeOrganizationOnboarding(payload);
        return { success: true, message: "Application submitted for review", role: "organization" as const };
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : "Registration failed",
        };
      } finally {
        setValidating(false);
      }
    },
    []
  );

  return {
    validateLogin,
    validating,
    submitInstitutionOnboarding,
    submitOrganizationOnboarding,
  };
}
