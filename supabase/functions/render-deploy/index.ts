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
    if (!token) return json({ error: 'RENDER_API_KEY not set' }, 500);
    const ownerId = Deno.env.get('RENDER_OWNER_ID');

    const body = await req.json();
    const {
      type, // web_service | static_site | private_service | background_worker | cron_job | postgres | key_value
      name,
      repo, // GitHub repo URL (full)
      branch = 'main',
      region = 'oregon',
      plan = 'starter',
      env = 'node',
      buildCommand,
      startCommand,
      publishPath,
      rootDir,
      schedule, // for cron
      autoDeploy = 'yes',
      envVars = [],
      databaseName,
      databaseUser,
      version, // postgres version
    } = body || {};

    if (!name) return json({ error: 'Missing name' }, 400);

    const userSlug = user.id.split('-')[0];
    const fullName = slugify(`${userSlug}-${name}`);
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' };

    let createdId = '';
    let createdName = fullName;
    let serviceUrl: string | null = null;
    let deployId: string | null = null;

    if (type === 'postgres') {
      const r = await fetch('https://api.render.com/v1/postgres', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ownerId,
          name: fullName,
          databaseName: databaseName || fullName.replace(/-/g, '_'),
          databaseUser: databaseUser || 'app',
          plan,
          region,
          version: version || '16',
        }),
      });
      const data = await r.json();
      if (!r.ok) return json({ error: 'Failed to create postgres', detail: data }, 500);
      createdId = data.id;
      createdName = data.name;
    } else if (type === 'key_value') {
      const r = await fetch('https://api.render.com/v1/key-value', {
        method: 'POST',
        headers,
        body: JSON.stringify({ ownerId, name: fullName, plan, region, maxmemoryPolicy: 'allkeys-lru' }),
      });
      const data = await r.json();
      if (!r.ok) return json({ error: 'Failed to create key-value', detail: data }, 500);
      createdId = data.id;
      createdName = data.name;
    } else {
      // Service types
      const apiType =
        type === 'web_service' ? 'web_service' :
        type === 'static_site' ? 'static_site' :
        type === 'private_service' ? 'private_service' :
        type === 'background_worker' ? 'background_worker' :
        type === 'cron_job' ? 'cron_job' : null;
      if (!apiType) return json({ error: `Invalid type: ${type}` }, 400);

      const serviceDetails: Record<string, unknown> = {
        env,
        plan,
        region,
        ...(buildCommand !== undefined ? { buildCommand } : {}),
      };
      if (apiType === 'web_service' || apiType === 'private_service' || apiType === 'background_worker') {
        if (startCommand) serviceDetails.startCommand = startCommand;
      }
      if (apiType === 'static_site') {
        if (publishPath) serviceDetails.publishPath = publishPath;
      }
      if (apiType === 'cron_job') {
        if (startCommand) serviceDetails.startCommand = startCommand;
        if (schedule) serviceDetails.schedule = schedule;
      }

      const payload: Record<string, unknown> = {
        type: apiType,
        name: fullName,
        ownerId,
        autoDeploy,
        branch,
        serviceDetails,
        ...(repo ? { repo } : {}),
        ...(rootDir ? { rootDir } : {}),
        ...(envVars.length ? { envVars: envVars.filter((e: any) => e.key).map((e: any) => ({ key: e.key, value: String(e.value ?? '') })) } : {}),
      };

      const r = await fetch('https://api.render.com/v1/services', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok) return json({ error: 'Failed to create service', detail: data }, 500);
      const svc = data.service || data;
      createdId = svc.id;
      createdName = svc.name;
      serviceUrl = svc.serviceDetails?.url || null;
      deployId = data.deployId || null;

      // Fetch latest deploy if not in response
      if (!deployId && createdId) {
        try {
          const dr = await fetch(`https://api.render.com/v1/services/${createdId}/deploys?limit=1`, { headers });
          const dd = await dr.json();
          if (Array.isArray(dd) && dd[0]) deployId = dd[0].deploy?.id || dd[0].id || null;
        } catch { /* ignore */ }
      }
    }

    // Record in DB
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    await admin.from('user_backend_services').upsert({
      user_id: user.id,
      render_service_id: createdId,
      render_service_name: createdName,
      kind: type,
      github_repo_full_name: repo ? repo.replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '') : null,
      branch: type.includes('postgres') || type.includes('key_value') ? null : branch,
      region,
      plan,
      service_url: serviceUrl,
    }, { onConflict: 'render_service_id' });

    return json({ service_id: createdId, service_name: createdName, deploy_id: deployId, service_url: serviceUrl });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
