import { Highlight, themes } from "prism-react-renderer";
import { cn } from "@/lib/utils";

const EXT_MAP: Record<string, string> = {
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  jsx: "jsx",
  json: "json",
  md: "markdown",
  mdx: "markdown",
  css: "css",
  scss: "scss",
  html: "markup",
  xml: "markup",
  svg: "markup",
  yml: "yaml",
  yaml: "yaml",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  py: "python",
  go: "go",
  rs: "rust",
  java: "java",
  rb: "ruby",
  php: "php",
  sql: "sql",
  toml: "toml",
  graphql: "graphql",
  gql: "graphql",
};

export function languageForFilename(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower === "dockerfile") return "docker";
  if (lower.endsWith(".lock") || lower.endsWith(".log")) return "text";
  const ext = lower.split(".").pop() || "";
  return EXT_MAP[ext] || "text";
}

export function SyntaxHighlighter({ code, filename, className }: { code: string; filename: string; className?: string }) {
  const lang = languageForFilename(filename);
  return (
    <Highlight code={code.replace(/\n$/, "")} language={lang as any} theme={themes.vsDark}>
      {({ className: hlClass, style, tokens, getLineProps, getTokenProps }) => (
        <pre className={cn("overflow-auto text-[12.5px] leading-6", hlClass, className)} style={{ ...style, background: "transparent" }}>
          {tokens.map((line, i) => {
            const { key: lineKey, ...lineProps } = getLineProps({ line });
            return (
              <div key={i} {...lineProps} className="grid grid-cols-[52px_1fr]">
                <span className="select-none border-r border-border/50 px-3 text-right font-mono text-[11px] text-muted-foreground">{i + 1}</span>
                <span className="whitespace-pre px-4 font-mono">
                  {line.map((token, j) => {
                    const { key: tokenKey, ...tokenProps } = getTokenProps({ token });
                    return <span key={j} {...tokenProps} />;
                  })}
                </span>
              </div>
            );
          })}
        </pre>
      )}
    </Highlight>
  );
}
