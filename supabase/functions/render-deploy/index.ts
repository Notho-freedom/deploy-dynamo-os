// Orchestrates: create Render service + first deploy + record in user_backend_services.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

// Render Postgres plans differ from Web-Service plans. Map generic → valid.
const PG_PLAN_ALIAS: Record<string, string> = {
  free: 'free',
  starter: 'basic_256mb',
  standard: 'basic_1gb',
  pro: 'pro_4gb',
  pro_plus: 'pro_8gb',
};
const KV_PLAN_ALIAS: Record<string, string> = {
  free: 'free',
  starter: 'starter',
  standard: 'standard',
  pro: 'pro',
  pro_plus: 'pro_plus',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization');
    if (!auth) return json({ error: 'Unauthorized' }, 401);

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const token = Deno.env.get('RENDER_API_KEY');
    if (!token) return json({ error: 'RENDER_API_KEY not configured on server' }, 200);
    const ownerId = Deno.env.get('RENDER_OWNER_ID');
    if (!ownerId) return json({ error: 'RENDER_OWNER_ID not configured on server' }, 200);

    let body: any = {};
    try { body = await req.json(); } catch { return json({ error: 'Invalid JSON body' }, 200); }
    const {
      type,
      name,
      repo,
      branch = 'main',
      region = 'oregon',
      plan = 'starter',
      env = 'node',
      buildCommand,
      startCommand,
      publishPath,
      rootDir,
      schedule,
      autoDeploy = 'yes',
      envVars = [],
      databaseName,
      databaseUser,
      version,
    } = body || {};

    if (!type) return json({ error: 'Missing type' }, 200);
    if (!name) return json({ error: 'Missing name' }, 200);

    const SERVICE_TYPES = ['web_service', 'static_site', 'private_service', 'background_worker', 'cron_job'];
    if (![...SERVICE_TYPES, 'postgres', 'key_value'].includes(type)) {
      return json({ error: `Invalid type: ${type}` }, 200);
    }
    if (SERVICE_TYPES.includes(type) && !repo) {
      return json({ error: `Repo URL required for type ${type}` }, 200);
    }
    if (type === 'cron_job' && !schedule) {
      return json({ error: 'schedule required for cron_job' }, 200);
    }

    const cleanEnvVars = (Array.isArray(envVars) ? envVars : [])
      .filter((e: any) => e && typeof e.key === 'string' && e.key.trim().length > 0)
      .map((e: any) => ({ key: e.key.trim(), value: String(e.value ?? '') }));

    const userSlug = user.id.split('-')[0];
    const fullName = slugify(`${userSlug}-${name}`);
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' };

    let createdId = '';
    let createdName = fullName;
    let serviceUrl: string | null = null;
    let deployId: string | null = null;

    async function callRender(path: string, payload: unknown) {
      const r = await fetch(`https://api.render.com${path}`, {
        method: 'POST', headers, body: JSON.stringify(payload),
      });
      const text = await r.text();
      let data: any;
      try { data = JSON.parse(text); } catch { data = text; }
      if (!r.ok) console.error('render-deploy: render api error', r.status, path, JSON.stringify(data).slice(0, 500));
      return { ok: r.ok, status: r.status, data };
    }

    if (type === 'postgres') {
      const res = await callRender('/v1/postgres', {
        ownerId,
        name: fullName,
        databaseName: databaseName || fullName.replace(/-/g, '_'),
        databaseUser: databaseUser || 'app',
        plan: PG_PLAN_ALIAS[plan] || plan,
        region,
        version: version || '16',
      });
      if (!res.ok) return json({ error: res.data?.message || 'Failed to create postgres', detail: res.data, status: res.status }, 200);
      createdId = res.data.id;
      createdName = res.data.name;
    } else if (type === 'key_value') {
      const res = await callRender('/v1/key-value', {
        ownerId, name: fullName,
        plan: KV_PLAN_ALIAS[plan] || plan,
        region, maxmemoryPolicy: 'allkeys-lru',
      });
      if (!res.ok) return json({ error: res.data?.message || 'Failed to create key-value', detail: res.data, status: res.status }, 200);
      createdId = res.data.id;
      createdName = res.data.name;
    } else {
      const serviceDetails: Record<string, unknown> = { env, plan, region };
      if (buildCommand !== undefined) serviceDetails.buildCommand = buildCommand;
      if (type === 'web_service' || type === 'private_service' || type === 'background_worker' || type === 'cron_job') {
        if (startCommand) serviceDetails.startCommand = startCommand;
      }
      if (type === 'static_site' && publishPath) serviceDetails.publishPath = publishPath;
      if (type === 'cron_job' && schedule) serviceDetails.schedule = schedule;

      const payload: Record<string, unknown> = {
        type, name: fullName, ownerId, autoDeploy, branch,
        repo, serviceDetails,
        ...(rootDir ? { rootDir } : {}),
        ...(cleanEnvVars.length ? { envVars: cleanEnvVars } : {}),
      };

      const res = await callRender('/v1/services', payload);
      if (!res.ok) return json({ error: res.data?.message || 'Failed to create service', detail: res.data, status: res.status }, 200);
      const svc = res.data.service || res.data;
      createdId = svc.id;
      createdName = svc.name;
      serviceUrl = svc.serviceDetails?.url || null;
      deployId = res.data.deployId || null;

      if (!deployId && createdId) {
        try {
          const dr = await fetch(`https://api.render.com/v1/services/${createdId}/deploys?limit=1`, { headers });
          const dd = await dr.json();
          if (Array.isArray(dd) && dd[0]) deployId = dd[0].deploy?.id || dd[0].id || null;
        } catch { /* ignore */ }
      }
    }

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { error: dbErr } = await admin.from('user_backend_services').upsert({
      user_id: user.id,
      render_service_id: createdId,
      render_service_name: createdName,
      kind: type,
      github_repo_full_name: repo ? repo.replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '') : null,
      branch: (type === 'postgres' || type === 'key_value') ? null : branch,
      region,
      plan,
      service_url: serviceUrl,
    }, { onConflict: 'render_service_id' });
    if (dbErr) console.error('render-deploy: db upsert failed', dbErr.message);

    return json({ service_id: createdId, service_name: createdName, deploy_id: deployId, service_url: serviceUrl });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('render-deploy: unhandled', msg);
    return json({ error: msg }, 200);
  }
});
