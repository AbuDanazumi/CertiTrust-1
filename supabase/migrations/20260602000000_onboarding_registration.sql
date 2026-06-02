-- Onboarding: extra tenant fields + pending registration RPCs (additive)

ALTER TYPE public.org_status ADD VALUE IF NOT EXISTS 'rejected';

ALTER TABLE public.institutions
  ADD COLUMN IF NOT EXISTS institution_type text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state_province text;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS industry text,
  ADD COLUMN IF NOT EXISTS contact_person_name text,
  ADD COLUMN IF NOT EXISTS contact_person_role text;

CREATE OR REPLACE FUNCTION public.register_institution_onboarding(_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_inst uuid;
  v_org uuid;
  v_account_type text;
  v_email text;
  v_name text;
  v_code text;
  v_address text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  PERFORM set_config('app.allow_tenant_profile_write', 'true', true);
  PERFORM set_config('app.allow_institution_admin_write', 'true', true);

  SELECT institution_id, organization_id, account_type, email
  INTO v_inst, v_org, v_account_type, v_email
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
    RAISE EXCEPTION 'Organization accounts cannot register as an institution';
  END IF;

  v_name := COALESCE(NULLIF(trim(_payload ->> 'institution_name'), ''), 'My Institution');
  v_address := NULLIF(trim(_payload ->> 'address'), '');

  IF v_inst IS NOT NULL THEN
    UPDATE public.institutions
    SET
      name = v_name,
      email = COALESCE(NULLIF(trim(_payload ->> 'email'), ''), v_email),
      phone = NULLIF(trim(_payload ->> 'phone'), ''),
      website_url = NULLIF(trim(_payload ->> 'website'), ''),
      country = NULLIF(trim(_payload ->> 'country'), ''),
      institution_type = NULLIF(trim(_payload ->> 'institution_type'), ''),
      address = v_address,
      city = NULLIF(trim(_payload ->> 'city'), ''),
      state_province = NULLIF(trim(_payload ->> 'state_province'), ''),
      logo_url = COALESCE(NULLIF(trim(_payload ->> 'logo_url'), ''), logo_url),
      status = CASE WHEN status = 'active' THEN status ELSE 'pending'::public.org_status END,
      updated_at = now()
    WHERE id = v_inst;

    UPDATE public.profiles
    SET account_type = 'institution',
        display_name = COALESCE(NULLIF(trim(_payload ->> 'contact_name'), ''), display_name)
    WHERE user_id = v_user;

    INSERT INTO public.user_roles (user_id, role, institution_id)
    VALUES (v_user, 'staff'::app_role, v_inst)
    ON CONFLICT DO NOTHING;

    RETURN v_inst;
  END IF;

  v_code := 'INST-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  INSERT INTO public.institutions (
    name, code, email, phone, website_url, country, institution_type,
    address, city, state_province, logo_url, status, is_active, verification_enabled
  )
  VALUES (
    v_name,
    v_code,
    COALESCE(NULLIF(trim(_payload ->> 'email'), ''), v_email),
    NULLIF(trim(_payload ->> 'phone'), ''),
    NULLIF(trim(_payload ->> 'website'), ''),
    NULLIF(trim(_payload ->> 'country'), ''),
    NULLIF(trim(_payload ->> 'institution_type'), ''),
    v_address,
    NULLIF(trim(_payload ->> 'city'), ''),
    NULLIF(trim(_payload ->> 'state_province'), ''),
    NULLIF(trim(_payload ->> 'logo_url'), ''),
    'pending'::public.org_status,
    false,
    false
  )
  RETURNING id INTO v_inst;

  UPDATE public.profiles
  SET institution_id = v_inst,
      account_type = 'institution',
      display_name = COALESCE(NULLIF(trim(_payload ->> 'contact_name'), ''), display_name)
  WHERE user_id = v_user;

  INSERT INTO public.user_roles (user_id, role, institution_id)
  VALUES (v_user, 'staff'::app_role, v_inst)
  ON CONFLICT DO NOTHING;

  RETURN v_inst;
END;
$$;

CREATE OR REPLACE FUNCTION public.register_organization_onboarding(_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_org uuid;
  v_inst uuid;
  v_account_type text;
  v_email text;
  v_org_name text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  PERFORM set_config('app.allow_tenant_profile_write', 'true', true);

  SELECT organization_id, institution_id, account_type, email, organization_name
  INTO v_org, v_inst, v_account_type, v_email, v_org_name
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
    RAISE EXCEPTION 'Institution accounts cannot register as an organization';
  END IF;

  v_org_name := COALESCE(NULLIF(trim(_payload ->> 'organization_name'), ''), NULLIF(trim(v_org_name), ''), 'My Organization');

  IF v_org IS NOT NULL THEN
    UPDATE public.organizations
    SET
      name = v_org_name,
      email = COALESCE(NULLIF(trim(_payload ->> 'email'), ''), v_email),
      phone = NULLIF(trim(_payload ->> 'phone'), ''),
      website = NULLIF(trim(_payload ->> 'website'), ''),
      country = NULLIF(trim(_payload ->> 'country'), ''),
      industry = NULLIF(trim(_payload ->> 'industry'), ''),
      org_type = COALESCE(NULLIF(trim(_payload ->> 'industry'), ''), org_type),
      contact_person_name = NULLIF(trim(_payload ->> 'contact_person_name'), ''),
      contact_person_role = NULLIF(trim(_payload ->> 'contact_person_role'), ''),
      logo_url = COALESCE(NULLIF(trim(_payload ->> 'logo_url'), ''), logo_url),
      status = CASE WHEN status = 'active' THEN status ELSE 'pending'::public.org_status END,
      updated_at = now()
    WHERE id = v_org;

    UPDATE public.profiles
    SET account_type = 'organization',
        organization_name = v_org_name,
        display_name = COALESCE(NULLIF(trim(_payload ->> 'contact_person_name'), ''), display_name)
    WHERE user_id = v_user;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user, 'organization'::app_role)
    ON CONFLICT DO NOTHING;

    RETURN v_org;
  END IF;

  INSERT INTO public.organizations (
    name, email, phone, website, country, industry, org_type,
    contact_person_name, contact_person_role, logo_url, status, is_active
  )
  VALUES (
    v_org_name,
    COALESCE(NULLIF(trim(_payload ->> 'email'), ''), v_email),
    NULLIF(trim(_payload ->> 'phone'), ''),
    NULLIF(trim(_payload ->> 'website'), ''),
    NULLIF(trim(_payload ->> 'country'), ''),
    NULLIF(trim(_payload ->> 'industry'), ''),
    COALESCE(NULLIF(trim(_payload ->> 'industry'), ''), 'Company'),
    NULLIF(trim(_payload ->> 'contact_person_name'), ''),
    NULLIF(trim(_payload ->> 'contact_person_role'), ''),
    NULLIF(trim(_payload ->> 'logo_url'), ''),
    'pending'::public.org_status,
    false
  )
  RETURNING id INTO v_org;

  UPDATE public.profiles
  SET organization_id = v_org,
      account_type = 'organization',
      organization_name = v_org_name,
      display_name = COALESCE(NULLIF(trim(_payload ->> 'contact_person_name'), ''), display_name)
  WHERE user_id = v_user;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user, 'organization'::app_role)
  ON CONFLICT DO NOTHING;

  RETURN v_org;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_institution_onboarding(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_organization_onboarding(jsonb) TO authenticated;
