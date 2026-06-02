import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { KeyRound, Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { SettingsSection } from "./SettingsSection";

export function SecuritySettingsPanel() {
  const auth = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPassword("");
    setConfirm("");
    toast.success("Password updated");
  }

  return (
    <div className="space-y-4">
      <SettingsSection
        title="Password"
        description="Update the password you use to sign in to this portal."
      >
        <form onSubmit={changePassword} className="grid max-w-md gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={6}
            />
          </div>
          <Button type="submit" variant="premium" disabled={busy} className="justify-self-start">
            {busy ? <Loader2 className="animate-spin" /> : <KeyRound className="h-4 w-4" />}
            Update password
          </Button>
        </form>
      </SettingsSection>

      <SettingsSection title="Sign-in recovery" description="If you are locked out, request a reset link by email.">
        <Button asChild variant="outline">
          <Link to="/forgot-password">Send password reset email</Link>
        </Button>
      </SettingsSection>

      <SettingsSection title="Session" description="Sign out on this device.">
        <Button
          variant="ghost"
          className="text-destructive hover:text-destructive"
          onClick={() => void auth.signOut()}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </SettingsSection>
    </div>
  );
}
