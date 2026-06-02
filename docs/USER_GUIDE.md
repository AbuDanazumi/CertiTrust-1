# CertiTrust user guide

## Public verification

Anyone can verify a certificate at **Verify** (`/verify`) using:

- Certificate ID (e.g. `CT-2025-XXXX-XXXX`)
- QR code scan from a printed credential

Results show holder name, qualification, institution, status (valid / revoked / suspended), and timestamp.

## Institution portal

**Sign up:** `/signup/institution` — multi-step onboarding; account stays **pending** until a super admin approves.

**After approval:**

1. **Dashboard** — issued certificate counts and recent activity
2. **Certificates** — search, issue single certificates, bulk CSV import, revoke/restore
3. **Settings** (tabs):
   - **Your profile** — name and job title
   - **Institution** — legal name, type, contact, address, website
   - **Branding** — logo and seal URLs
   - **Verification** — public verify status (managed by platform after approval)
   - **Notifications** — placeholders for future email alerts
   - **Security** — change password, sign out

## Organization portal

**Sign up:** `/signup/organization`

**After approval:**

1. **Dashboard** — verification statistics
2. **Verify** — look up credentials for hiring or compliance
3. **History** — export CSV/PDF of past checks
4. **Analytics** — charts of verification activity
5. **Settings** — profile, organization details, contacts, branding, security

## Super admin console

**URL:** `/super-admin/login` (not linked from the public site)

1. **Overview** — platform metrics and pending application alerts
2. **Institutions / Organizations** — approve, suspend, or reject tenants
3. **Certificates / Verifications** — read-only platform-wide views
4. **Audit** — security and change log
5. **Settings** — platform links, grant-admin instructions, security

### Approving a new tenant

1. Open **Institutions** or **Organizations**
2. Filter **Pending**
3. Click **Approve** — sets status to active and enables institution verification where applicable

## Support

Email: support@certitrust.app
