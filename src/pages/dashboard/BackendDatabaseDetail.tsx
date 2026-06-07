import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Copy, Check, Loader2, Eye, EyeOff, PauseCircle, PlayCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardToolbar } from '@/components/dashboard/DashboardPrimitives';
import { render, RenderPostgres } from '@/lib/render';
import { safeFormatDistance, cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function BackendDatabaseDetail() {
  const { dbId = '' } = useParams();
  const navigate = useNavigate();
  const [db, setDb] = useState<RenderPostgres | null>(null);
  const [conn, setConn] = useState<{ externalConnectionString: string; internalConnectionString: string; psqlCommand: string } | null>(null);
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState<Record<string, boolean>>({});

  const load = async () => {
    setLoading(true);
    try {
      const [d, c, b] = await Promise.all([
        render.getPostgres(dbId),
        render.getPostgresConnectionInfo(dbId).catch(() => null),
        render.listPostgresBackups(dbId).catch(() => []),
      ]);
      setDb(d || null);
      setConn(c);
      setBackups(b || []);
    } finally { setLoading(false); }
  };
  useEffect(() => { if (dbId) void load(); }, [dbId]);

  if (loading && !db) return <div className="flex items-center justify-center p-12 text-[13px] text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...</div>;
  if (!db) return (
    <div className="p-12 text-center">
      <AlertCircle className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
      <p>Database not found.</p>
      <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate('/dashboard/backend')}>Back</Button>
    </div>
  );

  const togglePower = async () => {
    try {
      if (db.suspended === 'suspended') await render.resumePostgres(db.id);
      else await render.suspendPostgres(db.id);
      toast.success('OK'); load();
    } catch (e) { toast.error(String(e)); }
  };

  return (
    <div className="flex min-w-0 flex-col">
      <DashboardToolbar
        eyebrow="Postgres database"
        title={db.name}
        subtitle={`${db.plan || ''} · ${db.region || ''} · v${db.version || ''}`}
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/backend')}>
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back
            </Button>
            <Button variant="outline" size="sm" onClick={togglePower}>
              {db.suspended === 'suspended' ? <><PlayCircle className="mr-1.5 h-3.5 w-3.5" /> Resume</> : <><PauseCircle className="mr-1.5 h-3.5 w-3.5" /> Suspend</>}
            </Button>
          </>
        }
      />

      <div className="space-y-4 p-4 md:p-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Status" value={db.status || (db.suspended === 'suspended' ? 'suspended' : 'available')} />
          <Stat label="Plan" value={db.plan || '—'} />
          <Stat label="Region" value={db.region || '—'} />
          <Stat label="Created" value={safeFormatDistance(db.createdAt)} />
        </div>

        <div className="rounded-md border border-border bg-card">
          <div className="border-b border-border px-4 py-2.5 text-[12px] font-medium">Connection info</div>
          <div className="space-y-3 p-4">
            <ConnRow label="External URL" value={conn?.externalConnectionString} show={show.ext} onToggle={() => setShow({ ...show, ext: !show.ext })} />
            <ConnRow label="Internal URL" value={conn?.internalConnectionString} show={show.int} onToggle={() => setShow({ ...show, int: !show.int })} />
            <ConnRow label="psql command" value={conn?.psqlCommand} show={show.psql} onToggle={() => setShow({ ...show, psql: !show.psql })} />
            <div className="grid grid-cols-2 gap-3 text-[12px]">
              <KV label="Database" value={db.databaseName} />
              <KV label="User" value={db.databaseUser} />
            </div>
          </div>
        </div>

        <div className="rounded-md border border-border bg-card">
          <div className="border-b border-border px-4 py-2.5 text-[12px] font-medium">Backups</div>
          {backups.length === 0 ? (
            <p className="p-6 text-center text-[12px] text-muted-foreground">No backups available.</p>
          ) : (
            <ul className="divide-y divide-border">
              {backups.map((b, i) => (
                <li key={i} className="flex items-center justify-between px-4 py-2.5 text-[12.5px]">
                  <span className="font-mono">{b.id || i}</span>
                  <span className="text-muted-foreground">{safeFormatDistance(b.createdAt)}</span>
                  {b.url && <a href={b.url} className="text-primary hover:underline">Download</a>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-[14px] font-semibold">{value}</p>
    </div>
  );
}

function KV({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate font-mono">{value || '—'}</p>
    </div>
  );
}

function ConnRow({ label, value, show, onToggle }: { label: string; value?: string; show?: boolean; onToggle: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => { if (!value) return; await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1200); };
  return (
    <div>
      <p className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2 rounded-md border border-border bg-background p-2">
        <code className="min-w-0 flex-1 truncate font-mono text-[11.5px]">{value ? (show ? value : value.replace(/./g, '•').slice(0, 60)) : '—'}</code>
        <button onClick={onToggle} className="rounded p-1 text-muted-foreground hover:text-foreground">{show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</button>
        <button onClick={copy} disabled={!value} className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30">{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}</button>
      </div>
    </div>
  );
}
