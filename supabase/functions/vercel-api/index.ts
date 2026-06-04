import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Allowlist — paths only, query strings stripped before matching
const ALLOWED = [
  /^\/v2\/user$/,
  /^\/v2\/teams$/,
  /^\/v9\/projects$/,                       // GET list, POST create
  /^\/v9\/projects\/[^/]+$/,                // GET, PATCH, DELETE single
  /^\/v6\/deployments$/,                    // GET list
  /^\/v13\/deployments$/,                   // POST create
  /^\/v13\/deployments\/[^/]+$/,            // GET single
  /^\/v12\/deployments\/[^/]+\/cancel$/,
  /^\/v9\/projects\/[^/]+\/promote\/[^/]+$/,
  /^\/v2\/deployments\/[^/]+\/events$/,
  /^\/v3\/deployments\/[^/]+\/events$/,
  /^\/v9\/projects\/[^/]+\/domains(\/[^/]+)?$/,
  /^\/v9\/projects\/[^/]+\/env(\/[^/]+)?$/,
];

const VERCEL_MODE = (Deno.env.get('VERCEL_MODE') ?? 'admin') as 'admin' | 'oauth';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization');
    if (!auth) return json({ error: 'Unauthorized' }, 401);

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: auth } } }
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const { path, method = 'GET', query, body: payload } = await req.json();
    if (typeof path !== 'string' || !path.startsWith('/')) return json({ error: 'Invalid path' }, 400);
    const pathOnly = path.split('?')[0];
    if (!ALLOWED.some((re) => re.test(pathOnly))) return json({ error: 'Path not allowed', path: pathOnly }, 403);

    let token: string | undefined;
    let teamId: string | undefined;

    if (VERCEL_MODE === 'admin') {
      token = Deno.env.get('VERCEL_ADMIN_TOKEN') || undefined;
      teamId = Deno.env.get('VERCEL_ADMIN_TEAM_ID') || undefined;
      if (!token) return json({ error: 'VERCEL_ADMIN_TOKEN not set on server' }, 500);
    } else {
      // Legacy OAuth path — kept for later reactivation
      const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      const { data: conn } = await admin
        .from('connected_accounts')
        .select('access_token, metadata')
        .eq('user_id', user.id)
        .eq('provider', 'vercel')
        .maybeSingle();
      if (!conn) return json({ error: 'Vercel not connected' }, 412);
      token = conn.access_token;
      teamId = (conn.metadata?.team_id || conn.metadata?.teamId) as string | undefined;
    }

    const url = new URL(`https://api.vercel.com${path}`);
    if (query && typeof query === 'object') {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      }
    }
    if (teamId && !url.searchParams.has('teamId')) url.searchParams.set('teamId', teamId);

    const r = await fetch(url.toString(), {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
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
