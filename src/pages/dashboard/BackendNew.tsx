import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Server, Globe, Workflow, Clock, Box, Database, KeyRound, Plus, X } from 'lucide-react';
import { useGithubRepos } from '@/hooks/useGithubRepos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DashboardToolbar } from '@/components/dashboard/DashboardPrimitives';
import { createServiceAndDeploy, RENDER_PLANS, RENDER_REGIONS } from '@/lib/render';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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

export default function BackendNew() {
  const navigate = useNavigate();
  const { repos, connected, loading: reposLoading } = useGithubRepos();
  const [step, setStep] = useState<'type' | 'config'>('type');
  const [type, setType] = useState<TypeKey>('web_service');
  const [name, setName] = useState('');
  const [repo, setRepo] = useState('');
  const [branch, setBranch] = useState('main');
  const [region, setRegion] = useState('oregon');
  const [plan, setPlan] = useState('starter');
  const [env, setEnv] = useState<'node' | 'docker' | 'static' | 'python'>('node');
  const [buildCommand, setBuildCommand] = useState('');
  const [startCommand, setStartCommand] = useState('');
  const [publishPath, setPublishPath] = useState('dist');
  const [rootDir, setRootDir] = useState('');
  const [schedule, setSchedule] = useState('0 * * * *');
  const [envVars, setEnvVars] = useState<{ key: string; value: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const cur = TYPES.find((t) => t.k === type)!;

  const submit = async () => {
    if (!name) { toast.error('Name required'); return; }
    if (cur.needsRepo && !repo) { toast.error('Repository required'); return; }
    setSubmitting(true);
    try {
      const res = await createServiceAndDeploy({
        type,
        name,
        repo: cur.needsRepo ? repo : undefined,
        branch: cur.needsRepo ? branch : undefined,
        region,
        plan,
        env: type === 'static_site' ? 'static' : env,
        buildCommand: buildCommand || undefined,
        startCommand: startCommand || undefined,
        publishPath: type === 'static_site' ? publishPath : undefined,
        rootDir: rootDir || undefined,
        schedule: type === 'cron_job' ? schedule : undefined,
        envVars: envVars.filter((e) => e.key),
      });
      toast.success(`${cur.label} created`);
      if (type === 'postgres') navigate(`/dashboard/backend/database/${res.service_id}`);
      else if (type === 'key_value') navigate('/dashboard/backend');
      else navigate(`/dashboard/backend/service/${res.service_id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
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

      <div className="mx-auto w-full max-w-3xl space-y-6 p-4 md:p-6">
        {step === 'type' && (
          <>
            <p className="text-[13px] text-muted-foreground">Choose what to create on Render.</p>
            <div className="grid gap-2 md:grid-cols-2">
              {TYPES.map((t) => (
                <button
                  key={t.k}
                  onClick={() => { setType(t.k); setStep('config'); }}
                  className={cn(
                    'flex items-start gap-3 rounded-md border border-border bg-card p-4 text-left transition hover:border-primary/40 hover:bg-muted/30',
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

        {step === 'config' && (
          <div className="space-y-5 rounded-md border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setStep('type')}>
                <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back
              </Button>
              <span className="text-[13px] font-semibold">{cur.label}</span>
            </div>

            <Field label="Name">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="my-service" />
              <p className="mt-1 text-[11px] text-muted-foreground">Will be prefixed with your user id for uniqueness.</p>
            </Field>

            {cur.needsRepo && (
              <>
                <Field label="GitHub Repository">
                  {!connected ? (
                    <p className="text-[12px] text-amber-300">Connect GitHub in Integrations to list your repos. You can also paste a URL.</p>
                  ) : reposLoading ? (
                    <div className="flex items-center gap-2 text-[12px] text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading repos...</div>
                  ) : (
                    <Select value={repo} onValueChange={setRepo}>
                      <SelectTrigger><SelectValue placeholder="Select a repository..." /></SelectTrigger>
                      <SelectContent>
                        {repos.map((r) => (
                          <SelectItem key={r.id} value={r.html_url}>{r.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Input className="mt-2" value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="https://github.com/owner/repo" />
                </Field>

                <Field label="Branch">
                  <Input value={branch} onChange={(e) => setBranch(e.target.value)} />
                </Field>

                <Field label="Root Directory">
                  <Input value={rootDir} onChange={(e) => setRootDir(e.target.value)} placeholder="(repo root)" />
                </Field>

                {type !== 'static_site' && (
                  <Field label="Runtime">
                    <Select value={env} onValueChange={(v) => setEnv(v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="node">Node</SelectItem>
                        <SelectItem value="python">Python</SelectItem>
                        <SelectItem value="docker">Docker</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                )}

                <Field label="Build Command">
                  <Input value={buildCommand} onChange={(e) => setBuildCommand(e.target.value)} placeholder={type === 'static_site' ? 'npm run build' : 'npm install && npm run build'} />
                </Field>

                {type === 'static_site' ? (
                  <Field label="Publish Directory">
                    <Input value={publishPath} onChange={(e) => setPublishPath(e.target.value)} />
                  </Field>
                ) : (
                  <Field label="Start Command">
                    <Input value={startCommand} onChange={(e) => setStartCommand(e.target.value)} placeholder="npm start" />
                  </Field>
                )}

                {type === 'cron_job' && (
                  <Field label="Schedule (cron)">
                    <Input value={schedule} onChange={(e) => setSchedule(e.target.value)} placeholder="0 * * * *" />
                  </Field>
                )}
              </>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label="Region">
                <Select value={region} onValueChange={setRegion}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{RENDER_REGIONS.map((r) => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Plan">
                <Select value={plan} onValueChange={setPlan}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{RENDER_PLANS.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>

            {cur.needsRepo && (
              <Field label="Environment Variables">
                <div className="space-y-2">
                  {envVars.map((v, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input value={v.key} onChange={(e) => setEnvVars(envVars.map((x, j) => j === i ? { ...x, key: e.target.value } : x))} placeholder="KEY" className="font-mono text-[12px]" />
                      <Input value={v.value} onChange={(e) => setEnvVars(envVars.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} placeholder="value" className="font-mono text-[12px]" />
                      <button onClick={() => setEnvVars(envVars.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-red-400"><X className="h-4 w-4" /></button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => setEnvVars([...envVars, { key: '', value: '' }])}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Add variable
                  </Button>
                </div>
              </Field>
            )}

            <div className="flex justify-end">
              <Button onClick={submit} disabled={submitting}>
                {submitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Create {cur.label}
              </Button>
            </div>
          </div>
        )}
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
