import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { Globe, Loader2, Search } from 'lucide-react';
import { DashboardToolbar, EmptyPanel, FilterBar, SectionPanel } from '@/components/dashboard/DashboardPrimitives';
import { useUserProjects, UserProjectRecord } from '@/hooks/useDashboardData';
import { vercel, VercelDomain } from '@/lib/vercel';
import { cn, safeDateString } from '@/lib/utils';

interface DomainRow extends VercelDomain {
  projectName: string;
  projectId: string;
}

export default function Domains() {
  const { projects, loading: projectsLoading, error: projectsError } = useUserProjects();
  const [query, setQuery] = useState('');

  const results = useQueries({
    queries: projects.map((project: UserProjectRecord) => ({
      queryKey: ['project-domains', project.vercel_project_id],
      queryFn: () => vercel.listDomains(project.vercel_project_id),
      staleTime: 60_000,
    })),
  });

  const domains = useMemo<DomainRow[]>(() => {
    return results.flatMap((r, i) => {
      const project = projects[i];
      if (!project || !r.data?.domains) return [];
      return r.data.domains.map((d) => ({
        ...d,
        projectName: project.vercel_project_name,
        projectId: project.vercel_project_id,
      }));
    });
  }, [results, projects]);

  const domainError = results.find((r) => r.error)?.error;
  const loadingDomains = results.some((r) => r.isLoading && !r.data);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return domains.filter((domain) => !normalized || domain.name.toLowerCase().includes(normalized) || domain.projectName.toLowerCase().includes(normalized));
  }, [domains, query]);

  const loading = projectsLoading || loadingDomains;
  const error = projectsError || (domainError instanceof Error ? domainError.message : null);


  return (
    <div>
      <DashboardToolbar
        eyebrow="All Projects"
        title="Domains"
        subtitle="Domains attached to your imported Vercel projects."
      />

      <div className="space-y-5 px-4 py-6 md:px-6">
        <SectionPanel title="Find a Domain" meta="Registrar not connected">
          <div className="p-4">
            <div className="flex h-11 items-center gap-2 rounded-md border border-border bg-background px-3 text-[13px] text-muted-foreground">
              <Search className="h-4 w-4" />
              Domain search and registration need a real registrar source before results can be shown.
            </div>
          </div>
        </SectionPanel>

        <FilterBar query={query} onQueryChange={setQuery} placeholder="Search domains..." />

        {error && (
          <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-[13px] text-warning">
            Some domain data could not be loaded: {error}
          </div>
        )}

        <SectionPanel title="Project Domains" meta={filtered.length ? `${filtered.length}` : 'Empty'}>
          {loading ? (
            <div className="flex h-44 items-center justify-center gap-2 text-[13px] text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading domains...
            </div>
          ) : filtered.length === 0 ? (
            <EmptyPanel
              className="rounded-none border-0 bg-transparent"
              icon={<Globe className="h-10 w-10" />}
              title="No domains found"
              description="Attached Vercel domains will appear here once a project has domains configured."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-[13px]">
                <thead className="border-b border-border text-[11px] text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium">Domain</th>
                    <th className="px-4 py-2.5 text-left font-medium">Project</th>
                    <th className="px-4 py-2.5 text-left font-medium">Status</th>
                    <th className="px-4 py-2.5 text-left font-medium">Branch</th>
                    <th className="px-4 py-2.5 text-right font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((domain) => (
                    <tr key={`${domain.projectId}-${domain.name}`} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <Link to={`/dashboard/domains/${encodeURIComponent(domain.name)}`} className="font-medium hover:text-primary">
                          {domain.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{domain.projectName}</td>
                      <td className="px-4 py-3">
                        <span className={cn('rounded-full border px-2 py-0.5 text-[12px]', domain.verified ? 'border-success/30 bg-success/10 text-success' : 'border-warning/30 bg-warning/10 text-warning')}>
                          {domain.verified ? 'Verified' : 'Needs verification'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{domain.gitBranch || 'Production'}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{safeDateString(domain.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionPanel>
      </div>
    </div>
  );
}
