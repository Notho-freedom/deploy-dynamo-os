import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/lib/store';
import { Rocket, ExternalLink, GitCommit, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

const buildSteps = [
  { t: 'Cloning repository...', d: 1500 },
  { t: 'Installing dependencies (npm install)', d: 4000 },
  { t: 'Detected framework: Next.js 14', d: 800 },
  { t: 'Running build (npm run build)', d: 6000 },
  { t: '✓ Compiled successfully', d: 500 },
  { t: 'Optimizing static assets...', d: 1500 },
  { t: 'Uploading to global CDN (12 regions)', d: 3000 },
  { t: 'Setting up edge functions', d: 1200 },
  { t: '✓ Deployment ready', d: 500 },
];

const Deploy = () => {
  const { projects, deployments, addDeployment, updateDeployment } = useApp();
  const [selected, setSelected] = useState(projects[0]?.id);
  const [logs, setLogs] = useState<string[]>([]);
  const [building, setBuilding] = useState(false);
  const [currentDpl, setCurrentDpl] = useState<string | null>(null);
  const logsRef = useRef<HTMLDivElement>(null);

  useEffect(() => { logsRef.current?.scrollTo(0, logsRef.current.scrollHeight); }, [logs]);

  const handleDeploy = () => {
    if (!selected) return;
    setLogs([]);
    setBuilding(true);
    const project = projects.find((p) => p.id === selected)!;
    const url = `${project.name}-${Math.random().toString(36).slice(2, 6)}.nebula.app`;
    const dpl = addDeployment({ projectId: selected, url, state: 'BUILDING', commit: 'feat: new deploy' });
    setCurrentDpl(dpl.uid);

    let delay = 0;
    buildSteps.forEach((step, i) => {
      delay += step.d;
      setTimeout(() => {
        setLogs((prev) => [...prev, `[${new Date().toISOString().slice(11, 19)}] ${step.t}`]);
        if (i === buildSteps.length - 1) {
          setBuilding(false);
          updateDeployment(dpl.uid, { state: 'READY', duration: Math.round(delay / 1000) });
          toast({ title: '🚀 Deployed', description: url });
        }
      }, delay);
    });
  };

  const projDeployments = deployments.filter((d) => d.projectId === selected);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl font-bold mb-1">Deployment</h1>
        <p className="text-muted-foreground">1-click deploy. Global CDN. Edge functions.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="glass p-5">
          <h3 className="font-semibold mb-3">Select project</h3>
          <div className="space-y-1">
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelected(p.id)}
                className={`w-full text-left p-2 rounded-lg text-sm transition ${selected === p.id ? 'bg-primary/10 border border-primary' : 'hover:bg-muted'}`}
              >
                <p className="font-mono">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.framework}</p>
              </button>
            ))}
          </div>
          <Button onClick={handleDeploy} disabled={building || !selected} className="w-full mt-4 gradient-cosmic glow">
            {building ? <><RefreshCw className="h-4 w-4 animate-spin" /> Deploying...</> : <><Rocket className="h-4 w-4" /> Deploy</>}
          </Button>
        </Card>

        <Card className="glass p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Build logs</h3>
            {building && <Badge variant="secondary" className="animate-pulse">BUILDING</Badge>}
          </div>
          <div ref={logsRef} className="bg-background/80 rounded-lg p-4 font-mono text-xs h-72 overflow-auto border border-border">
            {logs.length === 0 && !building && <p className="text-muted-foreground">No active build. Click Deploy to start.</p>}
            {logs.map((l, i) => <div key={i} className="text-foreground/90">{l}</div>)}
            {building && <div className="text-primary animate-pulse">▊</div>}
          </div>
        </Card>
      </div>

      <Card className="glass p-5">
        <h3 className="font-display text-lg font-semibold mb-3">Deployment history</h3>
        <div className="space-y-2">
          {projDeployments.map((d) => (
            <div key={d.uid} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition">
              {d.state === 'READY' ? <CheckCircle2 className="h-5 w-5 text-accent" /> : d.state === 'BUILDING' ? <RefreshCw className="h-5 w-5 text-primary animate-spin" /> : <XCircle className="h-5 w-5 text-destructive" />}
              <div className="flex-1 min-w-0">
                <p className="font-mono text-sm truncate">{d.url}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <GitCommit className="h-3 w-3" /> {d.commit} · {formatDistanceToNow(d.createdAt)} ago · {d.duration}s
                </p>
              </div>
              <Badge variant={d.state === 'READY' ? 'default' : 'destructive'} className={d.state === 'READY' ? 'gradient-cosmic border-0' : ''}>{d.state}</Badge>
              {d.state === 'READY' && (
                <Button variant="ghost" size="icon" asChild><a href={`https://${d.url}`} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a></Button>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default Deploy;
