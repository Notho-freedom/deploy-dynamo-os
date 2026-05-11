// Public redirect helper — keeps OAuth client_ids server-side.
// GET /oauth-start?provider=github|vercel&redirect_uri=...&state=...

Deno.serve((req) => {
  const url = new URL(req.url);
  const provider = url.searchParams.get('provider');
  const redirectUri = url.searchParams.get('redirect_uri') || '';
  const state = url.searchParams.get('state') || '';

  if (!redirectUri) return new Response('Missing redirect_uri', { status: 400 });

  let target = '';
  if (provider === 'github') {
    const clientId = Deno.env.get('GITHUB_CLIENT_ID');
    if (!clientId) return new Response('GITHUB_CLIENT_ID not set', { status: 500 });
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'repo read:user read:org admin:repo_hook',
      state,
      allow_signup: 'true',
    });
    target = `https://github.com/login/oauth/authorize?${params}`;
  } else if (provider === 'vercel') {
    const slug = Deno.env.get('VERCEL_INTEGRATION_SLUG');
    if (!slug) return new Response('VERCEL_INTEGRATION_SLUG not set', { status: 500 });
    // Vercel integration install URL
    const params = new URLSearchParams({
      // Vercel uses next param to return after install
      state,
    });
    target = `https://vercel.com/integrations/${slug}/new?${params}`;
  } else {
    return new Response('Unknown provider', { status: 400 });
  }

  return new Response(null, { status: 302, headers: { Location: target } });
});
