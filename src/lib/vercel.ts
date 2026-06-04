import { supabase } from '@/integrations/supabase/client';

export interface VercelProject {
  id: string;
  name: string;
  framework: string | null;
  updatedAt: number;
  link?: { type: string; repo?: string; org?: string; repoId?: number };
  targets?: { production?: { url?: string } };
}

export interface VercelDeployment {
  uid: string;
  id?: string;
  name: string;
  url: string;
  state: 'BUILDING' | 'READY' | 'ERROR' | 'CANCELED' | 'QUEUED' | 'INITIALIZING';
  target?: 'production' | 'preview' | null;
  created: number;
  ready?: number;
  meta?: { githubCommitMessage?: string; githubCommitRef?: string; githubCommitSha?: string };
  creator?: { username?: string };
  projectId?: string;
}

export interface VercelEvent {
  type: string;
  created: number;
  payload?: { text?: string; info?: { type?: string; name?: string; step?: string; path?: string }; statusCode?: number };
}

export interface VercelDomain {
  name: string;
  verified?: boolean;
  apexName?: string;
  projectId?: string;
  redirect?: string | null;
  gitBranch?: string | null;
  updatedAt?: number;
  createdAt?: number;
}

export interface VercelEnvVariable {
  id: string;
  key: string;
  target?: string[];
  type?: string;
  configurationId?: string | null;
  createdAt?: number;
  updatedAt?: number;
}

export async function vercelOAuthExchange(code: string) {
  const { data, error } = await supabase.functions.invoke('vercel-oauth-callback', {
    body: { code, redirect_uri: `${window.location.origin}/integrations/vercel/callback` },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function vercelApi<T = any>(path: string, opts: { method?: string; query?: Record<string, any>; body?: any } = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke('vercel-api', {
    body: { path, method: opts.method || 'GET', query: opts.query, body: opts.body },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  if (data?.status >= 400) {
    const msg = typeof data.data === 'object' ? data.data?.error?.message || JSON.stringify(data.data) : data.data;
    throw new Error(`Vercel ${data.status}: ${msg}`);
  }
  return data.data as T;
}

export interface CreateProjectInput {
  name: string;
  framework?: string | null;
  gitRepository?: { type: 'github'; repo: string };
  rootDirectory?: string;
  buildCommand?: string;
  outputDirectory?: string;
  installCommand?: string;
  environmentVariables?: Array<{ key: string; value: string; target: ('production' | 'preview' | 'development')[]; type?: 'plain' | 'encrypted' }>;
}

export const vercel = {
  listProjects: () => vercelApi<{ projects: VercelProject[] }>('/v9/projects', { query: { limit: 50 } }),
  getProject: (id: string) => vercelApi<VercelProject>(`/v9/projects/${id}`),
  listDeployments: (projectId?: string, limit = 30) =>
    vercelApi<{ deployments: VercelDeployment[] }>('/v6/deployments', {
      query: { limit, ...(projectId ? { projectId } : {}) },
    }),
  getDeployment: (id: string) => vercelApi<VercelDeployment>(`/v13/deployments/${id}`),
  getDeploymentEvents: (id: string) => vercelApi<VercelEvent[]>(`/v2/deployments/${id}/events`, { query: { limit: 200 } }),
  cancelDeployment: (id: string) => vercelApi(`/v12/deployments/${id}/cancel`, { method: 'PATCH' }),
  promoteDeployment: (projectId: string, deploymentId: string) =>
    vercelApi(`/v9/projects/${projectId}/promote/${deploymentId}`, { method: 'POST' }),
  listDomains: (projectId: string) => vercelApi<{ domains?: VercelDomain[] }>(`/v9/projects/${projectId}/domains`),
  listEnv: (projectId: string) => vercelApi<{ envs?: VercelEnvVariable[]; env?: VercelEnvVariable[] }>(`/v9/projects/${projectId}/env`),
  createProject: (input: CreateProjectInput) => vercelApi<VercelProject>('/v9/projects', { method: 'POST', body: input }),
  createDeployment: (input: { name: string; gitSource: { type: 'github'; repoId: number; ref: string }; projectSettings?: Record<string, unknown>; target?: 'production' }) =>
    vercelApi<VercelDeployment>('/v13/deployments', { method: 'POST', body: input }),
};

// Orchestrated end-to-end: create Vercel project + first deployment + record in user_projects.
export interface DeployInput {
  name: string;
  repo_full_name: string;
  repo_id: number;
  branch: string;
  framework: string;
  rootDirectory?: string;
  buildCommand?: string;
  outputDirectory?: string;
  installCommand?: string;
  envs?: { key: string; value: string }[];
}

export async function createProjectAndDeploy(input: DeployInput): Promise<{
  project_id: string;
  project_name: string;
  deployment_id: string;
  deployment_url: string;
}> {
  const { data, error } = await supabase.functions.invoke('vercel-deploy', { body: input });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error));
  return data;
}
