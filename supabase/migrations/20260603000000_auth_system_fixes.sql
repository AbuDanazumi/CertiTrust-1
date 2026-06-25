-- Pre-Migration Dependency Validation (Runtime Verification)
DO $$
DECLARE
  v_table_exists boolean;
  v_type_exists boolean;
  v_value_exists boolean;
  v_column_name text;
BEGIN
  -- 1. Verify Tables
  SELECT EXISTS (SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'profiles') INTO v_table_exists;
  IF NOT v_table_exists THEN RAISE EXCEPTION 'Dependency validation failed: table public.profiles is missing'; END IF;

  SELECT EXISTS (SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'user_roles') INTO v_table_exists;
  IF NOT v_table_exists THEN RAISE EXCEPTION 'Dependency validation failed: table public.user_roles is missing'; END IF;

  SELECT EXISTS (SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'institutions') INTO v_table_exists;
  IF NOT v_table_exists THEN RAISE EXCEPTION 'Dependency validation failed: table public.institutions is missing'; END IF;

  SELECT EXISTS (SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'organizations') INTO v_table_exists;
  IF NOT v_table_exists THEN RAISE EXCEPTION 'Dependency validation failed: table public.organizations is missing'; END IF;

  SELECT EXISTS (SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'auth' AND c.relname = 'users') INTO v_table_exists;
  IF NOT v_table_exists THEN RAISE EXCEPTION 'Dependency validation failed: table auth.users is missing'; END IF;

  -- 2. Verify Columns
  -- profiles columns
  FOR v_column_name IN SELECT unnest(ARRAY['user_id', 'display_name', 'email', 'account_type', 'organization_name', 'institution_id', 'organization_id', 'is_active'])
  LOOP
    SELECT EXISTS (SELECT 1 FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid = a.attrelid JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'profiles' AND a.attname = v_column_name AND NOT a.attisdropped) INTO v_table_exists;
    IF NOT v_table_exists THEN RAISE EXCEPTION 'Dependency validation failed: column % is missing from public.profiles', v_column_name; END IF;
  END LOOP;

  -- user_roles columns
  FOR v_column_name IN SELECT unnest(ARRAY['user_id', 'role', 'institution_id'])
  LOOP
    SELECT EXISTS (SELECT 1 FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid = a.attrelid JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'user_roles' AND a.attname = v_column_name AND NOT a.attisdropped) INTO v_table_exists;
    IF NOT v_table_exists THEN RAISE EXCEPTION 'Dependency validation failed: column % is missing from public.user_roles', v_column_name; END IF;
  END LOOP;

  -- institutions columns
  FOR v_column_name IN SELECT unnest(ARRAY['id', 'name', 'code', 'email', 'phone', 'website_url', 'country', 'institution_type', 'address', 'city', 'state_province', 'logo_url', 'status', 'is_active', 'verification_enabled'])
  LOOP
    SELECT EXISTS (SELECT 1 FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid = a.attrelid JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'institutions' AND a.attname = v_column_name AND NOT a.attisdropped) INTO v_table_exists;
    IF NOT v_table_exists THEN RAISE EXCEPTION 'Dependency validation failed: column % is missing from public.institutions', v_column_name; END IF;
  END LOOP;

  -- organizations columns
  FOR v_column_name IN SELECT unnest(ARRAY['id', 'name', 'email', 'phone', 'website', 'country', 'industry', 'org_type', 'contact_person_name', 'contact_person_role', 'logo_url', 'status', 'is_active'])
  LOOP
    SELECT EXISTS (SELECT 1 FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid = a.attrelid JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'organizations' AND a.attname = v_column_name AND NOT a.attisdropped) INTO v_table_exists;
    IF NOT v_table_exists THEN RAISE EXCEPTION 'Dependency validation failed: column % is missing from public.organizations', v_column_name; END IF;
  END LOOP;

  -- 3. Verify Enums
  SELECT EXISTS (SELECT 1 FROM pg_catalog.pg_type t JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typname = 'app_role') INTO v_type_exists;
  IF NOT v_type_exists THEN RAISE EXCEPTION 'Dependency validation failed: enum type public.app_role is missing'; END IF;

  SELECT EXISTS (SELECT 1 FROM pg_catalog.pg_type t JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typname = 'org_status') INTO v_type_exists;
  IF NOT v_type_exists THEN RAISE EXCEPTION 'Dependency validation failed: enum type public.org_status is missing'; END IF;

  -- Verify enum values for app_role
  FOR v_column_name IN SELECT unnest(ARRAY['super_admin', 'staff', 'verifier', 'organization'])
  LOOP
    SELECT EXISTS (SELECT 1 FROM pg_catalog.pg_enum e JOIN pg_catalog.pg_type t ON t.oid = e.enumtypid JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typname = 'app_role' AND e.enumlabel = v_column_name) INTO v_value_exists;
    IF NOT v_value_exists THEN RAISE EXCEPTION 'Dependency validation failed: enum value % is missing from public.app_role', v_column_name; END IF;
  END LOOP;

  -- Verify enum values for org_status
  FOR v_column_name IN SELECT unnest(ARRAY['pending', 'active', 'suspended', 'rejected'])
  LOOP
    SELECT EXISTS (SELECT 1 FROM pg_catalog.pg_enum e JOIN pg_catalog.pg_type t ON t.oid = e.enumtypid JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typname = 'org_status' AND e.enumlabel = v_column_name) INTO v_value_exists;
    IF NOT v_value_exists THEN RAISE EXCEPTION 'Dependency validation failed: enum value % is missing from public.org_status', v_column_name; END IF;
  END LOOP;

  RAISE NOTICE 'Dependency validation completed successfully.';
