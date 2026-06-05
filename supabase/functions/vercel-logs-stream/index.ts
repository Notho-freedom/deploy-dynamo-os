// Streams Vercel deployment build events as Server-Sent Events.
// EventSource cannot set custom headers, so we authenticate via the Supabase access_token
// passed in the URL (?token=...) AND we verify it server-side before opening the upstream.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Expose-Headers': 'content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const deploymentId = url.searchParams.get('id');
  if (!deploymentId) return new Response('Missing id', { status: 400, headers: corsHeaders });

  // Auth: prefer Authorization header, fall back to ?token= (EventSource cannot set headers).
  let bearer = req.headers.get('Authorization') || '';
  if (!bearer) {
    const token = url.searchParams.get('token');
    if (token) bearer = `Bearer ${token}`;
  }
  // If still no bearer, allow anonymous browse using the public anon key (the upstream still needs admin token).
  if (!bearer) bearer = `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`;

  try {
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: bearer } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

    const vercelToken = Deno.env.get('VERCEL_ADMIN_TOKEN');
    if (!vercelToken) return new Response('VERCEL_ADMIN_TOKEN not set', { status: 500, headers: corsHeaders });
    const teamId = Deno.env.get('VERCEL_ADMIN_TEAM_ID');

    const upstreamUrl = new URL(`https://api.vercel.com/v2/deployments/${deploymentId}/events`);
    upstreamUrl.searchParams.set('builds', '1');
    upstreamUrl.searchParams.set('follow', '1');
    if (teamId) upstreamUrl.searchParams.set('teamId', teamId);

    const upstream = await fetch(upstreamUrl.toString(), {
      headers: { Authorization: `Bearer ${vercelToken}` },
    });

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text().catch(() => '');
      return new Response(`data: ${JSON.stringify({ type: 'error', payload: { text: `Vercel ${upstream.status}: ${text}` } })}\n\n`, {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
      });
    }

    // Vercel streams newline-delimited JSON. Convert to SSE.
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = upstream.body!.getReader();
        let buffer = '';
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;
              // Some lines may already be JSON objects; pass through as SSE "data: ...".
              controller.enqueue(encoder.encode(`data: ${trimmed}\n\n`));
            }
          }
          if (buffer.trim()) controller.enqueue(encoder.encode(`data: ${buffer.trim()}\n\n`));
        } catch (err) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', payload: { text: String(err) } })}\n\n`));
        } finally {
          controller.close();
        }
      },
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
    return new Response(`data: ${JSON.stringify({ type: 'error', payload: { text: e instanceof Error ? e.message : String(e) } })}\n\n`, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  }
});
