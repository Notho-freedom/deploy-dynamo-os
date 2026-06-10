import { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, Wand2, Eye, Layers, Code2, Copy, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn, humanizeApiError } from '@/lib/utils';

const presets = [
  { k: 'component', label: 'Component', desc: 'Hero, pricing card, table, navbar…', I: Layers },
  { k: 'page', label: 'Full page', desc: 'Landing, dashboard, settings…', I: Eye },
  { k: 'edit', label: 'Edit existing', desc: 'Refine a screen with natural language', I: Wand2 },
] as const;

interface Variant { html: string }
interface HistoryItem { id: string; prompt: string; mode: string; variants: Variant[]; ts: number }

const HISTORY_KEY = 'uigen-history-v1';

// Extract fenced HTML blocks from an AI markdown response.
function extractHtmlVariants(markdown: string): Variant[] {
  const out: Variant[] = [];
  const re = /```(?:html)?\s*\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(markdown)) !== null) {
    const body = m[1].trim();
    if (body.toLowerCase().includes('<html') || body.includes('<') ) out.push({ html: body });
  }
  return out.slice(0, 3);
}

function wrapHtml(body: string): string {
  if (/<html[\s>]/i.test(body)) return body;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><script src="https://cdn.tailwindcss.com"></script><style>body{margin:0;background:#fff;color:#0a0a0a;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}</style></head><body>${body}</body></html>`;
}

