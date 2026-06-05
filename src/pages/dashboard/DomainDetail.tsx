import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Globe, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { DashboardToolbar, EmptyPanel, SectionPanel } from '@/components/dashboard/DashboardPrimitives';
import { Button } from '@/components/ui/button';
import { vercel, VercelDomainRecord } from '@/lib/vercel';
import { cn, safeDateString, safeFormatDistance } from '@/lib/utils';

export default function DomainDetail() {
  const { domain } = useParams<{ domain: string }>();
  const [info, setInfo] = useState<any | null>(null);
  const [records, setRecords] = useState<VercelDomainRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!domain) return;
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [details, rec] = await Promise.all([
          vercel.getDomain(domain).catch(() => null),
          vercel.listDomainRecords(domain).catch(() => ({ records: [] as VercelDomainRecord[] })),
        ]);
        if (!active) return;
        setInfo(details);
        setRecords(rec?.records || []);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [domain]);

  const removeRecord = async (id: string) => {
    if (!domain) return;
    try {
      await vercel.removeDomainRecord(domain, id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
      toast.success('Record removed');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div>
      <DashboardToolbar
        eyebrow="Domains"
        title={domain || 'Domain'}
        subtitle="DNS records, nameservers, and SSL certificates."
        actions={
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link to="/dashboard/domains">
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Link>
          </Button>
        }
      />

      <div className="space-y-5 px-4 py-6 md:px-6">
        {loading ? (
          <div className="flex h-48 items-center justify-center gap-2 rounded-md border border-border bg-card text-[13px] text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading domain…
          </div>
        ) : (
          <>
            <SectionPanel title="Summary">
              <div className="grid gap-3 p-4 md:grid-cols-3 xl:grid-cols-6">
                <Summary label="Status" value={info?.verified ? <span className="text-success">Verified</span> : <span className="text-warning">Pending</span>} />
                <Summary label="Registrar" value={info?.serviceType || 'Third Party'} />
                <Summary label="Age" value={safeFormatDistance(info?.createdAt, { addSuffix: true })} />
                <Summary label="Expires" value={safeDateString(info?.expiresAt)} />
                <Summary label="Nameservers" value={(info?.nameservers || []).join(', ') || 'Third Party'} />
                <Summary label="Auto Renewal" value={info?.renew ? 'On' : '—'} />
              </div>
            </SectionPanel>

            <SectionPanel
              title="DNS Records"
              meta={records.length ? `${records.length}` : 'Empty'}
              actions={
                <Button asChild variant="outline" size="sm" className="gap-1.5">
                  <a href={`https://vercel.com/dashboard/domains/${domain}`} target="_blank" rel="noreferrer">
                    Edit in Vercel <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
              }
            >
              {error ? (
                <EmptyPanel className="rounded-none border-0 bg-transparent" icon={<Globe className="h-8 w-8" />} title="Could not load DNS records" description={error} />
              ) : records.length === 0 ? (
                <EmptyPanel className="rounded-none border-0 bg-transparent" icon={<Globe className="h-8 w-8" />} title="No DNS records" description="Records managed at Vercel will appear here." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-[13px]">
                    <thead className="border-b border-border bg-muted/20 text-[11px] uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium">Name</th>
                        <th className="px-4 py-2 text-left font-medium">Type</th>
                        <th className="px-4 py-2 text-left font-medium">Value</th>
                        <th className="px-4 py-2 text-left font-medium">TTL</th>
                        <th className="px-4 py-2 text-left font-medium">Priority</th>
                        <th className="px-4 py-2 text-left font-medium">Age</th>
                        <th className="px-4 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {records.map((rec) => (
                        <tr key={rec.id}>
                          <td className="px-4 py-2 font-mono text-[12px]">{rec.name || '@'}</td>
                          <td className="px-4 py-2">
                            <span className="rounded border border-border px-1.5 py-0.5 text-[11px] font-mono">{rec.type}</span>
                          </td>
                          <td className="max-w-[280px] truncate px-4 py-2 font-mono text-[12px]">{rec.value}</td>
                          <td className="px-4 py-2 text-muted-foreground">{rec.ttl ?? '—'}</td>
                          <td className="px-4 py-2 text-muted-foreground">{rec.priority ?? '—'}</td>
                          <td className="px-4 py-2 text-muted-foreground">{safeFormatDistance(rec.createdAt, { addSuffix: true })}</td>
                          <td className="px-4 py-2 text-right">
                            <Button variant="outline" size="sm" onClick={() => removeRecord(rec.id)}>Remove</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionPanel>
          </>
        )}
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className={cn('min-w-0')}>
      <p className="mb-1 text-[11px] text-muted-foreground">{label}</p>
      <p className="truncate text-[13px] font-medium">{value || '—'}</p>
    </div>
  );
}
