// Render API proxy — multi-tenant. One shared admin Render account; each user
// only sees & touches services recorded for them in public.user_backend_services.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALLOWED = [
  /^\/v1\/services$/,
  /^\/v1\/services\/[^/]+$/,
  /^\/v1\/services\/[^/]+\/deploys(\/[^/]+(\/cancel)?)?$/,
  /^\/v1\/services\/[^/]+\/env-vars(\/[^/]+)?$/,
  /^\/v1\/services\/[^/]+\/custom-domains(\/[^/]+(\/verify)?)?$/,
  /^\/v1\/services\/[^/]+\/scale$/,
  /^\/v1\/services\/[^/]+\/suspend$/,
  /^\/v1\/services\/[^/]+\/resume$/,
  /^\/v1\/services\/[^/]+\/restart$/,
  /^\/v1\/services\/[^/]+\/events$/,
  /^\/v1\/services\/[^/]+\/headers(\/[^/]+)?$/,
  /^\/v1\/services\/[^/]+\/routes(\/[^/]+)?$/,
  /^\/v1\/services\/[^/]+\/jobs(\/[^/]+)?$/,
  /^\/v1\/postgres$/,
  /^\/v1\/postgres\/[^/]+(\/(connection-info|suspend|resume|recovery|backups))?$/,
  /^\/v1\/key-value$/,
  /^\/v1\/key-value\/[^/]+(\/(connection-info|suspend|resume))?$/,
  /^\/v1\/notification-settings$/,
  /^\/v1\/logs$/,
  /^\/v1\/metrics\/[a-z0-9-]+$/,
];

const FORBIDDEN_DIRECT_CREATE = [
  { method: 'POST', re: /^\/v1\/services$/ },
  { method: 'POST', re: /^\/v1\/postgres$/ },
  { method: 'POST', re: /^\/v1\/key-value$/ },
];

interface OwnedSets {
  services: Set<string>;
  postgres: Set<string>;
  keyValue: Set<string>;
  all: Set<string>;
}

const ownershipCache = new Map<string, { at: number; sets: OwnedSets }>();
async function loadOwnership(userId: string, admin: ReturnType<typeof createClient>): Promise<OwnedSets> {
  const hit = ownershipCache.get(userId);
  if (hit && Date.now() - hit.at < 5000) return hit.sets;
  const { data } = await admin
    .from('user_backend_services')
    .select('render_service_id, kind')
    .eq('user_id', userId);
  const sets: OwnedSets = { services: new Set(), postgres: new Set(), keyValue: new Set(), all: new Set() };
  for (const row of data || []) {
    const id = (row as any).render_service_id as string;
    const kind = (row as any).kind as string;
    if (!id) continue;
    sets.all.add(id);
    if (kind === 'postgres') sets.postgres.add(id);
    else if (kind === 'key_value') sets.keyValue.add(id);
    else sets.services.add(id);
  }
  ownershipCache.set(userId, { at: Date.now(), sets });
  return sets;
}

function extractResourceId(path: string, query: Record<string, any> = {}): string | null {
  const svc = path.match(/^\/v1\/services\/([^/]+)/);
  if (svc) return svc[1];
  const pg = path.match(/^\/v1\/postgres\/([^/]+)/);
  if (pg) return pg[1];
  const kv = path.match(/^\/v1\/key-value\/([^/]+)/);
  if (kv) return kv[1];
  if (path === '/v1/logs' || /^\/v1\/metrics\//.test(path)) {
    return (query?.resource as string) || null;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization');
    if (!auth) return json({ error: 'Unauthorized' }, 401);

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { path, method = 'GET', query, body: payload } = await req.json();
    if (typeof path !== 'string' || !path.startsWith('/')) return json({ error: 'Invalid path' }, 400);
    const pathOnly = path.split('?')[0];
    if (!ALLOWED.some((re) => re.test(pathOnly))) return json({ error: 'Path not allowed', path: pathOnly }, 403);

    for (const rule of FORBIDDEN_DIRECT_CREATE) {
      if (rule.method === method && rule.re.test(pathOnly)) {
        return json({ error: 'Use render-deploy to create resources (ownership must be recorded).' }, 403);
      }
    }

    const token = Deno.env.get('RENDER_API_KEY');
    if (!token) return json({ error: 'RENDER_API_KEY not set on server' }, 500);
    const ownerId = Deno.env.get('RENDER_OWNER_ID') || undefined;

    const owned = await loadOwnership(user.id, admin);

    const url = new URL(`https://api.render.com${path}`);
    if (query && typeof query === 'object') {
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === null) continue;
        if (Array.isArray(v)) for (const item of v) url.searchParams.append(k, String(item));
        else url.searchParams.set(k, String(v));
      }
    }
    if (ownerId && !url.searchParams.has('ownerId') && /^\/v1\/(services|postgres|key-value)$/.test(pathOnly)) {
      url.searchParams.set('ownerId', ownerId);
    }

    if (method === 'GET' && pathOnly === '/v1/services') {
      if (owned.services.size === 0) return json({ status: 200, data: [] }, 200);
      url.searchParams.delete('id');
      for (const id of owned.services) url.searchParams.append('id', id);
    } else if (method === 'GET' && pathOnly === '/v1/postgres') {
      if (owned.postgres.size === 0) return json({ status: 200, data: [] }, 200);
      url.searchParams.delete('id');
      for (const id of owned.postgres) url.searchParams.append('id', id);
    } else if (method === 'GET' && pathOnly === '/v1/key-value') {
      if (owned.keyValue.size === 0) return json({ status: 200, data: [] }, 200);
      url.searchParams.delete('id');
      for (const id of owned.keyValue) url.searchParams.append('id', id);
    } else {
      const resId = extractResourceId(pathOnly, query || {});
      if (resId && !owned.all.has(resId)) {
        return json({ error: 'Forbidden: resource not owned by user', resource: resId }, 403);
      }
    }

    const r = await fetch(url.toString(), {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: payload && method !== 'GET' ? JSON.stringify(payload) : undefined,
    });
    const text = await r.text();
    let data: unknown;
    try { data = JSON.parse(text); } catch { data = text; }

    if (method === 'DELETE' && r.ok) {
      const sid = pathOnly.match(/^\/v1\/(?:services|postgres|key-value)\/([^/]+)$/)?.[1];
      if (sid) {
        await admin.from('user_backend_services').delete().eq('user_id', user.id).eq('render_service_id', sid);
        ownershipCache.delete(user.id);
      }
    }

    return json({ status: r.status, data }, 200);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
