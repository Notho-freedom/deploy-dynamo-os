import { useEffect, useRef, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TerminalLine {
  text: string;
  tone?: 'default' | 'muted' | 'success' | 'warning' | 'error' | 'cmd';
}

export function Terminal({
  lines,
  streaming,
  className,
  height = 'h-72',
  prompt = '~/projects',
}: {
  lines: TerminalLine[];
  streaming?: boolean;
  className?: string;
  height?: string;
  prompt?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight });
  }, [lines]);

  const copy = async () => {
    await navigator.clipboard.writeText(lines.map((l) => l.text).join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className={cn('border border-border bg-[#0b0b0d] overflow-hidden', className)}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-black/40">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#27c93f]/80" />
        </div>
        <span className="text-[11px] font-mono text-muted-foreground truncate">{prompt}</span>
        <button
          onClick={copy}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Copy"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
      <div ref={ref} className={cn('font-mono text-[12.5px] leading-relaxed p-4 overflow-auto', height)}>
        {lines.map((l, i) => (
          <div
            key={i}
            className={cn(
              'whitespace-pre-wrap',
              l.tone === 'muted' && 'text-muted-foreground',
              l.tone === 'success' && 'text-success',
              l.tone === 'warning' && 'text-warning',
              l.tone === 'error' && 'text-destructive',
              l.tone === 'cmd' && 'text-foreground',
              !l.tone && 'text-foreground/85',
            )}
          >
            {l.tone === 'cmd' && <span className="text-primary mr-2">›</span>}
            {l.text}
          </div>
        ))}
        {streaming && <span className="inline-block h-3.5 w-1.5 bg-foreground/80 align-middle animate-blink" />}
      </div>
    </div>
  );
}
