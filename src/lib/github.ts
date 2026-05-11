import { supabase } from '@/integrations/supabase/client';

export interface GhRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description: string | null;
  language: string | null;
  default_branch: string;
  pushed_at: string;
  owner: { login: string; avatar_url: string };
}

export interface GhBranch { name: string; commit: { sha: string } }

export async function ghApi<T = any>(path: string, opts: { method?: string; query?: Record<string, any>; body?: any } = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke('github-api', {
    body: { path, method: opts.method || 'GET', query: opts.query, body: opts.body },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  if (data?.status >= 400) throw new Error(`GitHub ${data.status}: ${typeof data.data === 'object' ? data.data?.message || '' : ''}`);
  return data.data as T;
}

export const github = {
  me: () => ghApi<{ login: string; avatar_url: string }>('/user'),
  myRepos: () => ghApi<GhRepo[]>('/user/repos', { query: { per_page: 100, sort: 'pushed', affiliation: 'owner,collaborator,organization_member' } }),
  branches: (owner: string, repo: string) => ghApi<GhBranch[]>(`/repos/${owner}/${repo}/branches`, { query: { per_page: 50 } }),
  repo: (owner: string, repo: string) => ghApi<GhRepo>(`/repos/${owner}/${repo}`),
};

export function startGithubOAuth(): void {
  const redirectUri = `${window.location.origin}/integrations/github/callback`;
  const state = crypto.randomUUID();
  sessionStorage.setItem('gh_oauth_state', state);
  const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/oauth-start?provider=github&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
  window.location.href = url;
}

export function startVercelOAuth(): void {
  const redirectUri = `${window.location.origin}/integrations/vercel/callback`;
  const state = crypto.randomUUID();
  sessionStorage.setItem('vercel_oauth_state', state);
  const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/oauth-start?provider=vercel&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
  window.location.href = url;
}