END;
$$;

-- 1. Ensure exactly one role per auth user by adding unique constraint on user_roles.user_id
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_institution_id_key;
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_key;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);

-- 2. Redefine security functions using LANGUAGE plpgsql with SECURITY DEFINER to prevent inlining and recursion.
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.has_institution_role(_user_id UUID, _institution_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (institution_id = _institution_id OR institution_id IS NULL)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.user_institution_id(_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  SELECT institution_id INTO v_id
  FROM public.profiles
  WHERE user_id = _user_id
  LIMIT 1;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.user_organization_id(_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  SELECT organization_id INTO v_id
  FROM public.profiles
  WHERE user_id = _user_id
  LIMIT 1;
  RETURN v_id;
END;
$$;

-- 3. Create modular, idempotent onboarding sub-functions.

-- A. Create profile helper
CREATE OR REPLACE FUNCTION public.create_profile(
  v_user_id UUID,
  v_display_name TEXT,
  v_email TEXT,
  v_account_type TEXT,
  v_org_name TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Set transaction settings to authorize profile/tenant writes during trigger/RPC execution
  PERFORM set_config('app.allow_tenant_profile_write', 'true', true);

  INSERT INTO public.profiles (
    user_id,
    display_name,
    email,
    account_type,
    organization_name
  )
  VALUES (
    v_user_id,
    v_display_name,
    v_email,
    v_account_type,
    v_org_name
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    display_name = COALESCE(v_display_name, public.profiles.display_name),
    email = COALESCE(v_email, public.profiles.email),
    account_type = COALESCE(v_account_type, public.profiles.account_type),
    organization_name = COALESCE(v_org_name, public.profiles.organization_name);
END;
$$;

-- B. Create tenant helper
CREATE OR REPLACE FUNCTION public.create_institution_or_organization(
  v_user_id UUID,
  v_account_type TEXT,
  v_payload JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_name TEXT;
  v_email TEXT;
  v_code TEXT;
BEGIN
  IF v_account_type = 'institution' THEN
    v_name := COALESCE(NULLIF(trim(v_payload ->> 'institution_name'), ''), 'My Institution');
    v_email := COALESCE(NULLIF(trim(v_payload ->> 'email'), ''), (SELECT email FROM auth.users WHERE id = v_user_id));
    v_code := 'INST-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

    -- Check if institution already exists for this email
    SELECT id INTO v_tenant_id FROM public.institutions WHERE email = v_email LIMIT 1;
    
    IF v_tenant_id IS NULL THEN
      INSERT INTO public.institutions (
        name, code, email, phone, website_url, country, institution_type,
        address, city, state_province, logo_url, status, is_active, verification_enabled
      )
      VALUES (
        v_name,
        v_code,
        v_email,
        NULLIF(trim(v_payload ->> 'phone'), ''),
        NULLIF(trim(v_payload ->> 'website'), ''),
        COALESCE(NULLIF(trim(v_payload ->> 'country'), ''), 'US'),
        NULLIF(trim(v_payload ->> 'institution_type'), ''),
        COALESCE(NULLIF(trim(v_payload ->> 'address'), ''), 'Onboarding Address'),
        COALESCE(NULLIF(trim(v_payload ->> 'city'), ''), 'Onboarding City'),
        NULLIF(trim(v_payload ->> 'state_province'), ''),
        NULLIF(trim(v_payload ->> 'logo_url'), ''),
        'pending'::public.org_status,
        false,
        false
      )
      RETURNING id INTO v_tenant_id;
    ELSE
      -- Update existing institution
      UPDATE public.institutions
      SET
        name = COALESCE(NULLIF(trim(v_payload ->> 'institution_name'), ''), name),
        phone = COALESCE(NULLIF(trim(v_payload ->> 'phone'), ''), phone),
        website_url = COALESCE(NULLIF(trim(v_payload ->> 'website'), ''), website_url),
        country = COALESCE(NULLIF(trim(v_payload ->> 'country'), ''), country),
        institution_type = COALESCE(NULLIF(trim(v_payload ->> 'institution_type'), ''), institution_type),
        address = COALESCE(NULLIF(trim(v_payload ->> 'address'), ''), address),
        city = COALESCE(NULLIF(trim(v_payload ->> 'city'), ''), city),
        state_province = COALESCE(NULLIF(trim(v_payload ->> 'state_province'), ''), state_province),
        logo_url = COALESCE(NULLIF(trim(v_payload ->> 'logo_url'), ''), logo_url)
      WHERE id = v_tenant_id;
    END IF;

  ELSIF v_account_type = 'organization' THEN
    v_name := COALESCE(NULLIF(trim(v_payload ->> 'organization_name'), ''), 'My Organization');
    v_email := COALESCE(NULLIF(trim(v_payload ->> 'email'), ''), (SELECT email FROM auth.users WHERE id = v_user_id));

    -- Check if organization already exists for this email
    SELECT id INTO v_tenant_id FROM public.organizations WHERE email = v_email LIMIT 1;

    IF v_tenant_id IS NULL THEN
      INSERT INTO public.organizations (
        name, email, phone, website, country, industry, org_type,
        contact_person_name, contact_person_role, logo_url, status, is_active
      )
      VALUES (
        v_name,
        v_email,
        NULLIF(trim(v_payload ->> 'phone'), ''),
        NULLIF(trim(v_payload ->> 'website'), ''),
        COALESCE(NULLIF(trim(v_payload ->> 'country'), ''), 'US'),
        COALESCE(NULLIF(trim(v_payload ->> 'industry'), ''), 'Other'),
        'Company',
        NULLIF(trim(v_payload ->> 'contact_person_name'), ''),
        NULLIF(trim(v_payload ->> 'contact_person_role'), ''),
        NULLIF(trim(v_payload ->> 'logo_url'), ''),
        'pending'::public.org_status,
        false
      )
      RETURNING id INTO v_tenant_id;
    ELSE
      -- Update existing organization
      UPDATE public.organizations
      SET
        name = COALESCE(NULLIF(trim(v_payload ->> 'organization_name'), ''), name),
        phone = COALESCE(NULLIF(trim(v_payload ->> 'phone'), ''), phone),
        website = COALESCE(NULLIF(trim(v_payload ->> 'website'), ''), website),
        country = COALESCE(NULLIF(trim(v_payload ->> 'country'), ''), country),
        industry = COALESCE(NULLIF(trim(v_payload ->> 'industry'), ''), industry),
        contact_person_name = COALESCE(NULLIF(trim(v_payload ->> 'contact_person_name'), ''), contact_person_name),
        contact_person_role = COALESCE(NULLIF(trim(v_payload ->> 'contact_person_role'), ''), contact_person_role),
        logo_url = COALESCE(NULLIF(trim(v_payload ->> 'logo_url'), ''), logo_url)
      WHERE id = v_tenant_id;
    END IF;
  END IF;

  RETURN v_tenant_id;
END;
$$;

-- C. Assign role helper
CREATE OR REPLACE FUNCTION public.assign_role(
  v_user_id UUID,
  v_role public.app_role,
  v_tenant_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF v_role = 'staff'::app_role THEN
    INSERT INTO public.user_roles (user_id, role, institution_id)
    VALUES (v_user_id, v_role, v_tenant_id)
    ON CONFLICT (user_id) DO UPDATE
    SET role = EXCLUDED.role, institution_id = EXCLUDED.institution_id;
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, v_role)
    ON CONFLICT (user_id) DO UPDATE
    SET role = EXCLUDED.role, institution_id = NULL;
  END IF;
END;
$$;

-- D. Complete onboarding wrapper
CREATE OR REPLACE FUNCTION public.complete_onboarding(
  v_user_id UUID,
  v_account_type TEXT,
  v_payload JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_role public.app_role;
BEGIN
  -- Set transaction settings to authorize profile/tenant writes during trigger/RPC execution
  PERFORM set_config('app.allow_tenant_profile_write', 'true', true);
  PERFORM set_config('app.allow_institution_admin_write', 'true', true);

  -- Create/update institution or organization
  v_tenant_id := public.create_institution_or_organization(v_user_id, v_account_type, v_payload);

  -- Link tenant ID to profile and update basic profile info
  IF v_account_type = 'institution' THEN
    UPDATE public.profiles
    SET institution_id = v_tenant_id,
        display_name = COALESCE(NULLIF(trim(v_payload ->> 'contact_name'), ''), display_name),
        account_type = 'institution'
    WHERE user_id = v_user_id;
    
    v_role := 'staff'::app_role;
  ELSIF v_account_type = 'organization' THEN
    UPDATE public.profiles
    SET organization_id = v_tenant_id,
        organization_name = COALESCE(NULLIF(trim(v_payload ->> 'organization_name'), ''), organization_name),
        display_name = COALESCE(NULLIF(trim(v_payload ->> 'contact_person_name'), ''), display_name),
        account_type = 'organization'
    WHERE user_id = v_user_id;

    v_role := 'organization'::app_role;
  END IF;

  -- Assign/update role
  PERFORM public.assign_role(v_user_id, v_role, v_tenant_id);
END;
$$;

-- E. Modularized handle_new_user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_type text;
  v_display_name text;
  v_org_name text;
  v_payload jsonb;
  v_err_context text;
  v_err_state text;
  v_err_msg text;
  v_err_detail text;
BEGIN
  -- Set transaction settings to authorize profile/tenant writes during trigger execution
  PERFORM set_config('app.allow_tenant_profile_write', 'true', true);
  PERFORM set_config('app.allow_institution_admin_write', 'true', true);

  -- Extract basic metadata
  v_account_type := COALESCE(
    NULLIF(NEW.raw_user_meta_data ->> 'account_type', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'intended_role', ''),
    'institution'
  );
  v_display_name := COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'full_name');
  v_org_name := NEW.raw_user_meta_data ->> 'organization_name';
  v_payload := NEW.raw_user_meta_data -> 'onboarding_payload';

  -- Wrap onboarding operations in a controlled exception block
  BEGIN
    -- Create profile first
    PERFORM public.create_profile(NEW.id, v_display_name, NEW.email, v_account_type, v_org_name);

    -- Process onboarding payload if present
    IF v_payload IS NOT NULL AND v_payload <> 'null'::jsonb THEN
      PERFORM public.complete_onboarding(NEW.id, v_account_type, v_payload);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS
      v_err_state = RETURNED_SQLSTATE,
      v_err_msg = MESSAGE_TEXT,
      v_err_detail = PG_EXCEPTION_DETAIL,
      v_err_context = PG_EXCEPTION_CONTEXT;

    -- Log details to database server log for backend visibility
    RAISE LOG 'handle_new_user trigger onboarding execution failed. State: %, Msg: %, Detail: %, Context: %',
      v_err_state, v_err_msg, v_err_detail, v_err_context;

    -- Re-raise exception to force transaction rollback and return structured error information
    RAISE EXCEPTION 'Database error saving new user (failed at handle_new_user trigger). State: %, Error: %',
      v_err_state, v_err_msg;
  END;

  RETURN NEW;
END;
$$;

-- Recreate trigger on auth.users (ensure drop/create to update trigger definition safely)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- F. Redefining onboarding RPC endpoints to reuse the clean, transaction-safe complete_onboarding helper.
CREATE OR REPLACE FUNCTION public.register_institution_onboarding(_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_inst_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  PERFORM set_config('app.allow_tenant_profile_write', 'true', true);
  PERFORM set_config('app.allow_institution_admin_write', 'true', true);

  -- Execute complete onboarding transaction
  PERFORM public.complete_onboarding(v_user, 'institution', _payload);

  SELECT institution_id INTO v_inst_id FROM public.profiles WHERE user_id = v_user;
  RETURN v_inst_id;
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
  v_org_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  PERFORM set_config('app.allow_tenant_profile_write', 'true', true);

  -- Execute complete onboarding transaction
  PERFORM public.complete_onboarding(v_user, 'organization', _payload);

  SELECT organization_id INTO v_org_id FROM public.profiles WHERE user_id = v_user;
  RETURN v_org_id;
END;
$$;

-- 4. public.check_onboarding_status() helper to support public duplicate registration audit/recovery
CREATE OR REPLACE FUNCTION public.check_onboarding_status(_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_profile_exists boolean;
  v_role_exists boolean;
  v_tenant_exists boolean;
  v_account_type text;
BEGIN
  -- Check user in auth.users
  SELECT id INTO v_user_id FROM auth.users WHERE email = _email LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('exists', false);
  END IF;

  -- Check profile
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = v_user_id) INTO v_profile_exists;
  
  -- Check role
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_user_id) INTO v_role_exists;
  
  -- Check tenant based on account_type
  SELECT account_type INTO v_account_type FROM public.profiles WHERE user_id = v_user_id;
  
  IF v_account_type = 'institution' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.profiles p 
      JOIN public.institutions i ON p.institution_id = i.id 
      WHERE p.user_id = v_user_id
    ) INTO v_tenant_exists;
  ELSIF v_account_type = 'organization' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.profiles p 
      JOIN public.organizations o ON p.organization_id = o.id 
      WHERE p.user_id = v_user_id
    ) INTO v_tenant_exists;
  ELSE
    v_tenant_exists := false;
  END IF;

  RETURN jsonb_build_object(
    'exists', true,
    'profile_exists', v_profile_exists,
    'role_exists', v_role_exists,
    'tenant_exists', COALESCE(v_tenant_exists, false),
    'account_type', v_account_type,
    'incomplete', NOT (COALESCE(v_profile_exists, false) AND COALESCE(v_role_exists, false) AND COALESCE(v_tenant_exists, false))
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_onboarding_status(text) TO anon;
GRANT EXECUTE ON FUNCTION public.check_onboarding_status(text) TO authenticated;

-- Post-Migration Health Check (Runtime Verification)
DO $$
DECLARE
  v_func_ok boolean;
  v_trigger_count int;
  v_is_after_insert boolean;
  v_profiles_unique boolean;
  v_user_roles_unique boolean;
  v_orphaned_profiles int;
  v_orphaned_roles int;
  v_func_name text;
BEGIN
  -- 1. Verify Database Functions are LANGUAGE plpgsql and SECURITY DEFINER
  FOR v_func_name IN SELECT unnest(ARRAY[
    'handle_new_user',
    'create_profile',
    'complete_onboarding',
    'create_institution_or_organization',
    'assign_role',
    'has_role',
    'has_institution_role',
    'user_institution_id',
    'user_organization_id',
    'check_onboarding_status'
  ])
  LOOP
    SELECT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_proc p
      JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = v_func_name
        AND p.prosecdef = true
        AND (SELECT l.lanname FROM pg_catalog.pg_language l WHERE l.oid = p.prolang) = 'plpgsql'
    ) INTO v_func_ok;
    IF NOT v_func_ok THEN
      RAISE EXCEPTION 'Post-migration check failed: function public.% is missing, not SECURITY DEFINER, or not LANGUAGE plpgsql', v_func_name;
    END IF;
  END LOOP;

  -- 2. Verify auth.users triggers
  -- Exactly one trigger on auth.users calling handle_new_user
  SELECT count(*)
  INTO v_trigger_count
  FROM pg_catalog.pg_trigger t
  JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'auth'
    AND c.relname = 'users'
    AND NOT t.tgisinternal
    AND (SELECT p.proname FROM pg_catalog.pg_proc p WHERE p.oid = t.tgfoid) = 'handle_new_user';

  IF v_trigger_count = 0 THEN
    RAISE EXCEPTION 'Post-migration check failed: no trigger on auth.users executes handle_new_user()';
  ELSIF v_trigger_count > 1 THEN
    RAISE EXCEPTION 'Post-migration check failed: duplicate triggers (% found) on auth.users execute handle_new_user()', v_trigger_count;
  END IF;

  -- Verify it fires AFTER INSERT
  SELECT (t.tgtype::int & 2) = 0 AND (t.tgtype::int & 4) = 4
  INTO v_is_after_insert
  FROM pg_catalog.pg_trigger t
  JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'auth'
    AND c.relname = 'users'
    AND NOT t.tgisinternal
    AND (SELECT p.proname FROM pg_catalog.pg_proc p WHERE p.oid = t.tgfoid) = 'handle_new_user'
  LIMIT 1;

  IF NOT COALESCE(v_is_after_insert, false) THEN
    RAISE EXCEPTION 'Post-migration check failed: handle_new_user trigger on auth.users is not AFTER INSERT';
  END IF;

  -- 3. Verify Constraints
  -- profiles.user_id unique index
  SELECT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_index i
    JOIN pg_catalog.pg_class c ON c.oid = i.indexrelid
    JOIN pg_catalog.pg_class t ON t.oid = i.indrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'profiles'
      AND i.indisunique
      AND i.indkey[0] = (SELECT attnum FROM pg_catalog.pg_attribute WHERE attrelid = t.oid AND attname = 'user_id' AND NOT attisdropped)
  ) INTO v_profiles_unique;

  IF NOT v_profiles_unique THEN
    RAISE EXCEPTION 'Post-migration check failed: public.profiles table is missing UNIQUE(user_id) constraint';
  END IF;

  -- user_roles.user_id unique index
  SELECT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_index i
    JOIN pg_catalog.pg_class c ON c.oid = i.indexrelid
    JOIN pg_catalog.pg_class t ON t.oid = i.indrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'user_roles'
      AND i.indisunique
      AND i.indkey[0] = (SELECT attnum FROM pg_catalog.pg_attribute WHERE attrelid = t.oid AND attname = 'user_id' AND NOT attisdropped)
  ) INTO v_user_roles_unique;

  IF NOT v_user_roles_unique THEN
    RAISE EXCEPTION 'Post-migration check failed: public.user_roles table is missing UNIQUE(user_id) constraint';
  END IF;

  -- 4. Check for orphaned rows
  SELECT count(*) INTO v_orphaned_profiles
  FROM public.profiles p
  LEFT JOIN auth.users u ON p.user_id = u.id
  WHERE u.id IS NULL;

  IF v_orphaned_profiles > 0 THEN
    RAISE EXCEPTION 'Post-migration check failed: % orphaned profile records found (referencing non-existent auth users)', v_orphaned_profiles;
  END IF;

  SELECT count(*) INTO v_orphaned_roles
  FROM public.user_roles r
  LEFT JOIN auth.users u ON r.user_id = u.id
  WHERE u.id IS NULL;

  IF v_orphaned_roles > 0 THEN
    RAISE EXCEPTION 'Post-migration check failed: % orphaned user role records found (referencing non-existent auth users)', v_orphaned_roles;
  END IF;

  RAISE NOTICE 'Post-migration health check completed successfully.';
END;
$$;
