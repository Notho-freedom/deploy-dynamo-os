// Render API proxy (admin-only). Mirrors vercel-api.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALLOWED = [
  /^\/v1\/owners(\/[^/]+)?$/,
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
  /^\/v1\/registrycredentials(\/[^/]+)?$/,
  /^\/v1\/blueprints(\/[^/]+)?$/,
  /^\/v1\/notification-settings$/,
  /^\/v1\/logs$/,
  /^\/v1\/metrics\/(cpu|memory|bandwidth|http-requests|http-latency|active-connections|instance-count|disk-bandwidth|disk-iops|disk-usage)$/,
];

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

    const { path, method = 'GET', query, body: payload } = await req.json();
    if (typeof path !== 'string' || !path.startsWith('/')) return json({ error: 'Invalid path' }, 400);
    const pathOnly = path.split('?')[0];
    if (!ALLOWED.some((re) => re.test(pathOnly))) return json({ error: 'Path not allowed', path: pathOnly }, 403);

    const token = Deno.env.get('RENDER_API_KEY');
    if (!token) return json({ error: 'RENDER_API_KEY not set on server' }, 500);
    const ownerId = Deno.env.get('RENDER_OWNER_ID') || undefined;

    const url = new URL(`https://api.render.com${path}`);
    if (query && typeof query === 'object') {
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === null) continue;
        if (Array.isArray(v)) for (const item of v) url.searchParams.append(k, String(item));
        else url.searchParams.set(k, String(v));
      }
    }
    if (ownerId && !url.searchParams.has('ownerId') && /^\/v1\/(services|postgres|key-value|blueprints|registrycredentials)(\?|$)/.test(path)) {
      url.searchParams.set('ownerId', ownerId);
    }

    const r = await fetch(url.toString(), {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: payload && method !== 'GET' ? JSON.stringify(payload) : undefined,
    });
    const text = await r.text();
    let data: unknown;
    try { data = JSON.parse(text); } catch { data = text; }
    return json({ status: r.status, data }, 200);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
