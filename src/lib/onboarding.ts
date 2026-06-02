import { supabase } from "@/integrations/supabase/client";

export type TenantStatus = "pending" | "active" | "suspended" | "rejected";

export type InstitutionOnboardingPayload = {
  institution_name: string;
  email: string;
  phone?: string;
  website?: string;
  country?: string;
  institution_type?: string;
  address?: string;
  city?: string;
  state_province?: string;
  logo_url?: string;
  contact_name?: string;
};

export type OrganizationOnboardingPayload = {
  organization_name: string;
  email: string;
  phone?: string;
  website?: string;
  country?: string;
  industry?: string;
  contact_person_name?: string;
  contact_person_role?: string;
  logo_url?: string;
};

export async function uploadTenantLogo(
  file: File,
  bucket: "institution-logos" | "organization-logos",
  userId: string
): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${userId}/logo-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function registerInstitutionOnboarding(payload: InstitutionOnboardingPayload) {
  const { data, error } = await supabase.rpc("register_institution_onboarding", {
    _payload: payload as unknown as Record<string, unknown>,
  });
  if (error) throw error;
  return data as string;
}

export async function registerOrganizationOnboarding(payload: OrganizationOnboardingPayload) {
  const { data, error } = await supabase.rpc("register_organization_onboarding", {
    _payload: payload as unknown as Record<string, unknown>,
  });
  if (error) throw error;
  return data as string;
}
