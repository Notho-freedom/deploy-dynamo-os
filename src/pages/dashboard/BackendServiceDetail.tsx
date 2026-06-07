import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Loader2, RefreshCw, ExternalLink, PauseCircle, PlayCircle, RotateCcw, Trash2,
  Plus, X, Eye, EyeOff, Copy, Check, Rocket, AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DashboardToolbar } from '@/components/dashboard/DashboardPrimitives';
import { Terminal, TerminalLine } from '@/components/Terminal';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip as RTooltip, CartesianGrid } from 'recharts';
import { render, RenderService, RenderDeploy, RenderEnvVar, RenderCustomDomain, openRenderLogStream } from '@/lib/render';
import { supabase } from '@/integrations/supabase/client';
import { safeFormatDistance, cn, shortDeploymentId } from '@/lib/utils';
import { toast } from 'sonner';

const TABS = ['overview', 'deploys', 'logs', 'events', 'environment', 'settings', 'domains', 'metrics'] as const;
type Tab = typeof TABS[number];

function deployStatusBadge(status?: string) {
  const s = (status || '').toLowerCase();
  if (s === 'live') return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  if (s.includes('fail')) return 'bg-red-500/15 text-red-300 border-red-500/30';
  if (s.includes('cancel')) return 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30';
  if (s.includes('progress') || s === 'created') return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
  return 'bg-muted text-muted-foreground border-border';
}

