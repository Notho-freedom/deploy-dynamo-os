import { Link } from 'react-router-dom';
import { AlertCircle, Clock3, GitBranch, LayoutGrid, Plus, Rocket } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { DashboardToolbar, EmptyPanel, ProjectCard, SectionPanel } from '@/components/dashboard/DashboardPrimitives';
import { Button } from '@/components/ui/button';
import { useDashboardProjects, useRecentDeployments } from '@/hooks/useDashboardData';

export default function Dashboard() {
  const { projects, rawProjects, loading, error } = useDashboardProjects();
  const deployments = useRecentDeployments(rawProjects, 4);
  const recentPreviewDeployments = deployments.rows.filter((row) => row.environment === 'Preview').slice(0, 8);

  return (
    <div>
      <DashboardToolbar
        eyebrow="All Projects"
        title="Overview"
        subtitle="Projects, deployments and connected production surfaces."
        actions={
          <Button asChild size="sm" className="gap-1.5">
            <Link to="/dashboard/deploy/new">
              <Plus className="h-3.5 w-3.5" />
              Add New
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 px-4 py-6 xl:grid-cols-[360px_1fr] md:px-6">
        <aside className="space-y-6">
          <SectionPanel title="Usage" meta="No metering source">
            <EmptyPanel
              className="min-h-[170px] rounded-none border-0 bg-transparent"
              icon={<AlertCircle className="h-7 w-7" />}
              title="Usage is not connected"
              description="Real usage metrics will appear here once a billing or observability source is wired."
            />
          </SectionPanel>

          <SectionPanel title="Alerts" meta="Empty">
            <EmptyPanel
              className="min-h-[150px] rounded-none border-0 bg-transparent"
              icon={<Clock3 className="h-7 w-7" />}
              title="No alerts configured"
              description="Project alerts and anomaly notifications need a real monitoring source before they can be shown."
            />
          </SectionPanel>

          <SectionPanel title="Recent Previews" meta={recentPreviewDeployments.length ? `${recentPreviewDeployments.length}` : 'Empty'}>
            {recentPreviewDeployments.length === 0 ? (
              <EmptyPanel
                className="min-h-[180px] rounded-none border-0 bg-transparent"
                title="No preview deployments"
                description="Preview deployments from your imported projects will appear here."
              />
            ) : (
              <div className="divide-y divide-border">
                {recentPreviewDeployments.map((row) => (
                  <Link
                    key={row.uid}
                    to={`/dashboard/deploy/${row.projectId}?deployment=${row.uid}`}
                    className="block px-4 py-3 transition hover:bg-muted/30"
                  >
                    <p className="truncate text-[13px] font-medium">{row.message}</p>
                    <div className="mt-1 flex items-center gap-2 text-[12px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <GitBranch className="h-3.5 w-3.5" />
                        {row.branch}
                      </span>
                      <span>·</span>
                      <span>{row.commitSha}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </SectionPanel>
        </aside>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[14px] font-semibold">Your Projects</h2>
              <p className="text-[12px] text-muted-foreground">Imported repositories with their latest deployment status.</p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/dashboard/deploy">View Deployments</Link>
            </Button>
          </div>

          {error && (
            <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-[13px] text-warning">
              Some project data could not be loaded: {error}
            </div>
          )}

          {loading ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-40 animate-pulse rounded-md border border-border bg-card" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <EmptyPanel
              icon={<LayoutGrid className="h-9 w-9" />}
              title="No projects yet"
              description="Import a Git repository to create your first project and start tracking real deployments."
              action={
                <Button asChild className="gap-1.5">
                  <Link to="/dashboard/deploy/new">
                    <Rocket className="h-3.5 w-3.5" />
                    Import Git Repository
                  </Link>
                </Button>
              }
            />
          ) : (
            <>
              <div className="grid gap-4 lg:grid-cols-2">
                {projects.map((project) => (
                  <ProjectCard key={project.projectId} project={project} />
                ))}
              </div>
              <Button asChild variant="outline" className="w-full">
                <Link to="/dashboard/deploy">Show More</Link>
              </Button>
            </>
          )}

          <SectionPanel title="Recent Production Deployments" meta={deployments.rows.length ? `${deployments.rows.length}` : 'Empty'}>
            {deployments.rows.filter((row) => row.environment === 'Production').slice(0, 6).length === 0 ? (
              <EmptyPanel
                className="min-h-[160px] rounded-none border-0 bg-transparent"
                title="No production deployments"
                description="Production deployments from your projects will appear here after import."
              />
            ) : (
              <div className="divide-y divide-border">
                {deployments.rows
                  .filter((row) => row.environment === 'Production')
                  .slice(0, 6)
                  .map((row) => (
                    <Link key={row.uid} to={`/dashboard/deploy/${row.projectId}?deployment=${row.uid}`} className="grid gap-3 px-4 py-3 transition hover:bg-muted/30 md:grid-cols-[1fr_160px_120px]">
                      <span className="truncate text-[13px] font-medium">{row.message}</span>
                      <span className="truncate text-[12px] text-muted-foreground">{row.projectName}</span>
                      <span className="text-right text-[12px] text-muted-foreground">{formatDistanceToNow(row.created, { addSuffix: true })}</span>
                    </Link>
                  ))}
              </div>
            )}
          </SectionPanel>
        </section>
      </div>
    </div>
  );
}
