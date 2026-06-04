import { useEffect, useMemo, useState } from 'react';
import { Globe, Loader2, Search } from 'lucide-react';
import { DashboardToolbar, EmptyPanel, FilterBar, SectionPanel } from '@/components/dashboard/DashboardPrimitives';
import { useUserProjects, UserProjectRecord } from '@/hooks/useDashboardData';
import { vercel, VercelDomain } from '@/lib/vercel';
import { cn } from '@/lib/utils';

interface DomainRow extends VercelDomain {
  projectName: string;
  projectId: string;
}

export default function Domains() {
  const { projects, loading: projectsLoading, error: projectsError } = useUserProjects();
  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [loadingDomains, setLoadingDomains] = useState(false);
  const [domainError, setDomainError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      if (projects.length === 0) {
        setDomains([]);
        setLoadingDomains(false);
        return;
      }
      setLoadingDomains(true);
      setDomainError(null);
      const results = await Promise.all(
        projects.map(async (project: UserProjectRecord) => {
          try {
            const result = await vercel.listDomains(project.vercel_project_id);
            return (result.domains || []).map((domain) => ({
              ...domain,
              projectName: project.vercel_project_name,
              projectId: project.vercel_project_id,
            }));
          } catch (error) {
            setDomainError(error instanceof Error ? error.message : String(error));
            return [] as DomainRow[];
          }
        }),
      );
      if (!active) return;
      setDomains(results.flat());
      setLoadingDomains(false);
    }
    void load();
    return () => {
      active = false;
    };
  }, [projects]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return domains.filter((domain) => !normalized || domain.name.toLowerCase().includes(normalized) || domain.projectName.toLowerCase().includes(normalized));
  }, [domains, query]);

  const loading = projectsLoading || loadingDomains;
  const error = projectsError || domainError;

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
                      <td className="px-4 py-3 font-medium">{domain.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{domain.projectName}</td>
                      <td className="px-4 py-3">
                        <span className={cn('rounded-full border px-2 py-0.5 text-[12px]', domain.verified ? 'border-success/30 bg-success/10 text-success' : 'border-warning/30 bg-warning/10 text-warning')}>
                          {domain.verified ? 'Verified' : 'Needs verification'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{domain.gitBranch || 'Production'}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{domain.updatedAt ? new Date(domain.updatedAt).toLocaleDateString() : '—'}</td>
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
