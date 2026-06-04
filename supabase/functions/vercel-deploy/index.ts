// Orchestrates create-project + first-deployment + DB record on the admin Vercel account.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

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

    const token = Deno.env.get('VERCEL_ADMIN_TOKEN');
    if (!token) return json({ error: 'VERCEL_ADMIN_TOKEN not set' }, 500);
    const teamId = Deno.env.get('VERCEL_ADMIN_TEAM_ID') || undefined;

    const body = await req.json();
    const {
      name, repo_full_name, repo_id, branch, framework,
      rootDirectory, buildCommand, outputDirectory, installCommand,
      envs,
    } = body || {};

    if (!name || !repo_full_name || !repo_id || !branch) {
      return json({ error: 'Missing fields: name, repo_full_name, repo_id, branch required' }, 400);
    }

    // Namespaced project name: <user-id-short>-<name>
    const userSlug = user.id.split('-')[0];
    const projectName = slugify(`${userSlug}-${name}`);

    const teamQs = teamId ? `?teamId=${teamId}` : '';
    const vHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    // 1. Create project (or recover on 409)
    let projectId: string | null = null;
    {
      const r = await fetch(`https://api.vercel.com/v9/projects${teamQs}`, {
        method: 'POST',
        headers: vHeaders,
        body: JSON.stringify({
          name: projectName,
          framework: framework || null,
          gitRepository: { type: 'github', repo: repo_full_name },
          rootDirectory: rootDirectory && rootDirectory !== './' ? rootDirectory : undefined,
          buildCommand: buildCommand || undefined,
          outputDirectory: outputDirectory || undefined,
          installCommand: installCommand || undefined,
          environmentVariables: (envs || []).filter((e: any) => e.key && e.value).map((e: any) => ({
            key: e.key, value: e.value, target: ['production', 'preview', 'development'], type: 'encrypted',
          })),
        }),
      });
      const data = await r.json();
      if (r.ok) {
        projectId = data.id;
      } else if (r.status === 409 || /already exists/i.test(JSON.stringify(data))) {
        // Lookup existing
        const lr = await fetch(`https://api.vercel.com/v9/projects/${projectName}${teamQs}`, { headers: vHeaders });
        const ldata = await lr.json();
        if (!lr.ok) return json({ error: 'Project name conflict and lookup failed', detail: ldata }, 500);
        projectId = ldata.id;
      } else {
        return json({ error: 'Failed to create Vercel project', detail: data }, 500);
      }
    }

    // 2. Trigger first deployment from git
    const dr = await fetch(`https://api.vercel.com/v13/deployments${teamQs}`, {
      method: 'POST',
      headers: vHeaders,
      body: JSON.stringify({
        name: projectName,
        project: projectId,
        gitSource: { type: 'github', repoId: Number(repo_id), ref: branch },
        target: 'production',
      }),
    });
    const ddata = await dr.json();
    if (!dr.ok) return json({ error: 'Failed to create deployment', detail: ddata }, 500);

    // 3. Record in user_projects
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    await admin.from('user_projects').upsert({
      user_id: user.id,
      vercel_project_id: projectId!,
      vercel_project_name: projectName,
      github_repo_full_name: repo_full_name,
      github_repo_id: Number(repo_id),
      branch,
      framework: framework || null,
    }, { onConflict: 'vercel_project_id' });

    return json({
      project_id: projectId,
      project_name: projectName,
      deployment_id: ddata.id || ddata.uid,
      deployment_url: ddata.url,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
