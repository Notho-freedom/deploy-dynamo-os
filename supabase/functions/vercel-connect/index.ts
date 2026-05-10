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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: auth } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const { token, teamId } = await req.json();
    if (!token || typeof token !== 'string' || token.length < 10) {
      return json({ error: 'Invalid token' }, 400);
    }

    // Verify token by calling Vercel API
    const url = teamId
      ? `https://api.vercel.com/v2/user?teamId=${teamId}`
      : 'https://api.vercel.com/v2/user';
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) {
      const t = await r.text();
      return json({ error: `Vercel rejected token: ${r.status}`, detail: t }, 400);
    }
    const userInfo = await r.json();

    // Store with service role so we bypass RLS update vs insert race
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    await admin.from('connected_accounts').upsert(
      {
        user_id: user.id,
        provider: 'vercel',
        access_token: token,
        scopes: ['full'],
        metadata: {
          username: userInfo.user?.username || userInfo.username,
          email: userInfo.user?.email || userInfo.email,
          teamId: teamId || null,
        },
      },
      { onConflict: 'user_id,provider' }
    );

    return json({ ok: true, user: userInfo.user || userInfo });
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
