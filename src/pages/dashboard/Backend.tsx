import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box, Database, KeyRound, Workflow, Activity, Server, Clock, Globe, Plus, RefreshCw, Loader2, Search,
  PauseCircle, PlayCircle, RotateCcw, Trash2, ExternalLink, AlertCircle, CheckCircle2,
} from 'lucide-react';
import { render, RenderService, RenderPostgres, RenderKeyValue } from '@/lib/render';
import { Button } from '@/components/ui/button';
import { DashboardToolbar, FilterBar, SelectFilter } from '@/components/dashboard/DashboardPrimitives';
import { safeFormatDistance, cn } from '@/lib/utils';
import { toast } from 'sonner';

const TABS = [
  { k: 'overview', label: 'Overview', I: Activity },
  { k: 'web', label: 'Web Services', I: Server },
  { k: 'static', label: 'Static Sites', I: Globe },
  { k: 'workers', label: 'Background Workers', I: Workflow },
  { k: 'cron', label: 'Cron Jobs', I: Clock },
  { k: 'private', label: 'Private Services', I: Box },
  { k: 'postgres', label: 'Postgres', I: Database },
  { k: 'keyvalue', label: 'Key Value', I: KeyRound },
] as const;

type TabKey = typeof TABS[number]['k'];

function statusBadge(status?: string, suspended?: string) {
  if (suspended === 'suspended') return { cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30', label: 'Suspended' };
  const s = (status || '').toLowerCase();
  if (s.includes('live') || s.includes('available')) return { cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', label: 'Live' };
  if (s.includes('fail')) return { cls: 'bg-red-500/15 text-red-300 border-red-500/30', label: status! };
  if (s.includes('progress') || s.includes('creating')) return { cls: 'bg-blue-500/15 text-blue-300 border-blue-500/30', label: status! };
  return { cls: 'bg-muted text-muted-foreground border-border', label: status || '—' };
}

export default function Backend() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>('overview');
  const [services, setServices] = useState<RenderService[]>([]);
  const [postgres, setPostgres] = useState<RenderPostgres[]>([]);
  const [keyvalue, setKeyvalue] = useState<RenderKeyValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('all');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, p, k] = await Promise.all([
        render.listServices().catch(() => []),
        render.listPostgres().catch(() => []),
        render.listKeyValue().catch(() => []),
      ]);
      setServices(s);
      setPostgres(p);
      setKeyvalue(k);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const filterServices = (type: RenderService['type']) =>
    services.filter((s) => s.type === type)
      .filter((s) => !query || s.name.toLowerCase().includes(query.toLowerCase()) || s.repo?.toLowerCase().includes(query.toLowerCase()))
      .filter((s) => region === 'all' || s.serviceDetails?.region === region);

  const regions = Array.from(new Set(services.map((s) => s.serviceDetails?.region).filter(Boolean) as string[]));

  const totalsByType = {
    web_service: services.filter((s) => s.type === 'web_service').length,
    static_site: services.filter((s) => s.type === 'static_site').length,
    background_worker: services.filter((s) => s.type === 'background_worker').length,
    cron_job: services.filter((s) => s.type === 'cron_job').length,
    private_service: services.filter((s) => s.type === 'private_service').length,
    suspended: services.filter((s) => s.suspended === 'suspended').length,
  };

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-[220px] shrink-0 border-r border-border bg-card/30 p-3 md:block">
        <p className="px-2 pb-2 text-[11px] uppercase tracking-widest text-muted-foreground">Backend</p>
        <nav className="space-y-0.5">
          {TABS.map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] transition',
                tab === t.k ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground',
              )}
            >
              <t.I className="h-4 w-4" />
              <span className="min-w-0 flex-1 truncate">{t.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardToolbar
          eyebrow="Render backend"
          title={TABS.find((t) => t.k === tab)?.label || 'Backend'}
          subtitle={loading ? 'Loading from Render...' : `${services.length} services · ${postgres.length} Postgres · ${keyvalue.length} Key Value`}
          actions={
            <>
              <Button variant="outline" size="sm" onClick={load} disabled={loading}>
                <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', loading && 'animate-spin')} />
                Refresh
              </Button>
              <Button size="sm" onClick={() => navigate('/dashboard/backend/new')}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                New
              </Button>
            </>
          }
        />

        <div className="space-y-4 p-4 md:p-6">
          {error && (
            <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-[12px] text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Unable to reach Render API</p>
                <p className="font-mono text-[11px] opacity-80">{error}</p>
              </div>
            </div>
          )}

          {tab === 'overview' && (
            <OverviewGrid totals={totalsByType} postgres={postgres.length} keyvalue={keyvalue.length} services={services} />
          )}

          {tab !== 'overview' && tab !== 'postgres' && tab !== 'keyvalue' && (
            <>
              <FilterBar query={query} onQueryChange={setQuery} placeholder="Search services...">
                {regions.length > 0 && (
                  <SelectFilter
                    value={region}
                    onChange={setRegion}
                    label="Region"
                    options={[{ value: 'all', label: 'All regions' }, ...regions.map((r) => ({ value: r, label: r }))]}
                  />
                )}
              </FilterBar>
              <ServiceTable
                services={filterServices(
                  tab === 'web' ? 'web_service' :
                  tab === 'static' ? 'static_site' :
                  tab === 'workers' ? 'background_worker' :
                  tab === 'cron' ? 'cron_job' : 'private_service',
                )}
                loading={loading}
                onAction={load}
              />
            </>
          )}

          {tab === 'postgres' && (
            <PostgresTable items={postgres} loading={loading} />
          )}

          {tab === 'keyvalue' && (
            <KeyValueTable items={keyvalue} loading={loading} />
          )}
        </div>
      </div>
    </div>
  );
}

