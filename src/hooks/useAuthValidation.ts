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

export async function checkOnboardingStatus(email: string): Promise<{
  exists: boolean;
  profile_exists?: boolean;
  role_exists?: boolean;
  tenant_exists?: boolean;
  account_type?: string;
  incomplete?: boolean;
}> {
  const { data, error } = await supabase.rpc("check_onboarding_status", {
    _email: email,
  });
  if (error) {
    if (import.meta.env.DEV) {
      console.error("[Auth Debug] check_onboarding_status RPC failed:", error.message);
    }
    return { exists: false };
  }
  return data as any;
}

export async function validateLoginCredentials(
  email: string,
  password: string,
  accountType: AccountType
): Promise<AuthValidationResult> {
  if (import.meta.env.DEV) {
    console.log("[Auth Debug] Login started for", email, "portal:", accountType);
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (import.meta.env.DEV) {
      console.log("[Auth Debug] signInWithPassword error:", error.message);
    }
    if (
      error.message.toLowerCase().includes("confirm") ||
      error.message.toLowerCase().includes("verified") ||
      error.message.toLowerCase().includes("verification")
    ) {
      return { success: false, message: "Please verify your email before signing in." };
    }
    return { success: false, message: "Incorrect email or password." };
  }

  if (!data.session?.user.id) {
    return { success: false, message: "Failed to create session" };
  }

  const userId = data.session.user.id;
  if (import.meta.env.DEV) {
    console.log("[Auth Debug] Authentication successful. User ID:", userId);
  }

  // Fetch profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("account_type, institution_id, organization_id, display_name, organization_name, is_active")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileError) {
    if (import.meta.env.DEV) {
      console.error("[Auth Debug] Failed to load user profile:", profileError.message);
    }
    await supabase.auth.signOut();
    return { success: false, message: "Failed to load user profile" };
  }

  if (import.meta.env.DEV) {
    console.log("[Auth Debug] Profile loaded:", profile);
  }

  // Check suspended account (profile level)
  if (profile && profile.is_active === false) {
    if (import.meta.env.DEV) {
      console.log("[Auth Debug] Profile is suspended (is_active = false)");
    }
    await supabase.auth.signOut();
    return {
      success: false,
      message: "Your account has been suspended. Please contact support.",
    };
  }

  const userAccountType = resolveAccountType(profile);

  if (userAccountType !== accountType) {
    if (import.meta.env.DEV) {
      console.log("[Auth Debug] Selected portal mismatch. Expected:", accountType, "Got:", userAccountType);
    }
    await supabase.auth.signOut();
    return {
      success: false,
      message: "This account belongs to another portal. Please choose the correct account type.",
    };
  }

  const needsProvision =
    (userAccountType === "institution" && !profile?.institution_id) ||
    (userAccountType === "organization" && !profile?.organization_id);

  if (needsProvision && profile?.account_type) {
    if (import.meta.env.DEV) {
      console.log("[Auth Debug] Profile account_type exists but tenant ID is missing (incomplete onboarding)");
    }
    await supabase.auth.signOut();
    return {
      success: false,
      message: "Your account setup is incomplete.",
    };
  }

  if (needsProvision) {
    if (import.meta.env.DEV) {
      console.log("[Auth Debug] Needs provisioning. Autoprovisioning access...");
    }
    const provisioned = await provisionAccountAccess(userAccountType, {
      displayName: profile?.display_name ?? undefined,
      organizationName: profile?.organization_name ?? undefined,
    });
    if (!provisioned.success) {
      await supabase.auth.signOut();
      return { success: false, message: provisioned.message };
    }
  }

  // Check suspended account (tenant level)
  if (userAccountType === "institution" && profile?.institution_id) {
    const { data: inst } = await supabase
      .from("institutions")
      .select("is_active, status")
      .eq("id", profile.institution_id)
      .maybeSingle();
    if (inst && (inst.is_active === false || inst.status === "suspended")) {
      if (import.meta.env.DEV) {
        console.log("[Auth Debug] Institution is suspended/inactive:", inst);
      }
      await supabase.auth.signOut();
      return {
        success: false,
        message: "Your account has been suspended. Please contact support.",
      };
    }
  } else if (userAccountType === "organization" && profile?.organization_id) {
    const { data: org } = await supabase
      .from("organizations")
      .select("is_active, status")
      .eq("id", profile.organization_id)
      .maybeSingle();
    if (org && (org.is_active === false || org.status === "suspended")) {
      if (import.meta.env.DEV) {
        console.log("[Auth Debug] Organization is suspended/inactive:", org);
      }
      await supabase.auth.signOut();
      return {
        success: false,
        message: "Your account has been suspended. Please contact support.",
      };
    }
  }

  // Fetch roles
  const { data: roles, error: rolesError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (rolesError) {
    if (import.meta.env.DEV) {
      console.error("[Auth Debug] Failed to load user roles:", rolesError.message);
    }
    await supabase.auth.signOut();
    return { success: false, message: "Failed to load user roles" };
  }

  const roleList = (roles ?? []).map((entry) => entry.role);
  if (import.meta.env.DEV) {
    console.log("[Auth Debug] Roles loaded:", roleList);
  }

  if (roleList.includes("super_admin")) {
    await supabase.auth.signOut();
    return {
      success: false,
      message: "Super Admin accounts must sign in from the platform console",
    };
  }

  if (!hasExpectedRole(roleList, userAccountType)) {
    if (import.meta.env.DEV) {
      console.log("[Auth Debug] User is missing expected role for", userAccountType);
    }
    await supabase.auth.signOut();
    return {
      success: false,
      message: "Your account setup is incomplete.",
    };
  }

  if (import.meta.env.DEV) {
    console.log("[Auth Debug] Portal verified. Login successful!");
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
  metadata?: Record<string, any>;
}): Promise<AuthValidationResult> {
  const { email, password, displayName, accountType, organizationName, metadata } = args;

  if (import.meta.env.DEV) {
    console.log("[Auth Debug] Registration started for", email);
  }

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
        onboarding_payload: metadata,
      },
    },
  });

  if (error) {
    if (error.message.includes("already registered")) {
      return { success: false, message: "This email is already registered." };
    }
    return { success: false, message: error.message };
  }

  if (import.meta.env.DEV) {
    console.log("[Auth Debug] Auth user created successfully:", data.user?.id);
  }

  if (!data.user?.id) {
    return { success: false, message: "Failed to create account" };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

  if (signInError) {
    if (import.meta.env.DEV) {
      console.log("[Auth Debug] signInWithPassword failed (pending confirmation or rate limited):", signInError.message);
    }
    return {
      success: true,
      message: "Account created! Check your email to confirm.",
      requiresEmailConfirmation: true,
    };
  }

  if (import.meta.env.DEV) {
    console.log("[Auth Debug] Registration completed successfully (signed in).");
  }

  return { success: true, message: "Account created" };
}

