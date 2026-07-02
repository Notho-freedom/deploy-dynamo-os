import { supabase } from '@/integrations/supabase/client';
import { invokeFn } from '@/lib/utils';

export interface VercelProject {
  id: string;
  name: string;
  framework: string | null;
  updatedAt: number;
  createdAt?: number;
  link?: { type: string; repo?: string; org?: string; repoId?: number };
  targets?: { production?: { url?: string; alias?: string[] } };
  rootDirectory?: string | null;
  buildCommand?: string | null;
  outputDirectory?: string | null;
  installCommand?: string | null;
  devCommand?: string | null;
  nodeVersion?: string | null;
  publicSource?: boolean | null;
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
  meta?: { githubCommitMessage?: string; githubCommitRef?: string; githubCommitSha?: string; githubCommitAuthorName?: string; githubCommitAuthorLogin?: string };
  creator?: { username?: string; uid?: string };
  projectId?: string;
  functions?: Record<string, { runtime?: string; memory?: number; maxDuration?: number; regions?: string[] }>;
  routes?: Array<Record<string, unknown>>;
  alias?: string[];
  inspectorUrl?: string;
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

export interface VercelDomainRecord {
  id: string;
  type: string;
  name: string;
  value: string;
  ttl?: number;
  priority?: number;
  comment?: string;
  creator?: string;
  createdAt?: number;
}

export interface VercelEnvVariable {
  id: string;
  key: string;
  value?: string;
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

export interface VercelApiOptions {
  method?: string;
  query?: Record<string, any>;
  body?: any;
  silent?: number[]; // status codes to NOT throw on (returns undefined)
}

export async function vercelApi<T = any>(path: string, opts: VercelApiOptions = {}): Promise<T> {
  const { data, error } = await invokeFn<any>('vercel-api', { path, method: opts.method || 'GET', query: opts.query, body: opts.body });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  if (data?.status >= 400) {
    if (opts.silent?.includes(data.status)) return undefined as any;
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
  user: () => vercelApi<{ user: any }>('/v2/user'),
  listProjects: () => vercelApi<{ projects: VercelProject[] }>('/v9/projects', { query: { limit: 50 } }),
  getProject: (id: string) => vercelApi<VercelProject>(`/v9/projects/${id}`),
  updateProject: (id: string, patch: Partial<VercelProject> & Record<string, unknown>) =>
    vercelApi<VercelProject>(`/v9/projects/${id}`, { method: 'PATCH', body: patch }),
  deleteProject: (id: string) => vercelApi(`/v9/projects/${id}`, { method: 'DELETE' }),

  listDeployments: (projectId?: string, limit = 30) =>
    vercelApi<{ deployments: VercelDeployment[] }>('/v6/deployments', {
      query: { limit, ...(projectId ? { projectId } : {}) },
    }),
  getDeployment: (id: string, opts: { silent404?: boolean } = {}) =>
    vercelApi<VercelDeployment>(`/v13/deployments/${id}`, { silent: opts.silent404 ? [404, 410] : undefined }),
  getDeploymentEvents: (id: string) =>
    vercelApi<VercelEvent[]>(`/v2/deployments/${id}/events`, { query: { limit: 500, builds: 1 }, silent: [404, 410] }),
  cancelDeployment: (id: string) => vercelApi(`/v12/deployments/${id}/cancel`, { method: 'PATCH' }),
  promoteDeployment: (projectId: string, deploymentId: string) =>
    vercelApi(`/v9/projects/${projectId}/promote/${deploymentId}`, { method: 'POST' }),

  listDomains: (projectId: string) => vercelApi<{ domains?: VercelDomain[] }>(`/v9/projects/${projectId}/domains`),
  getDomain: (domain: string) => vercelApi<any>(`/v5/domains/${domain}`, { silent: [403, 404] }),
  listDomainRecords: (domain: string) =>
    vercelApi<{ records: VercelDomainRecord[] }>(`/v4/domains/${domain}/records`, { silent: [403, 404] }),
  addDomainRecord: (domain: string, body: Partial<VercelDomainRecord>) =>
    vercelApi(`/v2/domains/${domain}/records`, { method: 'POST', body }),
  removeDomainRecord: (domain: string, recordId: string) =>
    vercelApi(`/v2/domains/${domain}/records/${recordId}`, { method: 'DELETE' }),

  listEnv: (projectId: string) =>
    vercelApi<{ envs?: VercelEnvVariable[]; env?: VercelEnvVariable[] }>(`/v9/projects/${projectId}/env`),
  createEnv: (projectId: string, body: { key: string; value: string; target: string[]; type?: string }) =>
    vercelApi(`/v10/projects/${projectId}/env`, { method: 'POST', body }),
  updateEnv: (projectId: string, envId: string, body: Partial<VercelEnvVariable>) =>
    vercelApi(`/v9/projects/${projectId}/env/${envId}`, { method: 'PATCH', body }),
  deleteEnv: (projectId: string, envId: string) =>
    vercelApi(`/v9/projects/${projectId}/env/${envId}`, { method: 'DELETE' }),

  createProject: (input: CreateProjectInput) =>
    vercelApi<VercelProject>('/v9/projects', { method: 'POST', body: input }),
  createDeployment: (input: {
    name: string;
    gitSource: { type: 'github'; repoId: number; ref: string };
    projectSettings?: Record<string, unknown>;
    target?: 'production';
  }) => vercelApi<VercelDeployment>('/v13/deployments', { method: 'POST', body: input }),

  // Deep API surface — phase 4
  listAliases: (projectId: string) => vercelApi<{ aliases: any[] }>(`/v1/projects/${projectId}/aliases`, { silent: [403, 404] }),
  getAlias: (alias: string) => vercelApi<any>(`/v2/aliases/${alias}`, { silent: [403, 404] }),
  createAlias: (deploymentId: string, alias: string) =>
    vercelApi(`/v2/aliases/${alias}`, { method: 'POST', body: { deploymentId } }),
  removeAlias: (aliasId: string) => vercelApi(`/v2/aliases/${aliasId}`, { method: 'DELETE' }),
  listDeploymentFiles: (deploymentId: string) =>
    vercelApi<any[]>(`/v6/deployments/${deploymentId}/files`, { silent: [403, 404] }),
  getDeploymentFile: (deploymentId: string, fileId: string) =>
    vercelApi<any>(`/v7/deployments/${deploymentId}/files/${fileId}`, { silent: [403, 404] }),
  listChecks: (deploymentId: string) =>
    vercelApi<{ checks: any[] }>(`/v1/deployments/${deploymentId}/checks`, { silent: [403, 404] }),
  getFirewall: (projectId: string) =>
    vercelApi<any>(`/v1/firewall/configs/${projectId}`, { silent: [403, 404] }),
  attackStatus: () => vercelApi<any>('/v1/security/attack-status', { silent: [403] }),
  purgeCache: () => vercelApi('/v1/data-cache/purge-all', { method: 'DELETE' }),
  createProtectionBypass: (projectId: string) =>
    vercelApi(`/v1/projects/${projectId}/protection-bypass`, { method: 'POST', body: {} }),
  webVitals: (projectId: string, from: number, to: number) =>
    vercelApi<any>(`/v1/projects/${projectId}/web-vitals`, { query: { from, to }, silent: [403, 404] }),
  insights: (projectId: string) =>
    vercelApi<any>(`/v1/projects/${projectId}/insights`, { silent: [403, 404] }),
  listLogDrains: () => vercelApi<any[]>('/v1/integrations/log-drains', { silent: [403] }),
  createLogDrain: (body: Record<string, unknown>) =>
    vercelApi('/v1/integrations/log-drains', { method: 'POST', body }),
  deleteLogDrain: (id: string) => vercelApi(`/v1/integrations/log-drains/${id}`, { method: 'DELETE' }),
  listWebhooks: () => vercelApi<any[]>('/v1/webhooks', { silent: [403] }),
  createWebhook: (body: Record<string, unknown>) => vercelApi('/v1/webhooks', { method: 'POST', body }),
  deleteWebhook: (id: string) => vercelApi(`/v1/webhooks/${id}`, { method: 'DELETE' }),
  listEdgeConfigs: () => vercelApi<any[]>('/v1/edge-config', { silent: [403] }),
  getEdgeConfigItems: (id: string) => vercelApi<any[]>(`/v1/edge-config/${id}/items`, { silent: [403, 404] }),
  pauseProject: (projectId: string) => vercelApi(`/v9/projects/${projectId}/pause`, { method: 'POST' }),
  unpauseProject: (projectId: string) => vercelApi(`/v9/projects/${projectId}/unpause`, { method: 'POST' }),
  listCustomEnvironments: (projectId: string) =>
    vercelApi<any[]>(`/v9/projects/${projectId}/custom-environments`, { silent: [403, 404] }),
  listRedirects: (projectId: string) =>
    vercelApi<any[]>(`/v9/projects/${projectId}/redirects`, { silent: [403, 404] }),
  domainCerts: (domain: string) => vercelApi<any[]>(`/v4/domains/${domain}/certs`, { silent: [403, 404] }),
  // Usage / analytics
  getUsage: (from?: number, to?: number) =>
    vercelApi<any>('/v1/integrations/billing/usage', { query: { from, to }, silent: [403, 404] }),
  getProjectAnalytics: (projectId: string, from: number, to: number) =>
    vercelApi<any>(`/v1/projects/${projectId}/analytics`, { query: { from, to }, silent: [403, 404] }),
};

// Open an SSE stream for build logs via the dedicated edge function.
export function openLogStream(
  deploymentId: string,
  onEvent: (event: VercelEvent) => void,
  onError?: (err: Event) => void,
): () => void {
  const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/vercel-logs-stream?id=${encodeURIComponent(deploymentId)}`;
  const es = new EventSource(url);
  es.onmessage = (ev) => {
    if (!ev.data) return;
    try {
      const parsed = JSON.parse(ev.data) as VercelEvent;
      onEvent(parsed);
    } catch {
      // ignore malformed
    }
  };
  es.onerror = (err) => {
    if (onError) onError(err);
    es.close();
  };
  return () => es.close();
}

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
