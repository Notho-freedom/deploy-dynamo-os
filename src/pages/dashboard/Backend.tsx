import { useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Database, KeyRound, Workflow, Activity, Server, Clock, Globe, Plus, RefreshCw, Loader2,
  PauseCircle, PlayCircle, RotateCcw, Trash2, ExternalLink, AlertCircle, ArrowRight,
} from 'lucide-react';
import { render, RenderService, RenderPostgres, RenderKeyValue } from '@/lib/render';
import { Button } from '@/components/ui/button';
import { DashboardToolbar, FilterBar, SelectFilter } from '@/components/dashboard/DashboardPrimitives';
import { useRealtimeInvalidate } from '@/hooks/useRealtimeInvalidate';
import { useAuth } from '@/hooks/useAuth';
import { safeFormatDistance, cn } from '@/lib/utils';
import { toast } from 'sonner';

type TabKey = 'overview' | 'web_service' | 'static_site' | 'background_worker' | 'cron_job' | 'private_service' | 'postgres' | 'keyvalue';

const TAB_LABELS: Record<TabKey, string> = {
  overview: 'Overview',
  web_service: 'Web Services',
  static_site: 'Static Sites',
  background_worker: 'Background Workers',
  cron_job: 'Cron Jobs',
  private_service: 'Private Services',
  postgres: 'Postgres',
  keyvalue: 'Key Value',
};

const NEW_LABELS: Partial<Record<TabKey, string>> = {
  web_service: 'Create Web Service',
  static_site: 'Create Static Site',
  background_worker: 'Create Worker',
  cron_job: 'Create Cron Job',
  private_service: 'Create Private Service',
  postgres: 'Create Postgres Database',
  keyvalue: 'Create Key Value',
};

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
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('type') as TabKey) || 'overview';
  const query = params.get('q') || '';
  const region = params.get('region') || 'all';

  useRealtimeInvalidate('user_backend_services', [['render-services'], ['render-postgres'], ['render-keyvalue']]);

  const setQuery = (q: string) => {
    const next = new URLSearchParams(params);
    if (q) next.set('q', q);
    else next.delete('q');
    setParams(next, { replace: true });
  };
  const setRegion = (r: string) => {
    const next = new URLSearchParams(params);
    if (r === 'all') next.delete('region');
    else next.set('region', r);
    setParams(next, { replace: true });
  };

  const servicesQ = useQuery({
    queryKey: ['render-services', user?.id],
    queryFn: () => render.listServices().catch(() => [] as RenderService[]),
    refetchInterval: 30_000,
  });
  const postgresQ = useQuery({
    queryKey: ['render-postgres', user?.id],
    queryFn: () => render.listPostgres().catch(() => [] as RenderPostgres[]),
    refetchInterval: 30_000,
  });
  const keyvalueQ = useQuery({
    queryKey: ['render-keyvalue', user?.id],
    queryFn: () => render.listKeyValue().catch(() => [] as RenderKeyValue[]),
    refetchInterval: 30_000,
  });

  const services = servicesQ.data ?? [];
  const postgres = postgresQ.data ?? [];
  const keyvalue = keyvalueQ.data ?? [];
  const loading = (servicesQ.isLoading && !servicesQ.data) || (postgresQ.isLoading && !postgresQ.data) || (keyvalueQ.isLoading && !keyvalueQ.data);
  const refresh = () => {
    void servicesQ.refetch();
    void postgresQ.refetch();
    void keyvalueQ.refetch();
  };

  const filteredServices = useMemo(() => {
    if (tab === 'overview' || tab === 'postgres' || tab === 'keyvalue') return [];
    return services
      .filter((s) => s.type === tab)
      .filter((s) => !query || s.name.toLowerCase().includes(query.toLowerCase()) || (s.repo || '').toLowerCase().includes(query.toLowerCase()))
      .filter((s) => region === 'all' || s.serviceDetails?.region === region);
  }, [services, tab, query, region]);

  const regions = Array.from(new Set(services.map((s) => s.serviceDetails?.region).filter(Boolean) as string[]));
  const totalsByType = {
    web_service: services.filter((s) => s.type === 'web_service').length,
    static_site: services.filter((s) => s.type === 'static_site').length,
    background_worker: services.filter((s) => s.type === 'background_worker').length,
    cron_job: services.filter((s) => s.type === 'cron_job').length,
    private_service: services.filter((s) => s.type === 'private_service').length,
    suspended: services.filter((s) => s.suspended === 'suspended').length,
  };

  const isEmpty = !loading && services.length === 0 && postgres.length === 0 && keyvalue.length === 0;
  const tabIsEmpty = !loading && (
    (tab === 'postgres' && postgres.length === 0) ||
    (tab === 'keyvalue' && keyvalue.length === 0) ||
    (tab !== 'overview' && tab !== 'postgres' && tab !== 'keyvalue' && filteredServices.length === 0 && services.filter((s) => s.type === tab).length === 0)
  );

  const error = servicesQ.error || postgresQ.error || keyvalueQ.error;
  const errMsg = error instanceof Error ? error.message : null;

  const newAction = (type?: string) => {
    const target = type ? `/dashboard/backend/new?type=${encodeURIComponent(type)}` : '/dashboard/backend/new';
    navigate(target);
  };

  return (
    <div className="flex min-w-0 flex-col">
      <DashboardToolbar
        eyebrow="Render backend"
        title={TAB_LABELS[tab]}
        subtitle={loading ? 'Loading from Render…' : `${services.length} services · ${postgres.length} Postgres · ${keyvalue.length} Key Value`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
              <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', loading && 'animate-spin')} />
              Refresh
            </Button>
            <Button size="sm" onClick={() => newAction(tab === 'overview' ? undefined : tab)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {NEW_LABELS[tab] || 'New'}
            </Button>
          </>
        }
      />

      <div className="space-y-4 p-4 md:p-6">
        {errMsg && (
          <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-[12px] text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Unable to reach Render API</p>
              <p className="font-mono text-[11px] opacity-80">{errMsg}</p>
            </div>
          </div>
        )}

        {loading && services.length === 0 && postgres.length === 0 && keyvalue.length === 0 ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-md border border-border bg-card" />
            ))}
          </div>
        ) : isEmpty ? (
          <EmptyBackendInline onCreate={() => newAction()} />
        ) : tabIsEmpty ? (
          <TabEmptyInline tab={tab} onCreate={() => newAction(tab)} />
        ) : (
          <>
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
                <ServiceTable services={filteredServices} loading={loading} onAction={refresh} />
              </>
            )}

            {tab === 'postgres' && <PostgresTable items={postgres} loading={loading} />}
            {tab === 'keyvalue' && <KeyValueTable items={keyvalue} loading={loading} />}
          </>
        )}
      </div>
    </div>
  );
}

