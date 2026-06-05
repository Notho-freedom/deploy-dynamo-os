import { Fragment, memo } from "react";
import { cn } from "@/lib/utils";

// Minimal ANSI SGR parser → React spans with Tailwind classes.
// Supports: reset, bold, dim, underline, fg 30-37/90-97, bg 40-47/100-107, 38;5;N (256), 38;2;R;G;B (truecolor).

const FG_BASIC: Record<number, string> = {
  30: "text-zinc-500",
  31: "text-red-400",
  32: "text-emerald-400",
  33: "text-yellow-300",
  34: "text-blue-400",
  35: "text-fuchsia-400",
  36: "text-cyan-300",
  37: "text-zinc-200",
  90: "text-zinc-500",
  91: "text-red-300",
  92: "text-emerald-300",
  93: "text-yellow-200",
  94: "text-blue-300",
  95: "text-fuchsia-300",
  96: "text-cyan-200",
  97: "text-white",
};

interface Style {
  bold?: boolean;
  dim?: boolean;
  underline?: boolean;
  fgClass?: string;
  fgInline?: string;
}

function applyCodes(codes: number[], current: Style, params: number[]): Style {
  // Handle extended sequences (38;5;N or 38;2;R;G;B) at index pointed by `i`
  const next: Style = { ...current };
  for (let i = 0; i < codes.length; i++) {
    const c = codes[i];
    if (c === 0) {
      next.bold = false;
      next.dim = false;
      next.underline = false;
      next.fgClass = undefined;
      next.fgInline = undefined;
    } else if (c === 1) next.bold = true;
    else if (c === 2) next.dim = true;
    else if (c === 4) next.underline = true;
    else if (c === 22) { next.bold = false; next.dim = false; }
    else if (c === 24) next.underline = false;
    else if (c === 39) { next.fgClass = undefined; next.fgInline = undefined; }
    else if (FG_BASIC[c]) { next.fgClass = FG_BASIC[c]; next.fgInline = undefined; }
    else if (c === 38 && codes[i + 1] === 5) {
      const n = codes[i + 2];
      next.fgInline = ansi256ToHex(n);
      next.fgClass = undefined;
      i += 2;
    } else if (c === 38 && codes[i + 1] === 2) {
      next.fgInline = `rgb(${codes[i + 2] ?? 0}, ${codes[i + 3] ?? 0}, ${codes[i + 4] ?? 0})`;
      next.fgClass = undefined;
      i += 4;
    }
    // ignore bg + other codes
  }
  return next;
}

function ansi256ToHex(n: number): string {
  if (n < 16) {
    const basic = ["#000000","#cd0000","#00cd00","#cdcd00","#0000ee","#cd00cd","#00cdcd","#e5e5e5","#7f7f7f","#ff0000","#00ff00","#ffff00","#5c5cff","#ff00ff","#00ffff","#ffffff"];
    return basic[n] || "#cccccc";
  }
  if (n >= 232) {
    const v = 8 + (n - 232) * 10;
    return `rgb(${v},${v},${v})`;
  }
  const i = n - 16;
  const r = Math.floor(i / 36);
  const g = Math.floor((i % 36) / 6);
  const b = i % 6;
  const scale = (x: number) => (x === 0 ? 0 : 55 + x * 40);
  return `rgb(${scale(r)},${scale(g)},${scale(b)})`;
}

interface Segment { text: string; style: Style }

function parseAnsi(input: string): Segment[] {
  const segs: Segment[] = [];
  let current: Style = {};
  const re = /\x1b\[([0-9;]*)m/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(input)) !== null) {
    if (match.index > lastIndex) segs.push({ text: input.slice(lastIndex, match.index), style: current });
    const codes = match[1].split(";").map((s) => Number(s) || 0);
    current = applyCodes(codes, current, []);
    lastIndex = re.lastIndex;
  }
  if (lastIndex < input.length) segs.push({ text: input.slice(lastIndex), style: current });
  // strip remaining escape codes (cursor moves, etc.)
  return segs.map((s) => ({ ...s, text: s.text.replace(/\x1b\[[^m]*[A-Za-z]/g, "") }));
}

const KEYWORD_RULES: Array<{ re: RegExp; cls: string }> = [
  { re: /\b(error|err|fail(ed)?|fatal|panic)\b/i, cls: "text-red-400" },
  { re: /\b(warn(ing)?|deprecated)\b/i, cls: "text-yellow-300" },
  { re: /\b(success|ready|done|complete[d]?|✓)\b/i, cls: "text-emerald-400" },
  { re: /\b(info|notice)\b/i, cls: "text-cyan-300" },
];

function keywordClass(text: string): string | undefined {
  for (const rule of KEYWORD_RULES) if (rule.re.test(text)) return rule.cls;
  return undefined;
}

export const AnsiLine = memo(function AnsiLine({ text, className }: { text: string; className?: string }) {
  // Strip carriage returns; if no escape codes use keyword highlight.
  const cleaned = text.replace(/\r/g, "");
  const hasAnsi = cleaned.includes("\x1b[");
  if (!hasAnsi) {
    const kw = keywordClass(cleaned);
    return <span className={cn(className, kw)}>{cleaned || " "}</span>;
  }
  const segs = parseAnsi(cleaned);
  return (
    <span className={className}>
      {segs.map((s, i) => (
        <Fragment key={i}>
          <span
            className={cn(
              s.style.fgClass,
              s.style.bold && "font-semibold",
              s.style.dim && "opacity-60",
              s.style.underline && "underline",
            )}
            style={s.style.fgInline ? { color: s.style.fgInline } : undefined}
          >
            {s.text}
          </span>
        </Fragment>
      ))}
    </span>
  );
});

export function stripAnsi(input: string): string {
  return input.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "");
}
