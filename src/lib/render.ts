import { supabase } from '@/integrations/supabase/client';

export type RenderServiceType =
  | 'web_service'
  | 'static_site'
  | 'private_service'
  | 'background_worker'
  | 'cron_job';

export interface RenderService {
  id: string;
  name: string;
  type: RenderServiceType;
  repo?: string;
  branch?: string;
  autoDeploy?: 'yes' | 'no';
  suspended?: 'suspended' | 'not_suspended';
  rootDir?: string;
  createdAt?: string;
  updatedAt?: string;
  serviceDetails?: {
    url?: string;
    env?: string;
    plan?: string;
    region?: string;
    buildCommand?: string;
    startCommand?: string;
    publishPath?: string;
    healthCheckPath?: string;
    numInstances?: number;
    schedule?: string;
    pullRequestPreviewsEnabled?: string;
  };
}

export interface RenderDeploy {
  id: string;
  status: string; // created, build_in_progress, update_in_progress, live, deactivated, build_failed, update_failed, canceled, pre_deploy_in_progress, pre_deploy_failed
  commit?: { id: string; message: string; createdAt: string };
  trigger?: { firstBuild?: boolean; manual?: boolean; newCommit?: boolean; user?: { id: string; email: string } };
  createdAt: string;
  updatedAt?: string;
  finishedAt?: string;
}

export interface RenderEnvVar { key: string; value: string }

export interface RenderPostgres {
  id: string;
  name: string;
  databaseName?: string;
  databaseUser?: string;
  plan?: string;
  region?: string;
  version?: string;
  status?: string;
  suspended?: string;
  createdAt?: string;
  ipAllowList?: Array<{ cidrBlock: string; description?: string }>;
}

export interface RenderKeyValue {
  id: string;
  name: string;
  plan?: string;
  region?: string;
  status?: string;
  suspended?: string;
  createdAt?: string;
}

export interface RenderCustomDomain {
  id: string;
  name: string;
  domainType?: 'apex' | 'subdomain';
  publicSuffix?: string;
  redirectForName?: string;
  verificationStatus?: 'verified' | 'unverified';
  createdAt?: string;
}

export interface RenderLogEntry {
  id?: string;
  timestamp: string;
  message: string;
  level?: string;
  labels?: Array<{ name: string; value: string }>;
}

export interface RenderMetricSample { time: string; value: number }

interface ApiOpts {
  method?: string;
  query?: Record<string, any>;
  body?: any;
  silent?: number[];
}

export async function renderApi<T = any>(path: string, opts: ApiOpts = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke('render-api', {
    body: { path, method: opts.method || 'GET', query: opts.query, body: opts.body },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error));
  if (data?.status >= 400) {
    if (opts.silent?.includes(data.status)) return undefined as any;
    const msg = typeof data.data === 'object' ? data.data?.message || JSON.stringify(data.data) : data.data;
    throw new Error(`Render ${data.status}: ${msg}`);
  }
  return data.data as T;
}

// Render list endpoints often return arrays of { <kind>: {...}, cursor }
function unwrap<T>(arr: any[], key: string): T[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((x) => (x?.[key] ?? x)) as T[];
}

