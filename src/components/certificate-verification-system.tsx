import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import {
  Activity, AlertTriangle, Bell, BarChart3, Building2, Camera, CheckCircle2, Clock,
  ClipboardCopy, Download, Eye, EyeOff, FileCheck2, FileSpreadsheet, GraduationCap,
  History, KeyRound, Layers, Lock, Loader2, LogOut, Mail,
  Menu, Moon, Plus, Printer, QrCode, RefreshCw, ScanLine, Search, ShieldAlert,
  Settings as SettingsIcon, ShieldCheck, Sun, Trash2, Upload, Users, XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Landing } from "@/components/public/LandingPage";
import { PublicShell } from "@/components/public/PublicShell";
import { PendingApprovalView } from "@/components/onboarding/PendingApprovalView";
import { InstitutionSettingsContent } from "@/components/settings/InstitutionSettingsContent";
import { OrganizationSettingsContent } from "@/components/settings/OrganizationSettingsContent";
import { SuperAdminSettingsContent } from "@/components/settings/SuperAdminSettingsContent";
import { useAuth } from "@/hooks/useAuth";
import { loginPathForPortalShell } from "@/lib/auth-routes";
import type { TenantStatus } from "@/lib/onboarding";
import {
  institutionReviewPatch,
  organizationReviewPatch,
  orgStatusBadgeClass,
  type TenantReviewStatus,
} from "@/lib/tenant-review";
import { supabase } from "@/integrations/supabase/client";

// ─────────────────── helpers ───────────────────
async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function randomChunk(len: number): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = ""; const arr = new Uint32Array(len); crypto.getRandomValues(arr);
  for (let i = 0; i < len; i++) out += chars[arr[i] % chars.length];
  return out;
}
function generateCertId(prefix = "CT", year = new Date().getFullYear()): string {
  return `${prefix}-${year}-${randomChunk(4)}-${randomChunk(4)}`;
}
function buildQrPayload(certId: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://verify.certitrust.app";
  return `${origin}/verify?c=${encodeURIComponent(certId)}`;
}
function copyToClipboard(text: string, label = "Copied to clipboard") {
  navigator.clipboard?.writeText(text).then(() => toast.success(label), () => toast.error("Copy failed"));
}

function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    const stored = localStorage.getItem("certitrust.theme");
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("certitrust.theme", theme);
  }, [theme]);
  return { theme, toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")) };
}

type AppRole = "super_admin" | "staff" | "verifier" | "organization";

