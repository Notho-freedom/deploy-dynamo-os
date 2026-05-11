import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Proxy Zoho Mail Admin API. Auto-refreshes access_token using refresh_token.
async function getAccessToken() {
  const refresh = Deno.env.get('ZOHO_REFRESH_TOKEN');
  const clientId = Deno.env.get('ZOHO_CLIENT_ID');
  const clientSecret = Deno.env.get('ZOHO_CLIENT_SECRET');
  if (!refresh || !clientId || !clientSecret) throw new Error('Zoho credentials not configured');
  const params = new URLSearchParams({
    refresh_token: refresh,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
  });
  const r = await fetch(`https://accounts.zoho.com/oauth/v2/token?${params}`, { method: 'POST' });
  const j = await r.json();
  if (!r.ok || !j.access_token) throw new Error('Zoho token refresh failed: ' + JSON.stringify(j));
  return j.access_token as string;
}

const ALLOWED = [
  /^\/api\/organization\/[^/]+\/accounts$/,
  /^\/api\/organization\/[^/]+\/accounts\/[^/]+$/,
  /^\/api\/organization\/[^/]+\/domains$/,
  /^\/api\/organization\/[^/]+\/users$/,
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

    const orgId = Deno.env.get('ZOHO_ORG_ID');
    if (!orgId) return json({ error: 'ZOHO_ORG_ID not configured' }, 412);

    const { path, method = 'GET', body: payload } = await req.json();
    let resolved = path as string;
    if (typeof resolved !== 'string') return json({ error: 'Invalid path' }, 400);
    resolved = resolved.replace('{org}', orgId);
    if (!ALLOWED.some((re) => re.test(resolved))) return json({ error: 'Path not allowed' }, 403);

    const access = await getAccessToken();
    const r = await fetch(`https://mail.zoho.com${resolved}`, {
      method,
      headers: { Authorization: `Zoho-oauthtoken ${access}`, 'Content-Type': 'application/json' },
      body: payload && method !== 'GET' ? JSON.stringify(payload) : undefined,
    });
    const text = await r.text();
    let data: unknown; try { data = JSON.parse(text); } catch { data = text; }
    return json({ status: r.status, data }, 200);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
