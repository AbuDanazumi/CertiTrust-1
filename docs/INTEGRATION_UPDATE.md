# Integration Update - Role-Based Authentication System

## Overview
This guide provides step-by-step instructions to integrate the new role-based authentication system into your existing `certificate-verification-system.tsx` component.

## Files to Update

### 1. Update App.tsx

Add these routes if not already present:

```tsx
// Add role-based auth routes
<Route path="/login" element={<Index view="login" />} />
<Route path="/signup" element={<Index view="signup" />} />

// Institution portal with protection
<Route path="/institution" element={<Index view="inst-dashboard" />} />
<Route path="/institution/certificates" element={<Index view="inst-certificates" />} />
<Route path="/institution/settings" element={<Index view="inst-settings" />} />

// Organization portal with protection
<Route path="/organization" element={<Index view="org-dashboard" />} />
<Route path="/organization/verify" element={<Index view="org-verify" />} />
<Route path="/organization/history" element={<Index view="org-history" />} />
<Route path="/organization/analytics" element={<Index view="org-analytics" />} />
<Route path="/organization/settings" element={<Index view="org-settings" />} />

// Super Admin (separate)
<Route path="/super-admin/login" element={<Index view="sa-login" />} />
<Route path="/super-admin" element={<Index view="sa-dashboard" />} />
```

### 2. Update certificate-verification-system.tsx - Imports

Add these imports at the top of the file:

```tsx
import { LoginWithRoleValidation } from '@/components/LoginWithRoleValidation';
import { SignupWithRoleSelection } from '@/components/SignupWithRoleSelection';
import { RoleRequiredMessage } from '@/components/RoleRequiredMessage';
import { useAuthValidation, type AccountType } from '@/hooks/useAuthValidation';
```

### 3. Update CertificateVerificationSystem Component

Find the main `CertificateVerificationSystem` function and update the view handling:

```tsx
export function CertificateVerificationSystem({ view = "landing" }: { view?: VerificationView }) {
  const auth = useAuth(); // existing auth
  const location = useLocation();
  const navigate = useNavigate();

  // Determine if we should use new role-based auth for certain views
  const useRoleBasedAuth = ["login", "signup", "inst-dashboard", "inst-certificates", "org-dashboard", "org-verify"].includes(view);

  // If role-based view, verify authentication
  if (useRoleBasedAuth && view !== "login" && view !== "signup") {
    if (!auth.session) {
      navigate("/login");
      return <div>Redirecting to login...</div>;
    }

    // Verify user has correct role for portal
    if ((view.startsWith("inst-") && auth.role !== "staff") || 
        (view.startsWith("org-") && auth.role !== "organization")) {
      return <RoleRequiredMessage expectedRole={view.startsWith("inst-") ? "staff" : "organization"} />;
    }
  }

  return (
    <div className={`min-h-screen transition-colors ${theme === "dark" ? "bg-slate-950 text-white" : "bg-white text-slate-900"}`}>
      {view === "landing" && <Landing />}
      {view === "verify" && <VerifyPage />}
      {view === "login" && <LoginPage />}
      {view === "signup" && <SignupPage />}
      {view === "forgot-password" && <ForgotPasswordPage />}
      {view === "reset-password" && <ResetPasswordPage />}
      {view === "unauthorized" && <UnauthorizedPage />}
      {/* ... rest of views */}
    </div>
  );
}
```

### 4. Replace LoginPage Function

Find the existing `LoginPage` function and replace it with:

```tsx
function LoginPage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const roleParam = (urlParams.get("role") as AccountType) || "institution";

  return (
    <PublicShell>
      <section className="container grid place-items-center py-12 md:py-20">
        <LoginWithRoleValidation initialRole={roleParam} />
      </section>
    </PublicShell>
  );
}
```

### 5. Replace SignupPage Function

Find the existing `SignupPage` function and replace it with:

```tsx
function SignupPage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const roleParam = (urlParams.get("role") as AccountType) || "institution";

  return (
    <PublicShell>
      <section className="container grid place-items-center py-12 md:py-20">
        <SignupWithRoleSelection initialRole={roleParam} />
      </section>
    </PublicShell>
  );
}
```

### 6. Update Institution Dashboard

Wrap the institution dashboard with role verification:

```tsx
function InstitutionDashboard() {
  const auth = useAuth();
  const navigate = useNavigate();

  if (!auth.session) {
    navigate("/login?role=institution");
    return <div>Redirecting...</div>;
  }

  if (auth.role !== "staff") {
    return <RoleRequiredMessage expectedRole="staff" />;
  }

  return (
    <PortalShell role="institution" title="Dashboard">
      {/* Institution dashboard content */}
    </PortalShell>
  );
}
```

### 7. Update Organization Dashboard

Wrap the organization dashboard with role verification:

```tsx
function OrganizationDashboard() {
  const auth = useAuth();
  const navigate = useNavigate();

  if (!auth.session) {
    navigate("/login?role=organization");
    return <div>Redirecting...</div>;
  }

  if (auth.role !== "organization") {
    return <RoleRequiredMessage expectedRole="organization" />;
  }

  return (
    <PortalShell role="organization" title="Dashboard">
      {/* Organization dashboard content */}
    </PortalShell>
  );
}
```

## Database Setup

Run this SQL migration in your Supabase dashboard:

```sql
-- Add account_type support
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS account_type text
CHECK (account_type IN ('institution', 'organization'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_account_type 
ON public.profiles(account_type);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id_account_type 
ON public.profiles(user_id, account_type);

-- Add organization_name field
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS organization_name text;

-- Create trigger for default account_type
CREATE OR REPLACE FUNCTION set_default_account_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.account_type IS NULL THEN
    NEW.account_type := 'institution';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_set_default_account_type ON public.profiles;
CREATE TRIGGER profiles_set_default_account_type
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_default_account_type();
```

## Testing Checklist

- [ ] Database migration completed
- [ ] All imports added to certificate-verification-system.tsx
- [ ] LoginPage function updated
- [ ] SignupPage function updated
- [ ] Institution dashboard role check added
- [ ] Organization dashboard role check added
- [ ] Test institution signup at `/signup?role=institution`
- [ ] Test organization signup at `/signup?role=organization`
- [ ] Test institution login at `/login?role=institution`
- [ ] Test organization login at `/login?role=organization`
- [ ] Test wrong role rejection
- [ ] Test auto-redirects between portals
- [ ] Test session persistence on refresh
- [ ] Test logout functionality

## Deployment

1. Create a new branch: `git checkout -b feat/role-based-auth-system`
2. Apply all changes from this guide
3. Run database migration
4. Test all flows locally
5. Create Pull Request
6. Request review
7. Once approved, merge to main
8. Deploy to production

## Support

Refer to `docs/AUTH_IMPLEMENTATION.md` for detailed architecture and troubleshooting.
