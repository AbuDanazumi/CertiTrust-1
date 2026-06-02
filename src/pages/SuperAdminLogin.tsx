import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { friendlyAuthError } from "@/lib/auth-errors";
import { supabase } from "@/integrations/supabase/client";

export default function SuperAdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const uid = session?.user.id;
      if (!uid) throw new Error("No session");

      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      const isAdmin = (roles ?? []).some((r) => r.role === "super_admin");
      if (!isAdmin) {
        await supabase.auth.signOut();
        toast.error("This account is not a Super Admin.");
        navigate("/unauthorized");
        return;
      }

      toast.success("Welcome back, admin");
      navigate("/super-admin");
    } catch (err) {
      toast.error(friendlyAuthError(err instanceof Error ? err.message : "Sign-in failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[#0a0f1f] p-4 text-white">
      <Card className="w-full max-w-md border-white/10 bg-[#0f1729] text-white shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-lg bg-primary text-primary-foreground">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">Platform Console</CardTitle>
          <p className="text-sm text-white/60">Super Admin sign-in</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-3">
            <div className="grid gap-1.5">
              <Label className="text-white/80">Admin email</Label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-white/10 bg-white/5 text-white placeholder:text-white/40"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-white/80">Password</Label>
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-white/10 bg-white/5 text-white"
              />
            </div>
            <Button type="submit" variant="premium" disabled={busy} className="mt-2">
              {busy ? <Loader2 className="animate-spin" /> : <ShieldAlert />}
              Enter console
            </Button>
            <p className="mt-3 text-center text-xs text-white/40">
              Restricted access. Unauthorized attempts are logged.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