export default function BackendServiceDetail() {
  const { serviceId = '' } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'overview';
  const setTab = (t: Tab) => setParams({ tab: t });

  const [service, setService] = useState<RenderService | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const s = await render.getService(serviceId);
      setService(s || null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (serviceId) void load(); }, [serviceId]);

  if (loading && !service) {
    return <div className="flex items-center justify-center p-12 text-[13px] text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading service...</div>;
  }
  if (!service) {
    return (
      <div className="p-12 text-center">
        <AlertCircle className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-[13px] text-muted-foreground">Service not found or removed.</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate('/dashboard/backend')}>Back</Button>
      </div>
    );
  }

  const doAction = async (action: 'suspend' | 'resume' | 'restart' | 'delete') => {
    if (action === 'delete' && !confirm(`Delete "${service.name}"?`)) return;
    try {
      if (action === 'suspend') await render.suspendService(service.id);
      if (action === 'resume') await render.resumeService(service.id);
      if (action === 'restart') await render.restartService(service.id);
      if (action === 'delete') {
        await render.deleteService(service.id);
        await supabase.from('user_backend_services').delete().eq('render_service_id', service.id);
        toast.success('Deleted');
        navigate('/dashboard/backend');
        return;
      }
      toast.success(`Service ${action}ed`);
      load();
    } catch (e) {
      toast.error(`Failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <div className="flex min-w-0 flex-col">
      <DashboardToolbar
        eyebrow={service.type}
        title={service.name}
        subtitle={service.serviceDetails?.url || service.repo}
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/backend')}>
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back
            </Button>
            {service.serviceDetails?.url && (
              <Button variant="outline" size="sm" asChild>
                <a href={service.serviceDetails.url} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Open
                </a>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={load}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
            </Button>
          </>
        }
      />

      <div className="px-4 md:px-6">
        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
          <TabsList className="my-3">
            {TABS.map((t) => <TabsTrigger key={t} value={t} className="capitalize">{t}</TabsTrigger>)}
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab service={service} onAction={doAction} onReload={load} />
          </TabsContent>
          <TabsContent value="deploys">
            <DeploysTab serviceId={service.id} />
          </TabsContent>
          <TabsContent value="logs">
            <LogsTab resource={service.id} />
          </TabsContent>
          <TabsContent value="events">
            <EventsTab serviceId={service.id} />
          </TabsContent>
          <TabsContent value="environment">
            <EnvTab serviceId={service.id} />
          </TabsContent>
          <TabsContent value="settings">
            <SettingsTab service={service} onReload={load} />
          </TabsContent>
          <TabsContent value="domains">
            <DomainsTab serviceId={service.id} />
          </TabsContent>
          <TabsContent value="metrics">
            <MetricsTab serviceId={service.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function OverviewTab({ service, onAction, onReload }: { service: RenderService; onAction: (a: 'suspend' | 'resume' | 'restart' | 'delete') => void; onReload: () => void }) {
  const [autoDeploy, setAutoDeploy] = useState(service.autoDeploy === 'yes');
  const toggleAuto = async (v: boolean) => {
    setAutoDeploy(v);
    try { await render.updateService(service.id, { autoDeploy: v ? 'yes' : 'no' }); toast.success('Updated'); onReload(); }
    catch (e) { toast.error(e instanceof Error ? e.message : String(e)); setAutoDeploy(!v); }
  };
  const sd = service.serviceDetails || {};

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Type" value={service.type} />
        <Stat label="Plan" value={sd.plan || '—'} />
        <Stat label="Region" value={sd.region || '—'} />
        <Stat label="Instances" value={String(sd.numInstances ?? 1)} />
      </div>

      <div className="rounded-md border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Auto-Deploy</p>
            <p className="text-[12.5px] text-muted-foreground">Deploy automatically on push to <code className="rounded bg-muted px-1">{service.branch}</code>.</p>
          </div>
          <Switch checked={autoDeploy} onCheckedChange={toggleAuto} />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <KV label="Repository" value={service.repo} mono />
        <KV label="Branch" value={service.branch} mono />
        <KV label="Root directory" value={service.rootDir || '/'} mono />
        <KV label="Build command" value={sd.buildCommand} mono />
        <KV label="Start command" value={sd.startCommand} mono />
        <KV label="Health check" value={sd.healthCheckPath} mono />
        <KV label="Created" value={safeFormatDistance(service.createdAt)} />
        <KV label="Updated" value={safeFormatDistance(service.updatedAt)} />
      </div>

      <div className="flex flex-wrap gap-2 rounded-md border border-border bg-card p-3">
        {service.suspended === 'suspended' ? (
          <Button size="sm" variant="outline" onClick={() => onAction('resume')}><PlayCircle className="mr-1.5 h-3.5 w-3.5" /> Resume</Button>
        ) : (
          <Button size="sm" variant="outline" onClick={() => onAction('suspend')}><PauseCircle className="mr-1.5 h-3.5 w-3.5" /> Suspend</Button>
        )}
        <Button size="sm" variant="outline" onClick={() => onAction('restart')}><RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Restart</Button>
        <Button size="sm" variant="outline" onClick={() => onAction('delete')} className="text-red-400 hover:text-red-300"><Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete</Button>
      </div>
    </div>
  );
}

function DeploysTab({ serviceId }: { serviceId: string }) {
  const [deploys, setDeploys] = useState<RenderDeploy[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try { setDeploys(await render.listDeploys(serviceId)); }
    catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    void load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [serviceId]);

  const trigger = async (clearCache: boolean) => {
    setBusy(true);
    try { await render.triggerDeploy(serviceId, clearCache); toast.success('Deploy triggered'); load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={() => trigger(true)} disabled={busy}>Clear cache & deploy</Button>
        <Button size="sm" onClick={() => trigger(false)} disabled={busy}>
          {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Rocket className="mr-1.5 h-3.5 w-3.5" />}
          Manual Deploy
        </Button>
      </div>
      <div className="overflow-hidden rounded-md border border-border bg-card">
        <table className="w-full text-[12.5px]">
          <thead className="bg-muted/30 text-[11px] uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Deploy ID</th>
              <th className="px-3 py-2 text-left font-medium">Status</th>
              <th className="px-3 py-2 text-left font-medium">Commit</th>
              <th className="px-3 py-2 text-left font-medium">Trigger</th>
              <th className="px-3 py-2 text-left font-medium">Created</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading && deploys.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-muted-foreground"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></td></tr>
            )}
            {!loading && deploys.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No deploys yet.</td></tr>
            )}
            {deploys.map((d) => {
              const isActive = /progress|created/i.test(d.status);
              return (
                <tr key={d.id} className="border-t border-border hover:bg-muted/20">
                  <td className="px-3 py-2 font-mono text-[11px]">{shortDeploymentId(d.id)}</td>
                  <td className="px-3 py-2"><span className={cn('rounded-full border px-2 py-0.5 text-[10px]', deployStatusBadge(d.status))}>{d.status}</span></td>
                  <td className="max-w-[420px] px-3 py-2">
                    <p className="line-clamp-2 text-[12px]" title={d.commit?.message}>{d.commit?.message || '—'}</p>
                    {d.commit?.id && <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{d.commit.id.slice(0, 7)}</p>}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{d.trigger?.manual ? 'manual' : d.trigger?.newCommit ? 'commit' : d.trigger?.firstBuild ? 'first build' : '—'}</td>
                  <td className="px-3 py-2 text-muted-foreground">{safeFormatDistance(d.createdAt)}</td>
                  <td className="px-3 py-2 text-right">
                    {isActive && (
                      <Button size="sm" variant="ghost" onClick={async () => { try { await render.cancelDeploy(serviceId, d.id); toast.success('Canceled'); load(); } catch (e) { toast.error(String(e)); } }}>Cancel</Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LogsTab({ resource }: { resource: string }) {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [type, setType] = useState<'app' | 'build' | 'request'>('app');
  const closer = useRef<(() => void) | null>(null);

  useEffect(() => {
    setLines([]);
    closer.current?.();
    closer.current = openRenderLogStream(resource, type, (entry) => {
      const lvl = (entry.level || '').toLowerCase();
      const tone: TerminalLine['tone'] = lvl === 'error' ? 'error' : lvl === 'warning' || lvl === 'warn' ? 'warning' : undefined;
      const ts = entry.timestamp ? `[${new Date(entry.timestamp).toLocaleTimeString()}] ` : '';
      setLines((prev) => [...prev.slice(-1000), { text: `${ts}${entry.message}`, tone }]);
    });
    return () => closer.current?.();
  }, [resource, type]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {(['app', 'build', 'request'] as const).map((t) => (
          <button key={t} onClick={() => setType(t)} className={cn('rounded-md border px-3 py-1 text-[12px] capitalize', type === t ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground')}>
            {t}
          </button>
        ))}
      </div>
      <Terminal lines={lines} streaming height="h-[500px]" prompt={`render logs --type=${type}`} />
    </div>
  );
}

function EventsTab({ serviceId }: { serviceId: string }) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    render.listEvents(serviceId).then((e) => { setEvents(e); setLoading(false); }).catch(() => setLoading(false));
  }, [serviceId]);
  if (loading) return <div className="p-6 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" /></div>;
  if (!events.length) return <div className="rounded-md border border-dashed border-border bg-card p-12 text-center text-[13px] text-muted-foreground">No events.</div>;
  return (
    <ul className="overflow-hidden rounded-md border border-border bg-card divide-y divide-border">
      {events.map((e, i) => (
        <li key={i} className="flex items-center gap-3 px-4 py-2.5 text-[12.5px]">
          <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-mono">{e.type}</span>
          <span className="min-w-0 flex-1 truncate text-muted-foreground">{e.details?.message || JSON.stringify(e.details || {})}</span>
          <span className="text-[11px] text-muted-foreground">{safeFormatDistance(e.timestamp)}</span>
        </li>
      ))}
    </ul>
  );
}

function EnvTab({ serviceId }: { serviceId: string }) {
  const [vars, setVars] = useState<RenderEnvVar[]>([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [newKey, setNewKey] = useState('');
  const [newVal, setNewVal] = useState('');

  const load = async () => {
    try { setVars(await render.listEnv(serviceId)); }
    catch (e) { toast.error(String(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [serviceId]);

  const save = async (all: RenderEnvVar[]) => {
    try { await render.setEnv(serviceId, all); toast.success('Env vars saved'); load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
  };

  const add = () => {
    if (!newKey) return;
    save([...vars, { key: newKey, value: newVal }]);
    setNewKey(''); setNewVal('');
  };

  const remove = async (key: string) => {
    if (!confirm(`Delete ${key}?`)) return;
    try { await render.deleteEnv(serviceId, key); toast.success('Deleted'); load(); }
    catch (e) { toast.error(String(e)); }
  };

  if (loading) return <div className="p-6 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-md border border-border bg-card">
        <table className="w-full text-[12.5px]">
          <thead className="bg-muted/30 text-[11px] uppercase tracking-widest text-muted-foreground">
            <tr><th className="px-3 py-2 text-left font-medium">Key</th><th className="px-3 py-2 text-left font-medium">Value</th><th className="px-3 py-2"></th></tr>
          </thead>
          <tbody>
            {vars.length === 0 && <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">No env vars.</td></tr>}
            {vars.map((v) => (
              <tr key={v.key} className="border-t border-border">
                <td className="px-3 py-2 font-mono">{v.key}</td>
                <td className="px-3 py-2 font-mono">
                  <span>{visible[v.key] ? v.value : '•'.repeat(Math.min(20, v.value?.length ?? 6))}</span>
                </td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => setVisible({ ...visible, [v.key]: !visible[v.key] })} className="rounded p-1 text-muted-foreground hover:text-foreground" title={visible[v.key] ? 'Hide' : 'Show'}>
                    {visible[v.key] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                  <button onClick={() => remove(v.key)} className="rounded p-1 text-muted-foreground hover:text-red-400" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-2 rounded-md border border-border bg-card p-3">
        <Input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="KEY" className="font-mono" />
        <Input value={newVal} onChange={(e) => setNewVal(e.target.value)} placeholder="value" className="font-mono" />
        <Button size="sm" onClick={add}><Plus className="mr-1.5 h-3.5 w-3.5" /> Add</Button>
      </div>
    </div>
  );
}

function SettingsTab({ service, onReload }: { service: RenderService; onReload: () => void }) {
  const sd = service.serviceDetails || {};
  const [buildCommand, setBuildCommand] = useState(sd.buildCommand || '');
  const [startCommand, setStartCommand] = useState(sd.startCommand || '');
  const [healthCheckPath, setHealthCheckPath] = useState(sd.healthCheckPath || '');
  const [rootDir, setRootDir] = useState(service.rootDir || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await render.updateService(service.id, {
        rootDir,
        serviceDetails: { ...sd, buildCommand, startCommand, healthCheckPath },
      });
      toast.success('Settings saved');
      onReload();
    } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-3 rounded-md border border-border bg-card p-4">
      <SettingRow label="Root Directory"><Input value={rootDir} onChange={(e) => setRootDir(e.target.value)} /></SettingRow>
      <SettingRow label="Build Command"><Input value={buildCommand} onChange={(e) => setBuildCommand(e.target.value)} /></SettingRow>
      <SettingRow label="Start Command"><Input value={startCommand} onChange={(e) => setStartCommand(e.target.value)} /></SettingRow>
      <SettingRow label="Health Check Path"><Input value={healthCheckPath} onChange={(e) => setHealthCheckPath(e.target.value)} placeholder="/healthz" /></SettingRow>
      <div className="flex justify-end">
        <Button size="sm" onClick={save} disabled={saving}>{saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />} Save</Button>
      </div>
    </div>
  );
}

function DomainsTab({ serviceId }: { serviceId: string }) {
  const [domains, setDomains] = useState<RenderCustomDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');

  const load = async () => {
    try { setDomains(await render.listDomains(serviceId)); }
    catch (e) { toast.error(String(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [serviceId]);

  const add = async () => {
    if (!name) return;
    try { await render.addDomain(serviceId, name); toast.success('Domain added — configure DNS'); setName(''); load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
  };

  if (loading) return <div className="p-6 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" /></div>;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-md border border-border bg-card p-3">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="example.com" />
        <Button size="sm" onClick={add}><Plus className="mr-1.5 h-3.5 w-3.5" /> Add</Button>
      </div>
      <div className="overflow-hidden rounded-md border border-border bg-card">
        <table className="w-full text-[12.5px]">
          <thead className="bg-muted/30 text-[11px] uppercase tracking-widest text-muted-foreground">
            <tr><th className="px-3 py-2 text-left font-medium">Domain</th><th className="px-3 py-2 text-left font-medium">Type</th><th className="px-3 py-2 text-left font-medium">Status</th><th className="px-3 py-2"></th></tr>
          </thead>
          <tbody>
            {domains.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No custom domains.</td></tr>}
            {domains.map((d) => (
              <tr key={d.id} className="border-t border-border">
                <td className="px-3 py-2 font-mono">{d.name}</td>
                <td className="px-3 py-2 text-muted-foreground">{d.domainType || '—'}</td>
                <td className="px-3 py-2">
                  <span className={cn('rounded-full border px-2 py-0.5 text-[10px]', d.verificationStatus === 'verified' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/15 text-amber-300 border-amber-500/30')}>
                    {d.verificationStatus || 'unverified'}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  {d.verificationStatus !== 'verified' && (
                    <Button size="sm" variant="ghost" onClick={async () => { try { await render.verifyDomain(serviceId, d.id); toast.success('Verification triggered'); load(); } catch (e) { toast.error(String(e)); } }}>Verify</Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={async () => { if (!confirm(`Remove ${d.name}?`)) return; try { await render.removeDomain(serviceId, d.id); toast.success('Removed'); load(); } catch (e) { toast.error(String(e)); } }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MetricsTab({ serviceId }: { serviceId: string }) {
  const [range, setRange] = useState<'1h' | '24h' | '7d'>('24h');
  const [data, setData] = useState<Record<string, { time: string; value: number }[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const hours = range === '1h' ? 1 : range === '24h' ? 24 : 24 * 7;
    const startTime = new Date(now.getTime() - hours * 3600 * 1000).toISOString();
    const resolutionSeconds = range === '1h' ? 60 : range === '24h' ? 300 : 1800;
    const metrics = ['cpu', 'memory', 'http-requests', 'http-latency'];
    setLoading(true);
    Promise.all(metrics.map((m) => render.metrics(m, serviceId, startTime, now.toISOString(), resolutionSeconds).catch(() => null)))
      .then((results) => {
        const next: Record<string, { time: string; value: number }[]> = {};
        results.forEach((r, i) => {
          if (!r) { next[metrics[i]] = []; return; }
          const arr = Array.isArray(r) ? r : (r as any).values || [];
          next[metrics[i]] = arr.map((s: any) => ({ time: s.time, value: Number(s.value) || 0 }));
        });
        setData(next);
      })
      .finally(() => setLoading(false));
  }, [serviceId, range]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {(['1h', '24h', '7d'] as const).map((r) => (
          <button key={r} onClick={() => setRange(r)} className={cn('rounded-md border px-3 py-1 text-[12px]', range === r ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground')}>
            {r}
          </button>
        ))}
      </div>
      {loading && <div className="p-6 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" /></div>}
      <div className="grid gap-3 md:grid-cols-2">
        {['cpu', 'memory', 'http-requests', 'http-latency'].map((m) => (
          <div key={m} className="rounded-md border border-border bg-card p-3">
            <p className="mb-2 text-[11px] uppercase tracking-widest text-muted-foreground">{m}</p>
            {(data[m]?.length ?? 0) === 0 ? (
              <p className="py-12 text-center text-[12px] text-muted-foreground">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={data[m]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <RTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 11 }} />
                  <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" dot={false} strokeWidth={1.5} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-[15px] font-semibold">{value}</p>
    </div>
  );
}

function KV({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => { if (!value) return; await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1200); };
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
        {value && <button onClick={copy} className="text-muted-foreground hover:text-foreground">{copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}</button>}
      </div>
      <p className={cn('mt-1 truncate text-[12px]', mono && 'font-mono', !value && 'text-muted-foreground')}>{value || '—'}</p>
    </div>
  );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid items-center gap-2 md:grid-cols-[180px_1fr]">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}