// ─────────────────── shared UI ───────────────────
function Logo() {
  return (
    <Link to="/" className="inline-flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground shadow-soft">
        <ShieldCheck className="h-5 w-5" />
      </span>
      <span className="text-lg font-semibold tracking-tight">CertiTrust</span>
    </Link>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

// ─────────────────── public verify ───────────────────
type VerifyMode = "idle" | "loading" | "success" | "invalid" | "revoked" | "suspended";
type CertRecord = {
  certificate_id: string; full_name: string; matric_number: string; qualification: string;
  department_name: string; graduation_year: number; status: string; issue_date: string;
  hash_signature: string; qr_payload: string; institution_id: string;
};
type InstitutionRecord = { id: string; name: string; seal_url: string | null; country: string | null };

function modeFromStatus(status: string): VerifyMode {
  const s = status.toLowerCase();
  if (s === "valid") return "success";
  if (s === "revoked") return "revoked";
  if (s === "suspended") return "suspended";
  return "invalid";
}

async function logVerification(args: { result: VerifyMode; identifier: string; method: string; institutionId?: string | null; organizationId?: string | null }) {
  const map: Record<VerifyMode, string> = { success: "authentic", invalid: "invalid", revoked: "revoked", suspended: "suspended", idle: "invalid", loading: "invalid" };
  await supabase.from("verification_events").insert({
    result: map[args.result] as "authentic" | "invalid" | "revoked" | "suspended" | "tampered",
    search_method: args.method.slice(0, 64),
    certificate_identifier: args.identifier.slice(0, 128),
    institution_id: args.institutionId ?? null,
    organization_id: args.organizationId ?? null,
  } as never);
}

async function runVerifyQuery(input: string, method: "id" | "qr" | "name") {
  let lookup = input.trim();
  if (method === "qr") {
    const m = lookup.match(/[?&]c=([^&]+)/) ?? lookup.match(/\/c\/([A-Za-z0-9-]+)/);
    if (m) lookup = decodeURIComponent(m[1]);
  }
  let q = supabase.from("certificates").select("*");
  if (method === "name") q = q.ilike("full_name", `%${lookup}%`);
  else q = q.ilike("certificate_id", lookup);
  const { data, error } = await q.limit(1).maybeSingle();
  if (error || !data) return { record: null, institution: null, lookup };
  const record = data as CertRecord;
  const { data: inst } = await supabase.from("institutions").select("id,name,seal_url,country").eq("id", record.institution_id).maybeSingle();
  return { record, institution: (inst as InstitutionRecord | null) ?? null, lookup };
}

function QRDropZone({ onScan }: { onScan: (value: string) => void }) {
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!active) {
    return (
      <div className="mb-4 grid place-items-center rounded-lg border border-dashed border-border bg-secondary/45 p-8 text-center">
        <QrCode className="mb-2 h-10 w-10 text-primary" />
        <p className="font-medium">Scan a certificate QR code</p>
        <p className="mb-4 text-sm text-muted-foreground">Use your device camera.</p>
        <Button variant="premium" size="sm" onClick={() => { setError(null); setActive(true); }}><Camera />Open camera</Button>
        {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
      </div>
    );
  }
  return (
    <div className="mb-4 overflow-hidden rounded-lg border border-border bg-background">
      <div className="relative aspect-square w-full">
        <Scanner
          onScan={(d) => { const v = d?.[0]?.rawValue; if (!v) return; setActive(false); onScan(v); }}
          onError={(err) => { setError(err instanceof Error ? err.message : "Camera unavailable"); setActive(false); }}
          constraints={{ facingMode: "environment" }}
          styles={{ container: { width: "100%", height: "100%" }, video: { width: "100%", height: "100%", objectFit: "cover" } }}
        />
      </div>
      <div className="flex items-center justify-between border-t border-border bg-secondary/40 p-3">
        <p className="text-xs text-muted-foreground">Align QR inside frame</p>
        <Button variant="ghost" size="sm" onClick={() => setActive(false)}>Cancel</Button>
      </div>
    </div>
  );
}

function VerificationResult({ mode, cert, institution, verifiedAt }: { mode: VerifyMode; cert: CertRecord | null; institution: InstitutionRecord | null; verifiedAt: Date | null }) {
  if (mode === "idle") return (
    <Card className="elevated-panel"><CardContent className="grid min-h-[400px] place-items-center p-8 text-center">
      <div className="max-w-sm">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary"><ShieldCheck className="h-7 w-7" /></div>
        <h2 className="text-xl font-semibold">Awaiting credential</h2>
        <p className="mt-2 text-sm text-muted-foreground">Enter a Certificate ID or scan a QR code to verify.</p>
      </div>
    </CardContent></Card>
  );
  if (mode === "loading") return (
    <Card className="elevated-panel"><CardContent className="grid min-h-[400px] place-items-center p-8 text-center">
      <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
    </CardContent></Card>
  );
  if (mode === "invalid" || !cert) return (
    <Card className="elevated-panel"><CardContent className="grid min-h-[400px] place-items-center p-8 text-center">
      <div className="max-w-sm">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-destructive/10 text-destructive"><XCircle className="h-7 w-7" /></div>
        <h2 className="text-xl font-semibold">No matching certificate</h2>
        <p className="mt-2 text-sm text-muted-foreground">Check the ID and try again, or contact the issuing institution.</p>
      </div>
    </CardContent></Card>
  );
  const cfg = {
    success:   { label: "Valid Certificate",     icon: CheckCircle2, bar: "bg-accent text-accent-foreground", badge: "border-success/30 bg-success/15 text-success" },
    revoked:   { label: "Revoked Certificate",   icon: XCircle,      bar: "bg-destructive text-destructive-foreground", badge: "border-destructive/30 bg-destructive/15 text-destructive" },
    suspended: { label: "Suspended Certificate", icon: AlertTriangle, bar: "bg-warning text-warning-foreground", badge: "border-warning/40 bg-warning/20 text-warning-foreground" },
  }[mode as "success" | "revoked" | "suspended"];
  const Icon = cfg.icon;
  return (
    <Card className="elevated-panel overflow-hidden">
      <div className={`p-6 ${cfg.bar}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider opacity-80">{institution?.name ?? "Issuing institution"}</p>
            <h2 className="mt-1 text-2xl font-semibold">{cfg.label}</h2>
          </div>
          <Icon className="h-10 w-10 shrink-0" />
        </div>
      </div>
      <CardContent className="grid gap-5 p-6 md:grid-cols-[1fr_auto]">
        <div className="grid gap-4 sm:grid-cols-2">
          <InfoRow label="Candidate" value={cert.full_name} />
          <InfoRow label="Institution" value={institution?.name ?? "—"} />
          <InfoRow label="Program / Department" value={cert.department_name} />
          <InfoRow label="Qualification" value={cert.qualification} />
          <InfoRow label="Graduation year" value={String(cert.graduation_year)} />
          <InfoRow label="Certificate ID" value={cert.certificate_id} />
          <div className="sm:col-span-2">
            <p className="text-xs uppercase text-muted-foreground">Status</p>
            <Badge className={`mt-1 ${cfg.badge}`}>{cert.status.toUpperCase()}</Badge>
          </div>
        </div>
        <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-secondary/40 p-4">
          <QRCodeSVG value={cert.qr_payload} size={140} level="H" bgColor="hsl(var(--card))" fgColor="hsl(var(--foreground))" includeMargin />
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Scan to re-verify</p>
        </div>
        <p className="md:col-span-2 border-t border-border pt-4 text-xs text-muted-foreground">
          Verified {verifiedAt ? verifiedAt.toLocaleString() : "just now"}
        </p>
      </CardContent>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs uppercase text-muted-foreground">{label}</p><p className="mt-1 font-medium break-words">{value}</p></div>;
}

export function VerifyPortal() {
  const { organizationId } = useAuth();
  const [query, setQuery] = useState("");
  const [method, setMethod] = useState<"id" | "qr">("id");
  const [mode, setMode] = useState<VerifyMode>("idle");
  const [cert, setCert] = useState<CertRecord | null>(null);
  const [institution, setInstitution] = useState<InstitutionRecord | null>(null);
  const [verifiedAt, setVerifiedAt] = useState<Date | null>(null);

  // auto-verify from ?c= query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const c = params.get("c");
    if (c) { setQuery(c); setMethod("id"); run(c, "id"); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run(input: string, m: "id" | "qr") {
    if (!input.trim()) { setMode("invalid"); setCert(null); return; }
    setMode("loading");
    const { record, institution: inst, lookup } = await runVerifyQuery(input, m);
    if (!record) {
      setMode("invalid"); setCert(null); setInstitution(null);
      await logVerification({ result: "invalid", identifier: lookup, method: m, organizationId });
      return;
    }
    setCert(record); setInstitution(inst); setVerifiedAt(new Date());
    const next = modeFromStatus(record.status);
    setMode(next);
    await logVerification({ result: next, identifier: record.certificate_id, method: m, institutionId: record.institution_id, organizationId });
  }

  return (
    <PublicShell>
      <section className="container py-10 lg:py-14">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Verify a Certificate</h1>
          <p className="mt-3 text-muted-foreground">Enter a certificate ID or scan its QR code.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="elevated-panel h-fit">
            <CardHeader><CardTitle>Look up a certificate</CardTitle></CardHeader>
            <CardContent>
              <Tabs value={method} onValueChange={(v) => setMethod(v as "id" | "qr")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="id"><Search className="mr-1.5 h-3.5 w-3.5" />Certificate ID</TabsTrigger>
                  <TabsTrigger value="qr"><QrCode className="mr-1.5 h-3.5 w-3.5" />QR scan</TabsTrigger>
                </TabsList>
                <TabsContent value="id" className="pt-5">
                  <form onSubmit={(e) => { e.preventDefault(); run(query, "id"); }} className="space-y-3">
                    <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. CT-2025-9F41-A2C8" className="h-12 font-mono" />
                    <Button variant="premium" className="w-full" size="lg" disabled={mode === "loading"}>
                      {mode === "loading" ? <Loader2 className="animate-spin" /> : <ShieldCheck />}Verify
                    </Button>
                  </form>
                </TabsContent>
                <TabsContent value="qr" className="pt-5">
                  <QRDropZone onScan={(v) => { setQuery(v); run(v, "qr"); }} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <VerificationResult mode={mode} cert={cert} institution={institution} verifiedAt={verifiedAt} />
        </div>
      </section>
    </PublicShell>
  );
}

// ─────────────────── portal shell ───────────────────
type NavItem = { to: string; label: string; Icon: typeof FileCheck2 };

function PortalShell({ role, title, children }: { role: "institution" | "organization"; title: string; children: React.ReactNode }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();

  const loginPath = role === "institution" ? "/login/institution" : "/login/organization";

  // Redirect if user is on wrong portal
  useEffect(() => {
    if (auth.loading) return;
    if (!auth.session) {
      navigate(loginPath);
      return;
    }
    if (role === "institution" && auth.role === "organization") navigate("/organization");
    if (role === "organization" && (auth.role === "staff" || auth.role === "super_admin")) navigate("/institution");
  }, [auth.loading, auth.session, auth.role, role, navigate, loginPath]);

  const blocked =
    auth.tenantStatus && auth.tenantStatus !== "active"
      ? (auth.tenantStatus as Exclude<TenantStatus, "active">)
      : null;

  if (!auth.loading && auth.session && blocked) {
    return (
      <div className="flex min-h-screen flex-col bg-secondary/30">
        <header className="border-b border-border bg-background px-4 py-4">
          <Logo />
        </header>
        <PendingApprovalView
          tenantLabel={role === "institution" ? "Institution" : "Organization"}
          tenantName={auth.tenantName}
          status={blocked}
          onSignOut={() => void auth.signOut()}
        />
      </div>
    );
  }

  const items: NavItem[] = role === "institution"
    ? [
        { to: "/institution", label: "Dashboard", Icon: FileCheck2 },
        { to: "/institution/certificates", label: "Certificates", Icon: GraduationCap },
        { to: "/institution/settings", label: "Settings", Icon: SettingsIcon },
      ]
    : [
        { to: "/organization", label: "Dashboard", Icon: FileCheck2 },
        { to: "/organization/verify", label: "Verify", Icon: ScanLine },
        { to: "/organization/history", label: "History", Icon: History },
        { to: "/organization/analytics", label: "Analytics", Icon: BarChart3 },
        { to: "/organization/settings", label: "Settings", Icon: SettingsIcon },
      ];

  const Sidebar = () => (
    <nav className="flex flex-col gap-1 p-4">
      {items.map(({ to, label, Icon }) => {
        const active = loc.pathname === to;
        return (
          <Link key={to} to={to} className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"}`}>
            <Icon className="h-4 w-4" />{label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-secondary/30">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="border-b border-sidebar-border p-4"><Logo /></div>
        <Sidebar />
        <div className="mt-auto border-t border-sidebar-border p-4">
          <p className="truncate text-xs text-sidebar-foreground/70">{auth.email}</p>
          <p className="text-[11px] uppercase tracking-wide text-sidebar-foreground/50">{role}</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/85 px-4 backdrop-blur-xl md:px-8">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild><Button variant="ghost" size="icon" className="md:hidden"><Menu /></Button></SheetTrigger>
              <SheetContent side="left" className="w-64 p-0 bg-sidebar text-sidebar-foreground">
                <div className="border-b border-sidebar-border p-4"><Logo /></div>
                <Sidebar />
              </SheetContent>
            </Sheet>
            <h1 className="text-lg font-semibold">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={async () => { await auth.signOut(); navigate("/"); }}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}

// ─────────────────── institution data ───────────────────
type CertRow = {
  id: string; certificate_id: string; full_name: string; matric_number: string;
  qualification: string; department_name: string; graduation_year: number; status: string;
  issue_date: string; hash_signature: string; qr_payload: string;
};

function useCertificates(institutionId: string | null) {
  const [rows, setRows] = useState<CertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const load = useCallback(async () => {
    if (!institutionId) { setRows([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase.from("certificates").select("*").eq("institution_id", institutionId).order("created_at", { ascending: false }).limit(200);
    setRows((data ?? []) as CertRow[]); setLoading(false);
  }, [institutionId]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => rows.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return r.certificate_id.toLowerCase().includes(s) || r.full_name.toLowerCase().includes(s) || r.matric_number.toLowerCase().includes(s);
  }), [rows, search, statusFilter]);

  return { rows, filtered, loading, reload: load, search, setSearch, statusFilter, setStatusFilter };
}

const statusBadge: Record<string, string> = {
  valid: "border-success/30 bg-success/15 text-success",
  revoked: "border-destructive/30 bg-destructive/15 text-destructive",
  suspended: "border-warning/40 bg-warning/20 text-warning-foreground",
};

function IssueCertificateDialog({ institutionId, onCreated }: { institutionId: string | null; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ full_name: "", matric_number: "", qualification: "", department_name: "Computer Science", graduation_year: new Date().getFullYear() });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: k === "graduation_year" ? Number(e.target.value) : e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!institutionId) { toast.error("No institution context"); return; }
    setBusy(true);
    try {
      const certificate_id = generateCertId("CT", form.graduation_year);
      const issue_date = new Date().toISOString().slice(0, 10);
      const hash_signature = await sha256Hex(`${certificate_id}|${form.full_name}|${form.matric_number}|${form.qualification}|${issue_date}`);
      const qr_payload = buildQrPayload(certificate_id);
      const { error } = await supabase.from("certificates").insert({
        institution_id: institutionId, certificate_id,
        full_name: form.full_name, matric_number: form.matric_number,
        qualification: form.qualification, department_name: form.department_name,
        graduation_year: form.graduation_year, issue_date, status: "valid",
        hash_signature, qr_payload,
      });
      if (error) throw error;
      toast.success(`Certificate ${certificate_id} issued`);
      setForm({ full_name: "", matric_number: "", qualification: "", department_name: "Computer Science", graduation_year: new Date().getFullYear() });
      setOpen(false); onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not issue");
    } finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="premium"><Plus />Add certificate</Button></DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add certificate record</DialogTitle>
          <DialogDescription>Generates a unique ID and verification QR automatically.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-3">
          <div className="grid gap-1.5"><Label>Candidate full name</Label><Input value={form.full_name} onChange={set("full_name")} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label>Matric / ID</Label><Input value={form.matric_number} onChange={set("matric_number")} required /></div>
            <div className="grid gap-1.5"><Label>Graduation year</Label><Input type="number" min={1990} max={new Date().getFullYear() + 1} value={form.graduation_year} onChange={set("graduation_year")} required /></div>
          </div>
          <div className="grid gap-1.5"><Label>Qualification</Label><Input value={form.qualification} onChange={set("qualification")} placeholder="B.Sc. Computer Science" required /></div>
          <div className="grid gap-1.5"><Label>Department / Program</Label><Input value={form.department_name} onChange={set("department_name")} /></div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="premium" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Plus />}Issue</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CertificatePreviewDialog({ cert, open, onOpenChange, onReload }: { cert: CertRow | null; open: boolean; onOpenChange: (o: boolean) => void; onReload: () => void }) {
  async function setStatus(status: "valid" | "revoked") {
    if (!cert) return;
    const { error } = await supabase.from("certificates").update({ status, status_changed_at: new Date().toISOString() }).eq("id", cert.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Certificate ${status === "valid" ? "restored" : "revoked"}`);
    onReload(); onOpenChange(false);
  }
  function printCert() {
    if (!cert) return;
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) { toast.error("Pop-up blocked"); return; }
    const issued = new Date(cert.issue_date).toLocaleDateString(undefined, { day: "2-digit", month: "long", year: "numeric" });
    w.document.write(`<!doctype html><html><head><title>${cert.certificate_id}</title><style>
      body{font-family:Georgia,serif;margin:0;padding:48px;background:#f5f0e8;color:#1a1a2e}
      .frame{border:8px double #1e3a5f;padding:48px;background:#fffef9;max-width:780px;margin:0 auto}
      h1{font-family:'Times New Roman';text-align:center;font-size:36px;margin:8px 0;color:#0a1f3d}
      .sub{text-align:center;color:#5a6477;margin-bottom:32px;font-size:13px;letter-spacing:2px;text-transform:uppercase}
      .name{text-align:center;font-size:38px;font-style:italic;margin:24px 0;color:#1e3a5f}
      .body{text-align:center;font-size:16px;line-height:1.7;max-width:520px;margin:0 auto}
      .meta{display:flex;justify-content:space-between;margin-top:48px;font-size:12px;color:#5a6477;border-top:1px solid #d4c8a8;padding-top:16px}
    </style></head><body><div class="frame">
      <div style="text-align:center;font-size:13px;letter-spacing:6px;color:#1e3a5f">CERTITRUST · VERIFIED CREDENTIAL</div>
      <h1>Certificate of Completion</h1>
      <p class="sub">This is to certify that</p>
      <div class="name">${cert.full_name}</div>
      <p class="body">has fulfilled the requirements for<br/><strong>${cert.qualification}</strong><br/>conferred ${issued}.</p>
      <div class="meta"><div><strong>Certificate ID</strong><br/>${cert.certificate_id}</div><div><strong>Status</strong><br/>${cert.status.toUpperCase()}</div></div>
    </div><script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`);
    w.document.close();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        {cert && (
          <>
            <DialogHeader>
              <DialogTitle>{cert.certificate_id}</DialogTitle>
              <DialogDescription>Full certificate record</DialogDescription>
            </DialogHeader>
            <div className="grid gap-5 sm:grid-cols-[1fr_auto]">
              <div className="grid gap-3 text-sm">
                <InfoRow label="Candidate" value={cert.full_name} />
                <InfoRow label="Matric / ID" value={cert.matric_number} />
                <InfoRow label="Qualification" value={cert.qualification} />
                <InfoRow label="Department" value={cert.department_name} />
                <InfoRow label="Graduation year" value={String(cert.graduation_year)} />
                <InfoRow label="Issued" value={new Date(cert.issue_date).toLocaleDateString()} />
                <div><p className="text-xs uppercase text-muted-foreground">Status</p><Badge className={`mt-1 ${statusBadge[cert.status] ?? ""}`}>{cert.status.toUpperCase()}</Badge></div>
              </div>
              <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-secondary/40 p-4">
                <QRCodeSVG value={cert.qr_payload} size={150} level="H" includeMargin />
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Verification QR</p>
              </div>
            </div>
            <DialogFooter className="flex-wrap gap-2">
              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(cert.certificate_id, "ID copied")}><ClipboardCopy />Copy ID</Button>
              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(cert.qr_payload, "Link copied")}><Mail />Copy link</Button>
              <Button variant="glass" size="sm" onClick={printCert}><Printer />Print</Button>
              {cert.status === "valid"
                ? <Button variant="destructive" size="sm" onClick={() => setStatus("revoked")}><Trash2 />Revoke</Button>
                : <Button variant="premium" size="sm" onClick={() => setStatus("valid")}><RefreshCw />Restore</Button>}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────── institution pages ───────────────────
export function InstitutionDashboard() {
  const { institutionId } = useAuth();
  const [stats, setStats] = useState({ total: 0, valid: 0, revoked: 0, recent: [] as CertRow[] });
  const [loading, setLoading] = useState(true);

  useEffect(() => { (async () => {
    if (!institutionId) return;
    setLoading(true);
    const { data } = await supabase.from("certificates").select("*").eq("institution_id", institutionId).order("created_at", { ascending: false }).limit(200);
    const rows = (data ?? []) as CertRow[];
    setStats({
      total: rows.length,
      valid: rows.filter((r) => r.status === "valid").length,
      revoked: rows.filter((r) => r.status === "revoked").length,
      recent: rows.slice(0, 5),
    });
    setLoading(false);
  })(); }, [institutionId]);

  return (
    <PortalShell role="institution" title="Dashboard">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Total certificates" value={stats.total} icon={FileCheck2} loading={loading} />
        <StatCard label="Active" value={stats.valid} icon={CheckCircle2} loading={loading} tone="success" />
        <StatCard label="Revoked" value={stats.revoked} icon={XCircle} loading={loading} tone="destructive" />
      </div>
      <Card className="mt-6 elevated-panel">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent certificates</CardTitle>
          <Button asChild variant="ghost" size="sm"><Link to="/institution/certificates">View all</Link></Button>
        </CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-40 w-full" /> : stats.recent.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No certificates issued yet.</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Certificate ID</TableHead><TableHead>Candidate</TableHead><TableHead>Program</TableHead><TableHead>Status</TableHead><TableHead>Issued</TableHead></TableRow></TableHeader>
              <TableBody>{stats.recent.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.certificate_id}</TableCell>
                  <TableCell>{r.full_name}</TableCell>
                  <TableCell>{r.department_name}</TableCell>
                  <TableCell><Badge className={statusBadge[r.status]}>{r.status}</Badge></TableCell>
                  <TableCell>{new Date(r.issue_date).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </PortalShell>
  );
}

function StatCard({ label, value, icon: Icon, loading, tone = "primary" }: { label: string; value: number | string; icon: typeof FileCheck2; loading?: boolean; tone?: "primary" | "success" | "destructive" | "warning" }) {
  const tones: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/15 text-success",
    destructive: "bg-destructive/10 text-destructive",
    warning: "bg-warning/20 text-warning-foreground",
  };
  return (
    <Card className="elevated-panel">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{label}</p>
          <span className={`grid h-8 w-8 place-items-center rounded-md ${tones[tone]}`}><Icon className="h-4 w-4" /></span>
        </div>
        {loading ? <Skeleton className="mt-3 h-9 w-20" /> : <p className="mt-3 text-3xl font-semibold">{value}</p>}
      </CardContent>
    </Card>
  );
}

export function InstitutionCertificates() {
  const { institutionId } = useAuth();
  const { filtered, loading, reload, search, setSearch, statusFilter, setStatusFilter } = useCertificates(institutionId);
  const [preview, setPreview] = useState<CertRow | null>(null);

  return (
    <PortalShell role="institution" title="Certificates">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-10" placeholder="Search by name, ID, matric…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList><TabsTrigger value="all">All</TabsTrigger><TabsTrigger value="valid">Valid</TabsTrigger><TabsTrigger value="revoked">Revoked</TabsTrigger></TabsList>
          </Tabs>
        </div>
        <div className="flex gap-2">
          <BulkUploadDialog institutionId={institutionId} onCompleted={reload} />
          <IssueCertificateDialog institutionId={institutionId} onCreated={reload} />
        </div>
      </div>

      <Card className="elevated-panel">
        <CardContent className="p-0">
          {loading ? <div className="p-6"><Skeleton className="h-64 w-full" /></div> : filtered.length === 0 ? (
            <p className="p-10 text-center text-sm text-muted-foreground">No certificates match your search.</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Certificate ID</TableHead><TableHead>Candidate</TableHead><TableHead>Qualification</TableHead><TableHead>Year</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>{filtered.map((r) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => setPreview(r)}>
                  <TableCell className="font-mono text-xs">{r.certificate_id}</TableCell>
                  <TableCell className="font-medium">{r.full_name}</TableCell>
                  <TableCell>{r.qualification}</TableCell>
                  <TableCell>{r.graduation_year}</TableCell>
                  <TableCell><Badge className={statusBadge[r.status]}>{r.status}</Badge></TableCell>
                  <TableCell><Button variant="ghost" size="sm">View</Button></TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CertificatePreviewDialog cert={preview} open={!!preview} onOpenChange={(o) => !o && setPreview(null)} onReload={reload} />
    </PortalShell>
  );
}

export function InstitutionSettings() {
  return (
    <PortalShell role="institution" title="Settings">
      <InstitutionSettingsContent />
    </PortalShell>
  );
}

// ─────────────────── organization data ───────────────────
type VerificationRow = {
  id: string; created_at: string; certificate_identifier: string | null;
  search_method: string; result: string; verifier_name: string | null;
};

function useVerificationHistory(organizationId: string | null) {
  const [rows, setRows] = useState<VerificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!organizationId) { setRows([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase.from("verification_events").select("id,created_at,certificate_identifier,search_method,result,verifier_name").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(500);
    setRows((data ?? []) as VerificationRow[]); setLoading(false);
  }, [organizationId]);
  useEffect(() => { load(); }, [load]);
  return { rows, loading, reload: load };
}

const resultBadge: Record<string, string> = {
  authentic: "border-success/30 bg-success/15 text-success",
  invalid: "border-destructive/30 bg-destructive/15 text-destructive",
  revoked: "border-destructive/30 bg-destructive/15 text-destructive",
  suspended: "border-warning/40 bg-warning/20 text-warning-foreground",
  tampered: "border-destructive/30 bg-destructive/15 text-destructive",
};

export function OrganizationDashboard() {
  const { organizationId } = useAuth();
  const { rows, loading } = useVerificationHistory(organizationId);
  const stats = useMemo(() => {
    const month = new Date(); month.setDate(1); month.setHours(0, 0, 0, 0);
    return {
      total: rows.length,
      thisMonth: rows.filter((r) => new Date(r.created_at) >= month).length,
      authentic: rows.filter((r) => r.result === "authentic").length,
      flagged: rows.filter((r) => r.result !== "authentic").length,
    };
  }, [rows]);

  return (
    <PortalShell role="organization" title="Dashboard">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total verifications" value={stats.total} icon={Search} loading={loading} />
        <StatCard label="This month" value={stats.thisMonth} icon={History} loading={loading} />
        <StatCard label="Authentic" value={stats.authentic} icon={CheckCircle2} loading={loading} tone="success" />
        <StatCard label="Flagged" value={stats.flagged} icon={AlertTriangle} loading={loading} tone="destructive" />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild variant="premium"><Link to="/organization/verify"><ScanLine />Verify a certificate</Link></Button>
        <Button asChild variant="glass"><Link to="/organization/history"><History />View full history</Link></Button>
      </div>

      <Card className="mt-6 elevated-panel">
        <CardHeader><CardTitle>Recent verifications</CardTitle></CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-48 w-full" /> : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No verifications yet. Start by verifying a certificate.</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Certificate ID</TableHead><TableHead>Method</TableHead><TableHead>Result</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
              <TableBody>{rows.slice(0, 6).map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.certificate_identifier ?? "—"}</TableCell>
                  <TableCell className="capitalize">{r.search_method}</TableCell>
                  <TableCell><Badge className={resultBadge[r.result]}>{r.result}</Badge></TableCell>
                  <TableCell>{new Date(r.created_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </PortalShell>
  );
}

export function OrganizationVerify() {
  const { organizationId } = useAuth();
  const [query, setQuery] = useState("");
  const [method, setMethod] = useState<"id" | "qr">("id");
  const [mode, setMode] = useState<VerifyMode>("idle");
  const [cert, setCert] = useState<CertRecord | null>(null);
  const [institution, setInstitution] = useState<InstitutionRecord | null>(null);
  const [verifiedAt, setVerifiedAt] = useState<Date | null>(null);

  async function run(input: string, m: "id" | "qr") {
    if (!input.trim()) return;
    setMode("loading");
    const { record, institution: inst, lookup } = await runVerifyQuery(input, m);
    if (!record) {
      setMode("invalid"); setCert(null); setInstitution(null);
      await logVerification({ result: "invalid", identifier: lookup, method: m, organizationId });
      return;
    }
    setCert(record); setInstitution(inst); setVerifiedAt(new Date());
    const next = modeFromStatus(record.status);
    setMode(next);
    await logVerification({ result: next, identifier: record.certificate_id, method: m, institutionId: record.institution_id, organizationId });
  }

  return (
    <PortalShell role="organization" title="Verify a certificate">
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="elevated-panel h-fit">
          <CardHeader><CardTitle>Look up a certificate</CardTitle></CardHeader>
          <CardContent>
            <Tabs value={method} onValueChange={(v) => setMethod(v as "id" | "qr")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="id"><Search className="mr-1.5 h-3.5 w-3.5" />Certificate ID</TabsTrigger>
                <TabsTrigger value="qr"><QrCode className="mr-1.5 h-3.5 w-3.5" />QR scan</TabsTrigger>
              </TabsList>
              <TabsContent value="id" className="pt-5">
                <form onSubmit={(e) => { e.preventDefault(); run(query, "id"); }} className="space-y-3">
                  <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. CT-2025-9F41-A2C8" className="h-12 font-mono" />
                  <Button variant="premium" className="w-full" disabled={mode === "loading"}>
                    {mode === "loading" ? <Loader2 className="animate-spin" /> : <ShieldCheck />}Verify
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="qr" className="pt-5">
                <QRDropZone onScan={(v) => { setQuery(v); run(v, "qr"); }} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        <VerificationResult mode={mode} cert={cert} institution={institution} verifiedAt={verifiedAt} />
      </div>
    </PortalShell>
  );
}

export function OrganizationHistory() {
  const { organizationId } = useAuth();
  const { rows, loading } = useVerificationHistory(organizationId);
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => rows.filter((r) => !search.trim() || (r.certificate_identifier ?? "").toLowerCase().includes(search.toLowerCase())), [rows, search]);

  function exportCsv() {
    if (filtered.length === 0) { toast.error("Nothing to export"); return; }
    const header = ["certificate_id", "method", "result", "date"];
    const lines = [header.join(",")].concat(filtered.map((r) => [
      r.certificate_identifier ?? "", r.search_method, r.result, new Date(r.created_at).toISOString(),
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")));
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `verification-history-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded");
  }
  function printPdf() {
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) { toast.error("Pop-up blocked"); return; }
    const rowsHtml = filtered.map((r) => `<tr><td>${r.certificate_identifier ?? ""}</td><td>${r.search_method}</td><td>${r.result}</td><td>${new Date(r.created_at).toLocaleString()}</td></tr>`).join("");
    w.document.write(`<!doctype html><html><head><title>Verification History</title><style>
      body{font-family:system-ui;padding:32px;color:#111} table{width:100%;border-collapse:collapse;font-size:13px}
      th,td{padding:8px;border-bottom:1px solid #ddd;text-align:left} th{background:#f4f6fa}
      h1{font-size:20px;margin:0 0 4px} p{color:#666;margin:0 0 24px}
    </style></head><body>
      <h1>Verification History</h1><p>Generated ${new Date().toLocaleString()} · ${filtered.length} records</p>
      <table><thead><tr><th>Certificate ID</th><th>Method</th><th>Result</th><th>Date</th></tr></thead><tbody>${rowsHtml}</tbody></table>
      <script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`);
    w.document.close();
  }

  return (
    <PortalShell role="organization" title="Verification history">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-10" placeholder="Search certificate ID…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button variant="glass" onClick={exportCsv}><Download />CSV</Button>
          <Button variant="glass" onClick={printPdf}><Printer />PDF</Button>
        </div>
      </div>

      <Card className="elevated-panel">
        <CardContent className="p-0">
          {loading ? <div className="p-6"><Skeleton className="h-64 w-full" /></div> : filtered.length === 0 ? (
            <p className="p-10 text-center text-sm text-muted-foreground">No verifications recorded yet.</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Certificate ID</TableHead><TableHead>Method</TableHead><TableHead>Result</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
              <TableBody>{filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.certificate_identifier ?? "—"}</TableCell>
                  <TableCell className="capitalize">{r.search_method}</TableCell>
                  <TableCell><Badge className={resultBadge[r.result]}>{r.result}</Badge></TableCell>
                  <TableCell>{new Date(r.created_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </PortalShell>
  );
}

export function OrganizationSettings() {
  return (
    <PortalShell role="organization" title="Settings">
      <OrganizationSettingsContent />
    </PortalShell>
  );
}

// ═══════════════════════════════════════════════════════════════════
// BULK UPLOAD (CSV)
// ═══════════════════════════════════════════════════════════════════
function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const splitLine = (line: string): string[] => {
    const out: string[] = []; let cur = ""; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
      else if (ch === "," && !inQ) { out.push(cur); cur = ""; }
      else cur += ch;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  const headers = splitLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  return lines.slice(1).map((line) => {
    const cells = splitLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = cells[i] ?? ""; });
    return row;
  });
}

function BulkUploadDialog({ institutionId, onCompleted }: { institutionId: string | null; onCompleted: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, ok: 0, failed: 0 });
  const fileRef = useRef<HTMLInputElement>(null);

  function downloadTemplate() {
    const csv = "full_name,matric_number,qualification,department_name,graduation_year\nJane Doe,MAT12345,B.Sc. Computer Science,Computer Science,2024\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "certificates-template.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  async function handleFile(file: File) {
    if (!institutionId) { toast.error("No institution context"); return; }
    setBusy(true);
    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length === 0) { toast.error("Empty or invalid CSV"); setBusy(false); return; }
    setProgress({ done: 0, total: rows.length, ok: 0, failed: 0 });

    let ok = 0, failed = 0;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const full_name = r.full_name || r.name || r.candidate_name;
      const matric_number = r.matric_number || r.matric || r.matric_id || r.student_id || "";
      const qualification = r.qualification || r.program || "";
      const department_name = r.department_name || r.department || "General";
      const graduation_year = Number(r.graduation_year || r.year || new Date().getFullYear());
      if (!full_name || !qualification) { failed++; setProgress((p) => ({ ...p, done: i + 1, failed: p.failed + 1 })); continue; }
      try {
        const certificate_id = generateCertId("CT", graduation_year);
        const issue_date = new Date().toISOString().slice(0, 10);
        const hash_signature = await sha256Hex(`${certificate_id}|${full_name}|${matric_number}|${qualification}|${issue_date}`);
        const qr_payload = buildQrPayload(certificate_id);
        const { error } = await supabase.from("certificates").insert({
          institution_id: institutionId, certificate_id, full_name, matric_number,
          qualification, department_name, graduation_year, issue_date, status: "valid",
          hash_signature, qr_payload,
        });
        if (error) throw error;
        ok++;
      } catch { failed++; }
      setProgress({ done: i + 1, total: rows.length, ok, failed });
    }

    await supabase.from("bulk_uploads").insert({
      institution_id: institutionId, source_filename: file.name, upload_type: "certificates",
      status: failed > 0 ? "completed_with_errors" : "completed",
      total_rows: rows.length, processed_rows: ok, failed_rows: failed,
      completed_at: new Date().toISOString(),
    });

    toast.success(`Imported ${ok} of ${rows.length} certificates`);
    setBusy(false);
    onCompleted();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setProgress({ done: 0, total: 0, ok: 0, failed: 0 }); }}>
      <DialogTrigger asChild><Button variant="glass"><Upload />Bulk upload</Button></DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk import certificates</DialogTitle>
          <DialogDescription>Upload a CSV file with columns: full_name, matric_number, qualification, department_name, graduation_year.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Button variant="ghost" size="sm" onClick={downloadTemplate} className="justify-self-start"><FileSpreadsheet />Download CSV template</Button>
          <div className="grid place-items-center rounded-lg border border-dashed border-border bg-secondary/40 p-8 text-center">
            <Upload className="mb-3 h-8 w-8 text-primary" />
            <p className="font-medium">Choose a CSV file</p>
            <p className="mb-4 text-xs text-muted-foreground">Each row will be issued a certificate ID and QR.</p>
            <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            <Button variant="premium" size="sm" disabled={busy} onClick={() => fileRef.current?.click()}>
              {busy ? <Loader2 className="animate-spin" /> : <Upload />}Select file
            </Button>
          </div>
          {progress.total > 0 && (
            <div className="rounded-lg border border-border p-3 text-sm">
              <div className="mb-2 flex justify-between"><span>Progress</span><span className="font-medium">{progress.done} / {progress.total}</span></div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} /></div>
              <div className="mt-3 flex gap-4 text-xs text-muted-foreground"><span>✓ {progress.ok} imported</span><span>✕ {progress.failed} failed</span></div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════
// FORGOT / RESET PASSWORD & UNAUTHORIZED
// ═══════════════════════════════════════════════════════════════════
export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setSent(true); toast.success("Reset link sent");
  }

  return (
    <PublicShell>
      <section className="container grid place-items-center py-12 md:py-20">
        <Card className="elevated-panel w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Reset your password</CardTitle>
            <p className="text-sm text-muted-foreground">We'll email you a link to set a new one.</p>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="text-center">
                <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-success/15 text-success"><Mail className="h-6 w-6" /></div>
                <p className="text-sm">If an account exists for <span className="font-medium">{email}</span>, a reset link is on its way.</p>
                <Button asChild variant="glass" className="mt-4"><Link to="/login/institution">Back to sign in</Link></Button>
              </div>
            ) : (
              <form onSubmit={submit} className="grid gap-3">
                <div className="grid gap-1.5"><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <Button type="submit" variant="premium" disabled={busy} className="mt-2">
                  {busy ? <Loader2 className="animate-spin" /> : <KeyRound />}Send reset link
                </Button>
                <Link to="/login/institution" className="mt-2 text-center text-sm text-muted-foreground hover:text-foreground">Back to sign in</Link>
              </form>
            )}
          </CardContent>
        </Card>
      </section>
    </PublicShell>
  );
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase auto-handles recovery hash and creates a session
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (password !== confirm) { toast.error("Passwords do not match"); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated");
    navigate("/login/institution");
  }

  return (
    <PublicShell>
      <section className="container grid place-items-center py-12 md:py-20">
        <Card className="elevated-panel w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Set a new password</CardTitle>
            <p className="text-sm text-muted-foreground">Choose something strong you'll remember.</p>
          </CardHeader>
          <CardContent>
            {!ready ? (
              <div className="grid gap-3 text-center text-sm text-muted-foreground">
                <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                <p>Open this page from the reset link in your email.</p>
              </div>
            ) : (
              <form onSubmit={submit} className="grid gap-3">
                <div className="grid gap-1.5"><Label>New password</Label><Input type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                <div className="grid gap-1.5"><Label>Confirm</Label><Input type="password" minLength={6} required value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
                <Button type="submit" variant="premium" disabled={busy} className="mt-2">
                  {busy ? <Loader2 className="animate-spin" /> : <Lock />}Update password
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </section>
    </PublicShell>
  );
}

export function UnauthorizedPage() {
  return (
    <PublicShell>
      <section className="container grid place-items-center py-20">
        <Card className="elevated-panel max-w-md text-center">
          <CardContent className="p-8">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-destructive/10 text-destructive"><ShieldAlert className="h-7 w-7" /></div>
            <h1 className="text-2xl font-semibold">Access denied</h1>
            <p className="mt-2 text-sm text-muted-foreground">You do not have permission to access this page.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Button asChild variant="premium"><Link to="/">Go home</Link></Button>
              <Button asChild variant="glass"><Link to="/login/institution">Sign in</Link></Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </PublicShell>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ORGANIZATION ANALYTICS
// ═══════════════════════════════════════════════════════════════════
export function OrganizationAnalytics() {
  const { organizationId } = useAuth();
  const { rows, loading } = useVerificationHistory(organizationId);

  const byDay = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r) => {
      const d = new Date(r.created_at).toISOString().slice(0, 10);
      map.set(d, (map.get(d) ?? 0) + 1);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).slice(-14);
  }, [rows]);

  const max = Math.max(1, ...byDay.map(([, n]) => n));
  const counts = useMemo(() => ({
    authentic: rows.filter((r) => r.result === "authentic").length,
    revoked: rows.filter((r) => r.result === "revoked").length,
    suspended: rows.filter((r) => r.result === "suspended").length,
    invalid: rows.filter((r) => r.result === "invalid").length,
  }), [rows]);

  return (
    <PortalShell role="organization" title="Verification analytics">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total" value={rows.length} icon={BarChart3} loading={loading} />
        <StatCard label="Authentic" value={counts.authentic} icon={CheckCircle2} loading={loading} tone="success" />
        <StatCard label="Revoked detected" value={counts.revoked} icon={XCircle} loading={loading} tone="destructive" />
        <StatCard label="Suspended" value={counts.suspended} icon={AlertTriangle} loading={loading} tone="warning" />
      </div>

      <Card className="mt-6 elevated-panel">
        <CardHeader><CardTitle>Last 14 days</CardTitle></CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-48 w-full" /> : byDay.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No verifications yet.</p>
          ) : (
            <div className="flex h-48 items-end gap-2">
              {byDay.map(([d, n]) => (
                <div key={d} className="flex flex-1 flex-col items-center gap-1">
                  <div className="w-full rounded-t bg-primary/80" style={{ height: `${(n / max) * 100}%` }} title={`${d}: ${n}`} />
                  <span className="text-[10px] text-muted-foreground">{d.slice(5)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PortalShell>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SUPER ADMIN PORTAL
// ═══════════════════════════════════════════════════════════════════
type SaNav = { to: string; label: string; Icon: typeof FileCheck2 };
const SA_NAV: SaNav[] = [
  { to: "/super-admin", label: "Overview", Icon: BarChart3 },
  { to: "/super-admin/institutions", label: "Institutions", Icon: Building2 },
  { to: "/super-admin/organizations", label: "Organizations", Icon: Users },
  { to: "/super-admin/certificates", label: "Certificates", Icon: GraduationCap },
  { to: "/super-admin/verifications", label: "Verifications", Icon: Activity },
  { to: "/super-admin/audit", label: "Audit log", Icon: Layers },
  { to: "/super-admin/settings", label: "Settings", Icon: SettingsIcon },
];

function SuperAdminShell({ title, children }: { title: string; children: React.ReactNode }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    if (auth.loading) return;
    if (!auth.session) { navigate("/super-admin/login"); return; }
    if (auth.role !== "super_admin") navigate("/unauthorized");
  }, [auth.loading, auth.session, auth.role, navigate]);

  const Sidebar = () => (
    <nav className="flex flex-col gap-1 p-4">
      {SA_NAV.map(({ to, label, Icon }) => {
        const active = loc.pathname === to;
        return (
          <Link key={to} to={to} className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"}`}>
            <Icon className="h-4 w-4" />{label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-[#080d1a] text-white">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-white/10 bg-[#0a1124] md:flex">
        <div className="border-b border-white/10 p-4">
          <div className="inline-flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground"><ShieldAlert className="h-4 w-4" /></span>
            <span className="text-sm font-semibold tracking-tight">Platform Console</span>
          </div>
        </div>
        <Sidebar />
        <div className="mt-auto border-t border-white/10 p-4">
          <p className="truncate text-xs text-white/60">{auth.email}</p>
          <p className="text-[11px] uppercase tracking-wide text-white/40">super admin</p>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/10 bg-[#080d1a]/85 px-4 backdrop-blur-xl md:px-8">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild><Button variant="ghost" size="icon" className="md:hidden text-white"><Menu /></Button></SheetTrigger>
              <SheetContent side="left" className="w-64 border-white/10 bg-[#0a1124] p-0 text-white">
                <div className="border-b border-white/10 p-4">
                  <span className="text-sm font-semibold">Platform Console</span>
                </div>
                <Sidebar />
              </SheetContent>
            </Sheet>
            <h1 className="text-lg font-semibold">{title}</h1>
          </div>
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/10" onClick={async () => { await auth.signOut(); navigate("/"); }}>
            <LogOut className="h-4 w-4" /><span className="hidden sm:inline">Sign out</span>
          </Button>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}

function SaStatCard({ label, value, icon: Icon, loading }: { label: string; value: number | string; icon: typeof FileCheck2; loading?: boolean }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/60">{label}</p>
        <span className="grid h-8 w-8 place-items-center rounded-md bg-primary/20 text-primary"><Icon className="h-4 w-4" /></span>
      </div>
      {loading ? <Skeleton className="mt-3 h-9 w-20 bg-white/10" /> : <p className="mt-3 text-3xl font-semibold">{value}</p>}
    </div>
  );
}

export function SuperAdminDashboard() {
  const [stats, setStats] = useState({
    inst: 0,
    org: 0,
    cert: 0,
    ver: 0,
    ver24: 0,
    suspended: 0,
    pendingInst: 0,
    pendingOrg: 0,
  });
  const [recent, setRecent] = useState<{ id: string; created_at: string; result: string; certificate_identifier: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { (async () => {
    setLoading(true);
    const since = new Date(Date.now() - 86400000).toISOString();
    const [i, o, c, v, v24, sus, pendingI, pendingO, rec] = await Promise.all([
      supabase.from("institutions").select("id", { count: "exact", head: true }),
      supabase.from("organizations").select("id", { count: "exact", head: true }),
      supabase.from("certificates").select("id", { count: "exact", head: true }),
      supabase.from("verification_events").select("id", { count: "exact", head: true }),
      supabase.from("verification_events").select("id", { count: "exact", head: true }).gte("created_at", since),
      supabase.from("certificates").select("id", { count: "exact", head: true }).neq("status", "valid"),
      supabase.from("institutions").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("organizations").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("verification_events").select("id,created_at,result,certificate_identifier").order("created_at", { ascending: false }).limit(8),
    ]);
    setStats({
      inst: i.count ?? 0,
      org: o.count ?? 0,
      cert: c.count ?? 0,
      ver: v.count ?? 0,
      ver24: v24.count ?? 0,
      suspended: sus.count ?? 0,
      pendingInst: pendingI.count ?? 0,
      pendingOrg: pendingO.count ?? 0,
    });
    setRecent((rec.data ?? []) as typeof recent);
    setLoading(false);
  })(); }, []);

  return (
    <SuperAdminShell title="Platform overview">
      {(stats.pendingInst > 0 || stats.pendingOrg > 0) && (
        <div className="mb-4 flex flex-wrap gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
          <span className="text-white/80">
            <strong className="text-warning-foreground">{stats.pendingInst + stats.pendingOrg}</strong> application
            {stats.pendingInst + stats.pendingOrg === 1 ? "" : "s"} awaiting review
          </span>
          {stats.pendingInst > 0 && (
            <Link to="/super-admin/institutions" className="font-medium text-primary hover:underline">
              {stats.pendingInst} institution{stats.pendingInst === 1 ? "" : "s"}
            </Link>
          )}
          {stats.pendingOrg > 0 && (
            <Link to="/super-admin/organizations" className="font-medium text-primary hover:underline">
              {stats.pendingOrg} organization{stats.pendingOrg === 1 ? "" : "s"}
            </Link>
          )}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <SaStatCard label="Institutions" value={stats.inst} icon={Building2} loading={loading} />
        <SaStatCard label="Organizations" value={stats.org} icon={Users} loading={loading} />
        <SaStatCard label="Pending reviews" value={stats.pendingInst + stats.pendingOrg} icon={Clock} loading={loading} />
        <SaStatCard label="Certificates" value={stats.cert} icon={GraduationCap} loading={loading} />
        <SaStatCard label="Verifications" value={stats.ver} icon={Activity} loading={loading} />
        <SaStatCard label="24h activity" value={stats.ver24} icon={BarChart3} loading={loading} />
        <SaStatCard label="Flagged certs" value={stats.suspended} icon={AlertTriangle} loading={loading} />
      </div>
      <div className="mt-6 rounded-lg border border-white/10 bg-white/5">
        <div className="border-b border-white/10 p-4"><h2 className="text-sm font-semibold">Recent verification activity</h2></div>
        <div className="p-2">
          {loading ? <Skeleton className="h-40 w-full bg-white/10" /> : recent.length === 0 ? (
            <p className="p-6 text-center text-sm text-white/50">No verifications yet.</p>
          ) : (
            <Table>
              <TableHeader><TableRow className="border-white/10 hover:bg-transparent"><TableHead className="text-white/60">Certificate ID</TableHead><TableHead className="text-white/60">Result</TableHead><TableHead className="text-white/60">Time</TableHead></TableRow></TableHeader>
              <TableBody>{recent.map((r) => (
                <TableRow key={r.id} className="border-white/5">
                  <TableCell className="font-mono text-xs text-white/80">{r.certificate_identifier ?? "—"}</TableCell>
                  <TableCell><Badge className={resultBadge[r.result]}>{r.result}</Badge></TableCell>
                  <TableCell className="text-white/70">{new Date(r.created_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          )}
        </div>
      </div>
    </SuperAdminShell>
  );
}

type SaInst = { id: string; name: string; status: string; country: string | null; email: string | null; created_at: string };
export function SuperAdminInstitutions() {
  const [rows, setRows] = useState<SaInst[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending">("all");
  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("institutions").select("id,name,status,country,email,created_at").order("created_at", { ascending: false });
    setRows((data ?? []) as SaInst[]);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function setStatus(id: string, status: TenantReviewStatus) {
    const { error } = await supabase.from("institutions").update(institutionReviewPatch(status)).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "active" ? "Institution approved" : `Institution marked ${status}`);
    load();
  }

  const visible = filter === "pending" ? rows.filter((r) => r.status === "pending") : rows;

  return (
    <SuperAdminShell title="Institutions">
      <div className="mb-4 flex gap-2">
        <Button size="sm" variant={filter === "all" ? "default" : "ghost"} onClick={() => setFilter("all")}>All</Button>
        <Button size="sm" variant={filter === "pending" ? "default" : "ghost"} onClick={() => setFilter("pending")}>
          Pending ({rows.filter((r) => r.status === "pending").length})
        </Button>
      </div>
      <div className="rounded-lg border border-white/10 bg-white/5">
        {loading ? <div className="p-6"><Skeleton className="h-64 w-full bg-white/10" /></div> : visible.length === 0 ? (
          <p className="p-8 text-center text-sm text-white/50">No institutions{filter === "pending" ? " pending review" : ""}.</p>
        ) : (
          <Table>
            <TableHeader><TableRow className="border-white/10"><TableHead className="text-white/60">Name</TableHead><TableHead className="text-white/60">Country</TableHead><TableHead className="text-white/60">Email</TableHead><TableHead className="text-white/60">Status</TableHead><TableHead className="text-white/60">Joined</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>{visible.map((r) => (
              <TableRow key={r.id} className="border-white/5">
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="text-white/70">{r.country ?? "—"}</TableCell>
                <TableCell className="text-white/70">{r.email ?? "—"}</TableCell>
                <TableCell><Badge className={orgStatusBadgeClass(r.status)}>{r.status}</Badge></TableCell>
                <TableCell className="text-white/60">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="flex flex-wrap gap-1">
                  {r.status !== "active" && <Button size="sm" variant="ghost" className="text-success hover:bg-success/10" onClick={() => setStatus(r.id, "active")}>Approve</Button>}
                  {r.status !== "suspended" && <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => setStatus(r.id, "suspended")}>Suspend</Button>}
                  {r.status !== "rejected" && r.status !== "active" && (
                    <Button size="sm" variant="ghost" className="text-muted-foreground hover:bg-muted" onClick={() => setStatus(r.id, "rejected")}>Reject</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        )}
      </div>
    </SuperAdminShell>
  );
}

type SaOrg = { id: string; name: string; status: string; org_type: string; email: string | null; created_at: string };
export function SuperAdminOrganizations() {
  const [rows, setRows] = useState<SaOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending">("all");
  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("organizations").select("id,name,status,org_type,email,created_at").order("created_at", { ascending: false });
    setRows((data ?? []) as SaOrg[]);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function setStatus(id: string, status: TenantReviewStatus) {
    const { error } = await supabase.from("organizations").update(organizationReviewPatch(status)).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "active" ? "Organization approved" : `Organization marked ${status}`);
    load();
  }

  const visible = filter === "pending" ? rows.filter((r) => r.status === "pending") : rows;

  return (
    <SuperAdminShell title="Organizations">
      <div className="mb-4 flex gap-2">
        <Button size="sm" variant={filter === "all" ? "default" : "ghost"} onClick={() => setFilter("all")}>All</Button>
        <Button size="sm" variant={filter === "pending" ? "default" : "ghost"} onClick={() => setFilter("pending")}>
          Pending ({rows.filter((r) => r.status === "pending").length})
        </Button>
      </div>
      <div className="rounded-lg border border-white/10 bg-white/5">
        {loading ? <div className="p-6"><Skeleton className="h-64 w-full bg-white/10" /></div> : visible.length === 0 ? (
          <p className="p-8 text-center text-sm text-white/50">No organizations{filter === "pending" ? " pending review" : ""}.</p>
        ) : (
          <Table>
            <TableHeader><TableRow className="border-white/10"><TableHead className="text-white/60">Name</TableHead><TableHead className="text-white/60">Type</TableHead><TableHead className="text-white/60">Email</TableHead><TableHead className="text-white/60">Status</TableHead><TableHead className="text-white/60">Joined</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>{visible.map((r) => (
              <TableRow key={r.id} className="border-white/5">
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="text-white/70">{r.org_type}</TableCell>
                <TableCell className="text-white/70">{r.email ?? "—"}</TableCell>
                <TableCell><Badge className={orgStatusBadgeClass(r.status)}>{r.status}</Badge></TableCell>
                <TableCell className="text-white/60">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="flex flex-wrap gap-1">
                  {r.status !== "active" && <Button size="sm" variant="ghost" className="text-success hover:bg-success/10" onClick={() => setStatus(r.id, "active")}>Approve</Button>}
                  {r.status !== "suspended" && <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => setStatus(r.id, "suspended")}>Suspend</Button>}
                  {r.status !== "rejected" && r.status !== "active" && (
                    <Button size="sm" variant="ghost" className="text-muted-foreground hover:bg-muted" onClick={() => setStatus(r.id, "rejected")}>Reject</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        )}
      </div>
    </SuperAdminShell>
  );
}

export function SuperAdminCertificates() {
  const [rows, setRows] = useState<(CertRow & { institution_id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => {
    setLoading(true);
    const { data } = await supabase.from("certificates").select("*").order("created_at", { ascending: false }).limit(200);
    setRows((data ?? []) as (CertRow & { institution_id: string })[]); setLoading(false);
  })(); }, []);
  return (
    <SuperAdminShell title="All certificates">
      <div className="rounded-lg border border-white/10 bg-white/5">
        {loading ? <div className="p-6"><Skeleton className="h-64 w-full bg-white/10" /></div> : (
          <Table>
            <TableHeader><TableRow className="border-white/10"><TableHead className="text-white/60">Certificate ID</TableHead><TableHead className="text-white/60">Candidate</TableHead><TableHead className="text-white/60">Qualification</TableHead><TableHead className="text-white/60">Year</TableHead><TableHead className="text-white/60">Status</TableHead></TableRow></TableHeader>
            <TableBody>{rows.map((r) => (
              <TableRow key={r.id} className="border-white/5">
                <TableCell className="font-mono text-xs">{r.certificate_id}</TableCell>
                <TableCell>{r.full_name}</TableCell>
                <TableCell className="text-white/70">{r.qualification}</TableCell>
                <TableCell className="text-white/70">{r.graduation_year}</TableCell>
                <TableCell><Badge className={statusBadge[r.status]}>{r.status}</Badge></TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        )}
      </div>
    </SuperAdminShell>
  );
}

export function SuperAdminVerifications() {
  const [rows, setRows] = useState<{ id: string; created_at: string; certificate_identifier: string | null; search_method: string; result: string; institution_id: string | null; organization_id: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => {
    const { data } = await supabase.from("verification_events").select("id,created_at,certificate_identifier,search_method,result,institution_id,organization_id").order("created_at", { ascending: false }).limit(200);
    setRows((data ?? []) as typeof rows); setLoading(false);
  })(); }, []);
  return (
    <SuperAdminShell title="Verification activity">
      <div className="rounded-lg border border-white/10 bg-white/5">
        {loading ? <div className="p-6"><Skeleton className="h-64 w-full bg-white/10" /></div> : (
          <Table>
            <TableHeader><TableRow className="border-white/10"><TableHead className="text-white/60">Cert ID</TableHead><TableHead className="text-white/60">Method</TableHead><TableHead className="text-white/60">Result</TableHead><TableHead className="text-white/60">Time</TableHead></TableRow></TableHeader>
            <TableBody>{rows.map((r) => (
              <TableRow key={r.id} className="border-white/5">
                <TableCell className="font-mono text-xs">{r.certificate_identifier ?? "—"}</TableCell>
                <TableCell className="capitalize text-white/70">{r.search_method}</TableCell>
                <TableCell><Badge className={resultBadge[r.result]}>{r.result}</Badge></TableCell>
                <TableCell className="text-white/70">{new Date(r.created_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        )}
      </div>
    </SuperAdminShell>
  );
}

export function SuperAdminAudit() {
  const [rows, setRows] = useState<{ id: string; created_at: string; action: string; entity_type: string; summary: string | null; risk_level: string }[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => {
    const { data } = await supabase.from("audit_logs").select("id,created_at,action,entity_type,summary,risk_level").order("created_at", { ascending: false }).limit(200);
    setRows((data ?? []) as typeof rows); setLoading(false);
  })(); }, []);
  return (
    <SuperAdminShell title="Audit log">
      <div className="rounded-lg border border-white/10 bg-white/5">
        {loading ? <div className="p-6"><Skeleton className="h-64 w-full bg-white/10" /></div> : rows.length === 0 ? (
          <p className="p-10 text-center text-sm text-white/50">No audit entries recorded.</p>
        ) : (
          <Table>
            <TableHeader><TableRow className="border-white/10"><TableHead className="text-white/60">Action</TableHead><TableHead className="text-white/60">Entity</TableHead><TableHead className="text-white/60">Summary</TableHead><TableHead className="text-white/60">Risk</TableHead><TableHead className="text-white/60">Time</TableHead></TableRow></TableHeader>
            <TableBody>{rows.map((r) => (
              <TableRow key={r.id} className="border-white/5">
                <TableCell className="font-medium">{r.action}</TableCell>
                <TableCell className="text-white/70">{r.entity_type}</TableCell>
                <TableCell className="text-white/70">{r.summary ?? "—"}</TableCell>
                <TableCell><Badge className={r.risk_level === "high" ? "border-destructive/30 bg-destructive/15 text-destructive" : "border-success/30 bg-success/15 text-success"}>{r.risk_level}</Badge></TableCell>
                <TableCell className="text-white/70">{new Date(r.created_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        )}
      </div>
    </SuperAdminShell>
  );
}

export function SuperAdminSettings() {
  return (
    <SuperAdminShell title="Settings">
      <SuperAdminSettingsContent />
    </SuperAdminShell>
  );
}