export async function completeInstitutionOnboarding(payload: InstitutionOnboardingPayload) {
  if (import.meta.env.DEV) {
    console.log("[Auth Debug] Completing institution onboarding...");
  }
  await registerInstitutionOnboarding(payload);
  if (import.meta.env.DEV) {
    console.log("[Auth Debug] Institution onboarding completed.");
  }
  return { success: true, message: "Application submitted for review" };
}

export async function completeOrganizationOnboarding(payload: OrganizationOnboardingPayload) {
  if (import.meta.env.DEV) {
    console.log("[Auth Debug] Completing organization onboarding...");
  }
  await registerOrganizationOnboarding(payload);
  if (import.meta.env.DEV) {
    console.log("[Auth Debug] Organization onboarding completed.");
  }
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
        if (import.meta.env.DEV) {
          console.log("[Auth Debug] submitInstitutionOnboarding started for", payload.email);
        }

        // Check if user is already registered and handle duplicate registration
        const status = await checkOnboardingStatus(payload.email);
        if (status.exists) {
          if (!status.incomplete) {
            return { success: false, message: "This email is already registered." };
          }
          
          if (import.meta.env.DEV) {
            console.log("[Auth Debug] Incomplete registration found. Attempting to repair via auto-onboarding login...");
          }

          // Incomplete registration: attempt login first to verify password and get session
          const loginRes = await supabase.auth.signInWithPassword({
            email: payload.email,
            password: payload.password,
          });

          if (loginRes.error) {
            return { success: false, message: "This email is already registered." };
          }

          // Complete onboarding idempotently
          await completeInstitutionOnboarding(payload);
          
          if (import.meta.env.DEV) {
            console.log("[Auth Debug] Incomplete registration successfully repaired.");
          }
          return { success: true, message: "Application submitted for review", role: "staff" as const };
        }

        const auth = await createAuthAccount({
          email: payload.email,
          password: payload.password,
          displayName: payload.institution_name,
          accountType: "institution",
          metadata: payload,
        });
        if (!auth.success) return auth;
        if (auth.requiresEmailConfirmation) return auth;

        await completeInstitutionOnboarding(payload);
        return { success: true, message: "Application submitted for review", role: "staff" as const };
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("[Auth Debug] submitInstitutionOnboarding failed:", error);
        }
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
        if (import.meta.env.DEV) {
          console.log("[Auth Debug] submitOrganizationOnboarding started for", payload.email);
        }

        // Check if user is already registered and handle duplicate registration
        const status = await checkOnboardingStatus(payload.email);
        if (status.exists) {
          if (!status.incomplete) {
            return { success: false, message: "This email is already registered." };
          }

          if (import.meta.env.DEV) {
            console.log("[Auth Debug] Incomplete registration found. Attempting to repair via auto-onboarding login...");
          }

          // Incomplete registration: attempt login first to verify password and get session
          const loginRes = await supabase.auth.signInWithPassword({
            email: payload.email,
            password: payload.password,
          });

          if (loginRes.error) {
            return { success: false, message: "This email is already registered." };
          }

          // Complete onboarding idempotently
          await completeOrganizationOnboarding(payload);
          
          if (import.meta.env.DEV) {
            console.log("[Auth Debug] Incomplete registration successfully repaired.");
          }
          return { success: true, message: "Application submitted for review", role: "organization" as const };
        }

        const auth = await createAuthAccount({
          email: payload.email,
          password: payload.password,
          displayName: payload.contact_person_name ?? payload.organization_name,
          accountType: "organization",
          organizationName: payload.organization_name,
          metadata: payload,
        });
        if (!auth.success) return auth;
        if (auth.requiresEmailConfirmation) return auth;

        await completeOrganizationOnboarding(payload);
        return { success: true, message: "Application submitted for review", role: "organization" as const };
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("[Auth Debug] submitOrganizationOnboarding failed:", error);
        }
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
