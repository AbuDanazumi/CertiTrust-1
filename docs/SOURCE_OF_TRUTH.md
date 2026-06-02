# Source of truth

Use the **repository root** (this folder). Do not run or deploy from `verisecure-pro-main/verisecure-pro-main/` — that nested copy is archived drift.

## Application entry

| Concern | Location |
|---------|----------|
| Routes | `src/App.tsx` |
| Brand constants | `src/lib/brand.ts` |
| Supabase client | `src/integrations/supabase/client.ts` |
| Generated DB types | `src/integrations/supabase/types.ts` |

## Authentication

| Flow | Page |
|------|------|
| Institution login | `src/pages/InstitutionLogin.tsx` |
| Organization login | `src/pages/OrganizationLogin.tsx` |
| Institution signup | `src/pages/InstitutionSignup.tsx` |
| Organization signup | `src/pages/OrganizationSignup.tsx` |
| Super admin login | `src/pages/SuperAdminLogin.tsx` |
| Auth validation | `src/hooks/useAuthValidation.ts` |
| Session + tenant status | `src/hooks/useAuth.ts` |

## Settings UI

| Portal | Component |
|--------|-----------|
| Institution | `src/components/settings/InstitutionSettingsContent.tsx` |
| Organization | `src/components/settings/OrganizationSettingsContent.tsx` |
| Super admin | `src/components/settings/SuperAdminSettingsContent.tsx` |
| Shared security tab | `src/components/settings/SecuritySettingsPanel.tsx` |

## Portal features (monolith, modularize over time)

`src/components/certificate-verification-system.tsx` exports dashboard, verify, and admin views consumed by `App.tsx`.

## Database

- Migrations: `supabase/migrations/`
- Onboarding RPCs: `20260602000000_onboarding_registration.sql`
- Super admin grant: `grant_super_admin(email)` in `20260523001803_*.sql`

## Removed tooling

This project no longer uses Lovable-specific dev tooling or OAuth helpers. Auth is standard Supabase email/password.
