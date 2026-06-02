# CertiTrust v3 — Three-Role Ecosystem Refactor

Transform the platform into a startup-grade, role-isolated certificate verification ecosystem with clean separation between Super Admin, Institution, and Organization portals.

## 1. Information Architecture

```text
Public
  /                              Landing (no admin link)
  /verify                        Public verify (QR or Cert ID)
  /verify/result/:id             Result + "View Original Certificate"
  /login                         Tabs: Institution | Organization ONLY
  /signup                        Tabs: Institution | Organization ONLY
  /forgot-password
  /reset-password
  /unauthorized                  "You do not have permission..."

Super Admin (hidden, not linked publicly)
  /super-admin/login             Separate login UI + layout
  /super-admin                   Platform dashboard
  /super-admin/institutions      Approve / suspend institutions
  /super-admin/organizations     Approve / suspend organizations
  /super-admin/certificates      Read-only platform-wide cert list
  /super-admin/verifications     Platform verification activity
  /super-admin/audit             Audit log viewer
  /super-admin/settings          Platform settings

Institution Portal  (/institution/*)
  dashboard, certificates, certificates/upload (single + bulk),
  verifications, settings (profile / verification / notifications /
  security / branding)

Organization Portal (/organization/*)
  dashboard, verify, history, analytics,
  settings (profile / verification prefs / notifications / security)
```

Route guards redirect mismatched roles to `/unauthorized`.

## 2. Database changes

- Extend `app_role` enum: ensure `super_admin`, `institution_staff` (rename `staff` usage), `organization` all exist (super_admin + organization already exist; keep `staff` as institution staff).
- `institutions`: add `status` (`pending|active|suspended`), `logo_url`, `email`, `phone`, `address`.
- `organizations`: add `status`, `org_type` (Company/Embassy/Government Agency/Licensing Board/Recruitment Firm/Educational Partner), `logo_url`, `website`, `country`.
- `certificates`: add `certificate_pdf_url`, `verification_url`.
- New `storage.buckets`: `certificate-pdfs` (private), `institution-logos` (public), `organization-logos` (public).
- New `bulk_uploads` already exists — reuse for CSV/XLSX import history.
- RLS:
  - Super admin: full read on everything via `has_role(uid,'super_admin')`.
  - Institution staff: only own institution's records (already in place).
  - Organization: only own `verification_events`.
- Bootstrap RPCs: keep `bootstrap_demo_staff_access`, `bootstrap_demo_org_access`. Add `seed_super_admin(email)` callable only by service role (or via SQL seed).
- Trigger on signup: profile created with role metadata from `raw_user_meta_data.intended_role`; map to `user_roles` row.

## 3. Component structure

```text
src/
  components/
    shared/         Logo, PortalShell, ThemeToggle, StatusBadge, EmptyState
    public/         Landing, VerifyPortal, VerificationResult
    auth/           LoginPage, SignupPage, ForgotPassword, ResetPassword,
                    Unauthorized, SuperAdminLogin
    super-admin/    SuperAdminShell, Dashboard, InstitutionsPage,
                    OrganizationsPage, CertificatesPage, VerificationsPage,
                    AuditPage, SettingsPage
    institution/    InstitutionShell, Dashboard, CertificatesPage,
                    SingleUploadDialog, BulkUploadDialog, VerificationsPage,
                    SettingsPage (tabs: Profile, Verification, Notifications,
                    Security, Branding)
    organization/   OrganizationShell, Dashboard, VerifyPage, HistoryPage,
                    AnalyticsPage, SettingsPage (tabs: Profile,
                    Verification Prefs, Notifications, Security)
  hooks/  useAuth, useTheme, useRoleGuard
  lib/    cert.ts, csv.ts (PapaParse), xlsx.ts (read-only via SheetJS),
          exporters.ts, rateLimit.ts (client-side simple guard)
  pages/  Index.tsx (thin route renderer), NotFound.tsx
```

