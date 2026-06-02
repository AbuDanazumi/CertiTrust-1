-- Auth, signup bootstrap, and RLS fixes

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_type text,
  ADD COLUMN IF NOT EXISTS organization_name text;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_account_type_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_account_type_check
  CHECK (account_type IS NULL OR account_type IN ('institution', 'organization'));

CREATE INDEX IF NOT EXISTS idx_profiles_account_type ON public.profiles(account_type);

UPDATE public.profiles
SET account_type = 'organization'
WHERE account_type IS NULL AND organization_id IS NOT NULL;

UPDATE public.profiles
SET account_type = 'institution'
WHERE account_type IS NULL AND institution_id IS NOT NULL;

UPDATE public.profiles
SET account_type = 'institution'
WHERE account_type IS NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id,
    display_name,
    email,
    account_type,
    organization_name
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'full_name'),
    NEW.email,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data ->> 'account_type', ''),
      NULLIF(NEW.raw_user_meta_data ->> 'intended_role', ''),
      'institution'
    ),
    NEW.raw_user_meta_data ->> 'organization_name'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.bootstrap_institution_access(_institution_name text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_inst uuid;
  v_email text;
  v_name text;
  v_code text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT institution_id, email, display_name
  INTO v_inst, v_email, v_name
  FROM public.profiles
  WHERE user_id = v_user;

  IF v_inst IS NOT NULL THEN
    UPDATE public.profiles
    SET account_type = 'institution'
    WHERE user_id = v_user AND account_type IS DISTINCT FROM 'institution';

    INSERT INTO public.user_roles (user_id, role, institution_id)
    VALUES (v_user, 'staff'::app_role, v_inst)
    ON CONFLICT DO NOTHING;

    RETURN v_inst;
  END IF;

  v_name := COALESCE(NULLIF(trim(_institution_name), ''), NULLIF(trim(v_name), ''), 'My Institution');
  v_code := 'INST-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  INSERT INTO public.institutions (name, code, email, status, is_active, verification_enabled)
  VALUES (v_name, v_code, v_email, 'active', true, true)
  RETURNING id INTO v_inst;

  UPDATE public.profiles
  SET institution_id = v_inst,
      account_type = 'institution'
  WHERE user_id = v_user;

  INSERT INTO public.user_roles (user_id, role, institution_id)
  VALUES (v_user, 'staff'::app_role, v_inst)
  ON CONFLICT DO NOTHING;

  RETURN v_inst;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bootstrap_institution_access(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.bootstrap_demo_staff_access()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.bootstrap_institution_access(NULL);
END;
$$;

GRANT EXECUTE ON FUNCTION public.bootstrap_demo_staff_access() TO authenticated;

CREATE OR REPLACE FUNCTION public.bootstrap_demo_org_access(_org_name text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_org uuid;
  v_email text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT organization_id INTO v_org FROM public.profiles WHERE user_id = v_user;

  IF v_org IS NOT NULL THEN
    UPDATE public.profiles
    SET account_type = 'organization'
    WHERE user_id = v_user AND account_type IS DISTINCT FROM 'organization';

    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user, 'organization'::app_role)
    ON CONFLICT DO NOTHING;

    RETURN v_org;
  END IF;

  SELECT email INTO v_email FROM public.profiles WHERE user_id = v_user;

  INSERT INTO public.organizations (name, email)
  VALUES (COALESCE(NULLIF(trim(_org_name), ''), 'My Organization'), v_email)
  RETURNING id INTO v_org;

  UPDATE public.profiles
  SET organization_id = v_org,
      account_type = 'organization'
  WHERE user_id = v_user;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user, 'organization'::app_role)
  ON CONFLICT DO NOTHING;

  RETURN v_org;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bootstrap_demo_org_access(text) TO authenticated;

DROP POLICY IF EXISTS "Staff can view their institution" ON public.institutions;
CREATE POLICY "Staff can view their institution"
ON public.institutions
FOR SELECT
TO authenticated
USING (
  id = public.user_institution_id(auth.uid())
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
);

DROP POLICY IF EXISTS "Staff can update their institution" ON public.institutions;
CREATE POLICY "Staff can update their institution"
ON public.institutions
FOR UPDATE
TO authenticated
USING (
  id = public.user_institution_id(auth.uid())
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
)
WITH CHECK (
  id = public.user_institution_id(auth.uid())
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
);

DROP POLICY IF EXISTS "Org members can view their verification events" ON public.verification_events;
CREATE POLICY "Org members can view their verification events"
ON public.verification_events
FOR SELECT
TO authenticated
USING (
  organization_id = public.user_organization_id(auth.uid())
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
);
