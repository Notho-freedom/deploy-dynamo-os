import { useEffect, useRef, useState } from 'react';
import { useApp } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import { Stepper } from '@/components/Stepper';
import { Terminal, TerminalLine } from '@/components/Terminal';
import { StatusDot } from '@/components/StatusDot';
import { Button } from '@/components/ui/button';
import { Rocket, GitCommit, ExternalLink, RefreshCw, ChevronRight, RotateCcw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const buildSteps = [
  { key: 'queued', label: 'Queued', d: 400 },
  { key: 'cloning', label: 'Cloning repository', d: 1200 },
  { key: 'install', label: 'Installing dependencies', d: 6800 },
  { key: 'detect', label: 'Detected Next.js 14 · pnpm', d: 300 },
  { key: 'build', label: 'Running pnpm build', d: 12400 },
  { key: 'compile', label: 'Compiled successfully', d: 200 },
  { key: 'optimize', label: 'Optimizing static assets', d: 1700 },
  { key: 'upload', label: 'Uploading to global CDN (12 regions)', d: 3200 },
  { key: 'edge', label: 'Provisioning edge functions', d: 900 },
  { key: 'ready', label: 'Deployment ready', d: 200 },
];

export default function Deploy() {
  const { projects, deployments, addDeployment, updateDeployment } = useApp();
  const { lang } = useI18n();
  const [selected, setSelected] = useState(projects[0]?.id);
  const [logs, setLogs] = useState<TerminalLine[]>([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [building, setBuilding] = useState(false);
  const [tab, setTab] = useState<'deployment' | 'source' | 'functions' | 'logs'>('deployment');
  const timers = useRef<number[]>([]);

  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);

  const project = projects.find((p) => p.id === selected);
  const projDeployments = deployments.filter((d) => d.projectId === selected);
  const current = projDeployments[0];

  const start = () => {
    if (!project) return;
    setLogs([]);
    setStepIdx(0);
    setBuilding(true);
    setTab('deployment');
    const url = `${project.name}-${Math.random().toString(36).slice(2, 6)}.nebula.app`;
    const dpl = addDeployment({ projectId: selected, url, state: 'BUILDING', commit: 'feat: ship updates' });

    let acc = 0;
    buildSteps.forEach((s, i) => {
      acc += s.d;
      timers.current.push(window.setTimeout(() => {
        setStepIdx(i + 1);
        setLogs((prev) => [
          ...prev,
          { tone: 'muted', text: `[${new Date().toISOString().slice(11, 23)}]  ${s.label}` },
        ]);
        if (i === buildSteps.length - 1) {
          setBuilding(false);
          updateDeployment(dpl.uid, { state: 'READY', duration: Math.round(acc / 1000) });
        }
      }, acc));
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">Deployment</p>
          <h1 className="font-editorial text-4xl tracking-tight">{lang === 'fr' ? <>Pipeline & <em className="italic text-muted-foreground">historique</em></> : <>Pipeline & <em className="italic text-muted-foreground">history</em></>}</h1>
        </div>
        <Button onClick={start} disabled={building} className="gap-2">
          {building ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
          {building ? (lang === 'fr' ? 'Déploiement…' : 'Deploying…') : (lang === 'fr' ? 'Déployer' : 'Deploy')}
        </Button>
      </div>

      {/* Project selector ribbon */}
      <div className="border-y border-border flex divide-x divide-border overflow-x-auto">
        {projects.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelected(p.id)}
            className={`px-4 py-2.5 text-[12px] font-mono transition shrink-0 ${selected === p.id ? 'text-foreground bg-muted/40' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Active deployment header */}
      {current && (
        <div className="border border-border p-5">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-[12px]">
              <StatusDot tone={current.state === 'READY' ? 'success' : current.state === 'BUILDING' ? 'warning' : 'destructive'} pulse={current.state === 'BUILDING'} />
              {current.state}
            </span>
            <a href={`https://${current.url}`} target="_blank" rel="noreferrer" className="font-mono text-[13px] text-foreground hover:text-primary inline-flex items-center gap-1.5">
              {current.url} <ExternalLink className="h-3 w-3" />
            </a>
            <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1.5"><GitCommit className="h-3 w-3" /> {current.commit ?? 'main@a8f2c1d'}</span>
            <span className="text-[11px] font-mono text-muted-foreground">main</span>
            <span className="text-[11px] font-mono text-muted-foreground tabular-nums">{current.duration ?? 0}s</span>
            <span className="text-[11px] font-mono text-muted-foreground ml-auto">{formatDistanceToNow(current.createdAt, { addSuffix: true })}</span>
          </div>

          {/* Tabs */}
          <div className="mt-5 border-b border-border flex gap-1 -mb-5">
            {(['deployment', 'source', 'functions', 'logs'] as const).map((tk) => (
              <button
                key={tk}
                onClick={() => setTab(tk)}
                className={`px-3 py-2 text-[12px] capitalize border-b-2 -mb-px transition ${tab === tk ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                {tk}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Body */}
      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 border border-border p-5">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-4">{lang === 'fr' ? 'Étapes du build' : 'Build steps'}</p>
          <Stepper
            current={stepIdx}
            steps={buildSteps.map((s, i) => ({
              label: s.label,
              duration: i < stepIdx ? `${(s.d / 1000).toFixed(1)}s` : i === stepIdx && building ? '…' : '—',
            }))}
          />
        </div>
        <div className="lg:col-span-8">
          <Terminal lines={logs.length ? logs : [{ tone: 'muted', text: lang === 'fr' ? '— En attente d\'un build. Cliquez Déployer pour démarrer.' : '— Waiting for a build. Click Deploy to start.' }]} streaming={building} prompt={`build · ${project?.name ?? ''}`} height="h-[380px]" />
        </div>
      </div>

      {/* History */}
      <div>
        <h2 className="text-[13px] uppercase tracking-widest text-muted-foreground mb-3">{lang === 'fr' ? 'Historique' : 'History'}</h2>
        <div className="border border-border">
          <table className="w-full">
            <thead className="border-b border-border">
              <tr className="text-[11px] uppercase tracking-widest text-muted-foreground">
                <th className="text-left font-normal px-4 py-2.5">Status</th>
                <th className="text-left font-normal px-4 py-2.5">URL</th>
                <th className="text-left font-normal px-4 py-2.5">Commit</th>
                <th className="text-left font-normal px-4 py-2.5">Branch</th>
                <th className="text-right font-normal px-4 py-2.5">Duration</th>
                <th className="text-right font-normal px-4 py-2.5">Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {projDeployments.map((d) => (
                <tr key={d.uid} className="hover:bg-muted/30 transition">
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-[12px]">
                      <StatusDot tone={d.state === 'READY' ? 'success' : d.state === 'BUILDING' ? 'warning' : 'destructive'} />
                      {d.state}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[12px] truncate max-w-xs">{d.url}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">{d.commit ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">main</td>
                  <td className="px-4 py-3 text-right font-mono text-[12px] tabular-nums text-muted-foreground">{d.duration ?? '—'}s</td>
                  <td className="px-4 py-3 text-right font-mono text-[11px] text-muted-foreground">{formatDistanceToNow(d.createdAt, { addSuffix: false })}</td>
                  <td className="px-4 py-3 text-right">
                    {d.state === 'READY' && (
                      <button title="Promote to production" className="text-muted-foreground hover:text-foreground">
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
