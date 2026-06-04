import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { vercel, VercelDeployment, VercelEvent } from '@/lib/vercel';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Terminal } from '@/components/Terminal';
import { ArrowLeft, ExternalLink, Loader2, RefreshCw, Triangle } from 'lucide-react';
import { toast } from 'sonner';

const STATE_COLOR: Record<string, string> = {
  READY: 'text-success border-success/40 bg-success/10',
  BUILDING: 'text-primary border-primary/40 bg-primary/10',
  QUEUED: 'text-muted-foreground border-border bg-muted/30',
  INITIALIZING: 'text-primary border-primary/40 bg-primary/10',
  ERROR: 'text-destructive border-destructive/40 bg-destructive/10',
  CANCELED: 'text-muted-foreground border-border bg-muted/30',
};

export default function DeployDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const initialDeployment = params.get('deployment');

  const [deployment, setDeployment] = useState<VercelDeployment | null>(null);
  const [events, setEvents] = useState<VercelEvent[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<number | null>(null);

  const loadMeta = async () => {
    if (!projectId) return;
    const { data } = await supabase.from('user_projects').select('*').eq('vercel_project_id', projectId).maybeSingle();
    setMeta(data);
  };

  const loadDeployment = async (id: string) => {
    try {
      const d = await vercel.getDeployment(id);
      setDeployment(d);
      const ev = await vercel.getDeploymentEvents(id).catch(() => [] as VercelEvent[]);
      setEvents(Array.isArray(ev) ? ev : []);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Pick latest deployment if none in URL
  useEffect(() => {
    let active = true;
    const init = async () => {
      await loadMeta();
      let id = initialDeployment;
      if (!id && projectId) {
        const list = await vercel.listDeployments(projectId).catch(() => ({ deployments: [] as VercelDeployment[] }));
        id = list.deployments[0]?.uid || null;
      }
      if (id && active) await loadDeployment(id);
      if (active) setLoading(false);
    };
    init();
    return () => { active = false; };
  }, [projectId, initialDeployment]);

  // Poll while building
  useEffect(() => {
    if (!deployment) return;
    if (deployment.state === 'READY' || deployment.state === 'ERROR' || deployment.state === 'CANCELED') return;
    pollRef.current = window.setInterval(() => loadDeployment(deployment.uid), 2500);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [deployment?.uid, deployment?.state]); // eslint-disable-line

  const redeploy = async () => {
    if (!meta) return;
    try {
      const d = await vercel.createDeployment({
        name: meta.vercel_project_name,
        gitSource: { type: 'github', repoId: Number(meta.github_repo_id), ref: meta.branch },
        target: 'production',
      });
      toast.success('Redeploy triggered');
      await loadDeployment((d as any).id || d.uid);
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/dashboard/deploy')} className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
        <ArrowLeft className="h-3 w-3" /> Projects
      </button>

      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">Project</p>
          <h1 className="font-editorial text-4xl tracking-tight">{meta?.vercel_project_name || projectId}</h1>
          {meta && (
            <p className="text-[12px] font-mono text-muted-foreground mt-1">
              {meta.github_repo_full_name} · branch {meta.branch} · {meta.framework || 'static'}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={redeploy} disabled={!meta} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Redeploy
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="border border-border rounded-md p-12 text-center text-[13px] text-muted-foreground inline-flex items-center gap-2 justify-center w-full">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading deployment…
        </div>
      ) : !deployment ? (
        <div className="border border-dashed border-border rounded-md p-12 text-center text-[13px] text-muted-foreground">
          No deployment yet.
        </div>
      ) : (
        <>
          {/* Status header */}
          <div className="border border-border rounded-md p-5">
            <div className="flex items-center gap-4 flex-wrap">
              <span className={`inline-block px-2 py-0.5 text-[11px] font-mono uppercase rounded border ${STATE_COLOR[deployment.state] || ''}`}>
                {deployment.state}
              </span>
              <a href={`https://${deployment.url}`} target="_blank" rel="noreferrer" className="font-mono text-[13px] inline-flex items-center gap-1.5 hover:text-primary">
                {deployment.url} <ExternalLink className="h-3 w-3" />
              </a>
              {deployment.meta?.githubCommitMessage && (
                <span className="text-[11px] font-mono text-muted-foreground truncate max-w-md">
                  {deployment.meta.githubCommitMessage}
                </span>
              )}
            </div>
          </div>

          {/* Build logs */}
          <div>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2 font-mono">Build Logs</p>
            <Terminal
              lines={events.length === 0 ? [{ tone: 'muted' as const, text: deployment.state === 'BUILDING' ? '— Waiting for build logs…' : '— No logs available.' }] : events.map((e) => ({
                tone: (e.payload?.info?.type === 'stderr' ? 'error' : 'muted') as 'error' | 'muted',
                text: `[${new Date(e.created).toISOString().slice(11, 19)}] ${(e.payload?.text || '').replace(/\n+$/, '')}`,
              }))}
              streaming={deployment.state === 'BUILDING' || deployment.state === 'QUEUED' || deployment.state === 'INITIALIZING'}
              prompt={`build · ${meta?.vercel_project_name || ''}`}
              height="h-[480px]"
            />
          </div>
        </>
      )}
    </div>
  );
}
