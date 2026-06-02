import { Link } from "react-router-dom";
import { Mail, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_NAME, SUPPORT_EMAIL } from "@/lib/brand";
import { SettingsPageLayout } from "./SettingsPageLayout";
import { SecuritySettingsPanel } from "./SecuritySettingsPanel";
import { SettingsSection } from "./SettingsSection";

export function SuperAdminSettingsContent() {
  const platformTab = (
    <div className="space-y-4">
      <SettingsSection title="Platform identity" description={`How ${APP_NAME} appears to tenants.`}>
        <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
          <li>Public verify portal at <code className="rounded bg-muted px-1">/verify</code></li>
          <li>Institution portal at <code className="rounded bg-muted px-1">/institution</code></li>
          <li>Organization portal at <code className="rounded bg-muted px-1">/organization</code></li>
        </ul>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/">View public site</Link>
        </Button>
      </SettingsSection>

      <SettingsSection title="Tenant onboarding" description="Review and approve new registrations.">
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="premium">
            <Link to="/super-admin/institutions">Institutions queue</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/super-admin/organizations">Organizations queue</Link>
          </Button>
        </div>
      </SettingsSection>
    </div>
  );

  const accessTab = (
    <SettingsSection
      title="Super admin access"
      description="Additional console operators are provisioned in the database."
    >
      <p className="text-sm text-muted-foreground">
        Run in the Supabase SQL editor after the user has signed up at least once:
      </p>
      <pre className="mt-3 overflow-x-auto rounded-lg bg-muted/50 p-3 text-xs">
        {`SELECT public.grant_super_admin('admin@yourdomain.com');`}
      </pre>
      <p className="mt-3 text-sm text-muted-foreground">
        Or use <code className="rounded bg-muted px-1">node scripts/provision-super-admin.mjs</code> with a service
        role key (see README).
      </p>
    </SettingsSection>
  );

  const supportTab = (
    <SettingsSection title="Support" description="Contact channels for tenant escalations.">
      <Button asChild variant="outline">
        <a href={`mailto:${SUPPORT_EMAIL}`}>
          <Mail className="h-4 w-4" />
          {SUPPORT_EMAIL}
        </a>
      </Button>
    </SettingsSection>
  );

  const auditTab = (
    <SettingsSection title="Compliance" description="Review platform-wide activity.">
      <Button asChild variant="glass">
        <Link to="/super-admin/audit">
          <Shield className="h-4 w-4" />
          Open audit log
        </Link>
      </Button>
    </SettingsSection>
  );

  return (
    <SettingsPageLayout
      defaultTab="platform"
      className="max-w-4xl text-foreground"
      tabs={[
        { id: "platform", label: "Platform", content: platformTab },
        { id: "access", label: "Access", content: accessTab },
        { id: "support", label: "Support", content: supportTab },
        { id: "audit", label: "Audit", content: auditTab },
        {
          id: "security",
          label: "Security",
          content: (
            <div className="[&_.elevated-panel]:border-white/10 [&_.elevated-panel]:bg-white/5 [&_label]:text-white/80">
              <SecuritySettingsPanel />
            </div>
          ),
        },
      ]}
    />
  );
}