`App.tsx` becomes a real route table importing page components directly; remove the `view` prop pattern.

## 4. Feature behavior

**Super Admin**
- Dashboard cards: institutions, organizations, certificates, verifications (24h / total), active users, recent activity feed.
- Institutions / Organizations pages: approve (status → active), suspend, view details.
- Audit page: filterable `audit_logs`.
- Hidden from public — only reachable via `/super-admin/login`.

**Institution**
- Dashboard: totals + last 5 issued + last 5 verifications.
- Certificates page: search, filters (status), row actions (View, Revoke, Suspend, Restore, Regenerate QR, Download PDF).
- Single Upload dialog: form fields + PDF file → uploads PDF to bucket, generates cert ID + QR, stores `verification_url`.
- Bulk Upload dialog: drop CSV or XLSX → parse client-side → preview duplicates → batched insert → progress bar → success/failure summary → recorded in `bulk_uploads`.
- Settings: 5 tabs as specified.

**Organization**
- Dashboard: total / success / failed / revoked detected / recent.
- Verify page: QR upload OR cert ID; writes `verification_events` tagged with `organization_id`.
- History: table with search, status filter, pagination, CSV/PDF export.
- Analytics: simple charts (Recharts) — verifications by day, status distribution.
- Settings: 4 tabs as specified.

**Public verify result** shows: name, qualification, dept, institution, grad year, status badge, QR, timestamp, `View Original Certificate` button (cert PDF URL or institution verification URL).

## 5. Auth flow

- `/login` and `/signup`: pill tabs for Institution / Organization only. Signup metadata sets `intended_role`. After confirmation, role-bootstrap RPC runs.
- `/super-admin/login`: separate page, separate visual identity (darker, "Platform Control" framing). Validates user has `super_admin` role; otherwise redirects to `/unauthorized`.
- `useRoleGuard(allowedRoles)` HOC redirects on mismatch.
- Persistent sessions (already enabled in supabase client). Remember-me checkbox toggles `auth.persistSession` behavior — default true.
- Forgot password → `resetPasswordForEmail` with redirect to `/reset-password` (must handle `type=recovery`).

## 6. UI/UX

- Keep semantic tokens in `index.css` + `tailwind.config.ts`.
- Three shells: `SuperAdminShell` (darker, "platform" tone), `InstitutionShell` (current professional blue), `OrganizationShell` (warmer accent). Each shell exposes a sidebar parameterized by role.
- Strip cybersecurity/"command center" copy; use Issue, Manage, Verify, Track.
- Dark mode toggle in every shell topbar.
- Responsive: mobile sheet sidebar.

## 7. Out of scope (explicitly)

- Real 2FA enrollment (toggle UI only, store preference flag).
- Real device session management beyond Supabase's signOut-all.
- Real email sending for notification toggles (preference flags only).
- Tamper detection beyond comparing stored hash; no ML/threat scoring.

## 8. Execution order

1. Migration: institutions/organizations status + logo fields, certificates PDF url, storage buckets + policies, super admin seed helper.
2. Split monolith `certificate-verification-system.tsx` into the component tree in §3.
3. Rewrite `App.tsx` with direct route components + guards.
4. Build Super Admin portal + hidden login.
5. Build Institution portal incl. single + bulk upload (PapaParse + xlsx).
6. Build Organization portal incl. analytics + export.
7. Wire forgot/reset password + unauthorized page.
8. Polish shells, dark mode, responsive sidebar, empty states.
9. Smoke-test all three roles end-to-end.

## Technical notes

- Add deps: `papaparse`, `xlsx`, `recharts` (likely already present), `qrcode`.
- Storage bucket SQL + RLS policies via migration.
- `useAuth` returns `{ user, role: 'super_admin' | 'staff' | 'organization' | null, institutionId, organizationId, loading }`.
- Route guard renders `<Navigate to="/unauthorized" />` on role mismatch and `<Navigate to="/login" />` when unauthenticated.
- Super admin role is granted only by SQL (no public signup path).
