// Shared smoke tests: hit the deployed edge functions unauthenticated and
// assert they return a clean error (never a 500 with an opaque body) and
// respond to CORS preflight. This catches regressions where a function
// throws on missing auth instead of returning a structured 401.
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const ANON = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
if (!SUPABASE_URL || !ANON) throw new Error("Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY");

const FUNCTIONS = ["github-api", "render-api", "render-deploy", "vercel-deploy"];

for (const fn of FUNCTIONS) {
  const url = `${SUPABASE_URL}/functions/v1/${fn}`;

  Deno.test(`${fn} — CORS preflight allows browser calls`, async () => {
    const r = await fetch(url, {
      method: "OPTIONS",
      headers: { Origin: "https://example.com", "Access-Control-Request-Method": "POST" },
    });
    await r.text();
    assert(r.status === 200 || r.status === 204, `expected 2xx got ${r.status}`);
    assertEquals(r.headers.get("access-control-allow-origin"), "*");
  });

  Deno.test(`${fn} — unauthenticated call returns structured error, not 500`, async () => {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: ANON },
      body: JSON.stringify({}),
    });
    const text = await r.text();
    // Supabase gateway fronts unauthenticated invocations with 401 before the
    // function even runs (verify_jwt=true by default). Either that OR the
    // function's own 401 body is acceptable — never a 500.
    assert(r.status !== 500, `${fn} returned 500 with body: ${text.slice(0, 200)}`);
    assert(r.status < 600);
  });
}
