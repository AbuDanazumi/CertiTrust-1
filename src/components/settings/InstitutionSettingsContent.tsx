import { FormEvent, useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { VERIFY_ORIGIN } from "@/lib/brand";
import { supabase } from "@/integrations/supabase/client";
import { SettingsPageLayout } from "./SettingsPageLayout";
import { SecuritySettingsPanel } from "./SecuritySettingsPanel";
import { SettingsSection } from "./SettingsSection";

const INSTITUTION_TYPES = ["University", "Polytechnic", "College", "Training Center", "Other"] as const;

export function InstitutionSettingsContent() {
  const auth = useAuth();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);

  const [profile, setProfile] = useState({
    display_name: "",
    email: "",
    job_title: "",
  });

  const [institution, setInstitution] = useState({
    name: "",
    institution_type: "",
    email: "",
    phone: "",
    country: "",
    address: "",
    city: "",
    state_province: "",
    website_url: "",
    logo_url: "",
    seal_url: "",
    verification_enabled: false,
    status: "",
  });

  useEffect(() => {
    void (async () => {
      if (!auth.session?.user.id) return;
      setLoading(true);

      const [{ data: prof }, instQuery] = await Promise.all([
        supabase
          .from("profiles")
          .select("display_name,email,job_title")
          .eq("user_id", auth.session.user.id)
          .maybeSingle(),
        auth.institutionId
          ? supabase.from("institutions").select("*").eq("id", auth.institutionId).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      if (prof) {
        setProfile({
          display_name: prof.display_name ?? "",
          email: prof.email ?? auth.email ?? "",
          job_title: prof.job_title ?? "",
        });
      }

      const inst = instQuery.data;
      if (inst) {
        setInstitution({
          name: inst.name ?? "",
          institution_type: inst.institution_type ?? "",
          email: inst.email ?? "",
          phone: inst.phone ?? "",
          country: inst.country ?? "",
          address: inst.address ?? "",
          city: inst.city ?? "",
          state_province: inst.state_province ?? "",
          website_url: inst.website_url ?? "",
          logo_url: inst.logo_url ?? "",
          seal_url: inst.seal_url ?? "",
          verification_enabled: inst.verification_enabled ?? false,
          status: inst.status ?? "",
        });
      }

      setLoading(false);
    })();
  }, [auth.session?.user.id, auth.institutionId, auth.email]);

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

  async function saveInstitution(e: FormEvent) {
    e.preventDefault();
    if (!auth.institutionId) return;
    setBusy(true);
    const { error } = await supabase
      .from("institutions")
      .update({
        name: institution.name.trim(),
        institution_type: institution.institution_type.trim() || null,
        email: institution.email.trim() || null,
        phone: institution.phone.trim() || null,
        country: institution.country.trim() || null,
        address: institution.address.trim() || null,
        city: institution.city.trim() || null,
        state_province: institution.state_province.trim() || null,
        website_url: institution.website_url.trim() || null,
        logo_url: institution.logo_url.trim() || null,
        seal_url: institution.seal_url.trim() || null,
      })
      .eq("id", auth.institutionId);
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Institution details saved");
  }

  if (loading) {
    return <Skeleton className="h-96 w-full max-w-3xl" />;
  }

  const profileTab = (
    <SettingsSection title="Your account" description="How you appear inside the institution portal.">
      <form onSubmit={saveProfile} className="grid gap-4">
        <div className="grid gap-1.5">
          <Label>Full name</Label>
          <Input
            value={profile.display_name}
            onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
            placeholder="Jane Doe"
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Job title</Label>
          <Input
            value={profile.job_title}
            onChange={(e) => setProfile({ ...profile, job_title: e.target.value })}
            placeholder="Registrar, IT Director…"
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Sign-in email</Label>
          <Input value={profile.email} disabled className="bg-muted/40" />
          <p className="text-xs text-muted-foreground">Email changes require support — contact your platform admin.</p>
        </div>
        <Button type="submit" variant="premium" disabled={profileBusy} className="justify-self-start">
          {profileBusy ? <Loader2 className="animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          Save profile
        </Button>
      </form>
    </SettingsSection>
  );

  const institutionTab = (
    <SettingsSection title="Institution details" description="Official information shown on certificates and verification results.">
      <form onSubmit={saveInstitution} className="grid gap-4">
        <div className="grid gap-1.5">
          <Label>Institution name</Label>
          <Input
            value={institution.name}
            onChange={(e) => setInstitution({ ...institution, name: e.target.value })}
            required
          />
        </div>
        <div className="grid gap-1.5 sm:grid-cols-2 sm:gap-4">
          <div className="grid gap-1.5">
            <Label>Type</Label>
            <Input
              list="institution-types"
              value={institution.institution_type}
              onChange={(e) => setInstitution({ ...institution, institution_type: e.target.value })}
              placeholder="University"
            />
            <datalist id="institution-types">
              {INSTITUTION_TYPES.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>
          <div className="grid gap-1.5">
            <Label>Country</Label>
            <Input
              value={institution.country}
              onChange={(e) => setInstitution({ ...institution, country: e.target.value })}
            />
          </div>
        </div>
        <div className="grid gap-1.5 sm:grid-cols-2 sm:gap-4">
          <div className="grid gap-1.5">
            <Label>Official email</Label>
            <Input
              type="email"
              value={institution.email}
              onChange={(e) => setInstitution({ ...institution, email: e.target.value })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Phone</Label>
            <Input
              value={institution.phone}
              onChange={(e) => setInstitution({ ...institution, phone: e.target.value })}
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label>Street address</Label>
          <Textarea
            rows={2}
            value={institution.address}
            onChange={(e) => setInstitution({ ...institution, address: e.target.value })}
          />
        </div>
        <div className="grid gap-1.5 sm:grid-cols-2 sm:gap-4">
          <div className="grid gap-1.5">
            <Label>City</Label>
            <Input
              value={institution.city}
              onChange={(e) => setInstitution({ ...institution, city: e.target.value })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>State / province</Label>
            <Input
              value={institution.state_province}
              onChange={(e) => setInstitution({ ...institution, state_province: e.target.value })}
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label>Website</Label>
          <Input
            value={institution.website_url}
            onChange={(e) => setInstitution({ ...institution, website_url: e.target.value })}
            placeholder="https://university.edu"
          />
        </div>
        <Button type="submit" variant="premium" disabled={busy} className="justify-self-start">
          {busy ? <Loader2 className="animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          Save institution
        </Button>
      </form>
    </SettingsSection>
  );

  const brandingTab = (
    <SettingsSection title="Branding" description="Logos appear on verification pages and internal dashboards.">
      <form onSubmit={saveInstitution} className="grid gap-4">
        <div className="grid gap-1.5">
          <Label>Institution logo URL</Label>
          <Input
            value={institution.logo_url}
            onChange={(e) => setInstitution({ ...institution, logo_url: e.target.value })}
            placeholder="https://…/logo.png"
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Seal / crest URL</Label>
          <Input
            value={institution.seal_url}
            onChange={(e) => setInstitution({ ...institution, seal_url: e.target.value })}
            placeholder="https://…/seal.png"
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
    <SettingsSection
      title="Public verification"
      description="Controls whether third parties can verify your issued certificates online."
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm">
          <p className="font-medium">Status: {institution.status || "unknown"}</p>
          <p className="mt-1 text-muted-foreground">
            QR verification is {institution.verification_enabled ? "enabled" : "disabled"} for your institution.
            Platform administrators manage this after onboarding approval.
          </p>
        </div>
        <div className="grid gap-1.5">
          <Label>Public verify link</Label>
          <Input readOnly value={`${VERIFY_ORIGIN}/verify`} className="font-mono text-xs bg-muted/40" />
        </div>
      </div>
    </SettingsSection>
  );

  const notificationsTab = (
    <SettingsSection
      title="Notifications"
      description="Email alerts for certificate and verification activity (coming soon)."
    >
      <p className="text-sm text-muted-foreground">
        In-app and email notifications for revocations, bulk uploads, and verification spikes will appear here in a
        future release. For now, monitor your dashboard and certificate list.
      </p>
    </SettingsSection>
  );

  return (
    <SettingsPageLayout
      defaultTab="profile"
      tabs={[
        { id: "profile", label: "Your profile", content: profileTab },
        { id: "institution", label: "Institution", content: institutionTab },
        { id: "branding", label: "Branding", content: brandingTab },
        { id: "verification", label: "Verification", content: verificationTab },
        { id: "notifications", label: "Notifications", content: notificationsTab },
        { id: "security", label: "Security", content: <SecuritySettingsPanel /> },
      ]}
    />
  );
}
