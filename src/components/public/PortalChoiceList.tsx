import { useNavigate } from "react-router-dom";
import { ArrowRight, Building2, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type PortalMode = "signin" | "onboarding";

const copy: Record<
  PortalMode,
  { institutionLabel: string; organizationLabel: string }
> = {
  signin: {
    institutionLabel: "Institution",
    organizationLabel: "Organization",
  },
  onboarding: {
    institutionLabel: "Join as Institution",
    organizationLabel: "Join as Organization",
  },
};

const portals = [
  {
    id: "institution" as const,
    icon: Building2,
    iconClass: "bg-primary/10 text-primary",
    accent: "from-primary to-primary-glow",
    signInHref: "/login/institution",
    signupHref: "/signup/institution",
    description: "Issue and manage digital certificates.",
  },
  {
    id: "organization" as const,
    icon: Users,
    iconClass: "bg-accent/15 text-accent",
    accent: "from-accent to-primary-glow",
    signInHref: "/login/organization",
    signupHref: "/signup/organization",
    description: "Verify certificates and credentials.",
  },
];

export function PortalChoiceList({ mode }: { mode: PortalMode }) {
  const navigate = useNavigate();
  const labels = copy[mode];

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {portals.map((portal) => {
        const Icon = portal.icon;
        const label =
          portal.id === "institution" ? labels.institutionLabel : labels.organizationLabel;
        const href = mode === "signin" ? portal.signInHref : portal.signupHref;

        return (
          <button
            key={portal.id}
            type="button"
            onClick={() => navigate(href)}
            className={cn(
              "group flex flex-col overflow-hidden rounded-xl border border-border/70 bg-card text-left transition-all",
              "hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
          >
            <div className={cn("h-1 bg-gradient-to-r", portal.accent)} />
            <span className="flex flex-1 flex-col p-5">
              <span className={cn("mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl", portal.iconClass)}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="font-semibold">{label}</span>
              <span className="mt-1 text-sm text-muted-foreground">{portal.description}</span>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                Continue
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
