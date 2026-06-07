CREATE TABLE public.user_backend_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  render_service_id text NOT NULL UNIQUE,
  render_service_name text NOT NULL,
  kind text NOT NULL,
  github_repo_full_name text,
  branch text,
  region text,
  plan text,
  service_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_backend_services TO authenticated;
GRANT ALL ON public.user_backend_services TO service_role;

ALTER TABLE public.user_backend_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own backend services" ON public.user_backend_services
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own backend services" ON public.user_backend_services
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own backend services" ON public.user_backend_services
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own backend services" ON public.user_backend_services
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage all backend services" ON public.user_backend_services
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_user_backend_services_updated_at
  BEFORE UPDATE ON public.user_backend_services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_user_backend_services_user ON public.user_backend_services(user_id);
CREATE INDEX idx_user_backend_services_kind ON public.user_backend_services(kind);