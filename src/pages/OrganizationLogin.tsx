import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { AuthBrandPanel, AuthPageHeader } from "@/components/auth/AuthPageChrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthValidation } from "@/hooks/useAuthValidation";

export default function OrganizationLogin() {
  const navigate = useNavigate();
  const { validateLogin, validating } = useAuthValidation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Please enter your email and password");
      return;
    }

    setIsLoading(true);
    const result = await validateLogin(email.trim(), password, "organization");
    setIsLoading(false);

    if (result.success) {
      toast.success("Welcome back");
      navigate("/organization");
      return;
    }
    setError(result.message);
    toast.error(result.message);
  }

  const busy = isLoading || validating;

  return (
    <div className="flex min-h-screen bg-background">
      <AuthBrandPanel variant="organization" />
      <div className="flex flex-1 flex-col">
        <AuthPageHeader />
        <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
          <div className="w-full max-w-md space-y-8">
            <div className="text-center lg:text-left">
              <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent lg:hidden">
                <Users className="h-6 w-6" />
              </span>
              <h1 className="text-2xl font-semibold tracking-tight">Organization sign in</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Verify certificates and credentials for your organization.
              </p>
            </div>

            <div className="glass-panel rounded-2xl p-6 sm:p-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
                    {error}
                  </p>
                )}

                <div className="space-y-2">
                  <Label htmlFor="org-login-email">Email</Label>
                  <Input
                    id="org-login-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    disabled={busy}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="org-login-pass">Password</Label>
                    <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    id="org-login-pass"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    disabled={busy}
                    className="h-11"
                  />
                </div>

                <Button type="submit" variant="premium" className="h-11 w-full" disabled={busy}>
                  {busy ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Signing in…
                    </>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                New organization?{" "}
                <Link to="/signup/organization" className="font-medium text-primary hover:underline">
                  Create an account
                </Link>
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
