import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Allowlist of Vercel API paths — defense in depth so users can't proxy arbitrary URLs.
const ALLOWED = [
  /^\/v2\/user$/,
  /^\/v2\/teams\/?$/,
  /^\/v9\/projects\/?(\?.*)?$/,
  /^\/v9\/projects\/[^/]+$/,
  /^\/v6\/deployments\/?(\?.*)?$/,
  /^\/v13\/deployments(\/[^/]+)?$/,
  /^\/v12\/deployments\/[^/]+\/cancel$/,
  /^\/v9\/projects\/[^/]+\/promote\/[^/]+$/,
  /^\/v2\/deployments\/[^/]+\/events(\?.*)?$/,
  /^\/v9\/projects\/[^/]+\/domains(\/[^/]+)?$/,
  /^\/v9\/projects\/[^/]+\/env(\/[^/]+)?(\?.*)?$/,
];

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

    const body = await req.json();
    const { path, method = 'GET', query, body: payload } = body;
    if (typeof path !== 'string' || !path.startsWith('/')) {
      return json({ error: 'Invalid path' }, 400);
    }
    if (!ALLOWED.some((re) => re.test(path))) {
      return json({ error: 'Path not allowed' }, 403);
    }

    // Get user token via service role
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const { data: conn } = await admin
      .from('connected_accounts')
      .select('access_token, metadata')
      .eq('user_id', user.id)
      .eq('provider', 'vercel')
      .maybeSingle();
    if (!conn) return json({ error: 'Vercel not connected' }, 412);

    const teamId = conn.metadata?.teamId as string | undefined;
    const url = new URL(`https://api.vercel.com${path}`);
    if (query && typeof query === 'object') {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      }
    }
    if (teamId && !url.searchParams.has('teamId')) url.searchParams.set('teamId', teamId);

    const r = await fetch(url.toString(), {
      method,
      headers: {
        Authorization: `Bearer ${conn.access_token}`,
        'Content-Type': 'application/json',
      },
      body: payload && method !== 'GET' ? JSON.stringify(payload) : undefined,
    });
    const text = await r.text();
    let data: unknown;
    try { data = JSON.parse(text); } catch { data = text; }
    return json({ status: r.status, data }, r.ok ? 200 : r.status >= 500 ? 502 : 200);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
