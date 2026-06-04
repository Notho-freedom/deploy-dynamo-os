import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { UserProjectRecord } from '@/hooks/useDashboardData';
import { github } from '@/lib/github';
import { vercel, VercelDeployment, VercelDomain, VercelEnvVariable, VercelEvent } from '@/lib/vercel';
import { Button } from '@/components/ui/button';
import { CodeViewer, DashboardToolbar, DeploymentStatusBadge, EmptyPanel, SectionPanel } from '@/components/dashboard/DashboardPrimitives';
import { Terminal } from '@/components/Terminal';
import { cn } from '@/lib/utils';

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
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const initialDeployment = params.get('deployment');
  const [tab, setTab] = useState<DetailTab>('deployment');
  const [meta, setMeta] = useState<UserProjectRecord | null>(null);
  const [deployment, setDeployment] = useState<VercelDeployment | null>(null);
  const [events, setEvents] = useState<VercelEvent[]>([]);
  const [domains, setDomains] = useState<VercelDomain[]>([]);
  const [envs, setEnvs] = useState<VercelEnvVariable[]>([]);
  const [sourceCode, setSourceCode] = useState<string | null>(null);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<number | null>(null);

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

  const loadDeployment = useCallback(async (id: string) => {
    const item = await vercel.getDeployment(id);
    setDeployment(item);
    const nextEvents = await vercel.getDeploymentEvents(id).catch(() => [] as VercelEvent[]);
    setEvents(Array.isArray(nextEvents) ? nextEvents : []);
    return item;
  }, []);

  const loadProjectResources = useCallback(async () => {
    if (!projectId) return;
    const [domainResult, envResult] = await Promise.all([
      vercel.listDomains(projectId).catch(() => ({ domains: [] as VercelDomain[] })),
      vercel.listEnv(projectId).catch(() => ({ envs: [] as VercelEnvVariable[] })),
    ]);
    setDomains(domainResult.domains || []);
    setEnvs(envResult.envs || envResult.env || []);
  }, [projectId]);

  const loadSource = useCallback(async (record: UserProjectRecord | null) => {
    if (!record?.github_repo_full_name) return;
    const [owner, repo] = record.github_repo_full_name.split('/');
    if (!owner || !repo) return;

    try {
      const file = await github.repoFile(owner, repo, 'package.json');
      if (file.encoding !== 'base64') {
        setSourceError('package.json is not base64 encoded.');
        return;
      }
      setSourceCode(atob(file.content.replace(/\n/g, '')));
      setSourceError(null);
    } catch (error) {
      setSourceCode(null);
      setSourceError(error instanceof Error ? error.message : String(error));
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function init() {
      setLoading(true);
      try {
        const record = await loadMeta();
        let id = initialDeployment;
        if (!id && projectId) {
          const list = await vercel.listDeployments(projectId, 1).catch(() => ({ deployments: [] as VercelDeployment[] }));
          id = list.deployments[0]?.uid || list.deployments[0]?.id || null;
        }
        if (id && active) await loadDeployment(id);
        if (active) await Promise.all([loadProjectResources(), loadSource(record)]);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : String(error));
      } finally {
        if (active) setLoading(false);
      }
    }
    void init();
    return () => {
      active = false;
    };
  }, [initialDeployment, loadDeployment, loadMeta, loadProjectResources, loadSource, projectId]);

  useEffect(() => {
    if (!deployment) return;
    if (deployment.state === 'READY' || deployment.state === 'ERROR' || deployment.state === 'CANCELED') return;
    pollRef.current = window.setInterval(() => {
      void loadDeployment(deployment.uid);
    }, 2500);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [deployment, loadDeployment]);

  const redeploy = async () => {
    if (!meta) return;
    try {
      const item = await vercel.createDeployment({
        name: meta.vercel_project_name,
        gitSource: { type: 'github', repoId: Number(meta.github_repo_id), ref: meta.branch },
        target: 'production',
      });
      toast.success('Redeploy triggered');
      await loadDeployment(item.id || item.uid);
      setTab('logs');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  };

  const terminalLines = useMemo(
    () =>
      events.length === 0
        ? [{ tone: 'muted' as const, text: deployment?.state === 'BUILDING' ? 'Waiting for build logs...' : 'No logs available for this deployment.' }]
        : events.map((event) => ({
            tone: (event.payload?.info?.type === 'stderr' || event.payload?.statusCode && event.payload.statusCode >= 400 ? 'error' : 'muted') as 'error' | 'muted',
            text: `[${new Date(event.created).toISOString().slice(11, 19)}] ${(event.payload?.text || '').replace(/\n+$/, '')}`,
          })),
    [deployment?.state, events],
  );

  const projectTitle = meta?.vercel_project_name || deployment?.name || projectId || 'Deployment';

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
              onClick={() => setTab(item.id)}
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
        ) : !deployment ? (
          <EmptyPanel
            icon={<Rocket className="h-10 w-10" />}
            title="No deployment yet"
            description="This project does not have a deployment available through the current Vercel source."
          />
        ) : (
          <>
            {tab === 'deployment' && (
              <div className="space-y-5">
                <SectionPanel title="Deployment Details">
                  <div className="grid gap-5 p-4 lg:grid-cols-[360px_1fr]">
                    <div className="flex min-h-[180px] items-center justify-center rounded-md border border-border bg-muted/20">
                      <Triangle className="h-12 w-12 fill-current text-muted-foreground" />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <InfoItem label="Status" value={<DeploymentStatusBadge state={deployment.state} />} />
                      <InfoItem label="Environment" value={deployment.target === 'production' ? 'Production' : 'Preview'} />
                      <InfoItem label="Created" value={formatDistanceToNow(deployment.created, { addSuffix: true })} />
                      <InfoItem label="Duration" value={deployment.ready ? `${Math.max(0, Math.round((deployment.ready - deployment.created) / 1000))}s` : 'In progress'} />
                      <InfoItem label="Domain" value={deployment.url} wide />
                      <InfoItem label="Source" value={deployment.meta?.githubCommitMessage || 'No commit message'} wide />
                    </div>
                  </div>
                </SectionPanel>

                <SectionPanel title="Deployment Settings">
                  <div className="grid gap-3 p-4 md:grid-cols-3">
                    <SettingTile icon={<GitBranch className="h-4 w-4" />} label="Branch" value={deployment.meta?.githubCommitRef || meta?.branch || 'Unknown'} />
                    <SettingTile icon={<Github className="h-4 w-4" />} label="Repository" value={meta?.github_repo_full_name || 'Unknown'} />
                    <SettingTile icon={<Settings2 className="h-4 w-4" />} label="Framework" value={meta?.framework || 'Other'} />
                  </div>
                </SectionPanel>

                <SectionPanel title="Assigning Custom Domains" meta={domains.length ? `${domains.length}` : 'Empty'}>
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
            )}

            {tab === 'logs' && (
              <SectionPanel title="Build Logs" meta={`${events.length} lines`}>
                <Terminal
                  lines={terminalLines}
                  streaming={deployment.state === 'BUILDING' || deployment.state === 'QUEUED' || deployment.state === 'INITIALIZING'}
                  prompt={`build · ${projectTitle}`}
                  height="h-[620px]"
                  className="rounded-none border-0"
                />
              </SectionPanel>
            )}

            {tab === 'resources' && (
              <div className="space-y-5">
                <SectionPanel title="Deployment Summary">
                  <div className="grid gap-3 p-4 md:grid-cols-3">
                    <SettingTile icon={<Triangle className="h-4 w-4 fill-current" />} label="Framework" value={meta?.framework || 'Other'} />
                    <SettingTile icon={<Server className="h-4 w-4" />} label="Static Assets" value="Not available from current API" />
                    <SettingTile icon={<CheckCircle2 className="h-4 w-4" />} label="Environment Variables" value={`${envs.length} configured`} />
                  </div>
                </SectionPanel>
                <SectionPanel title="Static Assets">
                  <EmptyPanel className="rounded-none border-0 bg-transparent" title="Resources API not connected" description="Static asset and function inventories need a dedicated resource endpoint before they can be shown without mock data." />
                </SectionPanel>
              </div>
            )}

            {tab === 'source' && (
              sourceCode ? (
                <CodeViewer filename="package.json" code={sourceCode} actions={meta?.github_repo_full_name ? <Button asChild variant="outline" size="sm" className="gap-1.5"><a href={`https://github.com/${meta.github_repo_full_name}`} target="_blank" rel="noreferrer">GitHub<ExternalLink className="h-3.5 w-3.5" /></a></Button> : null} />
              ) : (
                <EmptyPanel
                  icon={<FileCode2 className="h-10 w-10" />}
                  title="Source unavailable"
                  description={sourceError || 'Connect GitHub and ensure package.json exists to view source metadata.'}
                />
              )
            )}

            {tab === 'open-graph' && (
              <EmptyPanel
                icon={<Globe className="h-10 w-10" />}
                title="Open Graph preview unavailable"
                description="No real Open Graph inspection endpoint is connected yet, so this view stays empty instead of showing placeholder previews."
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function InfoItem({ label, value, wide }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return (
    <div className={cn('min-w-0', wide && 'md:col-span-2')}>
      <p className="mb-1 text-[11px] text-muted-foreground">{label}</p>
      <div className="min-w-0 truncate text-[13px] font-medium">{value}</div>
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
