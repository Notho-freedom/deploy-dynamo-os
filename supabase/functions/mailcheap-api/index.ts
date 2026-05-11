import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALLOWED = [
  /^\/domains$/,
  /^\/domains\/[^/]+$/,
  /^\/domains\/[^/]+\/mailboxes$/,
  /^\/domains\/[^/]+\/mailboxes\/[^/]+$/,
  /^\/domains\/[^/]+\/aliases$/,
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

    const apiKey = Deno.env.get('MAILCHEAP_API_KEY');
    if (!apiKey) return json({ error: 'Mailcheap API key not configured' }, 412);

    const { path, method = 'GET', body: payload } = await req.json();
    if (typeof path !== 'string' || !path.startsWith('/')) return json({ error: 'Invalid path' }, 400);
    if (!ALLOWED.some((re) => re.test(path))) return json({ error: 'Path not allowed' }, 403);

    const r = await fetch(`https://api.mailcheap.co/v1${path}`, {
      method,
      headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' },
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
