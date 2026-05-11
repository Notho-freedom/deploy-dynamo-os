import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';
import { useIntegration } from '@/hooks/useIntegration';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/EmptyState';
import { github, GhRepo, startGithubOAuth } from '@/lib/github';
import { startVercelOAuth } from '@/lib/github';
import { vercel } from '@/lib/vercel';
import { Github, Search, Lock, Triangle, Loader2, Check, ExternalLink, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

const FRAMEWORK_PRESETS: Record<string, { build: string; output: string; install: string; framework: string }> = {
  nextjs: { framework: 'nextjs', build: 'next build', output: '.next', install: 'npm install' },
  vite: { framework: 'vite', build: 'npm run build', output: 'dist', install: 'npm install' },
  remix: { framework: 'remix', build: 'remix build', output: 'public/build', install: 'npm install' },
  astro: { framework: 'astro', build: 'astro build', output: 'dist', install: 'npm install' },
  svelte: { framework: 'sveltekit', build: 'vite build', output: '.svelte-kit', install: 'npm install' },
  other: { framework: '', build: 'npm run build', output: 'dist', install: 'npm install' },
};

export default function CICD() {
  const { lang } = useI18n();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const gh = useIntegration('github');
  const vc = useIntegration('vercel');

  const [repos, setRepos] = useState<GhRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [q, setQ] = useState('');
  const [step, setStep] = useState<'select' | 'configure' | 'deploying'>('select');
  const [selected, setSelected] = useState<GhRepo | null>(null);
  const [config, setConfig] = useState({
    name: '',
    root: './',
    framework: 'other',
    build: 'npm run build',
    output: 'dist',
    install: 'npm install',
    ref: 'main',
    envs: [] as { k: string; v: string }[],
  });
  const [deploying, setDeploying] = useState(false);

  // Refresh integrations after callback
  useEffect(() => {
    if (params.get('connected')) {
      gh.refresh(); vc.refresh();
    }
  }, [params]); // eslint-disable-line

  // Load repos when GH connected
  useEffect(() => {
    if (!gh.connected) return;
    setLoadingRepos(true);
    github.myRepos()
      .then((r) => setRepos(r))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoadingRepos(false));
  }, [gh.connected]);

  const filtered = useMemo(
    () => repos.filter((r) => r.full_name.toLowerCase().includes(q.toLowerCase())),
    [repos, q]
  );

  const startImport = (r: GhRepo) => {
    setSelected(r);
    setConfig((c) => ({ ...c, name: r.name, ref: r.default_branch || 'main' }));
    setStep('configure');
  };

  const applyPreset = (key: string) => {
    const p = FRAMEWORK_PRESETS[key];
    setConfig((c) => ({ ...c, framework: key, build: p.build, output: p.output, install: p.install }));
  };

  const deploy = async () => {
    if (!selected) return;
    if (!vc.connected) { toast.error('Connect Vercel first'); return; }
    setDeploying(true);
    try {
      // Create or upsert project
      const project = await vercel.createProject({
        name: config.name,
        framework: FRAMEWORK_PRESETS[config.framework]?.framework || null,
        gitRepository: { type: 'github', repo: selected.full_name },
        rootDirectory: config.root === './' ? undefined : config.root,
        buildCommand: config.build,
        outputDirectory: config.output,
        installCommand: config.install,
        environmentVariables: config.envs.filter((e) => e.k && e.v).map((e) => ({
          key: e.k, value: e.v, target: ['production', 'preview', 'development'], type: 'encrypted',
        })),
      }).catch((e) => {
        // If already exists, fetch by name
        if (String(e.message).includes('already exists') || String(e.message).includes('409')) return null;
        throw e;
      });

      // Create deployment from git
      const deployment = await vercel.createDeployment({
        name: config.name,
        gitSource: { type: 'github', repoId: selected.id, ref: config.ref },
        target: 'production' as const,
      });

      toast.success('Deployment triggered');
      navigate(`/dashboard/deploy?project=${project?.id || ''}&deployment=${deployment.uid}`);
    } catch (e: any) {
      toast.error(e.message || 'Deploy failed');
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">CI / CD</p>
        <h1 className="font-editorial text-4xl tracking-tight">
          Push. <em className="italic text-muted-foreground">Build. Ship.</em>
        </h1>
      </div>

      {/* Connection status row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ConnCard
          icon={<Github className="h-4 w-4" />}
          name="GitHub"
          connected={gh.connected}
          subtitle={gh.connection?.metadata?.login}
          onConnect={startGithubOAuth}
          onDisconnect={async () => { await gh.disconnect(); toast.success('GitHub disconnected'); setRepos([]); }}
        />
        <ConnCard
          icon={<Triangle className="h-4 w-4 fill-current" />}
          name="Vercel"
          connected={vc.connected}
          subtitle={vc.connection?.metadata?.username}
          onConnect={startVercelOAuth}
          onDisconnect={async () => { await vc.disconnect(); toast.success('Vercel disconnected'); }}
        />
      </div>

      {!gh.connected ? (
        <div className="border border-border">
          <EmptyState
            icon={<Github className="h-10 w-10" />}
            title={lang === 'fr' ? 'Connectez GitHub' : 'Connect GitHub'}
            description={lang === 'fr' ? 'Importez vos repositories pour activer les déploiements.' : 'Import your repositories to enable deploys.'}
            action={
              <Button onClick={startGithubOAuth} className="gap-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white">
                <Github className="h-4 w-4" /> Continue with GitHub
              </Button>
            }
          />
        </div>
      ) : step === 'select' ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 border border-border px-3 py-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={lang === 'fr' ? 'Filtrer les repositories…' : 'Filter repositories…'}
              className="flex-1 bg-transparent outline-none text-[13px] font-mono"
            />
            <span className="text-[11px] font-mono text-muted-foreground">
              {gh.connection?.metadata?.login} · {filtered.length}/{repos.length}
            </span>
          </div>
          <div className="border border-border">
            {loadingRepos && (
              <div className="px-4 py-12 text-center text-[13px] text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading repositories…
              </div>
            )}
            {!loadingRepos && filtered.length === 0 && (
              <div className="px-4 py-12 text-center text-[13px] text-muted-foreground">No repositories.</div>
            )}
            {filtered.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/30 transition">
                <img src={r.owner.avatar_url} className="h-5 w-5 rounded shrink-0" alt="" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[13px] truncate">{r.full_name}</span>
                    {r.private && <Lock className="h-3 w-3 text-muted-foreground" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground font-mono truncate">
                    {r.language || '—'} · {r.default_branch} · pushed {new Date(r.pushed_at).toLocaleDateString()}
                  </p>
                </div>
                <a href={r.html_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground"><ExternalLink className="h-3 w-3" /></a>
                <button
                  onClick={() => startImport(r)}
                  disabled={!vc.connected}
                  className="px-3 py-1 border border-border hover:border-foreground text-[12px] rounded-md transition disabled:opacity-40 gap-1.5 inline-flex items-center"
                  title={!vc.connected ? 'Connect Vercel first' : ''}
                >
                  Import <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="border border-border p-6 max-w-2xl">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">Configure</p>
          <h3 className="font-editorial text-2xl mb-1">{selected?.full_name}</h3>
          <p className="text-[12px] font-mono text-muted-foreground mb-6">
            <Check className="inline h-3 w-3 text-success" /> {selected?.language || 'Project'} · branch <span className="text-foreground">{config.ref}</span>
          </p>
          <div className="space-y-4">
            <Field label="Project name"><Input value={config.name} onChange={(e) => setConfig({ ...config, name: e.target.value })} className="font-mono" /></Field>
            <Field label="Framework">
              <select
                value={config.framework}
                onChange={(e) => applyPreset(e.target.value)}
                className="w-full h-9 px-3 text-[13px] font-mono bg-background border border-input rounded-md"
              >
                {Object.keys(FRAMEWORK_PRESETS).map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </Field>
            <Field label="Branch"><Input value={config.ref} onChange={(e) => setConfig({ ...config, ref: e.target.value })} className="font-mono" /></Field>
            <Field label="Root directory"><Input value={config.root} onChange={(e) => setConfig({ ...config, root: e.target.value })} className="font-mono" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Build command"><Input value={config.build} onChange={(e) => setConfig({ ...config, build: e.target.value })} className="font-mono" /></Field>
              <Field label="Output directory"><Input value={config.output} onChange={(e) => setConfig({ ...config, output: e.target.value })} className="font-mono" /></Field>
            </div>
            <Field label="Install command"><Input value={config.install} onChange={(e) => setConfig({ ...config, install: e.target.value })} className="font-mono" /></Field>
            <Field label="Environment variables">
              <div className="space-y-2">
                {config.envs.map((e, i) => (
                  <div key={i} className="grid grid-cols-2 gap-2">
                    <Input value={e.k} placeholder="KEY" onChange={(ev) => { const c = [...config.envs]; c[i].k = ev.target.value; setConfig({ ...config, envs: c }); }} className="font-mono text-[12px]" />
                    <Input type="password" value={e.v} placeholder="value" onChange={(ev) => { const c = [...config.envs]; c[i].v = ev.target.value; setConfig({ ...config, envs: c }); }} className="font-mono text-[12px]" />
                  </div>
                ))}
                <button onClick={() => setConfig({ ...config, envs: [...config.envs, { k: '', v: '' }] })} className="text-[11px] text-muted-foreground hover:text-foreground font-mono">+ add variable</button>
              </div>
            </Field>
          </div>
          <div className="flex gap-2 mt-8 pt-6 border-t border-border">
            <button onClick={() => { setStep('select'); setSelected(null); }} className="px-3 py-1.5 text-[12px] text-muted-foreground hover:text-foreground">Cancel</button>
            <Button onClick={deploy} disabled={deploying || !vc.connected} className="ml-auto gap-2">
              {deploying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Triangle className="h-3.5 w-3.5 fill-current" />}
              {deploying ? 'Deploying…' : 'Deploy to Vercel'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ConnCard({ icon, name, connected, subtitle, onConnect, onDisconnect }: {
  icon: React.ReactNode; name: string; connected: boolean; subtitle?: string;
  onConnect: () => void; onDisconnect: () => void;
}) {
  return (
    <div className="border border-border p-4 flex items-center gap-3">
      <span className="h-9 w-9 rounded border border-border flex items-center justify-center">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-[13px]">{name}</span>
          {connected ? (
            <span className="text-[10px] uppercase tracking-widest font-mono px-1.5 py-0.5 rounded bg-success/15 text-success border border-success/30">Live</span>
          ) : (
            <span className="text-[10px] uppercase tracking-widest font-mono px-1.5 py-0.5 rounded border border-border text-muted-foreground">Off</span>
          )}
        </div>
        <p className="text-[11px] font-mono text-muted-foreground truncate">{connected ? subtitle || 'connected' : 'not connected'}</p>
      </div>
      {connected ? (
        <Button variant="outline" size="sm" onClick={onDisconnect}>Disconnect</Button>
      ) : (
        <Button size="sm" onClick={onConnect}>Connect</Button>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] uppercase tracking-widest text-muted-foreground block mb-1.5">{label}</label>
      {children}
    </div>
  );
}
