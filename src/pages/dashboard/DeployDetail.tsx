import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileCode2,
  GitBranch,
  Github,
  Globe,
  Loader2,
  RefreshCw,
  Rocket,
  Server,
  Settings2,
  Triangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { UserProjectRecord } from '@/hooks/useDashboardData';
import { decodeBase64Utf8, GhTreeEntry, github } from '@/lib/github';
import { openLogStream, vercel, VercelDeployment, VercelDomain, VercelEnvVariable, VercelEvent, VercelProject } from '@/lib/vercel';
import { Button } from '@/components/ui/button';
import {
  DashboardToolbar,
  DeploymentStatusBadge,
  EmptyPanel,
  SectionPanel,
} from '@/components/dashboard/DashboardPrimitives';
import { Terminal, TerminalLine } from '@/components/Terminal';
import { FileTree } from '@/components/FileTree';
import { SyntaxHighlighter, languageForFilename } from '@/components/SyntaxHighlighter';
import { cn, safeFormatDistance, shortDeploymentId } from '@/lib/utils';

type DetailTab = 'deployment' | 'logs' | 'resources' | 'source' | 'open-graph';

const tabs: Array<{ id: DetailTab; label: string }> = [
  { id: 'deployment', label: 'Deployment' },
  { id: 'logs', label: 'Logs' },
  { id: 'resources', label: 'Resources' },
  { id: 'source', label: 'Source' },
  { id: 'open-graph', label: 'Open Graph' },
];

