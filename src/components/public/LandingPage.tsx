import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  FileCheck2,
  QrCode,
  ScanLine,
  Shield,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { usePublicLayout } from "@/components/public/PublicLayoutContext";
import { PublicShell } from "@/components/public/PublicShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function LandingPage() {
  const { openSignIn, openOnboarding } = usePublicLayout();
  const navigate = useNavigate();

  return (
    <>
      {/* 1. Hero */}
      <section className="relative overflow-hidden border-b border-border/50">
        <div className="absolute inset-0 bg-[image:var(--gradient-soft)]" />
        <div className="noise-overlay absolute inset-0 opacity-25" />
        <div className="container relative py-16 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="mb-5 border-primary/20 bg-primary/10 text-primary">
              <Sparkles className="mr-1 h-3 w-3" />
              Simple · Trusted · Free for verifiers
            </Badge>
            <h1 className="text-4xl font-semibold tracking-tight md:text-5xl lg:text-6xl lg:leading-[1.08]">
              Verify any academic certificate{" "}
              <span className="gradient-text">in seconds</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
              CertiTrust connects issuing institutions and verifying organizations on one trusted
              platform — built for speed, clarity, and audit-ready workflows.
            </p>
          </div>
        </div>
      </section>

      {/* 2. Verification CTA */}
      <section className="container relative z-10 -mt-8 md:-mt-10">
        <Card className="elevated-panel overflow-hidden border-primary/15">
          <CardContent className="flex flex-col items-center gap-6 p-8 text-center md:flex-row md:p-10 md:text-left">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
              <ScanLine className="h-7 w-7" />
            </div>
            <div className="flex-1 space-y-2">
              <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
                Need to check a certificate now?
              </h2>
              <p className="text-sm text-muted-foreground md:text-base">
                Public verification is free. Scan a QR code or enter a certificate ID — no account
                required.
              </p>
            </div>
            <Button asChild variant="premium" size="lg" className="h-12 shrink-0 px-8">
              <Link to="/verify">
                Verify a certificate
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* 3. Account selection */}
      <section id="join" className="container py-16 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Account selection
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
            How will you use CertiTrust?
          </h2>
          <p className="mt-3 text-muted-foreground">
            Choose the path that matches your role. Registration takes a few minutes.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button variant="premium" size="lg" onClick={openOnboarding}>
              Get started
            </Button>
            <Button variant="glass" size="lg" onClick={openSignIn}>
              Sign in
            </Button>
          </div>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <Card className="group elevated-panel transition-all duration-300 hover:-translate-y-0.5 hover:shadow-elevated">
            <CardContent className="flex h-full flex-col p-8">
              <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Building2 className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold">Join as Institution</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Issue and manage digital certificates.
              </p>
              <ul className="mt-5 flex-1 space-y-2.5 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                  Certificate issuance with QR codes
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                  Revoke or restore credentials
                </li>
              </ul>
              <div className="mt-8 grid gap-2">
                <Button
                  variant="premium"
                  className="justify-between"
                  onClick={() => navigate("/signup/institution")}
                >
                  Register institution
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate("/login/institution")}>
                  Institution sign in
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="group elevated-panel transition-all duration-300 hover:-translate-y-0.5 hover:shadow-elevated">
            <CardContent className="flex h-full flex-col p-8">
              <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold">Join as Organization</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Verify certificates and credentials.
              </p>
              <ul className="mt-5 flex-1 space-y-2.5 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                  QR and certificate ID lookup
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                  Verification history and exports
                </li>
              </ul>
              <div className="mt-8 grid gap-2">
                <Button
                  variant="premium"
                  className="justify-between"
                  onClick={() => navigate("/signup/organization")}
                >
                  Register organization
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate("/login/organization")}>
                  Organization sign in
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 4. Benefits */}
      <section className="border-t border-border/60 bg-secondary/25">
        <div className="container py-16 md:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Why CertiTrust
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
              Built for trust at every step
            </h2>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Zap,
                title: "Instant verification",
                text: "Confirm credentials in seconds with QR or ID lookup.",
              },
              {
                icon: Shield,
                title: "Tamper-aware records",
                text: "Cryptographic integrity helps detect altered certificates.",
              },
              {
                icon: QrCode,
                title: "QR-first workflow",
                text: "Every issued certificate is ready for mobile scanning.",
              },
              {
                icon: FileCheck2,
                title: "Audit-ready history",
                text: "Organizations keep a clear trail of every check performed.",
              },
            ].map((item) => (
              <Card key={item.title} className="glass-panel border-border/60">
                <CardContent className="p-6">
                  <item.icon className="mb-3 h-5 w-5 text-primary" />
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

export function Landing() {
  return (
    <PublicShell>
      <LandingPage />
    </PublicShell>
  );
}
