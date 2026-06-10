import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Activity, AlertCircle, BarChart3, Zap, Shield } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip as RTooltip } from 'recharts';
import { DashboardToolbar, EmptyPanel, SectionPanel } from '@/components/dashboard/DashboardPrimitives';
import { Skeleton } from '@/components/ui/skeleton';
import { useRecentDeployments, useUserProjects } from '@/hooks/useDashboardData';
import { useVercelUsage, type UsageMetric } from '@/hooks/useVercelUsage';
import { vercel } from '@/lib/vercel';
import { safeFormatDistance } from '@/lib/utils';

const fmt = (n: number) => {
  if (!n) return '0';
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(Math.round(n));
};
const fmtBytes = (n: number) => {
  if (!n) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0; let v = n;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(1)} ${u[i]}`;
};

export default function Observability() {
  const { projects } = useUserProjects();
  const { rows } = useRecentDeployments(projects, 6);
  const { metrics, loading } = useVercelUsage('24h');

  const alertsQ = useQuery({
    queryKey: ['vercel-alerts'],
    enabled: projects.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    refetchInterval: 120_000,
    queryFn: async () => {
      const [attack, drains] = await Promise.all([
        vercel.attackStatus().catch(() => null),
        vercel.listLogDrains().catch(() => null),
      ]);
      const alerts: Array<{ id: string; level: 'info' | 'warn' | 'error'; title: string; description?: string }> = [];
      if (attack?.attackModeEnabled) alerts.push({ id: 'attack-mode', level: 'warn', title: 'Attack Challenge Mode is enabled', description: 'Visitors must pass a challenge to reach your sites.' });
      if (Array.isArray(drains) && drains.length === 0) alerts.push({ id: 'no-drains', level: 'info', title: 'No log drains configured', description: 'Forward logs to Datadog, Logflare, etc. from Integrations.' });
      return alerts;
    },
  });

  return (
    <div>
      <DashboardToolbar
        eyebrow="All Projects"
        title="Observability"
        subtitle="Live edge, function, and middleware activity across imported projects."
      />

      <div className="space-y-5 px-4 py-6 md:px-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricSparkCard m={metrics.edgeRequests} icon={<Zap className="h-4 w-4" />} loading={loading} fmt={fmt} />
          <MetricSparkCard m={metrics.fastData} icon={<Activity className="h-4 w-4" />} loading={loading} fmt={fmtBytes} />
          <MetricSparkCard m={metrics.functionInvocations} icon={<BarChart3 className="h-4 w-4" />} loading={loading} fmt={fmt} />
          <MetricSparkCard m={metrics.middleware} icon={<AlertCircle className="h-4 w-4" />} loading={loading} fmt={fmt} />
        </div>

        <SectionPanel title="Active Alerts" meta={alertsQ.data?.length ? `${alertsQ.data.length}` : 'Empty'}>
          {alertsQ.isLoading && !alertsQ.data ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : !alertsQ.data?.length ? (
            <EmptyPanel className="rounded-none border-0 bg-transparent" title="No active alerts" description="When attack challenges trigger or upstream services degrade, alerts appear here." />
          ) : (
            <div className="divide-y divide-border">
              {alertsQ.data.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-4 py-3 text-[13px]">
                  <Shield className={a.level === 'error' ? 'h-4 w-4 text-red-400' : a.level === 'warn' ? 'h-4 w-4 text-amber-300' : 'h-4 w-4 text-muted-foreground'} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{a.title}</p>
                    {a.description && <p className="truncate text-[11.5px] text-muted-foreground">{a.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionPanel>

        <SectionPanel title="Recent Deployments" meta={rows.length ? `${rows.length}` : 'Empty'}>
          {rows.length === 0 ? (
            <EmptyPanel className="rounded-none border-0 bg-transparent" title="No deployment context" description="Import a project to populate observability context." />
          ) : (
            <div className="divide-y divide-border">
              {rows.slice(0, 10).map((row) => (
                <Link
                  key={row.uid}
                  to={`/dashboard/deploy/${row.projectId}?deployment=${row.uid}`}
                  className="grid gap-2 px-4 py-3 text-[13px] hover:bg-muted/30 md:grid-cols-[1fr_160px_120px_120px]"
                >
                  <span className="truncate font-medium">{row.message}</span>
                  <span className="truncate text-muted-foreground">{row.projectName}</span>
                  <span className="truncate text-muted-foreground">{row.state}</span>
                  <span className="text-right text-muted-foreground">{safeFormatDistance(row.created, { addSuffix: true })}</span>
                </Link>
              ))}
            </div>
          )}
        </SectionPanel>
      </div>
    </div>
  );
}

function MetricSparkCard({ m, icon, loading, fmt: f }: { m: UsageMetric; icon: React.ReactNode; loading: boolean; fmt: (n: number) => string }) {
  const data = useMemo(() => m.series.map((p) => ({ x: p.t, y: p.v })), [m.series]);
  const max = Math.max(1, ...data.map((d) => d.y));
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between text-muted-foreground">
        <span className="text-[12px]">{m.label}</span>
        {icon}
      </div>
      {loading ? (
        <Skeleton className="mb-2 h-7 w-24" />
      ) : (
        <p className="text-[24px] font-semibold tabular-nums">{f(m.total)}</p>
      )}
      <div className="mt-2 h-12 w-full">
        {loading ? (
          <Skeleton className="h-full w-full" />
        ) : data.length === 0 ? (
          <div className="flex h-full items-end justify-center text-[10px] text-muted-foreground/60">No data yet — refreshing every 2 min</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`g-${m.label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="y" stroke="hsl(var(--primary))" strokeWidth={1.2} fill={`url(#g-${m.label})`} isAnimationActive={false} />
              <RTooltip
                contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', fontSize: 11 }}
                formatter={(v: number) => [f(v as number), m.label]}
                labelFormatter={(t) => new Date(t as number).toLocaleString()}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">Last 24h · max {f(max)}</p>
    </div>
  );
}
