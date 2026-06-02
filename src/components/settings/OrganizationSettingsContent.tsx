import { FormEvent, useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { SettingsPageLayout } from "./SettingsPageLayout";
import { SecuritySettingsPanel } from "./SecuritySettingsPanel";
import { SettingsSection } from "./SettingsSection";

const INDUSTRIES = [
  "Human Resources",
  "Immigration & Compliance",
  "Education & Admissions",
  "Government",
  "Financial Services",
  "Healthcare",
  "Other",
] as const;

export function OrganizationSettingsContent() {
  const auth = useAuth();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);

  const [profile, setProfile] = useState({
    display_name: "",
    email: "",
    job_title: "",
  });

  const [organization, setOrganization] = useState({
    name: "",
    industry: "",
    org_type: "",
    email: "",
    phone: "",
    website: "",
    country: "",
    address: "",
    logo_url: "",
    notification_email: "",
    contact_person_name: "",
    contact_person_role: "",
    status: "",
  });

  useEffect(() => {
    void (async () => {
      if (!auth.session?.user.id) return;
      setLoading(true);

      const [{ data: prof }, orgQuery] = await Promise.all([
        supabase
          .from("profiles")
          .select("display_name,email,job_title")
          .eq("user_id", auth.session.user.id)
          .maybeSingle(),
        auth.organizationId
          ? supabase.from("organizations").select("*").eq("id", auth.organizationId).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      if (prof) {
        setProfile({
          display_name: prof.display_name ?? "",
          email: prof.email ?? auth.email ?? "",
          job_title: prof.job_title ?? "",
        });
      }

      const org = orgQuery.data;
      if (org) {
        setOrganization({
          name: org.name ?? "",
          industry: org.industry ?? "",
          org_type: org.org_type ?? "",
          email: org.email ?? "",
          phone: org.phone ?? "",
          website: org.website ?? "",
          country: org.country ?? "",
          address: org.address ?? "",
          logo_url: org.logo_url ?? "",
          notification_email: org.notification_email ?? "",
          contact_person_name: org.contact_person_name ?? "",
          contact_person_role: org.contact_person_role ?? "",
          status: org.status ?? "",
        });
      }

      setLoading(false);
    })();
  }, [auth.session?.user.id, auth.organizationId, auth.email]);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    if (!auth.session?.user.id) return;
    setProfileBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: profile.display_name.trim() || null,
        job_title: profile.job_title.trim() || null,
      })
      .eq("user_id", auth.session.user.id);
    setProfileBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Profile updated");
      void auth.refresh();
    }
  }

  async function saveOrganization(e: FormEvent) {
    e.preventDefault();
    if (!auth.organizationId) return;
    setBusy(true);
    const industry = organization.industry.trim();
    const { error } = await supabase
      .from("organizations")
      .update({
        name: organization.name.trim(),
        industry: industry || null,
        org_type: organization.org_type.trim() || industry || "Company",
        email: organization.email.trim() || null,
        phone: organization.phone.trim() || null,
        website: organization.website.trim() || null,
        country: organization.country.trim() || null,
        address: organization.address.trim() || null,
        logo_url: organization.logo_url.trim() || null,
        notification_email: organization.notification_email.trim() || null,
        contact_person_name: organization.contact_person_name.trim() || null,
        contact_person_role: organization.contact_person_role.trim() || null,
      })
      .eq("id", auth.organizationId);
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Organization settings saved");
  }

  if (loading) {
    return <Skeleton className="h-96 w-full max-w-3xl" />;
  }

  const profileTab = (
    <SettingsSection title="Your account" description="Personal details for this organization portal.">
      <form onSubmit={saveProfile} className="grid gap-4">
        <div className="grid gap-1.5">
          <Label>Full name</Label>
          <Input
            value={profile.display_name}
            onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Role / title</Label>
          <Input
            value={profile.job_title}
            onChange={(e) => setProfile({ ...profile, job_title: e.target.value })}
            placeholder="HR Manager, Compliance Lead…"
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Sign-in email</Label>
          <Input value={profile.email} disabled className="bg-muted/40" />
        </div>
        <Button type="submit" variant="premium" disabled={profileBusy} className="justify-self-start">
          {profileBusy ? <Loader2 className="animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          Save profile
        </Button>
      </form>
    </SettingsSection>
  );

  const organizationTab = (
    <SettingsSection title="Organization profile" description="Company details used on verification reports.">
      <form onSubmit={saveOrganization} className="grid gap-4">
        <div className="grid gap-1.5">
          <Label>Organization name</Label>
          <Input
            value={organization.name}
            onChange={(e) => setOrganization({ ...organization, name: e.target.value })}
            required
          />
        </div>
        <div className="grid gap-1.5 sm:grid-cols-2 sm:gap-4">
          <div className="grid gap-1.5">
            <Label>Industry</Label>
            <Input
              list="org-industries"
              value={organization.industry}
              onChange={(e) => setOrganization({ ...organization, industry: e.target.value })}
            />
            <datalist id="org-industries">
              {INDUSTRIES.map((i) => (
                <option key={i} value={i} />
              ))}
            </datalist>
          </div>
          <div className="grid gap-1.5">
            <Label>Organization type</Label>
            <Input
              value={organization.org_type}
              onChange={(e) => setOrganization({ ...organization, org_type: e.target.value })}
              placeholder="Company, Embassy…"
            />
          </div>
        </div>
        <div className="grid gap-1.5 sm:grid-cols-2 sm:gap-4">
          <div className="grid gap-1.5">
            <Label>Primary email</Label>
            <Input
              type="email"
              value={organization.email}
              onChange={(e) => setOrganization({ ...organization, email: e.target.value })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Phone</Label>
            <Input
              value={organization.phone}
              onChange={(e) => setOrganization({ ...organization, phone: e.target.value })}
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label>Website</Label>
          <Input
            value={organization.website}
            onChange={(e) => setOrganization({ ...organization, website: e.target.value })}
            placeholder="https://company.com"
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Country</Label>
          <Input
            value={organization.country}
            onChange={(e) => setOrganization({ ...organization, country: e.target.value })}
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Address</Label>
          <Textarea
            rows={2}
            value={organization.address}
            onChange={(e) => setOrganization({ ...organization, address: e.target.value })}
          />
        </div>
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          Account status: <span className="font-medium text-foreground">{organization.status || "unknown"}</span>
        </div>
        <Button type="submit" variant="premium" disabled={busy} className="justify-self-start">
          {busy ? <Loader2 className="animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          Save organization
        </Button>
      </form>
    </SettingsSection>
  );

  const contactsTab = (
    <SettingsSection title="Contacts & alerts" description="Who we reach for verification receipts and compliance notices.">
      <form onSubmit={saveOrganization} className="grid gap-4">
        <div className="grid gap-1.5 sm:grid-cols-2 sm:gap-4">
          <div className="grid gap-1.5">
            <Label>Primary contact name</Label>
            <Input
              value={organization.contact_person_name}
              onChange={(e) => setOrganization({ ...organization, contact_person_name: e.target.value })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Contact role</Label>
            <Input
              value={organization.contact_person_role}
              onChange={(e) => setOrganization({ ...organization, contact_person_role: e.target.value })}
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label>Notification email</Label>
          <Input
            type="email"
            value={organization.notification_email}
            onChange={(e) => setOrganization({ ...organization, notification_email: e.target.value })}
            placeholder="alerts@company.com"
          />
          <p className="text-xs text-muted-foreground">
            Optional copy address for verification summaries (when email delivery is enabled).
          </p>
        </div>
        <Button type="submit" variant="premium" disabled={busy} className="justify-self-start">
          {busy ? <Loader2 className="animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          Save contacts
        </Button>
      </form>
    </SettingsSection>
  );

  const brandingTab = (
    <SettingsSection title="Branding">
      <form onSubmit={saveOrganization} className="grid gap-4">
        <div className="grid gap-1.5">
          <Label>Logo URL</Label>
          <Input
            value={organization.logo_url}
            onChange={(e) => setOrganization({ ...organization, logo_url: e.target.value })}
            placeholder="https://…/logo.png"
          />
        </div>
        <Button type="submit" variant="premium" disabled={busy} className="justify-self-start">
          {busy ? <Loader2 className="animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          Save branding
        </Button>
      </form>
    </SettingsSection>
  );

  const verificationTab = (
    <SettingsSection title="Verification preferences" description="How your team uses the verify workspace.">
      <p className="text-sm text-muted-foreground">
        Default search method and automated receipt options will be configurable here soon. Use Verify and History
        from the sidebar for day-to-day checks.
      </p>
    </SettingsSection>
  );

  return (
    <SettingsPageLayout
      defaultTab="profile"
      tabs={[
        { id: "profile", label: "Your profile", content: profileTab },
        { id: "organization", label: "Organization", content: organizationTab },
        { id: "contacts", label: "Contacts", content: contactsTab },
        { id: "branding", label: "Branding", content: brandingTab },
        { id: "verification", label: "Verification", content: verificationTab },
        { id: "security", label: "Security", content: <SecuritySettingsPanel /> },
      ]}
    />
  );
}
