import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Allowlist of Cloudflare endpoints we proxy
const ALLOWED = [
  /^\/zones(\?.*)?$/,
  /^\/zones\/[^/]+$/,
  /^\/zones\/[^/]+\/dns_records(\?.*)?$/,
  /^\/zones\/[^/]+\/dns_records\/[^/]+$/,
  /^\/user\/tokens\/verify$/,
  /^\/accounts\/[^/]+\/tokens\/verify$/,
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
    const pathOnly = path.split('?')[0];
    if (!ALLOWED.some((re) => re.test(pathOnly))) return json({ error: 'Path not allowed' }, 403);

    const token = Deno.env.get('CLOUDFLARE_API_TOKEN');
    if (!token) return json({ error: 'Cloudflare token not configured' }, 412);

    const url = new URL(`https://api.cloudflare.com/client/v4${path}`);
    if (query && typeof query === 'object') {
      for (const [k, v] of Object.entries(query)) if (v != null) url.searchParams.set(k, String(v));
    }
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
