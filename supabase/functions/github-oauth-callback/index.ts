import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { code, redirect_uri } = await req.json();
    if (!code) return json({ error: 'Missing code' }, 400);

    const clientId = Deno.env.get('GITHUB_CLIENT_ID')!;
    const clientSecret = Deno.env.get('GITHUB_CLIENT_SECRET')!;

    const r = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code, redirect_uri }),
    });
    const tok = await r.json();
    if (!r.ok || tok.error) return json({ error: tok.error_description || 'GitHub token exchange failed', detail: tok }, 400);

    const meRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${tok.access_token}`, Accept: 'application/vnd.github+json' },
    });
    const me = await meRes.json();

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    await admin.from('connected_accounts').upsert(
      {
        user_id: user.id,
        provider: 'github',
        access_token: tok.access_token,
        scopes: (tok.scope || '').split(',').filter(Boolean),
        metadata: {
          login: me.login,
          id: me.id,
          avatar_url: me.avatar_url,
          name: me.name,
          username: me.login,
        },
      },
      { onConflict: 'user_id,provider' }
    );

    return json({ ok: true, login: me.login });
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
