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

export interface GhOrg { login: string; avatar_url: string; id: number }
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
  myOrgs: () => ghApi<GhOrg[]>('/user/orgs', { query: { per_page: 50 } }),
  branches: (owner: string, repo: string) => ghApi<GhBranch[]>(`/repos/${owner}/${repo}/branches`, { query: { per_page: 50 } }),
  repo: (owner: string, repo: string) => ghApi<GhRepo>(`/repos/${owner}/${repo}`),
  // Read a file from the default branch (base64-encoded content)
  repoFile: (owner: string, repo: string, path: string) =>
    ghApi<{ content: string; encoding: string }>(`/repos/${owner}/${repo}/contents/${path}`),
};

export async function readPackageJson(owner: string, repo: string): Promise<any | null> {
  try {
    const f = await github.repoFile(owner, repo, 'package.json');
    if (f.encoding !== 'base64') return null;
    return JSON.parse(atob(f.content.replace(/\n/g, '')));
  } catch {
    return null;
  }
}

export function detectFramework(pkg: any): { framework: string; build: string; output: string; install: string } {
  const deps = { ...(pkg?.dependencies || {}), ...(pkg?.devDependencies || {}) };
  const scripts = pkg?.scripts || {};
  const build = scripts.build ? 'npm run build' : 'npm run build';
  const install = pkg?.packageManager?.startsWith('pnpm') ? 'pnpm install' : pkg?.packageManager?.startsWith('yarn') ? 'yarn install' : 'npm install';
  if (deps['next']) return { framework: 'nextjs', build: 'next build', output: '.next', install };
  if (deps['@remix-run/react'] || deps['@remix-run/node']) return { framework: 'remix', build, output: 'public/build', install };
  if (deps['astro']) return { framework: 'astro', build: 'astro build', output: 'dist', install };
  if (deps['@sveltejs/kit']) return { framework: 'sveltekit', build, output: '.svelte-kit', install };
  if (deps['nuxt']) return { framework: 'nuxtjs', build: 'nuxt build', output: '.nuxt', install };
  if (deps['vite']) return { framework: 'vite', build, output: 'dist', install };
  if (deps['react-scripts']) return { framework: 'create-react-app', build, output: 'build', install };
  return { framework: '', build, output: 'dist', install };
}

// Legacy OAuth flows kept for future reactivation behind feature flag.
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
