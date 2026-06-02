import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Clock, LogOut, Mail, ShieldAlert, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TenantStatus } from "@/lib/onboarding";
import { cn } from "@/lib/utils";

import { SUPPORT_EMAIL } from "@/lib/brand";

const statusConfig: Record<
  Exclude<TenantStatus, "active">,
  {
    badge: string;
    badgeVariant: "default" | "secondary" | "destructive" | "outline";
    title: string;
    message: string;
    icon: typeof Clock;
    iconWrap: string;
  }
> = {
  pending: {
    badge: "Pending review",
    badgeVariant: "secondary",
    title: "Application submitted",
    message:
      "Thank you for registering. Our team is reviewing your application and will email you when your account is approved. Most reviews are completed within 1–2 business days.",
    icon: Clock,
    iconWrap: "bg-primary/10 text-primary ring-primary/20",
  },
  suspended: {
    badge: "Suspended",
    badgeVariant: "outline",
    title: "Account suspended",
    message:
      "Access to operational features is temporarily disabled. Contact CertiTrust support if you believe this is an error.",
    icon: ShieldAlert,
    iconWrap: "bg-warning/15 text-warning ring-warning/30",
  },
  rejected: {
    badge: "Not approved",
    badgeVariant: "destructive",
    title: "Application not approved",
    message:
      "Your registration was not approved at this time. Reach out to support for details or register again with a different email.",
    icon: XCircle,
    iconWrap: "bg-destructive/10 text-destructive ring-destructive/20",
  },
};

export function PendingApprovalView({
  tenantLabel,
  tenantName,
  status,
  onSignOut,
}: {
  tenantLabel: string;
  tenantName?: string | null;
  status: Exclude<TenantStatus, "active">;
  onSignOut: () => void;
}) {
  const { refresh } = useAuth();
  const cfg = statusConfig[status];
  const Icon = cfg.icon;

  useEffect(() => {
    if (status !== "pending") return;
    const interval = window.setInterval(() => {
      void refresh();
    }, 20000);
    return () => window.clearInterval(interval);
  }, [status, refresh]);

  return (
    <div className="mx-auto flex min-h-[65vh] w-full max-w-lg flex-col justify-center px-4 py-12">
      <div className="glass-panel overflow-hidden rounded-2xl">
        <div className="border-b border-border/60 bg-gradient-to-r from-muted/40 to-transparent px-8 py-6 text-center">
          <span
            className={cn(
              "mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl ring-1",
              cfg.iconWrap
            )}
          >
            <Icon className="h-8 w-8" />
          </span>
          <Badge variant={cfg.badgeVariant} className="mb-3">
            {cfg.badge}
          </Badge>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tenantLabel}</p>
          {tenantName && <p className="mt-1 text-lg font-semibold">{tenantName}</p>}
        </div>

        <div className="space-y-5 px-8 py-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">{cfg.title}</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">{cfg.message}</p>

          {status === "pending" && (
            <div className="rounded-xl border border-border/70 bg-muted/25 px-4 py-3 text-left text-sm text-muted-foreground">
              <p className="font-medium text-foreground">What happens next?</p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>We verify your organization details</li>
                <li>You receive an email when approved</li>
                <li>Dashboard access unlocks automatically</li>
              </ul>
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild variant="premium">
              <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`${tenantLabel} application — ${tenantName ?? "support"}`)}`}>
                <Mail className="h-4 w-4" />
                Contact support
              </a>
            </Button>
            <Button variant="ghost" onClick={onSignOut}>
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>

          <Button asChild variant="link" className="text-muted-foreground">
            <Link to="/">Back to home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
