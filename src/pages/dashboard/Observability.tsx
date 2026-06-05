import { Link } from 'react-router-dom';
import { Activity, AlertCircle, BarChart3, Zap } from 'lucide-react';
import { DashboardToolbar, EmptyPanel, SectionPanel } from '@/components/dashboard/DashboardPrimitives';
import { useRecentDeployments, useUserProjects } from '@/hooks/useDashboardData';
import { safeFormatDistance } from '@/lib/utils';

export default function Observability() {
  const { projects } = useUserProjects();
  const { rows } = useRecentDeployments(projects, 6);

  return (
    <div>
      <DashboardToolbar
        eyebrow="All Projects"
        title="Observability"
        subtitle="Edge, function and middleware activity from your imported projects."
      />

      <div className="space-y-5 px-4 py-6 md:px-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricEmpty title="Edge Requests" icon={<Zap className="h-5 w-5" />} />
          <MetricEmpty title="Fast Data Transfer" icon={<Activity className="h-5 w-5" />} />
          <MetricEmpty title="Function Invocations" icon={<BarChart3 className="h-5 w-5" />} />
          <MetricEmpty title="Middleware Invocations" icon={<AlertCircle className="h-5 w-5" />} />
        </div>

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

function MetricEmpty({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="mb-4 flex items-center justify-between text-muted-foreground">
        <span className="text-[12px]">{title}</span>
        {icon}
      </div>
      <p className="text-[24px] font-semibold text-muted-foreground">—</p>
      <p className="mt-1 text-[12px] text-muted-foreground">Requires Vercel Observability Plus on the linked project.</p>
    </div>
  );
}