function EmptyBackendInline({ onCreate }: { onCreate: () => void }) {
  const cards = [
    { type: 'web_service', label: 'Web Service', desc: 'API, full-stack apps, anything that listens on a port.', I: Server },
    { type: 'static_site', label: 'Static Site', desc: 'CDN-hosted static build (React, Vite, Hugo…).', I: Globe },
    { type: 'background_worker', label: 'Background Worker', desc: 'Long-running process without HTTP.', I: Workflow },
    { type: 'cron_job', label: 'Cron Job', desc: 'Run a command on a schedule.', I: Clock },
    { type: 'postgres', label: 'Postgres', desc: 'Managed Postgres database.', I: Database },
    { type: 'keyvalue', label: 'Key Value', desc: 'Redis-compatible cache.', I: KeyRound },
  ];
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-card p-6">
        <h2 className="text-[15px] font-semibold">Create your first backend service</h2>
        <p className="mt-1 text-[12.5px] text-muted-foreground">Choose what to spin up. All services connect to Render under your account.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.type}
            to={`/dashboard/backend/new?type=${c.type}`}
            className="group flex items-start gap-3 rounded-md border border-border bg-card p-4 transition hover:border-foreground/40"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted/40">
              <c.I className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-[13.5px] font-semibold">{c.label}</h3>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
              </div>
              <p className="mt-1 text-[12px] leading-snug text-muted-foreground">{c.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function TabEmptyInline({ tab, onCreate }: { tab: TabKey; onCreate: () => void }) {
  const label = TAB_LABELS[tab];
  return (
    <div className="rounded-md border border-dashed border-border bg-card p-12 text-center">
      <p className="text-[14px] font-medium">No {label.toLowerCase()} yet</p>
      <p className="mt-1 text-[12.5px] text-muted-foreground">Create one to get started — the form is pre-configured for {label.toLowerCase()}.</p>
      <Button size="sm" className="mt-4 gap-1.5" onClick={onCreate}>
        <Plus className="h-3.5 w-3.5" />
        {NEW_LABELS[tab] || `Create ${label}`}
      </Button>
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
