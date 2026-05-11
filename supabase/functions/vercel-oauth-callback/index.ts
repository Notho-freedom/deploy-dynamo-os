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

    const clientId = Deno.env.get('VERCEL_CLIENT_ID')!;
    const clientSecret = Deno.env.get('VERCEL_CLIENT_SECRET')!;

    const form = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri,
    });
    const r = await fetch('https://api.vercel.com/v2/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
    const tok = await r.json();
    if (!r.ok) return json({ error: 'Vercel token exchange failed', detail: tok }, 400);

    // tok: { access_token, token_type, installation_id, user_id, team_id }
    const teamId = tok.team_id || null;
    // Fetch user info
    const meUrl = teamId
      ? `https://api.vercel.com/v2/user?teamId=${teamId}`
      : 'https://api.vercel.com/v2/user';
    const meRes = await fetch(meUrl, { headers: { Authorization: `Bearer ${tok.access_token}` } });
    const me = await meRes.json();

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    await admin.from('connected_accounts').upsert(
      {
        user_id: user.id,
        provider: 'vercel',
        access_token: tok.access_token,
        scopes: ['integration'],
        metadata: {
          installation_id: tok.installation_id,
          team_id: teamId,
          teamId, // backward compat with existing vercel-api
          user_id: tok.user_id,
          username: me.user?.username || me.username,
          email: me.user?.email || me.email,
          install_type: teamId ? 'team' : 'user',
        },
      },
      { onConflict: 'user_id,provider' }
    );

    return json({ ok: true, team_id: teamId, username: me.user?.username || me.username });
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
