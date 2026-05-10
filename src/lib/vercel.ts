import { supabase } from '@/integrations/supabase/client';

export interface VercelProject {
  id: string;
  name: string;
  framework: string | null;
  updatedAt: number;
  link?: { type: string; repo?: string; org?: string };
  targets?: { production?: { url?: string } };
}

export interface VercelDeployment {
  uid: string;
  name: string;
  url: string;
  state: 'BUILDING' | 'READY' | 'ERROR' | 'CANCELED' | 'QUEUED' | 'INITIALIZING';
  target?: 'production' | 'preview' | null;
  created: number;
  ready?: number;
  meta?: { githubCommitMessage?: string; githubCommitRef?: string };
  creator?: { username?: string };
}

export async function vercelConnect(token: string, teamId?: string) {
  const { data, error } = await supabase.functions.invoke('vercel-connect', {
    body: { token, teamId },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function vercelApi<T = any>(path: string, opts: {
  method?: string;
  query?: Record<string, any>;
  body?: any;
} = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke('vercel-api', {
    body: { path, method: opts.method || 'GET', query: opts.query, body: opts.body },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  if (data?.status >= 400) throw new Error(`Vercel ${data.status}`);
  return data.data as T;
}

export const vercel = {
  listProjects: () => vercelApi<{ projects: VercelProject[] }>('/v9/projects', { query: { limit: 50 } }),
  listDeployments: (projectId?: string) =>
    vercelApi<{ deployments: VercelDeployment[] }>('/v6/deployments', {
      query: { limit: 30, ...(projectId ? { projectId } : {}) },
    }),
  getDeployment: (id: string) => vercelApi<VercelDeployment>(`/v13/deployments/${id}`),
  cancelDeployment: (id: string) =>
    vercelApi(`/v12/deployments/${id}/cancel`, { method: 'PATCH' }),
  promoteDeployment: (projectId: string, deploymentId: string) =>
    vercelApi(`/v9/projects/${projectId}/promote/${deploymentId}`, { method: 'POST' }),
  listDomains: (projectId: string) =>
    vercelApi(`/v9/projects/${projectId}/domains`),
  listEnv: (projectId: string) =>
    vercelApi(`/v9/projects/${projectId}/env`),
};
