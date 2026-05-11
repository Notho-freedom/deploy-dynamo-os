import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Porkbun uses POST to all endpoints with apikey + secretapikey in body.
// We support a small allowlist of operations for safety.
const ALLOWED_OPS = new Set([
  'ping',
  'pricing/get',
  'domain/checkDomain',
  'domain/listAll',
  'dns/retrieve',
  'dns/create',
  'dns/edit',
  'dns/delete',
  'ssl/retrieve',
]);

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

    const { op, params = {}, segments = [] } = await req.json();
    if (typeof op !== 'string' || !ALLOWED_OPS.has(op)) return json({ error: 'Operation not allowed' }, 403);

    const apikey = Deno.env.get('PORKBUN_API_KEY');
    const secretapikey = Deno.env.get('PORKBUN_SECRET_API_KEY');
    if (!apikey || !secretapikey) return json({ error: 'Porkbun credentials not configured' }, 412);

    const segPath = (segments as string[]).map((s) => encodeURIComponent(s)).join('/');
    const url = `https://api.porkbun.com/api/json/v3/${op}${segPath ? '/' + segPath : ''}`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apikey, secretapikey, ...params }),
    });
    const data = await r.json();
    return json({ status: r.status, data }, 200);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