export default function UIGen() {
  const { lang } = useI18n();
  const [mode, setMode] = useState<string>('page');
  const [prompt, setPrompt] = useState('');
  const [variants, setVariants] = useState<Variant[]>([]);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeVariant, setActiveVariant] = useState(0);
  const [showCode, setShowCode] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch { /* noop */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 30))); } catch { /* noop */ }
  }, [history]);

  const generate = async () => {
    if (!prompt.trim() || busy) return;
    setBusy(true);
    setVariants([]);
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const anon = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const system = `You are a senior UI designer. Generate 3 distinct visual variants of the requested ${mode} as **complete, self-contained HTML** snippets using Tailwind via the CDN. Respond with exactly three fenced blocks: \n\`\`\`html\n<!-- variant 1 -->\n…\n\`\`\`\n\`\`\`html\n<!-- variant 2 -->\n…\n\`\`\`\n\`\`\`html\n<!-- variant 3 -->\n…\n\`\`\`\nNo prose, no commentary. Each variant must be a full <body> fragment, beautiful, accessible, mobile-first.`;

    try {
      const res = await fetch(`https://${projectRef}.supabase.co/functions/v1/builder-chat`, {
        method: 'POST',
        signal: ac.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${anon}`, apikey: anon },
        body: JSON.stringify({ messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ] }),
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let acc = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (data === '[DONE]') continue;
          try {
            const json = JSON.parse(data);
            const delta: string | undefined = json?.choices?.[0]?.delta?.content;
            if (delta) {
              acc += delta;
              const vs = extractHtmlVariants(acc);
              if (vs.length) setVariants(vs);
            }
          } catch { /* ignore */ }
        }
      }
      const finalVariants = extractHtmlVariants(acc);
      if (finalVariants.length === 0) throw new Error('AI did not return any HTML block');
      setVariants(finalVariants);
      setActiveVariant(0);
      const item: HistoryItem = { id: crypto.randomUUID(), prompt, mode, variants: finalVariants, ts: Date.now() };
      setHistory((h) => [item, ...h].slice(0, 30));
    } catch (e) {
      if ((e as Error).name !== 'AbortError') toast.error(humanizeApiError(e));
    } finally {
      setBusy(false);
    }
  };

  const loadHistory = (h: HistoryItem) => {
    setPrompt(h.prompt);
    setMode(h.mode);
    setVariants(h.variants);
    setActiveVariant(0);
  };

  const copyCode = () => {
    const v = variants[activeVariant];
    if (!v) return;
    void navigator.clipboard.writeText(v.html);
    toast.success('Copied');
  };

  return (
    <div className="grid h-[calc(100vh-3.5rem)] grid-cols-1 border-t border-border lg:grid-cols-[320px_minmax(0,1fr)]">
      {/* Sidebar */}
      <aside className="flex min-h-0 flex-col border-r border-border">
        <div className="border-b border-border p-4">
          <p className="mb-3 text-[11px] uppercase tracking-widest text-muted-foreground">UI Generation</p>
          <div className="flex flex-col gap-1">
            {presets.map((p) => (
              <button
                key={p.k}
                onClick={() => setMode(p.k)}
                className={cn(
                  'flex items-start gap-2 rounded-md border p-2.5 text-left transition',
                  mode === p.k ? 'border-primary/50 bg-primary/5' : 'border-border hover:bg-muted/40',
                )}
              >
                <p.I className="mt-0.5 h-4 w-4 text-primary" />
                <div className="min-w-0">
                  <p className="text-[12.5px] font-medium">{p.label}</p>
                  <p className="text-[11px] text-muted-foreground">{p.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="border-b border-border p-3">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void generate(); }}
            rows={4}
            placeholder={lang === 'fr' ? 'Une page pricing en 3 colonnes, palette ocre, typo serif éditoriale…' : 'A 3-column pricing page, ochre palette, editorial serif typography…'}
            className="w-full resize-none bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
          />
          <Button onClick={generate} disabled={!prompt.trim() || busy} className="mt-2 w-full gap-1.5">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {busy ? 'Generating…' : 'Generate 3 variants'}
          </Button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <p className="px-4 pt-3 text-[11px] uppercase tracking-widest text-muted-foreground">History</p>
          {history.length === 0 ? (
            <p className="px-4 py-3 text-[12px] text-muted-foreground">Nothing yet.</p>
          ) : (
            <ul className="px-2 py-2">
              {history.map((h) => (
                <li key={h.id}>
                  <button onClick={() => loadHistory(h)} className="flex w-full items-start gap-2 rounded-md px-2 py-2 text-left hover:bg-muted/40">
                    <span className="mt-0.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px]">{h.prompt}</span>
                      <span className="block text-[10.5px] text-muted-foreground">{new Date(h.ts).toLocaleString()}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {history.length > 0 && (
            <button onClick={() => setHistory([])} className="mx-3 mb-3 mt-1 inline-flex items-center gap-1 self-start text-[11px] text-muted-foreground hover:text-red-400">
              <Trash2 className="h-3 w-3" /> Clear history
            </button>
          )}
        </div>
      </aside>

      {/* Variants */}
      <div className="flex min-h-0 flex-col bg-[#0a0a0c]">
        <div className="flex h-10 items-center gap-3 border-b border-border px-4">
          <span className="font-mono text-[11px] text-muted-foreground">
            {variants.length > 0 ? `${variants.length} variant${variants.length === 1 ? '' : 's'}` : 'awaiting prompt'}
          </span>
          {variants.length > 0 && (
            <div className="ml-auto flex items-center gap-1">
              {variants.map((_, i) => (
                <button key={i} onClick={() => setActiveVariant(i)} className={cn('h-6 w-6 rounded-md border text-[11px] font-mono', activeVariant === i ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground')}>
                  {i + 1}
                </button>
              ))}
              <button onClick={() => setShowCode((v) => !v)} className="ml-2 inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground">
                <Code2 className="h-3 w-3" /> {showCode ? 'preview' : 'code'}
              </button>
              <button onClick={copyCode} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground">
                <Copy className="h-3 w-3" /> copy
              </button>
            </div>
          )}
        </div>

        {variants.length === 0 ? (
          busy ? (
            <div className="grid flex-1 grid-cols-1 gap-4 p-6 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-full min-h-[200px] w-full bg-muted/20" />)}
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-[13px] text-muted-foreground">
              Describe the UI you want — three rendered variants will appear here.
            </div>
          )
        ) : showCode ? (
          <pre className="flex-1 overflow-auto bg-black/40 p-4 font-mono text-[12px] leading-6 text-zinc-200"><code>{variants[activeVariant]?.html}</code></pre>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-auto p-3 md:grid-cols-3">
            {variants.map((v, i) => (
              <div key={i} className={cn('overflow-hidden rounded-md border bg-white', activeVariant === i ? 'border-primary/60' : 'border-border')}>
                <div className="flex items-center justify-between border-b border-border bg-muted/40 px-2 py-1">
                  <span className="font-mono text-[10px] text-muted-foreground">variant {i + 1}</span>
                  <button onClick={() => setActiveVariant(i)} className="text-[10px] text-muted-foreground hover:text-foreground">focus</button>
                </div>
                <iframe
                  title={`variant-${i + 1}`}
                  sandbox="allow-scripts"
                  srcDoc={wrapHtml(v.html)}
                  className="h-[480px] w-full bg-white"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
