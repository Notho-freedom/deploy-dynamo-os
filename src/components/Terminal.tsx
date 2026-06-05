import { useEffect, useRef, useState } from "react";
import { Copy, Check, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnsiLine, stripAnsi } from "@/components/AnsiOutput";

export interface TerminalLine {
  text: string;
  tone?: "default" | "muted" | "success" | "warning" | "error" | "cmd";
}

export function Terminal({
  lines,
  streaming,
  className,
  height = "h-72",
  prompt = "~/projects",
}: {
  lines: TerminalLine[];
  streaming?: boolean;
  className?: string;
  height?: string;
  prompt?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (!autoScroll) return;
    ref.current?.scrollTo({ top: ref.current.scrollHeight });
  }, [lines, autoScroll]);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 32;
    setAutoScroll(atBottom);
  };

  const copy = async () => {
    await navigator.clipboard.writeText(lines.map((l) => stripAnsi(l.text)).join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const safe = (lines ?? []).filter(Boolean) as TerminalLine[];

  return (
    <div className={cn("relative border border-border bg-[#0b0b0d] overflow-hidden", className)}>
      <div className="flex items-center justify-between border-b border-border bg-black/40 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#27c93f]/80" />
        </div>
        <span className="truncate font-mono text-[11px] text-muted-foreground">{prompt}</span>
        <div className="flex items-center gap-1">
          {streaming && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> LIVE
            </span>
          )}
          <button onClick={copy} className="text-muted-foreground transition-colors hover:text-foreground" aria-label="Copy">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
      <div
        ref={ref}
        onScroll={onScroll}
        className={cn("overflow-auto bg-[#0a0a0b] p-4 font-mono text-[12.5px] leading-relaxed", height)}
      >
        {safe.length === 0 ? (
          <div className="text-muted-foreground/60">{streaming ? "Waiting for output…" : "No output."}</div>
        ) : (
          safe.map((l, i) => (
            <div
              key={i}
              className={cn(
                "whitespace-pre-wrap break-words",
                l.tone === "muted" && "text-zinc-500",
                l.tone === "success" && "text-emerald-400",
                l.tone === "warning" && "text-yellow-300",
                l.tone === "error" && "text-red-400",
                l.tone === "cmd" && "text-foreground",
                !l.tone && "text-zinc-200",
              )}
            >
              {l.tone === "cmd" && <span className="mr-2 text-primary">›</span>}
              <AnsiLine text={l.text} />
            </div>
          ))
        )}
        {streaming && <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-emerald-400 align-middle" />}
      </div>
      {!autoScroll && (
        <button
          onClick={() => {
            setAutoScroll(true);
            ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
          }}
          className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full border border-border bg-background/90 px-2.5 py-1 text-[11px] text-muted-foreground shadow hover:text-foreground"
        >
          <ArrowDown className="h-3 w-3" /> Resume autoscroll
        </button>
      )}
    </div>
  );
}
