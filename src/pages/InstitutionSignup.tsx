import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Building2, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { AuthBrandPanel, AuthPageHeader } from "@/components/auth/AuthPageChrome";
import { ReviewRow, SignupProgress } from "@/components/auth/SignupProgress";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthValidation } from "@/hooks/useAuthValidation";

const STEPS = ["Account", "Institution", "Location", "Review"];
const INSTITUTION_TYPES = ["University", "Polytechnic", "College", "Training Center", "Other"] as const;

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function InstitutionSignup() {
  const navigate = useNavigate();
  const { submitInstitutionOnboarding, validating } = useAuthValidation();

  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [logoName, setLogoName] = useState<string | null>(null);

  const [institutionName, setInstitutionName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [institutionType, setInstitutionType] = useState<string>(INSTITUTION_TYPES[0]);
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [address, setAddress] = useState("");
  const [stateProvince, setStateProvince] = useState("");
  const [city, setCity] = useState("");

  function validateStep(s: number): string | null {
    if (s === 1) {
      if (!institutionName.trim()) return "Institution name is required";
      if (!email.trim()) return "Official email is required";
      if (!isValidEmail(email)) return "Enter a valid email address";
      if (password.length < 6) return "Password must be at least 6 characters";
      if (password !== confirmPassword) return "Passwords do not match";
    }
    if (s === 2) {
      if (!institutionType) return "Institution type is required";
      if (!country.trim()) return "Country is required";
    }
    if (s === 3) {
      if (!address.trim()) return "Address is required";
      if (!city.trim()) return "City is required";
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
    const result = await submitInstitutionOnboarding({
      email: email.trim(),
      password,
      institution_name: institutionName.trim(),
      institution_type: institutionType,
      website: website.trim() || undefined,
      phone: phone.trim() || undefined,
      country: country.trim(),
      address: address.trim(),
      city: city.trim(),
      state_province: stateProvince.trim() || undefined,
      contact_name: institutionName.trim(),
    });
    setBusy(false);

    if (!result.success) {
      setError(result.message);
      toast.error(result.message);
      return;
    }

    toast.success(result.message);
    navigate(result.requiresEmailConfirmation ? "/login/institution" : "/institution");
  }

  const loading = busy || validating;

  return (
    <div className="flex min-h-screen bg-background">
      <AuthBrandPanel variant="institution" />
      <div className="flex flex-1 flex-col">
        <AuthPageHeader />
        <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-8 sm:px-6 lg:py-12">
          <div className="mb-8 flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Building2 className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Join as an Institution</h2>
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
                    <Label htmlFor="inst-name">Institution name</Label>
                    <Input id="inst-name" value={institutionName} onChange={(e) => setInstitutionName(e.target.value)} className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inst-email">Official email</Label>
                    <Input id="inst-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" />
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="inst-pass">Password</Label>
                      <Input id="inst-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="inst-pass2">Confirm password</Label>
                      <Input id="inst-pass2" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="h-11" />
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Institution type</Label>
                    <Select value={institutionType} onValueChange={setInstitutionType}>
                      <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {INSTITUTION_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="inst-web">Website</Label>
                    <Input id="inst-web" type="url" placeholder="https://" value={website} onChange={(e) => setWebsite(e.target.value)} className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inst-phone">Phone number</Label>
                    <Input id="inst-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inst-country">Country</Label>
                    <Input id="inst-country" value={country} onChange={(e) => setCountry(e.target.value)} className="h-11" />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="grid gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="inst-address">Address</Label>
                    <Input id="inst-address" value={address} onChange={(e) => setAddress(e.target.value)} className="h-11" />
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="inst-state">State / Province</Label>
                      <Input id="inst-state" value={stateProvince} onChange={(e) => setStateProvince(e.target.value)} className="h-11" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="inst-city">City</Label>
                      <Input id="inst-city" value={city} onChange={(e) => setCity(e.target.value)} className="h-11" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Logo upload (optional)</Label>
                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/80 bg-muted/15 px-6 py-8 text-center hover:border-primary/40">
                      <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                      <span className="text-sm font-medium">{logoName ?? "Drop logo or click to browse"}</span>
                      <input type="file" accept="image/*" className="sr-only" onChange={(e) => setLogoName(e.target.files?.[0]?.name ?? null)} />
                    </label>
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
                      <ReviewRow label="Institution" value={institutionName} />
                      <ReviewRow label="Email" value={email} />
                      <ReviewRow label="Type" value={institutionType} />
                      <ReviewRow label="Website" value={website} />
                      <ReviewRow label="Phone" value={phone} />
                      <ReviewRow label="Country" value={country} />
                      <ReviewRow label="Address" value={[address, city, stateProvince, country].filter(Boolean).join(", ")} />
                      <ReviewRow label="Logo" value={logoName ?? "Not uploaded"} />
                    </dl>
                  </div>
                  <div className="flex items-start gap-3 rounded-xl border border-border/60 p-4">
                    <Checkbox id="inst-terms" checked={agreeTerms} onCheckedChange={(v) => setAgreeTerms(v === true)} disabled={loading} />
                    <Label htmlFor="inst-terms" className="text-sm font-normal leading-relaxed">
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
                    Have an account? <Link to="/login/institution" className="font-medium text-primary hover:underline">Sign in</Link>
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
