import { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, Send, FileCode2, Wrench, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SyntaxHighlighter, languageForFilename as _lang } from '@/components/SyntaxHighlighter';
import { FileTree } from '@/components/FileTree';
import type { GhTreeEntry } from '@/lib/github';
import { cn, humanizeApiError } from '@/lib/utils';

const templates = [
  { name: 'SaaS Dashboard', prompt: 'A modern SaaS dashboard with auth, billing and analytics.' },
  { name: 'Marketplace', prompt: 'A marketplace for African artisans with Mobile Money checkout.' },
  { name: 'Landing page', prompt: 'A bold editorial landing page for a fintech startup.' },
  { name: 'Blog', prompt: 'A minimal blog with MDX, RSS and newsletter capture.' },
  { name: 'API + Docs', prompt: 'A REST API with OpenAPI docs and SDK generation.' },
];

interface Msg { role: 'user' | 'assistant'; text: string; streaming?: boolean }
interface ParsedFile { path: string; content: string; language: string }

// Parse fenced code blocks of the form ```lang path/to/file\n…\n```
function parseFiles(markdown: string): ParsedFile[] {
  const out: ParsedFile[] = [];
  const re = /```(\w+)?\s+([^\s`][^\n`]*?)\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(markdown)) !== null) {
    const [, , rawPath, body] = m;
    const path = rawPath.trim();
    if (!path.includes('/') && !path.includes('.')) continue;
    out.push({ path, content: body.replace(/\n$/, ''), language: languageForFilename(path) });
  }
  // Dedupe — last write wins.
  const seen = new Map<string, ParsedFile>();
  for (const f of out) seen.set(f.path, f);
  return Array.from(seen.values());
}

export default function Builder() {
  const { lang } = useI18n();
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const assistantText = messages.filter((m) => m.role === 'assistant').map((m) => m.text).join('\n\n');
  const files = useMemo(() => parseFiles(assistantText), [assistantText]);
  const selected = files.find((f) => f.path === selectedPath) ?? files[files.length - 1] ?? null;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const begin = (prompt: string) => {
    if (!prompt.trim()) return;
    setStarted(true);
    setMessages([{ role: 'user', text: prompt }]);
    void streamReply([{ role: 'user', content: prompt }]);
    setInput('');
  };

  const send = () => {
    if (!input.trim() || busy) return;
    const next: Msg = { role: 'user', text: input };
    setMessages((m) => [...m, next]);
    const history = [...messages, next].map((m) => ({ role: m.role, content: m.text }));
    void streamReply(history);
    setInput('');
  };

  const streamReply = async (history: Array<{ role: 'user' | 'assistant'; content: string }>) => {
    setBusy(true);
    setMessages((m) => [...m, { role: 'assistant', text: '', streaming: true }]);

    const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const url = `https://${projectRef}.supabase.co/functions/v1/builder-chat`;
    const anon = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${anon}`, apikey: anon },
        body: JSON.stringify({ messages: history }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
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
              setMessages((m) => {
                const last = m[m.length - 1];
                if (!last || last.role !== 'assistant') return m;
                return [...m.slice(0, -1), { ...last, text: acc }];
              });
            }
          } catch { /* ignore partial json */ }
        }
      }
      setMessages((m) => {
        const last = m[m.length - 1];
        if (!last) return m;
        return [...m.slice(0, -1), { ...last, streaming: false }];
      });
    } catch (e) {
      toast.error(humanizeApiError(e));
      setMessages((m) => {
        const last = m[m.length - 1];
        if (!last) return m;
        return [...m.slice(0, -1), { ...last, streaming: false, text: last.text || '_(generation failed — try again)_' }];
      });
    } finally {
      setBusy(false);
    }
  };

  if (!started) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center text-center">
        <p className="mb-4 text-[11px] uppercase tracking-widest text-muted-foreground">Project Builder</p>
        <h1 className="font-editorial mb-3 text-balance text-5xl tracking-tight md:text-6xl">
          {lang === 'fr' ? <>Que voulez-vous <em className="italic text-primary">construire</em> ?</> : <>What do you want to <em className="italic text-primary">build</em>?</>}
        </h1>
        <p className="mb-10 max-w-md text-[14px] text-muted-foreground">
          {lang === 'fr' ? 'Décrivez votre idée. L\'IA planifie les fichiers en streaming.' : 'Describe your idea. The AI plans the files in real time.'}
        </p>
        <div className="w-full border border-border p-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) begin(input); }}
            rows={4}
            placeholder={lang === 'fr' ? 'Une marketplace pour artisans avec paiement Mobile Money…' : 'A marketplace for artisans with Mobile Money checkout…'}
            className="w-full resize-none bg-transparent text-[14px] outline-none placeholder:text-muted-foreground"
          />
          <div className="mt-2 flex items-center gap-2">
            <span className="font-mono text-[11px] text-muted-foreground">⌘+enter to send</span>
            <Button disabled={!input.trim()} onClick={() => begin(input)} className="ml-auto gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Generate
            </Button>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {templates.map((t) => (
            <button key={t.name} onClick={() => begin(t.prompt)} className="rounded-full border border-border px-3 py-1.5 text-[12px] text-muted-foreground transition hover:border-foreground hover:text-foreground">
              {t.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid h-[calc(100vh-3.5rem)] grid-cols-1 border-t border-border lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      {/* Chat */}
      <div className="flex min-h-0 flex-col border-r border-border">
        <div className="flex items-center gap-2 border-b border-border px-5 py-3">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="font-mono text-[12px]">conversation</span>
          <span className="ml-auto font-mono text-[11px] text-muted-foreground">gemini · streaming</span>
        </div>
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5">
          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'ml-auto max-w-md' : 'max-w-md'}>
              <p className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">{m.role === 'user' ? 'You' : 'Nebula'}</p>
              <div className={cn('whitespace-pre-wrap text-[13.5px] leading-relaxed', m.role === 'user' && 'rounded-md bg-muted/40 px-3 py-2')}>
                {m.text}
                {m.streaming && <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-emerald-400 align-middle" />}
              </div>
            </div>
          ))}
          {busy && messages[messages.length - 1]?.text === '' && (
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          )}
        </div>
        <div className="border-t border-border p-3">
          <div className="flex items-end gap-2 border border-border p-2.5">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              rows={1}
              placeholder={lang === 'fr' ? 'Continuer la conversation…' : 'Continue the conversation…'}
              className="flex-1 resize-none bg-transparent text-[13px] outline-none"
            />
            <button onClick={send} disabled={busy || !input.trim()} className="text-primary hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-30">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Plan & Files (real, parsed from stream) */}
      <div className="flex min-h-0 flex-col bg-[#0a0a0c]">
        <div className="flex h-10 items-center gap-3 border-b border-border px-4">
          <FileCode2 className="h-3.5 w-3.5 text-primary" />
          <span className="font-mono text-[12px]">plan & files</span>
          <span className="ml-auto font-mono text-[11px] text-muted-foreground">{files.length} file{files.length === 1 ? '' : 's'}</span>
        </div>
        {files.length === 0 ? (
          <div className="flex flex-1 items-center justify-center p-8 text-center">
            <div className="max-w-xs">
              <Wrench className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-[13px] font-medium">Awaiting AI plan</p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                When the assistant produces files in fenced code blocks (with a path on the opening line), they appear here in real time.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-[200px_minmax(0,1fr)] overflow-hidden">
            <div className="overflow-y-auto border-r border-border p-2">
              <FileTree
                entries={files.map<GhTreeEntry>((f) => ({ path: f.path, type: 'blob', sha: f.path, mode: '100644', size: f.content.length }))}
                selectedPath={selected?.path}
                onSelect={setSelectedPath}
              />
            </div>
            <div className="min-w-0 overflow-auto p-4">
              {selected ? (
                <>
                  <p className="mb-2 font-mono text-[11px] text-muted-foreground">{selected.path}</p>
                  <SyntaxHighlighter code={selected.content} filename={selected.path} />
                </>
              ) : (
                <p className="text-[12px] text-muted-foreground">Select a file</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
