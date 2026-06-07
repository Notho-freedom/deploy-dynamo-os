// Streams Render logs as SSE by polling /v1/logs every 2s.
// EventSource cannot set headers, so we accept ?token= (Supabase access token).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const resource = url.searchParams.get('resource'); // srv_xxx | dpg_xxx | red_xxx
  const type = url.searchParams.get('type') || 'app'; // app|build|request
  if (!resource) return new Response('Missing resource', { status: 400, headers: corsHeaders });

  let bearer = req.headers.get('Authorization') || '';
  if (!bearer) {
    const token = url.searchParams.get('token');
    if (token) bearer = `Bearer ${token}`;
  }
  if (!bearer) bearer = `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`;

  try {
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: bearer } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

    const apiKey = Deno.env.get('RENDER_API_KEY');
    if (!apiKey) return new Response('RENDER_API_KEY not set', { status: 500, headers: corsHeaders });
    const ownerId = Deno.env.get('RENDER_OWNER_ID');

    const encoder = new TextEncoder();
    const seen = new Set<string>();
    let stopped = false;
    let lastTs: string | undefined;

    const stream = new ReadableStream({
      async start(controller) {
        const fetchLogs = async () => {
          try {
            const u = new URL('https://api.render.com/v1/logs');
            u.searchParams.append('resource', resource);
            u.searchParams.append('type', type);
            u.searchParams.set('limit', '100');
            u.searchParams.set('direction', 'backward');
            if (ownerId) u.searchParams.set('ownerId', ownerId);
            if (lastTs) u.searchParams.set('startTime', lastTs);
            const r = await fetch(u.toString(), {
              headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
            });
            if (r.status === 429) return;
            if (!r.ok) {
              const txt = await r.text();
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ level: 'error', message: `Render ${r.status}: ${txt}`, timestamp: new Date().toISOString() })}\n\n`));
              return;
            }
            const json = await r.json();
            const logs = Array.isArray(json) ? json : json.logs || [];
            // Logs come newest-first; emit oldest first
            const fresh = logs.filter((l: any) => {
              const id = l.id || `${l.timestamp}-${l.message?.slice(0, 30)}`;
              if (seen.has(id)) return false;
              seen.add(id);
              return true;
            }).reverse();
            for (const log of fresh) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(log)}\n\n`));
              if (log.timestamp) lastTs = log.timestamp;
            }
            // Cap memory
            if (seen.size > 5000) {
              const arr = Array.from(seen).slice(-2500);
              seen.clear();
              for (const x of arr) seen.add(x);
            }
          } catch (e) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ level: 'error', message: String(e), timestamp: new Date().toISOString() })}\n\n`));
          }
        };

        // Heartbeat + poll loop
        const heartbeat = setInterval(() => {
          if (stopped) return;
          try { controller.enqueue(encoder.encode(`: keepalive\n\n`)); } catch { /* closed */ }
        }, 15000);

        await fetchLogs();
        while (!stopped) {
          await new Promise((r) => setTimeout(r, 2000));
          if (stopped) break;
          await fetchLogs();
        }
        clearInterval(heartbeat);
        try { controller.close(); } catch { /* already */ }
      },
      cancel() { stopped = true; },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (e) {
    return new Response(`data: ${JSON.stringify({ level: 'error', message: e instanceof Error ? e.message : String(e) })}\n\n`, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  }
});
