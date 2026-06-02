import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, Moon, ShieldCheck, Sun } from "lucide-react";
import { PortalChoiceModal } from "@/components/public/PortalChoiceModal";
import { PublicLayoutContext } from "@/components/public/PublicLayoutContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useTheme } from "@/hooks/useTheme";

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

export function PublicShell({ children }: { children: React.ReactNode }) {
  const [signInOpen, setSignInOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const actions = {
    openSignIn: () => setSignInOpen(true),
    openOnboarding: () => setOnboardingOpen(true),
  };

  function openSignInFromMobile() {
    setMobileOpen(false);
    setSignInOpen(true);
  }

  function openOnboardingFromMobile() {
    setMobileOpen(false);
    setOnboardingOpen(true);
  }

  return (
    <PublicLayoutContext.Provider value={actions}>
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
          <div className="container flex h-16 items-center justify-between">
            <Logo />
            <nav className="hidden items-center gap-1 md:flex">
              <Button asChild variant="ghost" size="sm">
                <Link to="/verify">Verify</Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSignInOpen(true)}>
                Sign in
              </Button>
              <ThemeToggle />
              <Button variant="premium" size="sm" onClick={() => setOnboardingOpen(true)}>
                Get started
              </Button>
            </nav>
            <div className="flex items-center gap-1 md:hidden">
              <ThemeToggle />
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Open menu">
                    <Menu />
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <div className="mt-8 grid gap-2">
                    <Button asChild variant="ghost">
                      <Link to="/verify" onClick={() => setMobileOpen(false)}>
                        Verify a certificate
                      </Link>
                    </Button>
                    <Button variant="ghost" onClick={openSignInFromMobile}>
                      Sign in
                    </Button>
                    <Button variant="premium" onClick={openOnboardingFromMobile}>
                      Get started
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-border bg-secondary/30">
          <div className="container flex flex-col items-center justify-between gap-3 py-6 text-sm text-muted-foreground md:flex-row">
            <p>© {new Date().getFullYear()} CertiTrust · Digital credential verification</p>
            <div className="flex gap-4">
              <Link to="/verify" className="hover:text-foreground">
                Verify
              </Link>
              <button
                type="button"
                className="hover:text-foreground"
                onClick={() => setSignInOpen(true)}
              >
                Sign in
              </button>
            </div>
          </div>
        </footer>
      </div>

      <PortalChoiceModal mode="signin" open={signInOpen} onOpenChange={setSignInOpen} />
      <PortalChoiceModal mode="onboarding" open={onboardingOpen} onOpenChange={setOnboardingOpen} />
    </PublicLayoutContext.Provider>
  );
}
