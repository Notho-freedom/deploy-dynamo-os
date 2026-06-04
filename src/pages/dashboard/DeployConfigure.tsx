import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { github, readPackageJson, detectFramework, GhBranch } from '@/lib/github';
import { createProjectAndDeploy } from '@/lib/vercel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Loader2, Triangle, Plus, X, Check } from 'lucide-react';
import { toast } from 'sonner';

const FRAMEWORKS = [
  { v: 'nextjs', label: 'Next.js' },
  { v: 'vite', label: 'Vite' },
  { v: 'remix', label: 'Remix' },
  { v: 'astro', label: 'Astro' },
  { v: 'sveltekit', label: 'SvelteKit' },
  { v: 'nuxtjs', label: 'Nuxt' },
  { v: 'create-react-app', label: 'Create React App' },
  { v: '', label: 'Other' },
];

export default function DeployConfigure() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const repoFull = params.get('repo') || '';
  const repoId = Number(params.get('id') || 0);
  const [owner, repoName] = repoFull.split('/');

  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState(false);
  const [branches, setBranches] = useState<GhBranch[]>([]);
  const [cfg, setCfg] = useState({
    name: repoName || '',
    framework: '',
    branch: 'main',
    root: './',
    build: 'npm run build',
    output: 'dist',
    install: 'npm install',
    envs: [] as { k: string; v: string }[],
  });

  useEffect(() => {
    if (!repoFull || !owner || !repoName) return;
    setLoading(true);
    Promise.all([
      github.repo(owner, repoName).catch(() => null),
      github.branches(owner, repoName).catch(() => []),
      readPackageJson(owner, repoName),
    ]).then(([repo, brs, pkg]) => {
      setBranches(brs || []);
      const detected = pkg ? detectFramework(pkg) : { framework: '', build: 'npm run build', output: 'dist', install: 'npm install' };
      setCfg((c) => ({
        ...c,
        branch: repo?.default_branch || 'main',
        framework: detected.framework,
        build: detected.build,
        output: detected.output,
        install: detected.install,
      }));
    }).finally(() => setLoading(false));
  }, [repoFull, owner, repoName]);

  const applyPreset = (v: string) => {
    const presets: Record<string, { build: string; output: string }> = {
      nextjs: { build: 'next build', output: '.next' },
      vite: { build: 'npm run build', output: 'dist' },
      remix: { build: 'remix build', output: 'public/build' },
      astro: { build: 'astro build', output: 'dist' },
      sveltekit: { build: 'npm run build', output: '.svelte-kit' },
      nuxtjs: { build: 'nuxt build', output: '.nuxt' },
      'create-react-app': { build: 'npm run build', output: 'build' },
      '': { build: 'npm run build', output: 'dist' },
    };
    const p = presets[v] ?? presets[''];
    setCfg((c) => ({ ...c, framework: v, build: p.build, output: p.output }));
  };

  const deploy = async () => {
    setDeploying(true);
    try {
      const res = await createProjectAndDeploy({
        name: cfg.name,
        repo_full_name: repoFull,
        repo_id: repoId,
        branch: cfg.branch,
        framework: cfg.framework,
        rootDirectory: cfg.root,
        buildCommand: cfg.build,
        outputDirectory: cfg.output,
        installCommand: cfg.install,
        envs: cfg.envs.filter((e) => e.k && e.v).map((e) => ({ key: e.k, value: e.v })),
      });
      toast.success('Deployment triggered');
      navigate(`/dashboard/deploy/${res.project_id}?deployment=${res.deployment_id}`);
    } catch (e: any) {
      toast.error(e.message || 'Deploy failed');
    } finally {
      setDeploying(false);
    }
  };

  if (!repoFull) {
    return (
      <div className="space-y-4">
        <p className="text-[13px] text-muted-foreground">No repository selected.</p>
        <Button onClick={() => navigate('/dashboard/deploy/new')}>Pick a repository</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <button onClick={() => navigate('/dashboard/deploy/new')} className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
        <ArrowLeft className="h-3 w-3" /> Repositories
      </button>

      <div>
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">Step 2 of 2 · Configure</p>
        <h1 className="font-editorial text-4xl tracking-tight">{repoFull}</h1>
        {loading ? (
          <p className="text-[12px] font-mono text-muted-foreground mt-2 inline-flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin" /> Detecting framework…
          </p>
        ) : (
          <p className="text-[12px] font-mono text-muted-foreground mt-2">
            <Check className="inline h-3 w-3 text-success mr-1" />
            Detected <span className="text-foreground">{FRAMEWORKS.find((f) => f.v === cfg.framework)?.label || 'Other'}</span>
          </p>
        )}
      </div>

      <div className="border border-border rounded-md p-6 space-y-5">
        <Field label="Project name">
          <Input value={cfg.name} onChange={(e) => setCfg({ ...cfg, name: e.target.value })} className="font-mono" />
          <p className="text-[10.5px] text-muted-foreground font-mono mt-1">Will be prefixed with your account ID on the platform.</p>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Framework preset">
            <select
              value={cfg.framework}
              onChange={(e) => applyPreset(e.target.value)}
              className="w-full h-9 px-3 text-[13px] font-mono bg-background border border-input rounded-md"
            >
              {FRAMEWORKS.map((f) => <option key={f.v} value={f.v}>{f.label}</option>)}
            </select>
          </Field>
          <Field label="Branch">
            <select
              value={cfg.branch}
              onChange={(e) => setCfg({ ...cfg, branch: e.target.value })}
              className="w-full h-9 px-3 text-[13px] font-mono bg-background border border-input rounded-md"
            >
              {branches.length === 0 && <option value={cfg.branch}>{cfg.branch}</option>}
              {branches.map((b) => <option key={b.name} value={b.name}>{b.name}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Root directory">
          <Input value={cfg.root} onChange={(e) => setCfg({ ...cfg, root: e.target.value })} className="font-mono" />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Build command">
            <Input value={cfg.build} onChange={(e) => setCfg({ ...cfg, build: e.target.value })} className="font-mono" />
          </Field>
          <Field label="Output directory">
            <Input value={cfg.output} onChange={(e) => setCfg({ ...cfg, output: e.target.value })} className="font-mono" />
          </Field>
        </div>

        <Field label="Install command">
          <Input value={cfg.install} onChange={(e) => setCfg({ ...cfg, install: e.target.value })} className="font-mono" />
        </Field>

        <Field label="Environment variables">
          <div className="space-y-2">
            {cfg.envs.map((e, i) => (
              <div key={i} className="flex gap-2">
                <Input value={e.k} placeholder="KEY" onChange={(ev) => { const c = [...cfg.envs]; c[i].k = ev.target.value; setCfg({ ...cfg, envs: c }); }} className="font-mono text-[12px] flex-1" />
                <Input type="password" value={e.v} placeholder="value" onChange={(ev) => { const c = [...cfg.envs]; c[i].v = ev.target.value; setCfg({ ...cfg, envs: c }); }} className="font-mono text-[12px] flex-1" />
                <button onClick={() => setCfg({ ...cfg, envs: cfg.envs.filter((_, j) => j !== i) })} className="text-muted-foreground hover:text-destructive">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <button onClick={() => setCfg({ ...cfg, envs: [...cfg.envs, { k: '', v: '' }] })} className="text-[12px] text-muted-foreground hover:text-foreground font-mono inline-flex items-center gap-1">
              <Plus className="h-3 w-3" /> Add variable
            </button>
          </div>
        </Field>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={() => navigate('/dashboard/deploy/new')}>Cancel</Button>
        <Button onClick={deploy} disabled={deploying || loading} className="gap-2">
          {deploying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Triangle className="h-3.5 w-3.5 fill-current" />}
          {deploying ? 'Deploying…' : 'Deploy'}
        </Button>
      </div>
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
