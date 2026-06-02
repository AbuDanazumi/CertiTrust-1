
-- Institutions: status + contact + logo
DO $$ BEGIN
  CREATE TYPE public.org_status AS ENUM ('pending','active','suspended');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE public.institutions
  ADD COLUMN IF NOT EXISTS status public.org_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS logo_url text;

-- Organizations: status, type, branding
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS status public.org_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS org_type text NOT NULL DEFAULT 'Company',
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS country text;

-- Certificates: PDF + verification URL
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS certificate_pdf_url text,
  ADD COLUMN IF NOT EXISTS verification_url text;

-- Storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificate-pdfs','certificate-pdfs', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('institution-logos','institution-logos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('organization-logos','organization-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: institution logos & organization logos publicly readable, owners can write
DROP POLICY IF EXISTS "Public read institution logos" ON storage.objects;
CREATE POLICY "Public read institution logos" ON storage.objects FOR SELECT USING (bucket_id = 'institution-logos');

DROP POLICY IF EXISTS "Authenticated upload institution logos" ON storage.objects;
CREATE POLICY "Authenticated upload institution logos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'institution-logos');

DROP POLICY IF EXISTS "Authenticated update institution logos" ON storage.objects;
CREATE POLICY "Authenticated update institution logos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'institution-logos');

DROP POLICY IF EXISTS "Public read organization logos" ON storage.objects;
CREATE POLICY "Public read organization logos" ON storage.objects FOR SELECT USING (bucket_id = 'organization-logos');

DROP POLICY IF EXISTS "Authenticated upload organization logos" ON storage.objects;
CREATE POLICY "Authenticated upload organization logos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'organization-logos');

DROP POLICY IF EXISTS "Authenticated update organization logos" ON storage.objects;
CREATE POLICY "Authenticated update organization logos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'organization-logos');

-- Certificate PDFs: institution staff can read/write their own; super admin reads all
DROP POLICY IF EXISTS "Staff manage certificate pdfs" ON storage.objects;
CREATE POLICY "Staff manage certificate pdfs" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'certificate-pdfs' AND (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR (storage.foldername(name))[1] = public.user_institution_id(auth.uid())::text
  ))
  WITH CHECK (bucket_id = 'certificate-pdfs' AND (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR (storage.foldername(name))[1] = public.user_institution_id(auth.uid())::text
  ));

-- Grant super admin function (callable only by service role; safe to expose since it requires service key context)
CREATE OR REPLACE FUNCTION public.grant_super_admin(_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE email = _email LIMIT 1;
  IF v_uid IS NULL THEN RAISE EXCEPTION 'No user with email %', _email; END IF;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, 'super_admin'::app_role)
  ON CONFLICT DO NOTHING;
  RETURN v_uid;
END $$;

REVOKE ALL ON FUNCTION public.grant_super_admin(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.grant_super_admin(text) FROM authenticated;
REVOKE ALL ON FUNCTION public.grant_super_admin(text) FROM anon;