export const render = {
  // Services
  listServices: async (params: { type?: RenderServiceType; limit?: number } = {}) => {
    const arr = await renderApi<any[]>('/v1/services', { query: { limit: params.limit ?? 100, type: params.type } });
    return unwrap<RenderService>(arr, 'service');
  },
  getService: (id: string) => renderApi<RenderService>(`/v1/services/${id}`, { silent: [404] }),
  updateService: (id: string, body: Record<string, unknown>) =>
    renderApi<RenderService>(`/v1/services/${id}`, { method: 'PATCH', body }),
  deleteService: (id: string) => renderApi(`/v1/services/${id}`, { method: 'DELETE' }),
  suspendService: (id: string) => renderApi(`/v1/services/${id}/suspend`, { method: 'POST' }),
  resumeService: (id: string) => renderApi(`/v1/services/${id}/resume`, { method: 'POST' }),
  restartService: (id: string) => renderApi(`/v1/services/${id}/restart`, { method: 'POST' }),
  scaleService: (id: string, numInstances: number) =>
    renderApi(`/v1/services/${id}/scale`, { method: 'POST', body: { numInstances } }),

  // Deploys
  listDeploys: async (serviceId: string, limit = 30) => {
    const arr = await renderApi<any[]>(`/v1/services/${serviceId}/deploys`, { query: { limit } });
    return unwrap<RenderDeploy>(arr, 'deploy');
  },
  getDeploy: (serviceId: string, deployId: string) =>
    renderApi<RenderDeploy>(`/v1/services/${serviceId}/deploys/${deployId}`, { silent: [404] }),
  triggerDeploy: (serviceId: string, clearCache = false) =>
    renderApi<RenderDeploy>(`/v1/services/${serviceId}/deploys`, {
      method: 'POST',
      body: { clearCache: clearCache ? 'clear' : 'do_not_clear' },
    }),
  cancelDeploy: (serviceId: string, deployId: string) =>
    renderApi(`/v1/services/${serviceId}/deploys/${deployId}/cancel`, { method: 'POST' }),

  // Env vars
  listEnv: async (serviceId: string) => {
    const arr = await renderApi<any[]>(`/v1/services/${serviceId}/env-vars`, { query: { limit: 100 } });
    return unwrap<RenderEnvVar>(arr, 'envVar');
  },
  setEnv: (serviceId: string, vars: RenderEnvVar[]) =>
    renderApi(`/v1/services/${serviceId}/env-vars`, { method: 'PUT', body: vars }),
  deleteEnv: (serviceId: string, key: string) =>
    renderApi(`/v1/services/${serviceId}/env-vars/${encodeURIComponent(key)}`, { method: 'DELETE' }),

  // Custom domains
  listDomains: async (serviceId: string) => {
    const arr = await renderApi<any[]>(`/v1/services/${serviceId}/custom-domains`, { query: { limit: 50 } });
    return unwrap<RenderCustomDomain>(arr, 'customDomain');
  },
  addDomain: (serviceId: string, name: string) =>
    renderApi<RenderCustomDomain>(`/v1/services/${serviceId}/custom-domains`, { method: 'POST', body: { name } }),
  verifyDomain: (serviceId: string, domainId: string) =>
    renderApi(`/v1/services/${serviceId}/custom-domains/${domainId}/verify`, { method: 'POST' }),
  removeDomain: (serviceId: string, domainId: string) =>
    renderApi(`/v1/services/${serviceId}/custom-domains/${domainId}`, { method: 'DELETE' }),

  // Events
  listEvents: (serviceId: string, limit = 50) =>
    renderApi<any[]>(`/v1/services/${serviceId}/events`, { query: { limit } }).then((arr) => unwrap<any>(arr, 'event')),

  // Postgres
  listPostgres: async () => {
    const arr = await renderApi<any[]>('/v1/postgres', { query: { limit: 100 } });
    return unwrap<RenderPostgres>(arr, 'postgres');
  },
  getPostgres: (id: string) => renderApi<RenderPostgres>(`/v1/postgres/${id}`, { silent: [404] }),
  getPostgresConnectionInfo: (id: string) =>
    renderApi<{ externalConnectionString: string; internalConnectionString: string; psqlCommand: string }>(`/v1/postgres/${id}/connection-info`),
  listPostgresBackups: (id: string) => renderApi<any[]>(`/v1/postgres/${id}/backups`),
  suspendPostgres: (id: string) => renderApi(`/v1/postgres/${id}/suspend`, { method: 'POST' }),
  resumePostgres: (id: string) => renderApi(`/v1/postgres/${id}/resume`, { method: 'POST' }),

  // Key Value
  listKeyValue: async () => {
    const arr = await renderApi<any[]>('/v1/key-value', { query: { limit: 100 } });
    return unwrap<RenderKeyValue>(arr, 'keyValue');
  },
  getKeyValue: (id: string) => renderApi<RenderKeyValue>(`/v1/key-value/${id}`, { silent: [404] }),
  getKeyValueConnectionInfo: (id: string) =>
    renderApi<{ externalConnectionString: string; internalConnectionString: string }>(`/v1/key-value/${id}/connection-info`),

  // Metrics
  metrics: (metric: string, resource: string, startTime?: string, endTime?: string, resolutionSeconds = 300) =>
    renderApi<{ unit: string; values: RenderMetricSample[] } | RenderMetricSample[]>(`/v1/metrics/${metric}`, {
      query: { resource, startTime, endTime, resolutionSeconds },
      silent: [400, 403, 404],
    }),

  // Logs (one-shot)
  listLogs: (resource: string, type: 'app' | 'build' | 'request' = 'app', limit = 100) =>
    renderApi<any>('/v1/logs', { query: { resource, type, limit, direction: 'backward' } }),

  // Notifications
  getNotifications: () => renderApi<any>('/v1/notification-settings'),
  setNotifications: (body: Record<string, unknown>) =>
    renderApi('/v1/notification-settings', { method: 'PATCH', body }),
};

// SSE log stream
export function openRenderLogStream(
  resource: string,
  type: 'app' | 'build' | 'request',
  onEvent: (entry: RenderLogEntry) => void,
  onError?: (err: Event) => void,
): () => void {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const url = `https://${projectId}.supabase.co/functions/v1/render-logs-stream?resource=${encodeURIComponent(resource)}&type=${type}`;
  const es = new EventSource(url);
  es.onmessage = (ev) => {
    if (!ev.data) return;
    try { onEvent(JSON.parse(ev.data) as RenderLogEntry); } catch { /* ignore */ }
  };
  es.onerror = (err) => {
    if (onError) onError(err);
  };
  return () => es.close();
}

// Orchestration
export interface CreateServiceInput {
  type: RenderServiceType | 'postgres' | 'key_value';
  name: string;
  repo?: string;
  branch?: string;
  region?: string;
  plan?: string;
  env?: 'node' | 'static' | 'docker' | 'python' | 'ruby' | 'go' | 'rust' | 'elixir';
  buildCommand?: string;
  startCommand?: string;
  publishPath?: string;
  rootDir?: string;
  schedule?: string;
  autoDeploy?: 'yes' | 'no';
  envVars?: { key: string; value: string }[];
  databaseName?: string;
  databaseUser?: string;
  version?: string;
}

export async function createServiceAndDeploy(input: CreateServiceInput) {
  const { data, error } = await supabase.functions.invoke('render-deploy', { body: input });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error));
  return data as { service_id: string; service_name: string; deploy_id: string | null; service_url: string | null };
}

export const RENDER_REGIONS = [
  { id: 'oregon', label: 'Oregon (US West)' },
  { id: 'ohio', label: 'Ohio (US East)' },
  { id: 'virginia', label: 'Virginia (US East)' },
  { id: 'frankfurt', label: 'Frankfurt (EU)' },
  { id: 'singapore', label: 'Singapore (APAC)' },
];

export const RENDER_PLANS = [
  { id: 'free', label: 'Free' },
  { id: 'starter', label: 'Starter' },
  { id: 'standard', label: 'Standard' },
  { id: 'pro', label: 'Pro' },
  { id: 'pro_plus', label: 'Pro Plus' },
];
