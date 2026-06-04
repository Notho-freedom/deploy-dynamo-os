import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, GitBranch, Plus, Rocket } from 'lucide-react';
import { DashboardToolbar, DeploymentTable, EmptyPanel, FilterBar, SelectFilter } from '@/components/dashboard/DashboardPrimitives';
import { Button } from '@/components/ui/button';
import { useRecentDeployments, useUserProjects } from '@/hooks/useDashboardData';

export default function Deploy() {
  const { projects, loading: projectsLoading, error: projectsError } = useUserProjects();
  const { rows, loading: deploymentsLoading, error: deploymentsError } = useRecentDeployments(projects, 12);
  const [query, setQuery] = useState('');
  const [environment, setEnvironment] = useState('all');
  const [status, setStatus] = useState('all');
  const [repo, setRepo] = useState('all');
  const [branch, setBranch] = useState('all');

  const repoOptions = useMemo(
    () => [
      { label: 'All Repositories', value: 'all' },
      ...Array.from(new Set(rows.map((row) => row.repo))).map((value) => ({ label: value, value })),
    ],
    [rows],
  );

  const branchOptions = useMemo(
    () => [
      { label: 'All Branches', value: 'all' },
      ...Array.from(new Set(rows.map((row) => row.branch))).map((value) => ({ label: value, value })),
    ],
    [rows],
  );

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesQuery =
        !normalized ||
        row.message.toLowerCase().includes(normalized) ||
        row.projectName.toLowerCase().includes(normalized) ||
        row.repo.toLowerCase().includes(normalized) ||
        row.commitSha.toLowerCase().includes(normalized);
      const matchesEnvironment = environment === 'all' || row.environment === environment;
      const matchesStatus = status === 'all' || row.state === status;
      const matchesRepo = repo === 'all' || row.repo === repo;
      const matchesBranch = branch === 'all' || row.branch === branch;
      return matchesQuery && matchesEnvironment && matchesStatus && matchesRepo && matchesBranch;
    });
  }, [branch, environment, query, repo, rows, status]);

  const loading = projectsLoading || deploymentsLoading;
  const error = projectsError || deploymentsError;

  return (
    <div>
      <DashboardToolbar
        eyebrow="All Projects"
        title="Deployments"
        subtitle="Build history from your imported Vercel projects."
        actions={
          <Button asChild size="sm" className="gap-1.5">
            <Link to="/dashboard/deploy/new">
              <Plus className="h-3.5 w-3.5" />
              New Project
            </Link>
          </Button>
        }
      />

      <div className="space-y-4 px-4 py-6 md:px-6">
        <FilterBar query={query} onQueryChange={setQuery} placeholder="Search deployments...">
          <SelectFilter
            label="Environment"
            value={environment}
            onChange={setEnvironment}
            options={[
              { label: 'All Environments', value: 'all' },
              { label: 'Production', value: 'Production' },
              { label: 'Preview', value: 'Preview' },
            ]}
          />
          <SelectFilter
            label="Repository"
            value={repo}
            onChange={setRepo}
            options={repoOptions}
          />
          <SelectFilter
            label="Branch"
            value={branch}
            onChange={setBranch}
            options={branchOptions}
          />
          <SelectFilter
            label="Status"
            value={status}
            onChange={setStatus}
            options={[
              { label: 'All Statuses', value: 'all' },
              { label: 'Ready', value: 'READY' },
              { label: 'Building', value: 'BUILDING' },
              { label: 'Error', value: 'ERROR' },
              { label: 'Queued', value: 'QUEUED' },
              { label: 'Canceled', value: 'CANCELED' },
            ]}
          />
        </FilterBar>

        {error && (
          <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-[13px] text-warning">
            Some deployment data could not be loaded: {error}
          </div>
        )}

        {!loading && projects.length === 0 ? (
          <EmptyPanel
            icon={<Rocket className="h-10 w-10" />}
            title="No projects imported"
            description="Deployments are shown from real imported projects. Import a Git repository to begin."
            action={
              <Button asChild className="gap-1.5">
                <Link to="/dashboard/deploy/new">
                  <Plus className="h-3.5 w-3.5" />
                  Import Git Repository
                </Link>
              </Button>
            }
          />
        ) : (
          <DeploymentTable rows={filteredRows} loading={loading} />
        )}

        <div className="grid gap-3 text-[12px] text-muted-foreground md:grid-cols-3">
          <div className="rounded-md border border-border bg-card px-3 py-2">
            <CalendarDays className="mr-1.5 inline h-3.5 w-3.5" />
            Date range filtering will appear after the logs API is connected.
          </div>
          <div className="rounded-md border border-border bg-card px-3 py-2">
            <GitBranch className="mr-1.5 inline h-3.5 w-3.5" />
            Branches are derived from real deployment metadata.
          </div>
          <div className="rounded-md border border-border bg-card px-3 py-2">
            Showing {filteredRows.length} of {rows.length} deployments.
          </div>
        </div>
      </div>
    </div>
  );
}
