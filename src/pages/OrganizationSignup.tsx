import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { AuthBrandPanel, AuthPageHeader } from "@/components/auth/AuthPageChrome";
import { ReviewRow, SignupProgress } from "@/components/auth/SignupProgress";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthValidation } from "@/hooks/useAuthValidation";

const STEPS = ["Account", "Organization", "Contact", "Review"];
const INDUSTRIES = [
  "Human Resources",
  "Immigration & Compliance",
  "Education & Admissions",
  "Government",
  "Financial Services",
  "Healthcare",
  "Other",
];

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function OrganizationSignup() {
  const navigate = useNavigate();
  const { submitOrganizationOnboarding, validating } = useAuthValidation();

  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [organizationName, setOrganizationName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");
  const [country, setCountry] = useState("");
  const [phone, setPhone] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactRole, setContactRole] = useState("");

  function validateStep(s: number): string | null {
    if (s === 1) {
      if (!organizationName.trim()) return "Organization name is required";
      if (!email.trim()) return "Official email is required";
      if (!isValidEmail(email)) return "Enter a valid email address";
      if (password.length < 6) return "Password must be at least 6 characters";
      if (password !== confirmPassword) return "Passwords do not match";
    }
    if (s === 2) {
      if (!industry.trim()) return "Industry is required";
      if (!country.trim()) return "Country is required";
    }
    if (s === 3) {
      if (!contactName.trim()) return "Contact person name is required";
      if (!contactRole.trim()) return "Position / role is required";
    }
    return null;
  }

  async function handleSubmit() {
    const err = validateStep(1) || validateStep(2) || validateStep(3);
    if (err) {
      setError(err);
      return;
    }
    if (!agreeTerms) {
      setError("You must accept the terms to continue");
      return;
    }

    setBusy(true);
    setError("");
    const result = await submitOrganizationOnboarding({
      email: email.trim(),
      password,
      organization_name: organizationName.trim(),
      industry: industry.trim(),
      website: website.trim() || undefined,
      phone: phone.trim() || undefined,
      country: country.trim(),
      contact_person_name: contactName.trim(),
      contact_person_role: contactRole.trim(),
    });
    setBusy(false);

    if (!result.success) {
      setError(result.message);
      toast.error(result.message);
      return;
    }

    toast.success(result.message);
    navigate(result.requiresEmailConfirmation ? "/login/organization" : "/organization");
  }

  const loading = busy || validating;

  return (
    <div className="flex min-h-screen bg-background">
      <AuthBrandPanel variant="organization" />
      <div className="flex flex-1 flex-col">
        <AuthPageHeader />
        <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-8 sm:px-6 lg:py-12">
          <div className="mb-8 flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent/15 text-accent">
              <Users className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Join as an Organization</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Step {step} of {STEPS.length} · {STEPS[step - 1]}
              </p>
            </div>
          </div>

          <SignupProgress steps={STEPS} current={step} />

          <div key={step} className="mt-8 animate-in fade-in slide-in-from-right-3 duration-300">
            <div className="glass-panel rounded-2xl p-6 sm:p-8">
              {error && (
                <p className="mb-5 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}

              {step === 1 && (
                <div className="grid gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="org-name">Organization name</Label>
                    <Input id="org-name" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="org-email">Official email</Label>
                    <Input id="org-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" />
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="org-pass">Password</Label>
                      <Input id="org-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="org-pass2">Confirm password</Label>
                      <Input id="org-pass2" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="h-11" />
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="org-industry">Industry</Label>
                    <Input
                      id="org-industry"
                      list="org-industries"
                      placeholder="e.g. Human Resources"
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      className="h-11"
                    />
                    <datalist id="org-industries">
                      {INDUSTRIES.map((i) => (
                        <option key={i} value={i} />
                      ))}
                    </datalist>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="org-web">Website</Label>
                    <Input id="org-web" type="url" placeholder="https://" value={website} onChange={(e) => setWebsite(e.target.value)} className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="org-country">Country</Label>
                    <Input id="org-country" value={country} onChange={(e) => setCountry(e.target.value)} className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="org-phone">Phone number</Label>
                    <Input id="org-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-11" />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="grid gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="org-contact">Contact person</Label>
                    <Input id="org-contact" value={contactName} onChange={(e) => setContactName(e.target.value)} className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="org-role">Position / role</Label>
                    <Input id="org-role" value={contactRole} onChange={(e) => setContactRole(e.target.value)} placeholder="e.g. HR Manager" className="h-11" />
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-5">
                  <div className="rounded-xl border border-border/70 bg-muted/20 px-4">
                    <p className="border-b border-border/50 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Review & submit
                    </p>
                    <dl>
                      <ReviewRow label="Organization" value={organizationName} />
                      <ReviewRow label="Email" value={email} />
                      <ReviewRow label="Industry" value={industry} />
                      <ReviewRow label="Website" value={website} />
                      <ReviewRow label="Country" value={country} />
                      <ReviewRow label="Phone" value={phone} />
                      <ReviewRow label="Contact" value={`${contactName} · ${contactRole}`} />
                    </dl>
                  </div>
                  <div className="flex items-start gap-3 rounded-xl border border-border/60 p-4">
                    <Checkbox id="org-terms" checked={agreeTerms} onCheckedChange={(v) => setAgreeTerms(v === true)} disabled={loading} />
                    <Label htmlFor="org-terms" className="text-sm font-normal leading-relaxed">
                      I agree to the CertiTrust Terms of Service and Privacy Policy
                    </Label>
                  </div>
                </div>
              )}

              <div className="mt-8 flex flex-col-reverse gap-3 border-t border-border/60 pt-6 sm:flex-row sm:justify-between">
                {step > 1 ? (
                  <Button type="button" variant="ghost" disabled={loading} onClick={() => { setError(""); setStep((s) => s - 1); }}>
                    <ArrowLeft className="h-4 w-4" /> Back
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Have an account? <Link to="/login/organization" className="font-medium text-primary hover:underline">Sign in</Link>
                  </p>
                )}
                {step < 4 ? (
                  <Button
                    type="button"
                    variant="premium"
                    className="sm:ml-auto"
                    disabled={loading}
                    onClick={() => {
                      const v = validateStep(step);
                      if (v) { setError(v); return; }
                      setError("");
                      setStep((s) => s + 1);
                    }}
                  >
                    Continue <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="button" variant="premium" className="sm:ml-auto" disabled={loading} onClick={handleSubmit}>
                    {loading && <Loader2 className="animate-spin" />}
                    Submit application
                  </Button>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
