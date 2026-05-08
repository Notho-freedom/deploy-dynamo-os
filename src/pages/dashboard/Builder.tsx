import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { useApp } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Sparkles, Send, Paperclip, Monitor, Smartphone, Tablet as TabletIcon, RefreshCw, Code2, Eye, Terminal as TerminalIcon } from 'lucide-react';

const templates = [
  { name: 'SaaS Dashboard', prompt: 'A modern SaaS dashboard with auth, billing, and analytics' },
  { name: 'Marketplace', prompt: 'A marketplace for African artisans with Mobile Money checkout' },
  { name: 'Landing page', prompt: 'A bold editorial landing page for a fintech startup' },
  { name: 'Blog', prompt: 'A minimal blog with MDX, RSS, and newsletter capture' },
  { name: 'Mobile App', prompt: 'A React Native style PWA for ride-hailing in Lagos' },
  { name: 'API + Docs', prompt: 'A REST API with OpenAPI docs and SDK generation' },
];

interface Msg { role: 'user' | 'assistant'; text: string; streaming?: boolean }

export default function Builder() {
  const { lang } = useI18n();
  const addProject = useApp((s) => s.addProject);
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [view, setView] = useState<'preview' | 'code' | 'console'>('preview');
  const [files, setFiles] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const begin = (prompt: string) => {
    setStarted(true);
    setMessages([{ role: 'user', text: prompt }]);
    streamReply(prompt);
    addProject({ name: 'new-project-' + Math.random().toString(36).slice(2, 5), framework: 'nextjs', template: 'ai', status: 'building' });
  };

  const send = () => {
    if (!input.trim()) return;
    setMessages((m) => [...m, { role: 'user', text: input }]);
    streamReply(input);
    setInput('');
  };

  const streamReply = (prompt: string) => {
    const reply = lang === 'fr'
      ? `Bien reçu. Je scaffold un projet Next.js 14 avec Postgres, auth GitHub et Mobile Money. Je crée la structure :

› app/(marketing)/page.tsx
› app/dashboard/layout.tsx
› app/api/momo/route.ts
› lib/db/schema.ts
› components/ui/*

Build initial en cours…`
      : `Got it. Scaffolding a Next.js 14 project with Postgres, GitHub auth and Mobile Money. Creating structure:

› app/(marketing)/page.tsx
› app/dashboard/layout.tsx
› app/api/momo/route.ts
› lib/db/schema.ts
› components/ui/*

Initial build in progress…`;
    setMessages((m) => [...m, { role: 'assistant', text: '', streaming: true }]);
    let i = 0;
    const id = setInterval(() => {
      i += 4 + Math.random() * 6;
      setMessages((m) => {
        const last = m[m.length - 1];
        if (!last || last.role !== 'assistant') return m;
        return [...m.slice(0, -1), { ...last, text: reply.slice(0, Math.floor(i)) }];
      });
      if (i >= reply.length) {
        clearInterval(id);
        setMessages((m) => {
          const last = m[m.length - 1];
          return [...m.slice(0, -1), { ...last, streaming: false }];
        });
        setFiles((f) => [...f, 'app/(marketing)/page.tsx', 'app/api/momo/route.ts', 'lib/db/schema.ts']);
      }
    }, 28);
  };

  if (!started) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center max-w-3xl mx-auto text-center">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-4">{lang === 'fr' ? 'Project Builder' : 'Project Builder'}</p>
        <h1 className="font-editorial text-5xl md:text-6xl tracking-tight mb-3 text-balance">
          {lang === 'fr' ? <>Que voulez-vous <em className="italic text-primary">construire</em> ?</> : <>What do you want to <em className="italic text-primary">build</em>?</>}
        </h1>
        <p className="text-muted-foreground text-[14px] mb-10 max-w-md">
          {lang === 'fr' ? 'Décrivez votre idée. NebulaOS génère, configure et déploie.' : 'Describe your idea. NebulaOS generates, configures and ships it.'}
        </p>
        <div className="w-full border border-border p-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) begin(input); }}
            rows={4}
            placeholder={lang === 'fr' ? 'Une marketplace pour artisans avec paiement Mobile Money…' : 'A marketplace for artisans with Mobile Money checkout…'}
            className="w-full bg-transparent outline-none resize-none text-[14px] placeholder:text-muted-foreground"
          />
          <div className="flex items-center gap-2 mt-2">
            <button className="text-muted-foreground hover:text-foreground"><Paperclip className="h-4 w-4" /></button>
            <span className="text-[11px] text-muted-foreground font-mono">⌘+enter to send</span>
            <Button disabled={!input.trim()} onClick={() => begin(input)} className="ml-auto gap-1.5"><Sparkles className="h-3.5 w-3.5" /> Generate</Button>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap gap-2 justify-center">
          {templates.map((t) => (
            <button
              key={t.name}
              onClick={() => begin(t.prompt)}
              className="px-3 py-1.5 border border-border hover:border-foreground rounded-full text-[12px] text-muted-foreground hover:text-foreground transition"
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const deviceWidth = device === 'desktop' ? '100%' : device === 'tablet' ? 768 : 375;

  return (
    <div className="grid lg:grid-cols-2 gap-0 -m-6 -mt-8 h-[calc(100vh-3rem)] border-t border-border">
      {/* Chat */}
      <div className="flex flex-col border-r border-border min-h-0">
        <div className="px-5 py-3 border-b border-border flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-[12px] font-mono">conversation</span>
          <span className="ml-auto text-[11px] text-muted-foreground font-mono">gpt-5 · streaming</span>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'ml-auto max-w-md' : 'max-w-md'}>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{m.role === 'user' ? 'You' : 'Nebula'}</p>
              <div className={`text-[13.5px] whitespace-pre-wrap leading-relaxed ${m.role === 'user' ? 'bg-muted/40 px-3 py-2 rounded-md' : ''}`}>
                {m.text}
                {m.streaming && <span className="inline-block w-1.5 h-3.5 bg-foreground align-middle animate-blink ml-0.5" />}
              </div>
            </div>
          ))}
        </div>
        <div className="p-3 border-t border-border">
          <div className="border border-border p-2.5 flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              rows={1}
              placeholder={lang === 'fr' ? 'Continuer la conversation…' : 'Continue the conversation…'}
              className="flex-1 bg-transparent outline-none resize-none text-[13px]"
            />
            <button onClick={send} className="text-primary hover:opacity-80"><Send className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="flex flex-col min-h-0 bg-[#0a0a0c]">
        <div className="h-10 px-4 border-b border-border flex items-center gap-3">
          <div className="flex items-center gap-1">
            {(['preview', 'code', 'console'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] capitalize font-mono rounded transition ${view === v ? 'bg-muted/60 text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {v === 'preview' ? <Eye className="h-3 w-3" /> : v === 'code' ? <Code2 className="h-3 w-3" /> : <TerminalIcon className="h-3 w-3" />}
                {v}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-1">
            {[
              { k: 'desktop', I: Monitor },
              { k: 'tablet', I: TabletIcon },
              { k: 'mobile', I: Smartphone },
            ].map((d) => (
              <button key={d.k} onClick={() => setDevice(d.k as any)} className={`p-1.5 rounded transition ${device === d.k ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                <d.I className="h-3.5 w-3.5" />
              </button>
            ))}
            <button className="ml-2 p-1.5 text-muted-foreground hover:text-foreground"><RefreshCw className="h-3.5 w-3.5" /></button>
          </div>
        </div>
        <div className="px-4 py-2 border-b border-border flex items-center gap-2 bg-background">
          <span className="h-2 w-2 rounded-full bg-success" />
          <span className="font-mono text-[11px] text-muted-foreground truncate">https://preview-a8f2.nebula.app</span>
        </div>
        {view === 'preview' && (
          <div className="flex-1 overflow-auto p-6 flex items-start justify-center">
            <div style={{ width: deviceWidth, maxWidth: '100%' }} className="bg-background border border-border min-h-[420px] transition-all">
              <FakeAppPreview />
            </div>
          </div>
        )}
        {view === 'code' && (
          <div className="flex-1 grid grid-cols-[180px,1fr] overflow-hidden">
            <div className="border-r border-border overflow-y-auto p-3 text-[11.5px] font-mono space-y-0.5">
              <p className="text-muted-foreground mb-2">FILES</p>
              {(files.length ? files : ['app/page.tsx']).map((f) => (
                <div key={f} className="text-muted-foreground hover:text-foreground cursor-pointer truncate">{f}</div>
              ))}
            </div>
            <pre className="overflow-auto p-4 text-[12px] font-mono text-foreground/90"><code>{`export default function Page() {
  return (
    <main className="min-h-screen p-10">
      <h1 className="font-editorial text-5xl">Ankara Shop</h1>
      <p className="text-muted-foreground mt-4">
        Découvrez nos pagnes faits main, livraison partout en Afrique.
      </p>
      <Checkout provider="momo" />
    </main>
  );
}`}</code></pre>
          </div>
        )}
        {view === 'console' && (
          <div className="flex-1 overflow-auto p-4 font-mono text-[12px] text-muted-foreground space-y-1">
            <p>[09:42:18] Listening on 0.0.0.0:3000</p>
            <p>[09:42:19] Compiled / in 412ms</p>
            <p>[09:42:21] GET / 200 in 38ms</p>
            <p className="text-warning">[09:42:24] [warn] images.unsplash.com — large LCP</p>
            <p>[09:42:27] HMR update applied</p>
          </div>
        )}
      </div>
    </div>
  );
}

function FakeAppPreview() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <span className="font-editorial text-xl">ankara.shop</span>
        <span className="font-mono text-[10px] text-muted-foreground">CART · 0</span>
      </div>
      <h1 className="font-editorial text-3xl mb-2">Pagnes faits main, depuis Abidjan.</h1>
      <p className="text-[12px] text-muted-foreground mb-6">Livraison Mobile Money disponible.</p>
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="aspect-square bg-gradient-to-br from-primary/30 to-accent/20 border border-border" />
        ))}
      </div>
    </div>
  );
}
