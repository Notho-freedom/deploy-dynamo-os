import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { useApp } from '@/lib/store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { StatusDot } from '@/components/StatusDot';
import { Search, Globe, Settings as Cog } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from '@/hooks/use-toast';

const tlds = [
  { tld: '.com', price: 5900 },
  { tld: '.app', price: 12000 },
  { tld: '.io', price: 28500 },
  { tld: '.dev', price: 9800 },
  { tld: '.africa', price: 15500 },
  { tld: '.ci', price: 32000 },
  { tld: '.sn', price: 28000 },
  { tld: '.ng', price: 18500 },
];

export default function Domains() {
  const { lang } = useI18n();
  const { domains, addDomain } = useApp();
  const [q, setQ] = useState('');
  const [drawer, setDrawer] = useState<string | null>(null);

  const search = q.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">Domains</p>
        <h1 className="font-editorial text-4xl tracking-tight">
          {lang === 'fr' ? <>Réservez. <em className="italic text-muted-foreground">Pointez. Encaissez.</em></> : <>Register. <em className="italic text-muted-foreground">Point. Earn.</em></>}
        </h1>
      </div>

      <div className="border border-border p-5">
        <div className="flex items-center gap-3 border border-border px-3 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={lang === 'fr' ? 'Trouvez votre nom de domaine…' : 'Find your domain name…'}
            className="flex-1 bg-transparent outline-none text-[14px] font-mono"
          />
        </div>
        {search && (
          <div className="mt-4 divide-y divide-border border-t border-border">
            {tlds.map((t) => {
              const taken = ['.com', '.io'].includes(t.tld) && search.length < 8;
              return (
                <div key={t.tld} className="flex items-center gap-3 py-3 text-[13px]">
                  <span className="font-mono">
                    {search}<span className="text-primary">{t.tld}</span>
                  </span>
                  <span className={`text-[10px] uppercase tracking-wide ml-3 ${taken ? 'text-muted-foreground' : 'text-success'}`}>{taken ? 'taken' : 'available'}</span>
                  <span className="font-mono text-muted-foreground ml-auto tabular-nums">{t.price.toLocaleString('fr-FR')} FCFA / an</span>
                  <Button
                    size="sm"
                    disabled={taken}
                    onClick={() => {
                      addDomain({ name: search + t.tld, status: 'pending', expiresAt: '2027-01-01', autoRenew: true, registrar: 'namecheap' });
                      toast({ title: 'Domaine en cours de réservation', description: search + t.tld });
                    }}
                    variant={taken ? 'ghost' : 'default'}
                    className="h-7 text-[11px]"
                  >
                    {taken ? '—' : 'Add'}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-[13px] uppercase tracking-widest text-muted-foreground mb-3">{lang === 'fr' ? 'Vos domaines' : 'Your domains'}</h2>
        <div className="border border-border">
          <table className="w-full">
            <thead className="border-b border-border text-[11px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="text-left font-normal px-4 py-2.5">Domain</th>
                <th className="text-left font-normal px-4 py-2.5">Project</th>
                <th className="text-left font-normal px-4 py-2.5">Nameservers</th>
                <th className="text-left font-normal px-4 py-2.5">Expires</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {domains.map((d) => (
                <tr key={d.name} className="text-[13px] hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono">{d.name}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-[12px]">{d.projectId ?? '—'}</td>
                  <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 text-[12px]"><StatusDot tone={d.status === 'active' ? 'success' : 'warning'} pulse={d.status === 'pending'} /> {d.status === 'active' ? 'configured' : 'verifying'}</span></td>
                  <td className="px-4 py-3 font-mono text-[12px] text-muted-foreground">{d.expiresAt}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setDrawer(d.name)} className="text-muted-foreground hover:text-foreground"><Cog className="h-3.5 w-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Sheet open={!!drawer} onOpenChange={(v) => !v && setDrawer(null)}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="font-editorial italic text-2xl">{drawer}</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-5">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">DNS records</p>
              <div className="border border-border">
                <table className="w-full text-[12px] font-mono">
                  <thead className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                    <tr><th className="text-left px-3 py-2 font-normal">Type</th><th className="text-left px-3 py-2 font-normal">Name</th><th className="text-left px-3 py-2 font-normal">Value</th><th className="text-left px-3 py-2 font-normal">TTL</th></tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {[
                      ['A', '@', '76.76.21.21', '3600'],
                      ['CNAME', 'www', 'cname.nebula.app.', '3600'],
                      ['MX', '@', '10 mx.zoho.com.', '3600'],
                      ['TXT', '@', 'v=spf1 include:zoho.com ~all', '3600'],
                    ].map((r, i) => (
                      <tr key={i}>{r.map((c, j) => <td key={j} className="px-3 py-2">{c}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <Button variant="outline" className="w-full">Add record</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
