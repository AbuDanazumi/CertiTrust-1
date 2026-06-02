import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Moon, ShieldCheck, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

export function AuthLogo() {
  return (
    <Link to="/" className="inline-flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground shadow-soft">
        <ShieldCheck className="h-5 w-5" />
      </span>
      <span className="text-lg font-semibold tracking-tight">CertiTrust</span>
    </Link>
  );
}

export function AuthThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

const brandContent = {
  institution: {
    eyebrow: "Institution portal",
    headline: "Issue trusted credentials at scale.",
    subline:
      "Register your institution to issue verifiable digital certificates with QR codes and full lifecycle control.",
    bullets: ["Certificate issuance & QR codes", "Bulk upload support", "Revoke or restore anytime"],
    glow: "bg-primary/20",
  },
  organization: {
    eyebrow: "Organization portal",
    headline: "Verify credentials in seconds.",
    subline:
      "Register your organization to verify certificates by QR or ID with a complete audit trail.",
    bullets: ["QR & certificate ID lookup", "Verification history", "Export-ready reports"],
    glow: "bg-accent/20",
  },
} as const;

export function AuthBrandPanel({ variant }: { variant: keyof typeof brandContent }) {
  const brand = brandContent[variant];
  return (
    <aside className="relative hidden w-[42%] overflow-hidden bg-[image:var(--gradient-hero)] text-primary-foreground lg:flex lg:flex-col">
      <div className="noise-overlay absolute inset-0 opacity-25" />
      <div className={cn("absolute -left-20 top-16 h-72 w-72 rounded-full blur-3xl", brand.glow)} />
      <div className="relative z-10 flex items-center justify-between p-8">
        <AuthLogo />
        <AuthThemeToggle />
      </div>
      <div className="relative z-10 flex flex-1 flex-col justify-center px-10 xl:px-14">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground/70">{brand.eyebrow}</p>
        <h1 className="mt-4 max-w-md text-3xl font-semibold leading-tight tracking-tight">{brand.headline}</h1>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-primary-foreground/80">{brand.subline}</p>
        <ul className="mt-8 space-y-3">
          {brand.bullets.map((item) => (
            <li key={item} className="flex items-center gap-2.5 text-sm">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />
              {item}
            </li>
          ))}
        </ul>
      </div>
      <p className="relative z-10 px-10 pb-8 text-xs text-primary-foreground/45">© CertiTrust</p>
    </aside>
  );
}

export function AuthPageHeader({ backTo = "/" }: { backTo?: string }) {
  return (
    <header className="flex items-center justify-between border-b border-border/60 px-4 py-4 lg:border-none lg:px-10 lg:pt-8">
      <div className="lg:hidden">
        <AuthLogo />
      </div>
      <Link
        to={backTo}
        className="ml-auto inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Home
      </Link>
      <div className="hidden lg:block">
        <AuthThemeToggle />
      </div>
    </header>
  );
}
