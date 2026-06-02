CREATE TYPE public.app_role AS ENUM ('super_admin', 'staff', 'verifier');
CREATE TYPE public.certificate_status AS ENUM ('valid', 'revoked', 'suspended');
CREATE TYPE public.student_status AS ENUM ('active', 'graduated', 'withdrawn', 'suspended');
CREATE TYPE public.verification_result AS ENUM ('authentic', 'invalid', 'revoked', 'suspended', 'tampered');
CREATE TYPE public.audit_risk_level AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TABLE public.institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  domain TEXT,
  website_url TEXT,
  country TEXT,
  seal_url TEXT,
  verification_enabled BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.campuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  city TEXT,
  country TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(institution_id, code)
);

CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  campus_id UUID REFERENCES public.campuses(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  faculty TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(institution_id, code)
);

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
  campus_id UUID REFERENCES public.campuses(id) ON DELETE SET NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  display_name TEXT,
  email TEXT,
  job_title TEXT,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role, institution_id)
);

CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  campus_id UUID REFERENCES public.campuses(id) ON DELETE SET NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  matric_number TEXT NOT NULL,
  email TEXT,
  enrollment_year INTEGER,
  graduation_year INTEGER,
  status public.student_status NOT NULL DEFAULT 'active',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(institution_id, matric_number)
);

CREATE TABLE public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  campus_id UUID REFERENCES public.campuses(id) ON DELETE SET NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  certificate_id TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  matric_number TEXT NOT NULL,
  qualification TEXT NOT NULL,
  department_name TEXT NOT NULL,
  graduation_year INTEGER NOT NULL,
  status public.certificate_status NOT NULL DEFAULT 'valid',
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  hash_signature TEXT NOT NULL,
  qr_payload TEXT NOT NULL,
  seal_area TEXT,
  revoked_reason TEXT,
  suspended_reason TEXT,
  status_changed_at TIMESTAMPTZ,
  status_changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  issued_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.verification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id UUID REFERENCES public.certificates(id) ON DELETE SET NULL,
  certificate_identifier TEXT,
  institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
  result public.verification_result NOT NULL,
  verifier_name TEXT,
  verifier_email TEXT,
  organization TEXT,
  search_method TEXT NOT NULL DEFAULT 'certificate_id',
  ip_address INET,
  user_agent TEXT,
  report_url TEXT,
  receipt_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  summary TEXT,
  changes JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  risk_level public.audit_risk_level NOT NULL DEFAULT 'low',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'system',
  priority public.audit_risk_level NOT NULL DEFAULT 'low',
  action_url TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.bulk_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source_filename TEXT NOT NULL,
  upload_type TEXT NOT NULL DEFAULT 'students',
  status TEXT NOT NULL DEFAULT 'processing',
  total_rows INTEGER NOT NULL DEFAULT 0,
  processed_rows INTEGER NOT NULL DEFAULT 0,
  failed_rows INTEGER NOT NULL DEFAULT 0,
  error_report JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_institution_id ON public.profiles(institution_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_students_institution_matric ON public.students(institution_id, matric_number);
CREATE INDEX idx_certificates_identifier ON public.certificates(certificate_id);
CREATE INDEX idx_certificates_name ON public.certificates USING GIN (to_tsvector('english', full_name));
CREATE INDEX idx_verification_events_certificate ON public.verification_events(certificate_identifier);
CREATE INDEX idx_audit_logs_institution_created ON public.audit_logs(institution_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.has_institution_role(_user_id UUID, _institution_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (institution_id = _institution_id OR institution_id IS NULL)
  )
$$;

CREATE OR REPLACE FUNCTION public.user_institution_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT institution_id
  FROM public.profiles
  WHERE user_id = _user_id
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'full_name'),
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER update_institutions_updated_at BEFORE UPDATE ON public.institutions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_campuses_updated_at BEFORE UPDATE ON public.campuses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_certificates_updated_at BEFORE UPDATE ON public.certificates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active institutions" ON public.institutions FOR SELECT USING (is_active = true AND verification_enabled = true);
CREATE POLICY "Super admins can manage institutions" ON public.institutions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Staff can view campuses in their institution" ON public.campuses FOR SELECT TO authenticated USING (institution_id = public.user_institution_id(auth.uid()) OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins can manage campuses" ON public.campuses FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Staff can view departments in their institution" ON public.departments FOR SELECT TO authenticated USING (institution_id = public.user_institution_id(auth.uid()) OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins and staff can manage departments" ON public.departments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin') OR public.has_institution_role(auth.uid(), institution_id, 'staff')) WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_institution_role(auth.uid(), institution_id, 'staff'));

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin')) WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Users can create their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Staff can view students in their institution" ON public.students FOR SELECT TO authenticated USING (institution_id = public.user_institution_id(auth.uid()) OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Staff can manage students in their institution" ON public.students FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin') OR public.has_institution_role(auth.uid(), institution_id, 'staff')) WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_institution_role(auth.uid(), institution_id, 'staff'));

CREATE POLICY "Public can verify non-sensitive certificate fields" ON public.certificates FOR SELECT USING (true);
CREATE POLICY "Staff can manage certificates in their institution" ON public.certificates FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin') OR public.has_institution_role(auth.uid(), institution_id, 'staff')) WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_institution_role(auth.uid(), institution_id, 'staff'));

CREATE POLICY "Anyone can create verification events" ON public.verification_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Staff can view verification events for their institution" ON public.verification_events FOR SELECT TO authenticated USING (institution_id = public.user_institution_id(auth.uid()) OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Staff can create audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (actor_user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Privileged staff can view audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin') OR public.has_institution_role(auth.uid(), institution_id, 'staff'));

CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Privileged staff can create notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_institution_role(auth.uid(), institution_id, 'staff'));

CREATE POLICY "Staff can view uploads for their institution" ON public.bulk_uploads FOR SELECT TO authenticated USING (institution_id = public.user_institution_id(auth.uid()) OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Staff can manage uploads for their institution" ON public.bulk_uploads FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin') OR public.has_institution_role(auth.uid(), institution_id, 'staff')) WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_institution_role(auth.uid(), institution_id, 'staff'));
