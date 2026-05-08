import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';
import { useApp } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GitHubOAuthDialog } from '@/components/GitHubOAuthDialog';
import { EmptyState } from '@/components/EmptyState';
import { StatusDot } from '@/components/StatusDot';
import { Github, Search, GitBranch, Lock, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const seedRepos = [
  { full: 'akua/kente-shop', stars: 18, lang: 'TypeScript', private: false, updated: '2h ago' },
  { full: 'akua/ankara-bookings', stars: 7, lang: 'TypeScript', private: true, updated: '1d ago' },
  { full: 'akua/lagos-fintech', stars: 42, lang: 'Go', private: false, updated: '3d ago' },
  { full: 'akua/dakar-news', stars: 12, lang: 'JavaScript', private: false, updated: '1w ago' },
  { full: 'akua/sahel-cms', stars: 0, lang: 'Python', private: true, updated: '2w ago' },
  { full: 'akua/nebula-docs', stars: 3, lang: 'MDX', private: false, updated: '1mo ago' },
];

export default function CICD() {
  const { lang } = useI18n();
  const navigate = useNavigate();
  const addProject = useApp((s) => s.addProject);
  const [connected, setConnected] = useState(false);
  const [oauthOpen, setOauthOpen] = useState(false);
  const [q, setQ] = useState('');
  const [importing, setImporting] = useState<string | null>(null);
  const [step, setStep] = useState<'select' | 'configure'>('select');
  const [config, setConfig] = useState({ root: './', framework: 'Next.js', build: 'pnpm build', output: '.next', envs: [{ k: 'DATABASE_URL', v: '' }] });

  const repos = seedRepos.filter((r) => r.full.toLowerCase().includes(q.toLowerCase()));

  const startImport = (full: string) => {
    setImporting(full);
    setStep('configure');
  };

  const finishImport = () => {
    if (!importing) return;
    addProject({ name: importing.split('/')[1], framework: 'nextjs', template: 'github-import', status: 'building', repo: importing });
    toast({ title: 'Project imported', description: `${importing} → deploying…` });
    setImporting(null);
    setStep('select');
    navigate('/dashboard/deploy');
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">CI / CD</p>
        <h1 className="font-editorial text-4xl tracking-tight">
          {lang === 'fr' ? <>Push. <em className="italic text-muted-foreground">Build. Ship.</em></> : <>Push. <em className="italic text-muted-foreground">Build. Ship.</em></>}
        </h1>
      </div>

      {!connected ? (
        <div className="border border-border">
          <EmptyState
            icon={<Github className="h-10 w-10" />}
            title={lang === 'fr' ? 'Connectez GitHub' : 'Connect GitHub'}
            description={lang === 'fr' ? 'Importez vos repositories pour activer les déploiements automatiques sur push.' : 'Import your repositories to enable automatic deployments on push.'}
            action={
              <Button onClick={() => setOauthOpen(true)} className="gap-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white">
                <Github className="h-4 w-4" /> {lang === 'fr' ? 'Continuer avec GitHub' : 'Continue with GitHub'}
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
            <span className="text-[11px] font-mono text-muted-foreground">akua · {repos.length} repos</span>
          </div>
          <div className="border border-border">
            {repos.map((r) => (
              <div key={r.full} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/30 transition">
                <Github className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[13px] truncate">{r.full}</span>
                    {r.private && <Lock className="h-3 w-3 text-muted-foreground" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground font-mono">{r.lang} · ★ {r.stars} · {r.updated}</p>
                </div>
                <button onClick={() => startImport(r.full)} className="px-3 py-1 border border-border hover:border-foreground text-[12px] rounded-md transition">
                  Import
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="border border-border p-6 max-w-2xl">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">{lang === 'fr' ? 'Configurer' : 'Configure'}</p>
          <h3 className="font-editorial text-2xl mb-1">{importing}</h3>
          <p className="text-[12px] font-mono text-muted-foreground mb-6">
            <Check className="inline h-3 w-3 text-success" /> Detected <span className="text-foreground">Next.js 14</span> · pnpm-lock.yaml
          </p>
          <div className="space-y-4">
            <Field label="Root directory">
              <Input value={config.root} onChange={(e) => setConfig({ ...config, root: e.target.value })} className="font-mono" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Build command"><Input value={config.build} onChange={(e) => setConfig({ ...config, build: e.target.value })} className="font-mono" /></Field>
              <Field label="Output directory"><Input value={config.output} onChange={(e) => setConfig({ ...config, output: e.target.value })} className="font-mono" /></Field>
            </div>
            <Field label="Environment variables">
              <div className="space-y-2">
                {config.envs.map((e, i) => (
                  <div key={i} className="grid grid-cols-2 gap-2">
                    <Input value={e.k} onChange={(ev) => {
                      const c = [...config.envs]; c[i].k = ev.target.value; setConfig({ ...config, envs: c });
                    }} className="font-mono text-[12px]" />
                    <Input type="password" value={e.v} placeholder="value" onChange={(ev) => {
                      const c = [...config.envs]; c[i].v = ev.target.value; setConfig({ ...config, envs: c });
                    }} className="font-mono text-[12px]" />
                  </div>
                ))}
                <button onClick={() => setConfig({ ...config, envs: [...config.envs, { k: '', v: '' }] })} className="text-[11px] text-muted-foreground hover:text-foreground font-mono">+ add variable</button>
              </div>
            </Field>
          </div>
          <div className="flex gap-2 mt-8 pt-6 border-t border-border">
            <button onClick={() => { setStep('select'); setImporting(null); }} className="px-3 py-1.5 text-[12px] text-muted-foreground hover:text-foreground">Cancel</button>
            <Button onClick={finishImport} className="ml-auto gap-2"><GitBranch className="h-3.5 w-3.5" /> Deploy</Button>
          </div>
        </div>
      )}

      {connected && step === 'select' && (
        <div className="border-t border-border pt-6">
          <h2 className="text-[13px] uppercase tracking-widest text-muted-foreground mb-3">{lang === 'fr' ? 'Repositories connectés' : 'Connected repositories'}</h2>
          <div className="border border-border">
            {[
              { repo: 'akua/kente-shop', branch: 'main', auto: true, last: '2m ago' },
              { repo: 'tunde/lagos-rides', branch: 'main', auto: true, last: '6h ago' },
            ].map((c) => (
              <div key={c.repo} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 text-[13px]">
                <StatusDot tone="success" />
                <span className="font-mono">{c.repo}</span>
                <span className="text-muted-foreground font-mono text-[11px]">{c.branch}</span>
                <span className="ml-auto text-[11px] text-muted-foreground font-mono">last push {c.last}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <GitHubOAuthDialog open={oauthOpen} onOpenChange={setOauthOpen} onAuthorized={() => setConnected(true)} />
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
