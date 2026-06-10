import { useEffect, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { BarChart3, Globe, MousePointerClick, Users } from 'lucide-react';
import { DashboardToolbar, EmptyPanel, SectionPanel, SelectFilter } from '@/components/dashboard/DashboardPrimitives';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserProjects } from '@/hooks/useDashboardData';
import { vercel } from '@/lib/vercel';
import { humanizeApiError } from '@/lib/utils';
import { toast } from 'sonner';

interface AnalyticsTotals {
  pageviews?: { total?: number };
  visitors?: { total?: number };
  countries?: Array<{ key: string; total: number }>;
  pages?: Array<{ key: string; total: number }>;
  referrers?: Array<{ key: string; total: number }>;
}

export default function Analytics() {
  const { projects } = useUserProjects();
  const [selected, setSelected] = useState<string>('');
  const [range, setRange] = useState<'24h' | '7d' | '30d'>('7d');

  useEffect(() => {
    if (!selected && projects[0]) setSelected(projects[0].vercel_project_id);
  }, [projects, selected]);

  const q = useQuery<AnalyticsTotals | null>({
    queryKey: ['vercel-analytics', selected, range],
    enabled: !!selected,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    refetchInterval: 60_000,
    queryFn: async () => {
      const now = Date.now();
      const from = now - ({ '24h': 24, '7d': 24 * 7, '30d': 24 * 30 }[range]) * 60 * 60 * 1000;
      try {
        return await vercel.getProjectAnalytics(selected, from, now);
      } catch (e) {
        toast.error(humanizeApiError(e));
        throw e;
      }
    },
  });

  const totals = q.data ?? null;
  const loading = q.isLoading && !q.data;

  return (
    <div>
      <DashboardToolbar
        eyebrow="All Projects"
        title="Analytics"
        subtitle="Pageviews, visitors, top pages and referrers from Vercel Web Analytics."
        actions={
          <div className="flex items-center gap-2">
            <SelectFilter
              label="Project"
              value={selected}
              onChange={setSelected}
              options={projects.map((p) => ({ label: p.vercel_project_name, value: p.vercel_project_id }))}
            />
            <SelectFilter
              label="Range"
              value={range}
              onChange={(v) => setRange(v as '24h' | '7d' | '30d')}
              options={[
                { label: 'Last 24 hours', value: '24h' },
                { label: 'Last 7 days', value: '7d' },
                { label: 'Last 30 days', value: '30d' },
              ]}
            />
          </div>
        }
      />

      <div className="space-y-5 px-4 py-6 md:px-6">
        {projects.length === 0 ? (
          <EmptyPanel icon={<BarChart3 className="h-9 w-9" />} title="No projects connected" description="Import a project to view its analytics." />
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <MetricCard label="Pageviews" value={totals?.pageviews?.total} icon={<MousePointerClick className="h-4 w-4" />} loading={loading} />
              <MetricCard label="Visitors" value={totals?.visitors?.total} icon={<Users className="h-4 w-4" />} loading={loading} />
              <MetricCard label="Top countries" value={totals?.countries?.length} icon={<Globe className="h-4 w-4" />} loading={loading} />
              <MetricCard label="Top pages" value={totals?.pages?.length} icon={<BarChart3 className="h-4 w-4" />} loading={loading} />
            </div>

            <SectionPanel title="Top Pages" meta={`${totals?.pages?.length ?? 0}`}>
              <BreakdownTable rows={totals?.pages || []} loading={loading} />
            </SectionPanel>

            <SectionPanel title="Top Referrers" meta={`${totals?.referrers?.length ?? 0}`}>
              <BreakdownTable rows={totals?.referrers || []} loading={loading} />
            </SectionPanel>

            <SectionPanel title="Countries" meta={`${totals?.countries?.length ?? 0}`}>
              <BreakdownTable rows={totals?.countries || []} loading={loading} />
            </SectionPanel>
          </>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon, loading }: { label: string; value: number | undefined; icon: React.ReactNode; loading: boolean }) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between text-muted-foreground">
        <span className="text-[12px]">{label}</span>
        {icon}
      </div>
      {loading ? <Skeleton className="h-7 w-20" /> : <p className="text-[24px] font-semibold tabular-nums">{value ?? '—'}</p>}
    </div>
  );
}

function BreakdownTable({ rows, loading }: { rows: Array<{ key: string; total: number }>; loading: boolean }) {
  if (loading && rows.length === 0) {
    return (
      <div className="space-y-1.5 p-4">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
      </div>
    );
  }
  if (rows.length === 0) {
    return <EmptyPanel className="rounded-none border-0 bg-transparent" title="No data for this range" />;
  }
  const max = Math.max(...rows.map((r) => r.total));
  return (
    <div className="divide-y divide-border">
      {rows.slice(0, 20).map((row) => (
        <div key={row.key} className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
          <span className="min-w-0 flex-1 truncate font-mono text-[12px]">{row.key || '—'}</span>
          <div className="hidden h-1.5 w-40 overflow-hidden rounded-full bg-muted/40 md:block">
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round((row.total / max) * 100)}%` }} />
          </div>
          <span className="w-16 text-right tabular-nums text-muted-foreground">{row.total.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}
