import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALLOWED = [
  /^\/user$/,
  /^\/user\/repos(\?.*)?$/,
  /^\/user\/orgs$/,
  /^\/orgs\/[^/]+\/repos(\?.*)?$/,
  /^\/repos\/[^/]+\/[^/]+$/,
  /^\/repos\/[^/]+\/[^/]+\/branches(\?.*)?$/,
  /^\/repos\/[^/]+\/[^/]+\/contents\/.*$/,
  /^\/repos\/[^/]+\/[^/]+\/git\/trees\/[^/]+(\?.*)?$/,
  /^\/repos\/[^/]+\/[^/]+\/commits(\/[^/]+)?(\?.*)?$/,
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

    const { path, method = 'GET', query, body: payload } = await req.json();
    if (typeof path !== 'string' || !path.startsWith('/')) return json({ error: 'Invalid path' }, 400);
    if (!ALLOWED.some((re) => re.test(path))) return json({ error: 'Path not allowed' }, 403);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: conn } = await admin
      .from('connected_accounts')
      .select('access_token')
      .eq('user_id', user.id)
      .eq('provider', 'github')
      .maybeSingle();
    if (!conn) return json({ error: 'GitHub not connected' }, 412);

    const url = new URL(`https://api.github.com${path}`);
    if (query && typeof query === 'object') {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      }
    }

    const r = await fetch(url.toString(), {
      method,
      headers: {
        Authorization: `Bearer ${conn.access_token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
        'User-Agent': 'OnNebula',
      },
      body: payload && method !== 'GET' ? JSON.stringify(payload) : undefined,
    });
    const text = await r.text();
    let data: unknown;
    try { data = JSON.parse(text); } catch { data = text; }
    if (r.status === 401) {
      return json({ status: 401, error: 'GitHub token expired or revoked', needsReauth: true, data }, 200);
    }
    return json({ status: r.status, data }, 200);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
