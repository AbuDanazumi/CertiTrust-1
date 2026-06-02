import { useNavigate } from "react-router-dom";
import { ArrowRight, Building2, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type PortalMode = "signin" | "onboarding";

const copy: Record<PortalMode, { title: string; description: string }> = {
  signin: {
    title: "Sign in",
    description: "Choose your portal to continue to the right workspace.",
  },
  onboarding: {
    title: "Get started",
    description: "Select how you want to use CertiTrust. You can complete registration in a few minutes.",
  },
};

const portals = [
  {
    id: "institution" as const,
    icon: Building2,
    iconClass: "bg-primary/10 text-primary",
    signInHref: "/login/institution",
    signupHref: "/signup/institution",
    description: "Issue and manage digital certificates.",
  },
  {
    id: "organization" as const,
    icon: Users,
    iconClass: "bg-accent/15 text-accent",
    signInHref: "/login/organization",
    signupHref: "/signup/organization",
    description: "Verify certificates and credentials.",
  },
];

export function PortalChoiceModal({
  mode,
  open,
  onOpenChange,
}: {
  mode: PortalMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const text = copy[mode];

  function go(href: string) {
    onOpenChange(false);
    navigate(href);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="space-y-2 border-b border-border/60 px-6 py-5 text-left">
          <DialogTitle className="text-xl">{text.title}</DialogTitle>
          <DialogDescription>{text.description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 p-4">
          {portals.map((portal) => {
            const Icon = portal.icon;
            const label =
              portal.id === "institution"
                ? mode === "signin"
                  ? "Institution"
                  : "Join as Institution"
                : mode === "signin"
                  ? "Organization"
                  : "Join as Organization";
            const href = mode === "signin" ? portal.signInHref : portal.signupHref;

            return (
              <button
                key={portal.id}
                type="button"
                onClick={() => go(href)}
                className={cn(
                  "group flex w-full items-center gap-4 rounded-xl border border-border/70 bg-card p-4 text-left transition-all",
                  "hover:border-primary/30 hover:bg-muted/30 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                )}
              >
                <span
                  className={cn(
                    "grid h-11 w-11 shrink-0 place-items-center rounded-xl",
                    portal.iconClass
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{label}</span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">{portal.description}</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