function OverviewGrid({ totals, postgres, keyvalue, services }: { totals: Record<string, number>; postgres: number; keyvalue: number; services: RenderService[] }) {
  const cards = [
    { label: 'Web Services', value: totals.web_service, I: Server, to: 'web' },
    { label: 'Static Sites', value: totals.static_site, I: Globe, to: 'static' },
    { label: 'Workers', value: totals.background_worker, I: Workflow, to: 'workers' },
    { label: 'Cron Jobs', value: totals.cron_job, I: Clock, to: 'cron' },
    { label: 'Private', value: totals.private_service, I: Box, to: 'private' },
    { label: 'Postgres', value: postgres, I: Database, to: 'postgres' },
    { label: 'Key Value', value: keyvalue, I: KeyRound, to: 'keyvalue' },
    { label: 'Suspended', value: totals.suspended, I: PauseCircle, to: 'web' },
  ];
  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
        {cards.map((c) => (
          <div key={c.label} className="rounded-md border border-border bg-card p-3">
            <div className="flex items-center justify-between text-muted-foreground">
              <c.I className="h-3.5 w-3.5" />
              <span className="text-[10px] uppercase tracking-widest">{c.label}</span>
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-md border border-border bg-card">
        <div className="border-b border-border px-4 py-2.5 text-[12px] font-medium">Recently updated</div>
        {services.length === 0 ? (
          <div className="p-8 text-center text-[13px] text-muted-foreground">
            No backend services yet.{' '}
            <Link to="/dashboard/backend/new" className="text-primary hover:underline">Create your first service →</Link>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {services.slice(0, 8).map((s) => {
              const b = statusBadge(undefined, s.suspended);
              return (
                <li key={s.id}>
                  <Link to={`/dashboard/backend/service/${s.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30">
                    <Server className="h-4 w-4 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{s.name}</span>
                    <span className="hidden truncate text-[11px] text-muted-foreground md:inline">{s.repo}</span>
                    <span className={cn('rounded-full border px-2 py-0.5 text-[10px]', b.cls)}>{b.label}</span>
                    <span className="hidden text-[11px] text-muted-foreground md:inline">{safeFormatDistance(s.updatedAt)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}

function ServiceTable({ services, loading, onAction }: { services: RenderService[]; loading: boolean; onAction: () => void }) {
  const doAction = async (id: string, action: 'suspend' | 'resume' | 'restart' | 'delete', name: string) => {
    if (action === 'delete' && !confirm(`Delete service "${name}"? This is irreversible.`)) return;
    try {
      if (action === 'suspend') await render.suspendService(id);
      if (action === 'resume') await render.resumeService(id);
      if (action === 'restart') await render.restartService(id);
      if (action === 'delete') await render.deleteService(id);
      toast.success(`Service ${action}ed`);
      onAction();
    } catch (e) {
      toast.error(`Failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  if (loading && services.length === 0) {
    return <div className="flex items-center justify-center rounded-md border border-border bg-card p-12 text-[13px] text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading services...</div>;
  }
  if (services.length === 0) {
    return <div className="rounded-md border border-dashed border-border bg-card p-12 text-center text-[13px] text-muted-foreground">No services of this type.</div>;
  }

  return (
    <div className="overflow-hidden rounded-md border border-border bg-card">
      <table className="w-full text-[12.5px]">
        <thead className="bg-muted/30 text-[11px] uppercase tracking-widest text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Name</th>
            <th className="px-3 py-2 text-left font-medium">Status</th>
            <th className="px-3 py-2 text-left font-medium">Region</th>
            <th className="px-3 py-2 text-left font-medium">Plan</th>
            <th className="px-3 py-2 text-left font-medium">Repo</th>
            <th className="px-3 py-2 text-left font-medium">Branch</th>
            <th className="px-3 py-2 text-left font-medium">Updated</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {services.map((s) => {
            const b = statusBadge(undefined, s.suspended);
            return (
              <tr key={s.id} className="border-t border-border hover:bg-muted/20">
                <td className="px-3 py-2">
                  <Link to={`/dashboard/backend/service/${s.id}`} className="font-medium hover:text-primary">{s.name}</Link>
                </td>
                <td className="px-3 py-2"><span className={cn('rounded-full border px-2 py-0.5 text-[10px]', b.cls)}>{b.label}</span></td>
                <td className="px-3 py-2 text-muted-foreground">{s.serviceDetails?.region || '—'}</td>
                <td className="px-3 py-2 text-muted-foreground">{s.serviceDetails?.plan || '—'}</td>
                <td className="max-w-[200px] truncate px-3 py-2 text-muted-foreground" title={s.repo}>{s.repo?.replace(/^https?:\/\/github\.com\//, '') || '—'}</td>
                <td className="px-3 py-2 text-muted-foreground">{s.branch || '—'}</td>
                <td className="px-3 py-2 text-muted-foreground">{safeFormatDistance(s.updatedAt)}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-1">
                    {s.serviceDetails?.url && (
                      <a href={s.serviceDetails.url} target="_blank" rel="noreferrer" className="rounded p-1 text-muted-foreground hover:text-foreground" title="Open">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {s.suspended === 'suspended' ? (
                      <button onClick={() => doAction(s.id, 'resume', s.name)} className="rounded p-1 text-muted-foreground hover:text-foreground" title="Resume">
                        <PlayCircle className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <button onClick={() => doAction(s.id, 'suspend', s.name)} className="rounded p-1 text-muted-foreground hover:text-foreground" title="Suspend">
                        <PauseCircle className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button onClick={() => doAction(s.id, 'restart', s.name)} className="rounded p-1 text-muted-foreground hover:text-foreground" title="Restart">
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => doAction(s.id, 'delete', s.name)} className="rounded p-1 text-muted-foreground hover:text-red-400" title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PostgresTable({ items, loading }: { items: RenderPostgres[]; loading: boolean }) {
  if (loading && items.length === 0) {
    return <div className="flex items-center justify-center rounded-md border border-border bg-card p-12 text-[13px] text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading databases...</div>;
  }
  if (items.length === 0) {
    return <div className="rounded-md border border-dashed border-border bg-card p-12 text-center text-[13px] text-muted-foreground">No Postgres databases yet.</div>;
  }
  return (
    <div className="overflow-hidden rounded-md border border-border bg-card">
      <table className="w-full text-[12.5px]">
        <thead className="bg-muted/30 text-[11px] uppercase tracking-widest text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Name</th>
            <th className="px-3 py-2 text-left font-medium">Database</th>
            <th className="px-3 py-2 text-left font-medium">User</th>
            <th className="px-3 py-2 text-left font-medium">Plan</th>
            <th className="px-3 py-2 text-left font-medium">Region</th>
            <th className="px-3 py-2 text-left font-medium">Version</th>
            <th className="px-3 py-2 text-left font-medium">Status</th>
            <th className="px-3 py-2 text-left font-medium">Created</th>
          </tr>
        </thead>
        <tbody>
          {items.map((p) => {
            const b = statusBadge(p.status, p.suspended);
            return (
              <tr key={p.id} className="border-t border-border hover:bg-muted/20">
                <td className="px-3 py-2"><Link to={`/dashboard/backend/database/${p.id}`} className="font-medium hover:text-primary">{p.name}</Link></td>
                <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">{p.databaseName || '—'}</td>
                <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">{p.databaseUser || '—'}</td>
                <td className="px-3 py-2 text-muted-foreground">{p.plan || '—'}</td>
                <td className="px-3 py-2 text-muted-foreground">{p.region || '—'}</td>
                <td className="px-3 py-2 text-muted-foreground">{p.version || '—'}</td>
                <td className="px-3 py-2"><span className={cn('rounded-full border px-2 py-0.5 text-[10px]', b.cls)}>{b.label}</span></td>
                <td className="px-3 py-2 text-muted-foreground">{safeFormatDistance(p.createdAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function KeyValueTable({ items, loading }: { items: RenderKeyValue[]; loading: boolean }) {
  if (loading && items.length === 0) {
    return <div className="flex items-center justify-center rounded-md border border-border bg-card p-12 text-[13px] text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...</div>;
  }
  if (items.length === 0) {
    return <div className="rounded-md border border-dashed border-border bg-card p-12 text-center text-[13px] text-muted-foreground">No Key Value instances yet.</div>;
  }
  return (
    <div className="overflow-hidden rounded-md border border-border bg-card">
      <table className="w-full text-[12.5px]">
        <thead className="bg-muted/30 text-[11px] uppercase tracking-widest text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Name</th>
            <th className="px-3 py-2 text-left font-medium">Plan</th>
            <th className="px-3 py-2 text-left font-medium">Region</th>
            <th className="px-3 py-2 text-left font-medium">Status</th>
            <th className="px-3 py-2 text-left font-medium">Created</th>
          </tr>
        </thead>
        <tbody>
          {items.map((k) => {
            const b = statusBadge(k.status, k.suspended);
            return (
              <tr key={k.id} className="border-t border-border hover:bg-muted/20">
                <td className="px-3 py-2 font-medium">{k.name}</td>
                <td className="px-3 py-2 text-muted-foreground">{k.plan || '—'}</td>
                <td className="px-3 py-2 text-muted-foreground">{k.region || '—'}</td>
                <td className="px-3 py-2"><span className={cn('rounded-full border px-2 py-0.5 text-[10px]', b.cls)}>{b.label}</span></td>
                <td className="px-3 py-2 text-muted-foreground">{safeFormatDistance(k.createdAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
