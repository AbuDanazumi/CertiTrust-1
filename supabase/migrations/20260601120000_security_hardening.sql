-- Database security hardening: tenant isolation, bootstrap RPCs, RLS

CREATE OR REPLACE FUNCTION public.protect_profile_tenant_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF coalesce(current_setting('app.allow_tenant_profile_write', true), '') = 'true' THEN
    RETURN NEW;
  END IF;

  IF public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.institution_id := NULL;
    NEW.organization_id := NULL;
    RETURN NEW;
  END IF;

  IF NEW.institution_id IS DISTINCT FROM OLD.institution_id THEN
    RAISE EXCEPTION 'institution_id is managed by the platform and cannot be changed';
  END IF;

  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    RAISE EXCEPTION 'organization_id is managed by the platform and cannot be changed';
  END IF;

  IF NEW.account_type IS DISTINCT FROM OLD.account_type THEN
    RAISE EXCEPTION 'account_type is managed by the platform and cannot be changed';
  END IF;

  IF NEW.organization_name IS DISTINCT FROM OLD.organization_name THEN
    RAISE EXCEPTION 'organization_name is managed by the platform and cannot be changed';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_tenant_columns ON public.profiles;
CREATE TRIGGER protect_profile_tenant_columns
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_tenant_columns();

CREATE OR REPLACE FUNCTION public.protect_institution_admin_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF coalesce(current_setting('app.allow_institution_admin_write', true), '') = 'true' THEN
    RETURN NEW;
  END IF;

  IF public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RETURN NEW;
  END IF;

  NEW.status := OLD.status;
  NEW.is_active := OLD.is_active;
  NEW.verification_enabled := OLD.verification_enabled;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_institution_admin_fields ON public.institutions;
CREATE TRIGGER protect_institution_admin_fields
BEFORE UPDATE ON public.institutions
FOR EACH ROW
EXECUTE FUNCTION public.protect_institution_admin_fields();

UPDATE public.profiles AS p
SET organization_id = NULL
WHERE p.organization_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.organizations AS o WHERE o.id = p.organization_id
  );

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_organization_id_fkey;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_organization_id_fkey
  FOREIGN KEY (organization_id)
  REFERENCES public.organizations(id)
  ON DELETE SET NULL;

DROP POLICY IF EXISTS "Anyone authenticated can create an organization" ON public.organizations;

CREATE POLICY "Super admins can manage organizations"
ON public.organizations
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE OR REPLACE FUNCTION public.bootstrap_institution_access(_institution_name text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_inst uuid;
  v_org uuid;
  v_email text;
  v_name text;
  v_code text;
  v_account_type text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  PERFORM set_config('app.allow_tenant_profile_write', 'true', true);
  PERFORM set_config('app.allow_institution_admin_write', 'true', true);

  SELECT institution_id, organization_id, account_type, email, display_name
  INTO v_inst, v_org, v_account_type, v_email, v_name
  FROM public.profiles
  WHERE user_id = v_user
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF v_org IS NOT NULL THEN
    RAISE EXCEPTION 'Account is already linked to an organization';
  END IF;

  IF v_account_type = 'organization' THEN
    RAISE EXCEPTION 'Organization accounts cannot bootstrap institution access';
  END IF;

  IF v_inst IS NOT NULL THEN
    UPDATE public.profiles
    SET account_type = 'institution'
    WHERE user_id = v_user
      AND account_type IS DISTINCT FROM 'institution';

    INSERT INTO public.user_roles (user_id, role, institution_id)
    VALUES (v_user, 'staff'::app_role, v_inst)
    ON CONFLICT DO NOTHING;

    RETURN v_inst;
  END IF;

  IF v_account_type IS NOT NULL AND v_account_type <> 'institution' THEN
    RAISE EXCEPTION 'Invalid account type for institution bootstrap: %', v_account_type;
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

GRANT EXECUTE ON FUNCTION public.bootstrap_institution_access(text) TO authenticated;
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
  v_inst uuid;
  v_email text;
  v_account_type text;
  v_profile_org_name text;
  v_display_name text;
  v_org_name text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  PERFORM set_config('app.allow_tenant_profile_write', 'true', true);

  SELECT organization_id, institution_id, account_type, email, organization_name, display_name
  INTO v_org, v_inst, v_account_type, v_email, v_profile_org_name, v_display_name
  FROM public.profiles
  WHERE user_id = v_user
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF v_inst IS NOT NULL THEN
    RAISE EXCEPTION 'Account is already linked to an institution';
  END IF;

  IF v_account_type = 'institution' THEN
    RAISE EXCEPTION 'Institution accounts cannot bootstrap organization access';
  END IF;

  IF v_org IS NOT NULL THEN
    UPDATE public.profiles
    SET account_type = 'organization'
    WHERE user_id = v_user
      AND account_type IS DISTINCT FROM 'organization';

    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user, 'organization'::app_role)
    ON CONFLICT DO NOTHING;

    RETURN v_org;
  END IF;

  IF v_account_type IS NOT NULL AND v_account_type <> 'organization' THEN
    RAISE EXCEPTION 'Invalid account type for organization bootstrap: %', v_account_type;
  END IF;

  v_org_name := COALESCE(
    NULLIF(trim(_org_name), ''),
    NULLIF(trim(v_profile_org_name), ''),
    NULLIF(trim(v_display_name), ''),
    'My Organization'
  );

  INSERT INTO public.organizations (name, email)
  VALUES (v_org_name, v_email)
  RETURNING id INTO v_org;

  UPDATE public.profiles
  SET organization_id = v_org,
      account_type = 'organization',
      organization_name = v_org_name
  WHERE user_id = v_user;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user, 'organization'::app_role)
  ON CONFLICT DO NOTHING;

  RETURN v_org;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bootstrap_demo_org_access(text) TO authenticated;
