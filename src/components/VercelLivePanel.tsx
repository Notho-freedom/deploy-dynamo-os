import { useEffect, useState } from 'react';
import { useIntegration } from '@/hooks/useIntegration';
import { vercel, VercelDeployment, VercelProject } from '@/lib/vercel';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, ExternalLink, MoreHorizontal, Triangle } from 'lucide-react';
import { VercelConnectDialog } from './VercelConnectDialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

const STATE_COLOR: Record<string, string> = {
  READY: 'text-success border-success/40 bg-success/10',
  BUILDING: 'text-primary border-primary/40 bg-primary/10',
  QUEUED: 'text-muted-foreground border-border bg-muted/30',
  INITIALIZING: 'text-primary border-primary/40 bg-primary/10',
  ERROR: 'text-destructive border-destructive/40 bg-destructive/10',
  CANCELED: 'text-muted-foreground border-border bg-muted/30',
};

function fmt(ts?: number) {
  if (!ts) return '—';
  const d = Date.now() - ts;
  if (d < 60_000) return 'just now';
  if (d < 3_600_000) return Math.floor(d / 60_000) + 'm ago';
  if (d < 86_400_000) return Math.floor(d / 3_600_000) + 'h ago';
  return Math.floor(d / 86_400_000) + 'd ago';
}

export function VercelLivePanel() {
  const { connected, connection, refresh } = useIntegration('vercel');
  const [openConnect, setOpenConnect] = useState(false);
  const [projects, setProjects] = useState<VercelProject[]>([]);
  const [deployments, setDeployments] = useState<VercelDeployment[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!connected) return;
    setLoading(true);
    try {
      const [p, d] = await Promise.all([
        vercel.listProjects(),
        selectedProject === 'all' ? vercel.listDeployments() : vercel.listDeployments(selectedProject),
      ]);
      setProjects(p.projects || []);
      setDeployments(d.deployments || []);
    } catch (e: any) {
      toast.error(e.message || 'Vercel API error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [connected, selectedProject]); // eslint-disable-line

  if (!connected) {
    return (
      <div className="border border-dashed border-border rounded-md p-8 text-center">
        <Triangle className="h-6 w-6 mx-auto mb-3 text-muted-foreground" />
        <h3 className="font-editorial text-xl mb-1">Connect Vercel</h3>
        <p className="text-[13px] text-muted-foreground mb-4 max-w-sm mx-auto">
          Stream real deployments, logs and analytics from your Vercel account. Your token never touches the browser.
        </p>
        <Button onClick={() => setOpenConnect(true)}>Connect Vercel</Button>
        <VercelConnectDialog open={openConnect} onOpenChange={setOpenConnect} onConnected={refresh} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded bg-success/15 text-success border border-success/30">
          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> LIVE
        </span>
        <span className="text-[12px] text-muted-foreground font-mono">
          {connection?.metadata?.username || connection?.metadata?.email}
        </span>
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="ml-auto h-8 px-2 text-[12px] font-mono bg-background border border-border rounded"
        >
          <option value="all">All projects</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
        </Button>
      </div>

      <div className="border border-border rounded-md overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[10.5px] uppercase tracking-widest text-muted-foreground font-mono border-b border-border bg-muted/20">
          <span className="col-span-1">Status</span>
          <span className="col-span-3">Project</span>
          <span className="col-span-4">Commit</span>
          <span className="col-span-2">Branch</span>
          <span className="col-span-1">Age</span>
          <span className="col-span-1 text-right">·</span>
        </div>
        {deployments.length === 0 && !loading && (
          <div className="px-4 py-12 text-center text-[13px] text-muted-foreground">No deployments yet.</div>
        )}
        {deployments.map((d) => (
          <div key={d.uid} className="grid grid-cols-12 gap-2 px-4 py-3 text-[12.5px] border-b border-border last:border-0 hover:bg-muted/20 items-center">
            <span className="col-span-1">
              <span className={`inline-block px-1.5 py-0.5 text-[10px] font-mono uppercase rounded border ${STATE_COLOR[d.state] || ''}`}>{d.state}</span>
            </span>
            <span className="col-span-3 font-mono truncate">{d.name}</span>
            <span className="col-span-4 truncate text-muted-foreground">{d.meta?.githubCommitMessage || d.url}</span>
            <span className="col-span-2 font-mono text-[11.5px] truncate text-muted-foreground">{d.meta?.githubCommitRef || '—'}</span>
            <span className="col-span-1 font-mono text-[11px] text-muted-foreground">{fmt(d.created)}</span>
            <span className="col-span-1 flex items-center justify-end gap-1">
              <a href={`https://${d.url}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
                <ExternalLink className="h-3 w-3" />
              </a>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground"><MoreHorizontal className="h-3.5 w-3.5" /></button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {d.state === 'READY' && d.target !== 'production' && (
                    <DropdownMenuItem
                      onClick={async () => {
                        try {
                          // need projectId — find from projects by name
                          const proj = projects.find((p) => p.name === d.name);
                          if (!proj) throw new Error('Project not found');
                          await vercel.promoteDeployment(proj.id, d.uid);
                          toast.success('Promoted to production');
                          load();
                        } catch (e: any) { toast.error(e.message); }
                      }}
                    >Promote to production</DropdownMenuItem>
                  )}
                  {(d.state === 'BUILDING' || d.state === 'QUEUED') && (
                    <DropdownMenuItem
                      onClick={async () => {
                        try { await vercel.cancelDeployment(d.uid); toast.success('Canceled'); load(); }
                        catch (e: any) { toast.error(e.message); }
                      }}
                    >Cancel deployment</DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => window.open(`https://vercel.com/${connection?.metadata?.username}/${d.name}/${d.uid}`, '_blank')}>
                    Open in Vercel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
