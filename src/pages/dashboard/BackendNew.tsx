import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Loader2, Server, Globe, Workflow, Clock, Box, Database, KeyRound,
  Plus, X, Check, CheckCircle2,
} from 'lucide-react';
import { useGithubRepos } from '@/hooks/useGithubRepos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DashboardToolbar } from '@/components/dashboard/DashboardPrimitives';
import { Stepper } from '@/components/Stepper';
import { createServiceAndDeploy, RENDER_PLANS, RENDER_REGIONS } from '@/lib/render';
import { toast } from 'sonner';
import { cn, humanizeApiError } from '@/lib/utils';

const TYPES = [
  { k: 'web_service', label: 'Web Service', desc: 'HTTP service from a Git repo or Docker image', I: Server, needsRepo: true },
  { k: 'static_site', label: 'Static Site', desc: 'Static assets built from a Git repo', I: Globe, needsRepo: true },
  { k: 'private_service', label: 'Private Service', desc: 'Internal HTTP not exposed to the internet', I: Box, needsRepo: true },
  { k: 'background_worker', label: 'Background Worker', desc: 'Long-running process from a Git repo', I: Workflow, needsRepo: true },
  { k: 'cron_job', label: 'Cron Job', desc: 'Scheduled task', I: Clock, needsRepo: true },
  { k: 'postgres', label: 'Postgres', desc: 'Managed Postgres database', I: Database, needsRepo: false },
  { k: 'key_value', label: 'Key Value (Redis)', desc: 'Managed Key Value store', I: KeyRound, needsRepo: false },
] as const;

type TypeKey = typeof TYPES[number]['k'];

const DRAFT_KEY = 'backend-new-draft-v2';

interface Draft {
  step: number;
  type: TypeKey;
  name: string;
  repo: string;
  branch: string;
  rootDir: string;
  region: string;
  plan: string;
  env: 'node' | 'docker' | 'static' | 'python';
  buildCommand: string;
  startCommand: string;
  publishPath: string;
  schedule: string;
  envVars: { key: string; value: string }[];
}

const initialDraft = (preset?: TypeKey): Draft => ({
  step: preset ? 1 : 0,
  type: preset || 'web_service',
  name: '',
  repo: '',
  branch: 'main',
  rootDir: '',
  region: 'oregon',
  plan: 'starter',
  env: 'node',
  buildCommand: '',
  startCommand: '',
  publishPath: 'dist',
  schedule: '0 * * * *',
  envVars: [],
});

const STEPS = [
  { label: 'Type', description: 'What to create' },
  { label: 'Source', description: 'Repo & branch' },
  { label: 'Build & Runtime', description: 'Region, plan, commands' },
  { label: 'Environment', description: 'Env variables' },
  { label: 'Review', description: 'Confirm & create' },
] as const;

