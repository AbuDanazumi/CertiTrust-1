import { Link, Navigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { AuthLogo, AuthThemeToggle } from "@/components/auth/AuthPageChrome";
import { PortalChoiceList } from "@/components/public/PortalChoiceList";

export function AuthHubPage({ mode }: { mode: "login" | "signup" }) {
  const [params] = useSearchParams();
  const role = params.get("role");
  const isLogin = mode === "login";

  if (role === "institution") {
    return <Navigate to={isLogin ? "/login/institution" : "/signup/institution"} replace />;
  }
  if (role === "organization") {
    return <Navigate to={isLogin ? "/login/organization" : "/signup/organization"} replace />;
  }

  const title = isLogin ? "Sign in" : "Get started";
  const description = isLogin
    ? "Choose your portal to open the correct workspace."
    : "Select how you will use CertiTrust. Registration takes a few minutes.";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border/60 px-4 py-4">
        <div className="container flex items-center justify-between">
          <AuthLogo />
          <AuthThemeToggle />
        </div>
      </header>

      <main className="container flex flex-1 flex-col items-center justify-center py-12">
        <div className="w-full max-w-2xl space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-2 text-muted-foreground">{description}</p>
          </div>

          <PortalChoiceList mode={isLogin ? "signin" : "onboarding"} />

          <p className="text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
