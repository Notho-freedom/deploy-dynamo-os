import { Link } from 'react-router-dom';
import { Activity, AlertCircle, BarChart3, ListFilter, Search } from 'lucide-react';
import { DashboardToolbar, EmptyPanel, SectionPanel } from '@/components/dashboard/DashboardPrimitives';
import { useRecentDeployments, useUserProjects } from '@/hooks/useDashboardData';

export default function Monitoring() {
  const { projects } = useUserProjects();
  const { rows, loading, error } = useRecentDeployments(projects, 6);

  return (
    <div>
      <DashboardToolbar
        eyebrow="All Projects"
        title="Logs & Observability"
        subtitle="Runtime logs and metrics will appear here when a real observability source is connected."
      />

      <div className="space-y-5 px-4 py-6 md:px-6">
        {error && (
          <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-[13px] text-warning">
            Some deployment context could not be loaded: {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <MetricEmpty title="Requests" icon={<Activity className="h-5 w-5" />} />
          <MetricEmpty title="Latency" icon={<BarChart3 className="h-5 w-5" />} />
          <MetricEmpty title="Error Rate" icon={<AlertCircle className="h-5 w-5" />} />
        </div>

        <SectionPanel title="Runtime Logs" meta="Not connected">
          <EmptyPanel
            className="rounded-none border-0 bg-transparent"
            icon={<Search className="h-10 w-10" />}
            title="Runtime logs are not connected"
            description="Build logs are available inside deployment details. Runtime logs need a logs endpoint before they can be searched here."
          />
        </SectionPanel>

        <SectionPanel title="Recent Deployments" meta={rows.length ? `${rows.length}` : 'Empty'}>
          {loading ? (
            <div className="h-40 animate-pulse bg-muted/20" />
          ) : rows.length === 0 ? (
            <EmptyPanel className="rounded-none border-0 bg-transparent" title="No deployment context" description="Import a project to see deployment context in observability." />
          ) : (
            <div className="divide-y divide-border">
              {rows.slice(0, 8).map((row) => (
                <Link key={row.uid} to={`/dashboard/deploy/${row.projectId}?deployment=${row.uid}`} className="grid gap-2 px-4 py-3 text-[13px] hover:bg-muted/30 md:grid-cols-[1fr_160px_120px]">
                  <span className="truncate font-medium">{row.message}</span>
                  <span className="truncate text-muted-foreground">{row.projectName}</span>
                  <span className="text-right text-muted-foreground">{row.state}</span>
                </Link>
              ))}
            </div>
          )}
        </SectionPanel>

        <SectionPanel title="Filters" meta="Planned">
          <div className="flex items-center gap-2 p-4 text-[13px] text-muted-foreground">
            <ListFilter className="h-4 w-4" />
            Environment, status code, source and query filters will be enabled after runtime logs are connected.
          </div>
        </SectionPanel>
      </div>
    </div>
  );
}

function MetricEmpty({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="mb-4 flex items-center justify-between text-muted-foreground">
        <span className="text-[12px]">{title}</span>
        {icon}
      </div>
      <p className="text-[24px] font-semibold text-muted-foreground">—</p>
      <p className="mt-1 text-[12px] text-muted-foreground">No real metric source</p>
    </div>
  );
}