export default function BackendNew() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const presetType = (params.get('type') as TypeKey | null) ?? undefined;
  const { repos, connected, loading: reposLoading } = useGithubRepos();

  const [draft, setDraft] = useState<Draft>(() => {
    if (typeof window === 'undefined') return initialDraft(presetType);
    try {
      const saved = sessionStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Draft;
        if (presetType && parsed.type !== presetType) return { ...parsed, type: presetType, step: Math.max(parsed.step, 1) };
        return parsed;
      }
    } catch { /* noop */ }
    return initialDraft(presetType);
  });
  const [submitting, setSubmitting] = useState(false);
  const [pasteEnv, setPasteEnv] = useState('');

  useEffect(() => {
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch { /* noop */ }
  }, [draft]);

  const cur = useMemo(() => TYPES.find((t) => t.k === draft.type)!, [draft.type]);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const goto = (n: number) => setDraft((d) => ({ ...d, step: Math.max(0, Math.min(STEPS.length - 1, n)) }));

  // Skip the "Source" step entirely for resources that don't need a repo.
  const visibleSteps = useMemo(() => cur.needsRepo ? STEPS : STEPS.filter((_, i) => i !== 1), [cur.needsRepo]);
  const stepperIndex = useMemo(() => {
    if (!cur.needsRepo && draft.step > 1) return draft.step - 1;
    return draft.step;
  }, [draft.step, cur.needsRepo]);

  const validateStep = (s: number): string | null => {
    if (s === 0) return draft.type ? null : 'Select a type';
    if (s === 1) {
      if (!cur.needsRepo) return null;
      if (!draft.repo) return 'Repository required';
      if (!draft.branch) return 'Branch required';
    }
    if (s === 2 && !draft.name) return 'Service name required';
    return null;
  };

  const next = () => {
    const err = validateStep(draft.step);
    if (err) { toast.error(err); return; }
    if (!cur.needsRepo && draft.step === 0) { goto(2); return; }
    goto(draft.step + 1);
  };
  const back = () => {
    if (!cur.needsRepo && draft.step === 2) { goto(0); return; }
    goto(draft.step - 1);
  };

  const importEnv = () => {
    const parsed = pasteEnv
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#') && l.includes('='))
      .map((l) => {
        const idx = l.indexOf('=');
        return { key: l.slice(0, idx).trim(), value: l.slice(idx + 1).trim().replace(/^["']|["']$/g, '') };
      });
    if (parsed.length === 0) { toast.error('No KEY=value pairs found'); return; }
    setDraft((d) => ({ ...d, envVars: [...d.envVars, ...parsed] }));
    setPasteEnv('');
    toast.success(`Imported ${parsed.length} variables`);
  };

  const submit = async () => {
    const err = validateStep(2);
    if (err) { toast.error(err); goto(2); return; }
    setSubmitting(true);
    try {
      const res = await createServiceAndDeploy({
        type: draft.type,
        name: draft.name,
        repo: cur.needsRepo ? draft.repo : undefined,
        branch: cur.needsRepo ? draft.branch : undefined,
        region: draft.region,
        plan: draft.plan,
        env: draft.type === 'static_site' ? 'static' : draft.env,
        buildCommand: draft.buildCommand || undefined,
        startCommand: draft.startCommand || undefined,
        publishPath: draft.type === 'static_site' ? draft.publishPath : undefined,
        rootDir: draft.rootDir || undefined,
        schedule: draft.type === 'cron_job' ? draft.schedule : undefined,
        envVars: draft.envVars.filter((e) => e.key),
      });
      toast.success(`${cur.label} created`);
      try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* noop */ }
      if (draft.type === 'postgres') navigate(`/dashboard/backend/database/${res.service_id}`);
      else if (draft.type === 'key_value') navigate('/dashboard/backend');
      else navigate(`/dashboard/backend/service/${res.service_id}`);
    } catch (e) {
      toast.error(humanizeApiError(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-w-0 flex-col">
      <DashboardToolbar
        eyebrow="Create"
        title="New backend service"
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/backend')}>
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Cancel
          </Button>
        }
      />

      <div className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-6 md:grid-cols-[220px_1fr] md:px-6">
        <aside className="md:sticky md:top-20 md:self-start">
          <Stepper steps={visibleSteps as any} current={stepperIndex} />
        </aside>

        <div className="space-y-5 rounded-md border border-border bg-card p-5">
          {draft.step === 0 && (
            <>
              <p className="text-[13px] text-muted-foreground">Choose what to create on Render.</p>
              <div className="grid gap-2 md:grid-cols-2">
                {TYPES.map((t) => (
                  <button
                    key={t.k}
                    onClick={() => { set('type', t.k); next(); }}
                    className={cn(
                      'flex items-start gap-3 rounded-md border bg-card p-4 text-left transition hover:border-primary/40 hover:bg-muted/30',
                      draft.type === t.k ? 'border-primary/50' : 'border-border',
                    )}
                  >
                    <t.I className="mt-0.5 h-5 w-5 text-primary" />
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold">{t.label}</p>
                      <p className="mt-0.5 text-[11.5px] text-muted-foreground">{t.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {draft.step === 1 && cur.needsRepo && (
            <>
              <Field label="GitHub Repository">
                {!connected ? (
                  <p className="text-[12px] text-amber-300">Connect GitHub in Integrations to list your repos. You can also paste a URL.</p>
                ) : reposLoading ? (
                  <div className="flex items-center gap-2 text-[12px] text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading repos…</div>
                ) : (
                  <Select value={draft.repo} onValueChange={(v) => set('repo', v)}>
                    <SelectTrigger><SelectValue placeholder="Select a repository…" /></SelectTrigger>
                    <SelectContent>
                      {repos.map((r) => <SelectItem key={r.id} value={r.html_url}>{r.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                <Input className="mt-2" value={draft.repo} onChange={(e) => set('repo', e.target.value)} placeholder="https://github.com/owner/repo" />
              </Field>
              <Field label="Branch">
                <Input value={draft.branch} onChange={(e) => set('branch', e.target.value)} />
              </Field>
              <Field label="Root Directory">
                <Input value={draft.rootDir} onChange={(e) => set('rootDir', e.target.value)} placeholder="(repo root)" />
              </Field>
            </>
          )}

          {draft.step === 2 && (
            <>
              <Field label="Name">
                <Input value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="my-service" />
                <p className="mt-1 text-[11px] text-muted-foreground">Will be prefixed with your user id for uniqueness.</p>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Region">
                  <Select value={draft.region} onValueChange={(v) => set('region', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{RENDER_REGIONS.map((r) => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Plan">
                  <Select value={draft.plan} onValueChange={(v) => set('plan', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{RENDER_PLANS.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              </div>

              {cur.needsRepo && draft.type !== 'static_site' && (
                <Field label="Runtime">
                  <Select value={draft.env} onValueChange={(v) => set('env', v as Draft['env'])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="node">Node</SelectItem>
                      <SelectItem value="python">Python</SelectItem>
                      <SelectItem value="docker">Docker</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              )}

              {cur.needsRepo && (
                <Field label="Build Command">
                  <Input value={draft.buildCommand} onChange={(e) => set('buildCommand', e.target.value)} placeholder={draft.type === 'static_site' ? 'npm run build' : 'npm install && npm run build'} />
                </Field>
              )}

              {cur.needsRepo && draft.type === 'static_site' && (
                <Field label="Publish Directory">
                  <Input value={draft.publishPath} onChange={(e) => set('publishPath', e.target.value)} />
                </Field>
              )}

              {cur.needsRepo && draft.type !== 'static_site' && (
                <Field label="Start Command">
                  <Input value={draft.startCommand} onChange={(e) => set('startCommand', e.target.value)} placeholder="npm start" />
                </Field>
              )}

              {draft.type === 'cron_job' && (
                <Field label="Schedule (cron)">
                  <Input value={draft.schedule} onChange={(e) => set('schedule', e.target.value)} placeholder="0 * * * *" />
                </Field>
              )}
            </>
          )}

          {draft.step === 3 && (
            <>
              <Field label="Environment Variables">
                <div className="space-y-2">
                  {draft.envVars.map((v, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input value={v.key} onChange={(e) => set('envVars', draft.envVars.map((x, j) => j === i ? { ...x, key: e.target.value } : x))} placeholder="KEY" className="font-mono text-[12px]" />
                      <Input value={v.value} onChange={(e) => set('envVars', draft.envVars.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} placeholder="value" className="font-mono text-[12px]" />
                      <button onClick={() => set('envVars', draft.envVars.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-red-400"><X className="h-4 w-4" /></button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => set('envVars', [...draft.envVars, { key: '', value: '' }])}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Add variable
                  </Button>
                </div>
              </Field>
              <Field label="Paste .env">
                <Textarea
                  rows={4}
                  value={pasteEnv}
                  onChange={(e) => setPasteEnv(e.target.value)}
                  placeholder={'DATABASE_URL=postgres://…\nAPI_KEY=…'}
                  className="font-mono text-[12px]"
                />
                <Button variant="outline" size="sm" className="mt-2" onClick={importEnv} disabled={!pasteEnv.trim()}>
                  Import {pasteEnv ? `(${pasteEnv.split('\n').filter((l) => l.includes('=')).length})` : ''}
                </Button>
              </Field>
            </>
          )}

          {draft.step === 4 && (
            <div className="space-y-3 text-[13px]">
              <p className="text-[12px] text-muted-foreground">Review your configuration before creating the resource.</p>
              <ReviewRow label="Type" value={cur.label} />
              <ReviewRow label="Name" value={draft.name || <em className="text-amber-300">missing</em>} />
              {cur.needsRepo && <ReviewRow label="Repository" value={`${draft.repo} · ${draft.branch}`} />}
              <ReviewRow label="Region / Plan" value={`${draft.region} · ${draft.plan}`} />
              {cur.needsRepo && draft.type !== 'static_site' && <ReviewRow label="Runtime" value={draft.env} />}
              {cur.needsRepo && draft.buildCommand && <ReviewRow label="Build" value={<code className="font-mono text-[11px]">{draft.buildCommand}</code>} />}
              {cur.needsRepo && draft.type !== 'static_site' && draft.startCommand && <ReviewRow label="Start" value={<code className="font-mono text-[11px]">{draft.startCommand}</code>} />}
              {draft.type === 'static_site' && <ReviewRow label="Publish" value={draft.publishPath} />}
              {draft.type === 'cron_job' && <ReviewRow label="Schedule" value={draft.schedule} />}
              <ReviewRow label="Env vars" value={`${draft.envVars.filter((v) => v.key).length} configured`} />
            </div>
          )}

          <div className="flex items-center justify-between border-t border-border pt-4">
            <Button variant="ghost" size="sm" onClick={back} disabled={draft.step === 0}>
              <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back
            </Button>
            {draft.step < STEPS.length - 1 ? (
              <Button size="sm" onClick={next}>
                Next <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button size="sm" onClick={submit} disabled={submitting}>
                {submitting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />}
                Create {cur.label}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block text-[11px] uppercase tracking-widest text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-1.5">
      <span className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1 truncate text-right">{value || '—'}</span>
    </div>
  );
}
