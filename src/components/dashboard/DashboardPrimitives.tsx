import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock3,
  Copy,
  ExternalLink,
  FileCode2,
  GitBranch,
  Github,
  LayoutGrid,
  Loader2,
  Search,
  XCircle,
} from 'lucide-react';
import { cn, safeFormatDistance, shortDeploymentId } from '@/lib/utils';
import { DashboardProject, DeploymentRow } from '@/hooks/useDashboardData';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function DashboardToolbar({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 md:px-6">
      <div className="min-w-0">
        {eyebrow && <p className="text-[11px] text-muted-foreground">{eyebrow}</p>}
        <h1 className="truncate text-[15px] font-semibold tracking-normal">{title}</h1>
        {subtitle && <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function FilterBar({
  query,
  onQueryChange,
  placeholder = 'Search...',
  children,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  placeholder?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 md:flex-row">
      <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-md border border-border bg-card px-3 text-[13px]">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
        />
      </label>
      {children}
    </div>
  );
}

export function SelectFilter({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  label: string;
}) {
  return (
    <label className="relative h-10 min-w-[160px]">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full appearance-none rounded-md border border-border bg-card px-3 pr-8 text-[13px] outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
    </label>
  );
}

export function EmptyPanel({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex min-h-[180px] flex-col items-center justify-center rounded-md border border-border bg-card px-6 py-10 text-center', className)}>
      {icon && <div className="mb-3 text-muted-foreground">{icon}</div>}
      <p className="text-[14px] font-medium">{title}</p>
      {description && <p className="mt-1 max-w-md text-[13px] leading-5 text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function SectionPanel({
  title,
  meta,
  children,
  className,
  actions,
}: {
  title: string;
  meta?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}) {
  return (
    <section className={cn('overflow-hidden rounded-md border border-border bg-card', className)}>
      <div className="flex min-h-10 items-center justify-between gap-3 border-b border-border px-4 py-2">
        <h2 className="text-[12px] font-medium">{title}</h2>
        <div className="flex items-center gap-2">
          {meta && <div className="text-[11px] text-muted-foreground">{meta}</div>}
          {actions}
        </div>
      </div>
      {children}
    </section>
  );
}

export function DeploymentStatusBadge({ state }: { state: DeploymentRow['state'] }) {
  const icon = state === 'READY' ? CheckCircle2 : state === 'ERROR' ? XCircle : state === 'CANCELED' ? Circle : Clock3;
  const Icon = icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[12px] font-medium',
        state === 'READY' && 'border-success/30 bg-success/10 text-success',
        (state === 'BUILDING' || state === 'INITIALIZING') && 'border-primary/30 bg-primary/10 text-primary',
        state === 'QUEUED' && 'border-border bg-muted/40 text-muted-foreground',
        state === 'ERROR' && 'border-destructive/30 bg-destructive/10 text-destructive',
        state === 'CANCELED' && 'border-border bg-muted/40 text-muted-foreground',
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {state === 'READY' ? 'Ready' : state.charAt(0) + state.slice(1).toLowerCase()}
    </span>
  );
}

export function TruncatedText({ text, lines = 2, className }: { text: string; lines?: 1 | 2 | 3; className?: string }) {
  const clampClass = lines === 1 ? 'line-clamp-1' : lines === 2 ? 'line-clamp-2' : 'line-clamp-3';
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn(clampClass, 'block break-words text-left', className)}>{text}</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-md whitespace-pre-wrap text-[12px]">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function ProjectCard({ project }: { project: DashboardProject }) {
  const deployment = project.latestDeployment;
  const url = deployment?.url || project.productionUrl?.replace(/^https?:\/\//, '');
  return (
    <Link
      to={`/dashboard/deploy/${project.projectId}`}
      className="group block rounded-md border border-border bg-card p-4 transition hover:border-foreground/40"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40">
          <LayoutGrid className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-[14px] font-semibold">{project.name}</h3>
            {deployment && <DeploymentStatusBadge state={deployment.state} />}
          </div>
          {url && <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{url}</p>}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 text-[12px] text-muted-foreground">
        <Github className="h-3.5 w-3.5" />
        <span className="truncate">{project.repo}</span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3 text-[12px] text-muted-foreground">
        <span className="inline-flex min-w-0 items-center gap-1">
          <GitBranch className="h-3.5 w-3.5" />
          <span className="truncate">{deployment?.meta?.githubCommitRef || project.branch}</span>
        </span>
        <span className="shrink-0">
          {safeFormatDistance(deployment?.created ?? project.createdAt, { addSuffix: true })}
        </span>
      </div>
    </Link>
  );
}

export function DeploymentTable({ rows, loading }: { rows: DeploymentRow[]; loading?: boolean }) {
  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center gap-2 rounded-md border border-border bg-card text-[13px] text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading deployments...
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <EmptyPanel
        icon={<AlertCircle className="h-8 w-8" />}
        title="No deployments found"
        description="Import a repository or adjust your filters to see deployments here."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px] table-fixed text-[13px]">
          <colgroup>
            <col style={{ width: '160px' }} />
            <col style={{ width: '130px' }} />
            <col style={{ width: '110px' }} />
            <col />
            <col style={{ width: '200px' }} />
            <col style={{ width: '140px' }} />
            <col style={{ width: '90px' }} />
            <col style={{ width: '130px' }} />
            <col style={{ width: '52px' }} />
          </colgroup>
          <thead className="border-b border-border bg-muted/20 text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">Deployment</th>
              <th className="px-4 py-2.5 text-left font-medium">Status</th>
              <th className="px-4 py-2.5 text-left font-medium">Env</th>
              <th className="px-4 py-2.5 text-left font-medium">Commit</th>
              <th className="px-4 py-2.5 text-left font-medium">Project</th>
              <th className="px-4 py-2.5 text-left font-medium">Branch</th>
              <th className="px-4 py-2.5 text-left font-medium">SHA</th>
              <th className="px-4 py-2.5 text-right font-medium">Created</th>
              <th className="px-2 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={`${row.projectId}-${row.uid}`} className="transition hover:bg-muted/30">
                <td className="px-4 py-3 align-top">
                  <Link to={`/dashboard/deploy/${row.projectId}?deployment=${row.uid}`} className="font-mono text-[12px] text-foreground hover:text-primary">
                    {shortDeploymentId(row.uid)}
                  </Link>
                </td>
                <td className="px-4 py-3 align-top">
                  <DeploymentStatusBadge state={row.state} />
                  {row.duration !== null && <span className="ml-2 text-[11px] text-muted-foreground">{row.duration}s</span>}
                </td>
                <td className="px-4 py-3 align-top">
                  <span className={cn('rounded-full border px-2 py-0.5 text-[11px]', row.environment === 'Production' ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border text-muted-foreground')}>
                    {row.environment}
                  </span>
                </td>
                <td className="px-4 py-3 align-top">
                  <Link to={`/dashboard/deploy/${row.projectId}?deployment=${row.uid}`} className="block hover:text-primary">
                    <TruncatedText text={row.message} lines={2} className="text-[13px] font-medium" />
                  </Link>
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="truncate font-medium">{row.projectName}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{row.repo}</div>
                </td>
                <td className="px-4 py-3 align-top text-muted-foreground">
                  <span className="inline-flex max-w-full items-center gap-1 truncate">
                    <GitBranch className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{row.branch}</span>
                  </span>
                </td>
                <td className="px-4 py-3 align-top font-mono text-[12px] text-muted-foreground">{row.commitSha}</td>
                <td className="px-4 py-3 align-top text-right text-[12px] text-muted-foreground">
                  {safeFormatDistance(row.created, { addSuffix: true })}
                </td>
                <td className="px-2 py-3 align-top text-right">
                  {row.url && (
                    <a href={`https://${row.url}`} target="_blank" rel="noreferrer" className="inline-flex text-muted-foreground hover:text-foreground" aria-label="Open deployment">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function CodeViewer({ filename, code, actions }: { filename: string; code: string; actions?: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-[#1e1e1e]">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-[#181818] px-4 py-2.5">
        <div className="inline-flex min-w-0 items-center gap-2">
          <FileCode2 className="h-4 w-4 text-muted-foreground" />
          <span className="truncate text-[13px] font-semibold">{filename}</span>
        </div>
        <div className="flex items-center gap-1">
          {actions}
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => void navigator.clipboard.writeText(code)} aria-label="Copy source">
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <SyntaxBlock code={code} filename={filename} />
    </div>
  );
}

// Lazy local wrapper so a missing prism doesn't crash the rest of the dashboard.
import { SyntaxHighlighter } from '@/components/SyntaxHighlighter';
function SyntaxBlock({ code, filename }: { code: string; filename: string }) {
  return <SyntaxHighlighter code={code} filename={filename} className="max-h-[calc(100vh-220px)]" />;
}

export function ExternalTextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:text-primary/80">
      {children}
      <ArrowUpRight className="h-3.5 w-3.5" />
    </a>
  );
}