export default function DeployDetail() {
  const { user } = useAuth();
  const { projectId } = useParams<{ projectId: string }>();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const initialDeployment = params.get('deployment');
  const tabParam = (params.get('tab') as DetailTab) || 'deployment';
  const [tab, setTab] = useState<DetailTab>(tabParam);
  const [meta, setMeta] = useState<UserProjectRecord | null>(null);
  const [project, setProject] = useState<VercelProject | null>(null);
  const [deployment, setDeployment] = useState<VercelDeployment | null>(null);
  const [domains, setDomains] = useState<VercelDomain[]>([]);
  const [envs, setEnvs] = useState<VercelEnvVariable[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const setTabSticky = (id: DetailTab) => {
    setTab(id);
    const next = new URLSearchParams(params);
    next.set('tab', id);
    setParams(next, { replace: true });
  };

  const loadMeta = useCallback(async () => {
    if (!projectId || !user) return null;
    const { data, error } = await supabase
      .from('user_projects')
      .select('*')
      .eq('user_id', user.id)
      .eq('vercel_project_id', projectId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const record = data as UserProjectRecord | null;
    setMeta(record);
    return record;
  }, [projectId, user]);

  const loadProjectDetail = useCallback(async () => {
    if (!projectId) return;
    try {
      const p = await vercel.getProject(projectId);
      setProject(p);
    } catch (e) {
      // ignore
    }
  }, [projectId]);

  const loadDeployment = useCallback(async (id: string): Promise<VercelDeployment | undefined> => {
    const item = await vercel.getDeployment(id, { silent404: true });
    if (!item) {
      setNotFound(true);
      return undefined;
    }
    setDeployment(item);
    return item;
  }, []);

  const loadProjectResources = useCallback(async () => {
    if (!projectId) return;
    const [domainResult, envResult] = await Promise.all([
      vercel.listDomains(projectId).catch(() => ({ domains: [] as VercelDomain[] })),
      vercel.listEnv(projectId).catch(() => ({ envs: [] as VercelEnvVariable[], env: [] as VercelEnvVariable[] })),
    ]);
    setDomains(domainResult.domains || []);
    setEnvs(envResult.envs || envResult.env || []);
  }, [projectId]);

  useEffect(() => {
    let active = true;
    async function init() {
      setLoading(true);
      setNotFound(false);
      try {
        const record = await loadMeta();
        await loadProjectDetail();
        let id = initialDeployment;
        if (!id && projectId) {
          const list = await vercel
            .listDeployments(projectId, 1)
            .catch(() => ({ deployments: [] as VercelDeployment[] }));
          id = list.deployments[0]?.uid || list.deployments[0]?.id || null;
        }
        if (id && active) await loadDeployment(id);
        if (active) await loadProjectResources();
      } catch (error) {
        if (active) toast.error(error instanceof Error ? error.message : String(error));
      } finally {
        if (active) setLoading(false);
      }
    }
    void init();
    return () => {
      active = false;
    };
  }, [initialDeployment, loadDeployment, loadMeta, loadProjectDetail, loadProjectResources, projectId]);

  // Re-poll only the deployment status (not events — those come via SSE).
  useEffect(() => {
    if (!deployment) return;
    if (deployment.state === 'READY' || deployment.state === 'ERROR' || deployment.state === 'CANCELED') return;
    let cancelled = false;
    let timer: number | undefined;
    const tick = async () => {
      try {
        const next = await vercel.getDeployment(deployment.uid, { silent404: true });
        if (cancelled) return;
        if (!next) {
          setNotFound(true);
          return;
        }
        setDeployment(next);
        if (next.state !== 'READY' && next.state !== 'ERROR' && next.state !== 'CANCELED') {
          timer = window.setTimeout(tick, 3000);
        }
      } catch {
        // stop polling on transient error
      }
    };
    timer = window.setTimeout(tick, 3000);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [deployment]);

  const redeploy = async () => {
    if (!meta) return;
    try {
      const item = await vercel.createDeployment({
        name: meta.vercel_project_name,
        gitSource: { type: 'github', repoId: Number(meta.github_repo_id), ref: meta.branch },
        target: 'production',
      });
      toast.success('Redeploy triggered');
      const fresh = await loadDeployment((item.id || item.uid) as string);
      if (fresh) setTabSticky('logs');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  };

  const projectTitle = meta?.vercel_project_name || project?.name || deployment?.name || projectId || 'Deployment';

  return (
    <div>
      <DashboardToolbar
        eyebrow="Deployments"
        title={projectTitle}
        subtitle={meta ? `${meta.github_repo_full_name} · ${meta.branch}` : 'Deployment details'}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/deploy')} className="gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </Button>
            {deployment?.url && (
              <Button asChild variant="outline" size="sm" className="gap-1.5">
                <a href={`https://${deployment.url}`} target="_blank" rel="noreferrer">
                  Visit
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            )}
            <Button size="sm" onClick={redeploy} disabled={!meta} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              Redeploy
            </Button>
          </>
        }
      />

      <div className="border-b border-border px-4 md:px-6">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((item) => (
            <button
              key={item.id}
              onClick={() => setTabSticky(item.id)}
              className={cn(
                'h-11 shrink-0 border-b-2 px-3 text-[13px] transition',
                tab === item.id ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-6 md:px-6">
        {loading ? (
          <div className="flex h-64 items-center justify-center gap-2 rounded-md border border-border bg-card text-[13px] text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading deployment...
          </div>
        ) : notFound || !deployment ? (
          <EmptyPanel
            icon={<Rocket className="h-10 w-10" />}
            title="Deployment unavailable"
            description="This deployment no longer exists on Vercel or has been removed. Trigger a new redeploy to continue."
            action={
              meta ? (
                <Button onClick={redeploy} className="gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" /> Redeploy
                </Button>
              ) : null
            }
          />
        ) : (
          <>
            {tab === 'deployment' && (
              <DeploymentOverviewTab deployment={deployment} project={project} meta={meta} domains={domains} />
            )}
            {tab === 'logs' && <LogsTab deployment={deployment} />}
            {tab === 'resources' && <ResourcesTab deployment={deployment} envs={envs} />}
            {tab === 'source' && <SourceTab meta={meta} />}
            {tab === 'open-graph' && <OpenGraphTab deployment={deployment} />}
          </>
        )}
      </div>
    </div>
  );
}

/* -------------------------------- Deployment -------------------------------- */

function DeploymentOverviewTab({
  deployment,
  project,
  meta,
  domains,
}: {
  deployment: VercelDeployment;
  project: VercelProject | null;
  meta: UserProjectRecord | null;
  domains: VercelDomain[];
}) {
  const duration =
    deployment.ready && deployment.created
      ? `${Math.max(0, Math.round((deployment.ready - deployment.created) / 1000))}s`
      : deployment.state === 'BUILDING'
        ? 'In progress'
        : '—';

  return (
    <div className="space-y-5">
      <SectionPanel title="Deployment Details">
        <div className="grid gap-5 p-4 lg:grid-cols-[360px_1fr]">
          <div className="flex min-h-[180px] items-center justify-center rounded-md border border-border bg-muted/20">
            {deployment.url ? (
              <img
                src={`https://api.microlink.io/?url=${encodeURIComponent(`https://${deployment.url}`)}&screenshot=true&meta=false&embed=screenshot.url`}
                alt={`Preview of ${deployment.url}`}
                className="h-full w-full rounded-md object-cover"
                onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
              />
            ) : (
              <Triangle className="h-12 w-12 fill-current text-muted-foreground" />
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <InfoItem label="Deployment ID" value={<span className="font-mono text-[12px]">{shortDeploymentId(deployment.uid)}</span>} />
            <InfoItem label="Status" value={<DeploymentStatusBadge state={deployment.state} />} />
            <InfoItem label="Environment" value={deployment.target === 'production' ? 'Production' : 'Preview'} />
            <InfoItem label="Created" value={safeFormatDistance(deployment.created, { addSuffix: true })} />
            <InfoItem label="Duration" value={duration} />
            <InfoItem label="Author" value={deployment.creator?.username || deployment.meta?.githubCommitAuthorLogin || '—'} />
            <InfoItem label="Domain" value={deployment.url || '—'} wide />
            <InfoItem label="Commit" value={deployment.meta?.githubCommitMessage || 'No commit message'} wide />
          </div>
        </div>
      </SectionPanel>

      <SectionPanel title="Build & Deployment Settings">
        <div className="grid gap-3 p-4 md:grid-cols-3">
          <SettingTile icon={<Settings2 className="h-4 w-4" />} label="Framework" value={project?.framework || meta?.framework || 'Other'} />
          <SettingTile icon={<GitBranch className="h-4 w-4" />} label="Branch" value={deployment.meta?.githubCommitRef || meta?.branch || 'Unknown'} />
          <SettingTile icon={<Github className="h-4 w-4" />} label="Repository" value={meta?.github_repo_full_name || project?.link?.repo || '—'} />
          <SettingTile icon={<Server className="h-4 w-4" />} label="Root Directory" value={project?.rootDirectory || './'} />
          <SettingTile icon={<Server className="h-4 w-4" />} label="Build Command" value={project?.buildCommand || 'Auto'} />
          <SettingTile icon={<Server className="h-4 w-4" />} label="Output Directory" value={project?.outputDirectory || 'Auto'} />
          <SettingTile icon={<Server className="h-4 w-4" />} label="Install Command" value={project?.installCommand || 'Auto'} />
          <SettingTile icon={<Server className="h-4 w-4" />} label="Node Version" value={project?.nodeVersion || 'Default'} />
          <SettingTile icon={<CheckCircle2 className="h-4 w-4" />} label="Environment Variables" value={`Configured at project level`} />
        </div>
      </SectionPanel>

      <SectionPanel title="Assigned Domains" meta={domains.length ? `${domains.length}` : 'Empty'}>
        {domains.length === 0 ? (
          <EmptyPanel className="rounded-none border-0 bg-transparent" title="No domains assigned" description="Custom domains from Vercel will appear here when attached to this project." />
        ) : (
          <div className="divide-y divide-border">
            {domains.map((domain) => (
              <div key={domain.name} className="flex items-center gap-3 px-4 py-3 text-[13px]">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{domain.name}</span>
                <span className={cn('text-[12px]', domain.verified ? 'text-success' : 'text-warning')}>{domain.verified ? 'Verified' : 'Needs verification'}</span>
              </div>
            ))}
          </div>
        )}
      </SectionPanel>
    </div>
  );
}

/* ----------------------------------- Logs ----------------------------------- */

function eventToLine(ev: VercelEvent): TerminalLine | null {
  const text = ev.payload?.text ?? '';
  if (!text) return null;
  const type = ev.payload?.info?.type;
  const status = ev.payload?.statusCode;
  let tone: TerminalLine['tone'] = 'default';
  if (type === 'stderr' || (status && status >= 400)) tone = 'error';
  else if (ev.type === 'command') tone = 'cmd';
  else if (ev.type === 'delimiter') tone = 'muted';
  const ts = (() => {
    try {
      return new Date(ev.created).toISOString().slice(11, 19);
    } catch {
      return '--:--:--';
    }
  })();
  return { tone, text: `${ts}  ${text.replace(/\n+$/, '')}` };
}

function LogsTab({ deployment }: { deployment: VercelDeployment }) {
  const [events, setEvents] = useState<VercelEvent[]>([]);
  const [streaming, setStreaming] = useState(false);
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    let close: (() => void) | null = null;
    setEvents([]);
    seenRef.current = new Set();

    async function start() {
      // 1. Backfill via REST so we don't lose existing logs.
      try {
        const initial = (await vercel.getDeploymentEvents(deployment.uid)) || [];
        if (cancelled) return;
        const arr = Array.isArray(initial) ? initial : [];
        arr.forEach((e) => {
          const key = `${e.created}-${e.payload?.text?.slice(0, 32) ?? ''}-${e.type}`;
          seenRef.current.add(key);
        });
        setEvents(arr);
      } catch {
        // ignore
      }

      // 2. Open SSE for live updates (only while building).
      if (deployment.state === 'BUILDING' || deployment.state === 'QUEUED' || deployment.state === 'INITIALIZING') {
        // Pass the supabase access token via query because EventSource cannot set headers.
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token || cancelled) return;
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const url = `https://${projectId}.supabase.co/functions/v1/vercel-logs-stream?id=${encodeURIComponent(deployment.uid)}&token=${encodeURIComponent(token)}`;
        try {
          const es = new EventSource(url);
          setStreaming(true);
          es.onmessage = (ev) => {
            if (!ev.data) return;
            try {
              const parsed = JSON.parse(ev.data) as VercelEvent;
              const key = `${parsed.created}-${parsed.payload?.text?.slice(0, 32) ?? ''}-${parsed.type}`;
              if (seenRef.current.has(key)) return;
              seenRef.current.add(key);
              setEvents((prev) => [...prev, parsed]);
            } catch {
              // ignore non-JSON
            }
          };
          es.onerror = () => {
            setStreaming(false);
            es.close();
          };
          close = () => {
            setStreaming(false);
            es.close();
          };
        } catch {
          setStreaming(false);
        }
      }
    }

    void start();
    return () => {
      cancelled = true;
      if (close) close();
    };
  }, [deployment.uid, deployment.state]);

  const lines = useMemo(
    () =>
      (events
        .map(eventToLine)
        .filter(Boolean) as TerminalLine[]),
    [events],
  );

  return (
    <SectionPanel title="Build Logs" meta={`${lines.length} lines`}>
      <Terminal
        lines={lines}
        streaming={streaming}
        prompt={`build · ${deployment.name}`}
        height="h-[640px]"
        className="rounded-none border-0"
      />
    </SectionPanel>
  );
}

/* -------------------------------- Resources -------------------------------- */

function ResourcesTab({ deployment, envs }: { deployment: VercelDeployment; envs: VercelEnvVariable[] }) {
  const functions = deployment.functions ? Object.entries(deployment.functions) : [];

  return (
    <div className="space-y-5">
      <SectionPanel title="Functions" meta={functions.length ? `${functions.length}` : 'Empty'}>
        {functions.length === 0 ? (
          <EmptyPanel className="rounded-none border-0 bg-transparent" title="No serverless functions" description="No function metadata is exposed for this deployment." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-[13px]">
              <thead className="border-b border-border bg-muted/20 text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Path</th>
                  <th className="px-4 py-2 text-left font-medium">Runtime</th>
                  <th className="px-4 py-2 text-left font-medium">Memory</th>
                  <th className="px-4 py-2 text-left font-medium">Max Duration</th>
                  <th className="px-4 py-2 text-left font-medium">Regions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {functions.map(([path, fn]) => (
                  <tr key={path}>
                    <td className="truncate px-4 py-2 font-mono text-[12px]">{path}</td>
                    <td className="px-4 py-2 text-muted-foreground">{fn.runtime || '—'}</td>
                    <td className="px-4 py-2 text-muted-foreground">{fn.memory ? `${fn.memory} MB` : '—'}</td>
                    <td className="px-4 py-2 text-muted-foreground">{fn.maxDuration ? `${fn.maxDuration}s` : '—'}</td>
                    <td className="px-4 py-2 text-muted-foreground">{fn.regions?.join(', ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionPanel>

      <SectionPanel title="Environment Variables" meta={`${envs.length} configured`}>
        {envs.length === 0 ? (
          <EmptyPanel className="rounded-none border-0 bg-transparent" title="No environment variables" description="Add environment variables in Project Settings to make them available to this deployment." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-[13px]">
              <thead className="border-b border-border bg-muted/20 text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Key</th>
                  <th className="px-4 py-2 text-left font-medium">Target</th>
                  <th className="px-4 py-2 text-left font-medium">Type</th>
                  <th className="px-4 py-2 text-right font-medium">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {envs.map((env) => (
                  <tr key={env.id}>
                    <td className="px-4 py-2 font-mono text-[12px]">{env.key}</td>
                    <td className="px-4 py-2 text-muted-foreground">{env.target?.join(', ') || '—'}</td>
                    <td className="px-4 py-2 text-muted-foreground">{env.type || '—'}</td>
                    <td className="px-4 py-2 text-right text-muted-foreground">{safeFormatDistance(env.updatedAt, { addSuffix: true })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionPanel>
    </div>
  );
}

/* ---------------------------------- Source --------------------------------- */

function SourceTab({ meta }: { meta: UserProjectRecord | null }) {
  const [entries, setEntries] = useState<GhTreeEntry[]>([]);
  const [loadingTree, setLoadingTree] = useState(false);
  const [treeError, setTreeError] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | undefined>('package.json');
  const [content, setContent] = useState<string | null>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);

  const owner = meta?.github_repo_full_name?.split('/')[0];
  const repo = meta?.github_repo_full_name?.split('/')[1];
  const branch = meta?.branch || 'main';

  useEffect(() => {
    let active = true;
    async function loadTree() {
      if (!owner || !repo) return;
      setLoadingTree(true);
      setTreeError(null);
      try {
        const tree = await github.repoTree(owner, repo, branch);
        if (!active) return;
        setEntries(tree.tree.filter((e) => e.type === 'blob' || e.type === 'tree'));
      } catch (e) {
        if (!active) return;
        setTreeError(e instanceof Error ? e.message : String(e));
      } finally {
        if (active) setLoadingTree(false);
      }
    }
    void loadTree();
    return () => {
      active = false;
    };
  }, [owner, repo, branch]);

  useEffect(() => {
    let active = true;
    async function loadContent() {
      if (!owner || !repo || !selectedPath) return;
      setContentLoading(true);
      setContentError(null);
      try {
        const file = await github.repoFile(owner, repo, selectedPath, branch);
        if (!active) return;
        if (file.encoding === 'base64') setContent(decodeBase64Utf8(file.content));
        else setContent(String(file.content || ''));
      } catch (e) {
        if (!active) return;
        setContent(null);
        setContentError(e instanceof Error ? e.message : String(e));
      } finally {
        if (active) setContentLoading(false);
      }
    }
    void loadContent();
    return () => {
      active = false;
    };
  }, [owner, repo, branch, selectedPath]);

  if (!owner || !repo) {
    return <EmptyPanel icon={<FileCode2 className="h-10 w-10" />} title="No GitHub repository linked" description="Source view requires a linked GitHub repository on the imported project." />;
  }

  if (treeError) {
    return <EmptyPanel icon={<FileCode2 className="h-10 w-10" />} title="Could not load source" description={treeError} />;
  }

  return (
    <div className="grid h-[calc(100vh-220px)] grid-cols-[260px_1fr] gap-3">
      <div className="overflow-hidden rounded-md border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border bg-muted/20 px-3 py-2 text-[11px] uppercase tracking-wide text-muted-foreground">
          <span>Files</span>
          <span className="font-mono normal-case text-[10px]">{branch}</span>
        </div>
        <FileTree
          entries={entries}
          loading={loadingTree}
          selectedPath={selectedPath}
          onSelect={setSelectedPath}
          className="h-[calc(100%-32px)]"
        />
      </div>
      <div className="flex min-h-0 flex-col overflow-hidden rounded-md border border-border bg-[#1e1e1e]">
        <div className="flex items-center justify-between gap-2 border-b border-border bg-[#181818] px-4 py-2.5">
          <div className="inline-flex min-w-0 items-center gap-2">
            <FileCode2 className="h-4 w-4 text-muted-foreground" />
            <span className="truncate font-mono text-[12px] text-foreground/90">{selectedPath || '—'}</span>
            {selectedPath && (
              <span className="rounded border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                {languageForFilename(selectedPath)}
              </span>
            )}
          </div>
          {selectedPath && (
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <a href={`https://github.com/${owner}/${repo}/blob/${branch}/${selectedPath}`} target="_blank" rel="noreferrer">
                GitHub <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          )}
        </div>
        <div className="flex-1 overflow-auto">
          {contentLoading ? (
            <div className="flex h-full items-center justify-center text-[12px] text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading file…</div>
          ) : contentError ? (
            <div className="p-6 text-[12px] text-muted-foreground">{contentError}</div>
          ) : content === null ? (
            <div className="p-6 text-[12px] text-muted-foreground">Select a file in the tree.</div>
          ) : (
            <SyntaxHighlighter code={content} filename={selectedPath || ''} />
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- Open Graph -------------------------------- */

function OpenGraphTab({ deployment }: { deployment: VercelDeployment }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ title?: string; description?: string; image?: { url?: string }; url?: string; publisher?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!deployment.url) {
        setError('Deployment has no public URL yet.');
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(`https://${deployment.url}`)}&screenshot=true`);
        const json = await res.json();
        if (!active) return;
        if (json.status !== 'success') {
          setError(json.message || 'Could not fetch Open Graph metadata.');
        } else {
          setData(json.data);
        }
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [deployment.url]);

  if (loading) {
    return <div className="flex h-64 items-center justify-center gap-2 text-[13px] text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Inspecting deployment…</div>;
  }
  if (error || !data) {
    return <EmptyPanel icon={<Globe className="h-10 w-10" />} title="No Open Graph preview" description={error || 'Could not inspect this deployment.'} />;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <SectionPanel title="Preview">
        {data.image?.url ? (
          <img src={data.image.url} alt="OG preview" className="w-full" />
        ) : (
          <EmptyPanel className="rounded-none border-0 bg-transparent" title="No screenshot available" />
        )}
      </SectionPanel>
      <SectionPanel title="Meta">
        <dl className="divide-y divide-border text-[13px]">
          <Row label="Title" value={data.title} />
          <Row label="Description" value={data.description} />
          <Row label="URL" value={data.url} />
          <Row label="Publisher" value={data.publisher} />
        </dl>
      </SectionPanel>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 px-4 py-3">
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="break-words text-[13px]">{value || '—'}</dd>
    </div>
  );
}

function InfoItem({ label, value, wide }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return (
    <div className={cn('min-w-0', wide && 'md:col-span-2 xl:col-span-3')}>
      <p className="mb-1 text-[11px] text-muted-foreground">{label}</p>
      <div className="min-w-0 break-words text-[13px] font-medium">{value}</div>
    </div>
  );
}

function SettingTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-[11px]">{label}</span>
      </div>
      <p className="truncate text-[13px] font-medium">{value}</p>
    </div>
  );
}
