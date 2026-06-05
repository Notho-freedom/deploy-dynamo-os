import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ScrollText } from 'lucide-react';
import { DashboardToolbar, EmptyPanel, FilterBar, SectionPanel, SelectFilter } from '@/components/dashboard/DashboardPrimitives';
import { Terminal, TerminalLine } from '@/components/Terminal';
import { supabase } from '@/integrations/supabase/client';
import { useUserProjects, UserProjectRecord } from '@/hooks/useDashboardData';
import { vercel, VercelDeployment, VercelEvent } from '@/lib/vercel';
import { safeFormatDistance } from '@/lib/utils';

interface AggregatedEvent extends VercelEvent {
  projectId: string;
  projectName: string;
  deploymentId: string;
}

export default function Logs() {
  const { projects } = useUserProjects();
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('all');
  const [events, setEvents] = useState<AggregatedEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [latestDeployments, setLatestDeployments] = useState<Array<{ project: UserProjectRecord; deployment: VercelDeployment }>>([]);
  const sourcesRef = useRef<EventSource[]>([]);

  // Load most-recent deployment per project.
  useEffect(() => {
    let active = true;
    async function load() {
      if (projects.length === 0) {
        setLatestDeployments([]);
        return;
      }
      setLoading(true);
      try {
        const results = await Promise.all(
          projects.map(async (project) => {
            const list = await vercel.listDeployments(project.vercel_project_id, 1).catch(() => ({ deployments: [] as VercelDeployment[] }));
            return list.deployments[0] ? { project, deployment: list.deployments[0] } : null;
          }),
        );
        if (!active) return;
        setLatestDeployments(results.filter(Boolean) as Array<{ project: UserProjectRecord; deployment: VercelDeployment }>);
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [projects]);

  // Backfill + open SSE streams for each (filtered) deployment.
  useEffect(() => {
    let cancelled = false;
    setEvents([]);
    sourcesRef.current.forEach((es) => es.close());
    sourcesRef.current = [];

    const targets = latestDeployments.filter((entry) => selectedProject === 'all' || entry.project.vercel_project_id === selectedProject);
    if (targets.length === 0) return;

    async function setup() {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

      for (const { project, deployment } of targets) {
        if (cancelled) return;
        // Backfill REST.
        try {
          const initial = (await vercel.getDeploymentEvents(deployment.uid)) || [];
          if (cancelled) return;
          if (Array.isArray(initial)) {
            setEvents((prev) =>
              [
                ...prev,
                ...initial.map((e) => ({
                  ...e,
                  projectId: project.vercel_project_id,
                  projectName: project.vercel_project_name,
                  deploymentId: deployment.uid,
                })),
              ].sort((a, b) => a.created - b.created).slice(-1500),
            );
          }
        } catch {
          // ignore
        }

        // Live stream while still building.
        const active = deployment.state === 'BUILDING' || deployment.state === 'QUEUED' || deployment.state === 'INITIALIZING';
        if (!active || !token) continue;
        const url = `https://${projectId}.supabase.co/functions/v1/vercel-logs-stream?id=${encodeURIComponent(deployment.uid)}&token=${encodeURIComponent(token)}`;
        const es = new EventSource(url);
        setStreaming(true);
        es.onmessage = (ev) => {
          if (!ev.data) return;
          try {
            const parsed = JSON.parse(ev.data) as VercelEvent;
            setEvents((prev) => [
              ...prev,
              {
                ...parsed,
                projectId: project.vercel_project_id,
                projectName: project.vercel_project_name,
                deploymentId: deployment.uid,
              },
            ].slice(-1500));
          } catch {
            // ignore
          }
        };
        es.onerror = () => es.close();
        sourcesRef.current.push(es);
      }
    }

    void setup();
    return () => {
      cancelled = true;
      sourcesRef.current.forEach((es) => es.close());
      sourcesRef.current = [];
      setStreaming(false);
    };
  }, [latestDeployments, selectedProject]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((e) => {
      const text = (e.payload?.text || '').toLowerCase();
      if (q && !text.includes(q) && !e.projectName.toLowerCase().includes(q)) return false;
      if (level === 'error' && !(e.payload?.info?.type === 'stderr' || (e.payload?.statusCode && e.payload.statusCode >= 400) || /error|fail/i.test(text))) return false;
      if (level === 'warn' && !/warn/i.test(text)) return false;
      return true;
    });
  }, [events, query, level]);

  const lines: TerminalLine[] = filtered.map((e) => {
    const tone: TerminalLine['tone'] =
      e.payload?.info?.type === 'stderr' || (e.payload?.statusCode && e.payload.statusCode >= 400) ? 'error' : 'default';
    let ts = '--:--:--';
    try { ts = new Date(e.created).toISOString().slice(11, 19); } catch { /* noop */ }
    return { tone, text: `${ts}  [${e.projectName}]  ${(e.payload?.text || '').replace(/\n+$/, '')}` };
  });

  return (
    <div>
      <DashboardToolbar
        eyebrow="All Projects"
        title="Logs"
        subtitle="Live and recent build logs across your imported projects."
      />

      <div className="space-y-4 px-4 py-6 md:px-6">
        <FilterBar query={query} onQueryChange={setQuery} placeholder="Filter log lines…">
          <SelectFilter
            label="Project"
            value={selectedProject}
            onChange={setSelectedProject}
            options={[
              { label: 'All Projects', value: 'all' },
              ...projects.map((p) => ({ label: p.vercel_project_name, value: p.vercel_project_id })),
            ]}
          />
          <SelectFilter
            label="Level"
            value={level}
            onChange={setLevel}
            options={[
              { label: 'All levels', value: 'all' },
              { label: 'Errors only', value: 'error' },
              { label: 'Warnings only', value: 'warn' },
            ]}
          />
        </FilterBar>

        {loading ? (
          <div className="flex h-48 items-center justify-center gap-2 rounded-md border border-border bg-card text-[13px] text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading recent logs…
          </div>
        ) : projects.length === 0 ? (
          <EmptyPanel icon={<ScrollText className="h-9 w-9" />} title="No projects connected" description="Import a project to see live and recent logs here." />
        ) : (
          <SectionPanel title="Recent build events" meta={`${filtered.length} lines`}>
            <Terminal lines={lines} streaming={streaming} prompt="logs · all projects" height="h-[560px]" className="rounded-none border-0" />
          </SectionPanel>
        )}

        <SectionPanel title="Sources" meta={latestDeployments.length ? `${latestDeployments.length} deployments` : 'Empty'}>
          {latestDeployments.length === 0 ? (
            <EmptyPanel className="rounded-none border-0 bg-transparent" title="Nothing to stream yet" description="Logs come from each project's latest deployment." />
          ) : (
            <div className="divide-y divide-border">
              {latestDeployments.map(({ project, deployment }) => (
                <Link
                  key={project.vercel_project_id}
                  to={`/dashboard/deploy/${project.vercel_project_id}?deployment=${deployment.uid}&tab=logs`}
                  className="grid gap-3 px-4 py-3 text-[13px] transition hover:bg-muted/30 md:grid-cols-[1fr_140px_120px_120px]"
                >
                  <span className="truncate font-medium">{project.vercel_project_name}</span>
                  <span className="truncate text-muted-foreground">{deployment.meta?.githubCommitRef || '—'}</span>
                  <span className="truncate text-muted-foreground">{deployment.state}</span>
                  <span className="text-right text-muted-foreground">{safeFormatDistance(deployment.created, { addSuffix: true })}</span>
                </Link>
              ))}
            </div>
          )}
        </SectionPanel>
      </div>
    </div>
  );
}
