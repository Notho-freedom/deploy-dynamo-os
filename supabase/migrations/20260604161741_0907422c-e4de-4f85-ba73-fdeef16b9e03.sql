CREATE TABLE public.user_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  vercel_project_id text NOT NULL,
  vercel_project_name text NOT NULL,
  github_repo_full_name text NOT NULL,
  github_repo_id bigint,
  branch text NOT NULL DEFAULT 'main',
  framework text,
  production_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vercel_project_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_projects TO authenticated;
GRANT ALL ON public.user_projects TO service_role;

ALTER TABLE public.user_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own projects" ON public.user_projects FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own projects" ON public.user_projects FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own projects" ON public.user_projects FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own projects" ON public.user_projects FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage all projects" ON public.user_projects FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX user_projects_user_id_created_at_idx ON public.user_projects (user_id, created_at DESC);

CREATE TRIGGER update_user_projects_updated_at BEFORE UPDATE ON public.user_projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();