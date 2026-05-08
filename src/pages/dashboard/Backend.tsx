import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { StatusDot } from '@/components/StatusDot';
import { Database, Shield, FolderTree, Zap, Key, ScrollText, Plus, Play, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';

const tabs = [
  { k: 'database', I: Database, label: 'Database' },
  { k: 'auth', I: Shield, label: 'Auth' },
  { k: 'storage', I: FolderTree, label: 'Storage' },
  { k: 'functions', I: Zap, label: 'Functions' },
  { k: 'secrets', I: Key, label: 'Secrets' },
  { k: 'logs', I: ScrollText, label: 'Logs' },
];

const tables = [
  { name: 'users', rows: 1284, rls: true },
  { name: 'products', rows: 326, rls: true },
  { name: 'orders', rows: 4128, rls: true },
  { name: 'payments_momo', rows: 3812, rls: true },
  { name: 'shipments', rows: 2904, rls: false },
];

const productRows = [
  { id: 'p_001', name: 'Pagne kente royal', price: 12500, stock: 14 },
  { id: 'p_002', name: 'Boubou indigo Bamako', price: 24000, stock: 8 },
  { id: 'p_003', name: 'Bogolan tissé main', price: 18750, stock: 22 },
  { id: 'p_004', name: 'Wax tropical Dakar', price: 9500, stock: 41 },
];

export default function Backend() {
  const { lang } = useI18n();
  const [tab, setTab] = useState('database');
  const [activeTable, setActiveTable] = useState('products');
  const [sql, setSql] = useState('SELECT * FROM products WHERE stock < 20 ORDER BY price DESC;');
  const [showSecret, setShowSecret] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">Backend</p>
        <h1 className="font-editorial text-4xl tracking-tight">
          {lang === 'fr' ? <>Une <em className="italic text-primary">colonne vertébrale</em>. Tout inclus.</> : <>One <em className="italic text-primary">backbone</em>. Everything included.</>}
        </h1>
      </div>

      {/* tabs */}
      <div className="border-b border-border flex gap-1">
        {tabs.map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)} className={`flex items-center gap-1.5 px-3 py-2 text-[12px] border-b-2 -mb-px transition ${tab === t.k ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            <t.I className="h-3.5 w-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'database' && (
        <>
          <div className="grid grid-cols-12 gap-0 border border-border min-h-[480px]">
            <aside className="col-span-3 border-r border-border p-3">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Tables</p>
                <button className="text-muted-foreground hover:text-foreground"><Plus className="h-3.5 w-3.5" /></button>
              </div>
              <ul className="space-y-0.5">
                {tables.map((t) => (
                  <li key={t.name}>
                    <button onClick={() => setActiveTable(t.name)} className={`w-full text-left px-2 py-1.5 rounded text-[12.5px] font-mono transition ${activeTable === t.name ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                      {t.name}
                      <span className="float-right text-[10px] text-muted-foreground tabular-nums">{t.rows.toLocaleString()}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </aside>
            <div className="col-span-9 flex flex-col">
              <div className="px-4 py-2.5 border-b border-border flex items-center gap-3">
                <span className="font-mono text-[13px]">{activeTable}</span>
                <span className="text-[11px] text-muted-foreground font-mono">public.{activeTable}</span>
                <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-mono"><StatusDot tone="success" /> RLS enabled</span>
                <button className="text-[11px] text-muted-foreground hover:text-foreground"><Plus className="h-3.5 w-3.5 inline mr-1" />Insert row</button>
              </div>
              <table className="w-full">
                <thead className="border-b border-border bg-muted/30">
                  <tr className="text-[11px] uppercase tracking-widest text-muted-foreground font-mono">
                    <th className="text-left px-3 py-2 font-normal">id <span className="ml-1 normal-case text-muted-foreground/60">text</span></th>
                    <th className="text-left px-3 py-2 font-normal">name <span className="ml-1 normal-case text-muted-foreground/60">text</span></th>
                    <th className="text-left px-3 py-2 font-normal">price_xof <span className="ml-1 normal-case text-muted-foreground/60">int4</span></th>
                    <th className="text-left px-3 py-2 font-normal">stock <span className="ml-1 normal-case text-muted-foreground/60">int4</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-mono text-[12px]">
                  {productRows.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/30">
                      <td className="px-3 py-2">{r.id}</td>
                      <td className="px-3 py-2">{r.name}</td>
                      <td className="px-3 py-2 num">{r.price.toLocaleString('fr-FR')}</td>
                      <td className="px-3 py-2 num">{r.stock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-border mt-auto">
                <div className="px-4 py-2 border-b border-border flex items-center gap-3">
                  <span className="text-[11px] font-mono text-muted-foreground">SQL EDITOR</span>
                  <Button size="sm" className="ml-auto h-7 text-[11px]"><Play className="h-3 w-3" /> Run</Button>
                </div>
                <textarea value={sql} onChange={(e) => setSql(e.target.value)} className="w-full p-3 bg-[#0a0a0c] font-mono text-[12px] resize-none outline-none" rows={4} />
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'auth' && (
        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 border border-border">
            <p className="px-4 py-2.5 border-b border-border text-[11px] uppercase tracking-widest text-muted-foreground">Providers</p>
            {[
              { p: 'Email + Password', on: true },
              { p: 'Magic link', on: true },
              { p: 'Google', on: true },
              { p: 'GitHub', on: true },
              { p: 'Apple', on: false },
              { p: 'Phone (SMS)', on: true },
            ].map((p) => (
              <div key={p.p} className="px-4 py-3 border-b border-border last:border-0 flex items-center gap-3 text-[13px]">
                <span className="flex-1">{p.p}</span>
                <Switch defaultChecked={p.on} />
              </div>
            ))}
          </div>
          <div className="lg:col-span-7 border border-border">
            <p className="px-4 py-2.5 border-b border-border text-[11px] uppercase tracking-widest text-muted-foreground">Users · 1 284</p>
            <table className="w-full text-[12.5px] font-mono">
              <thead className="text-muted-foreground border-b border-border text-[11px] uppercase tracking-widest">
                <tr><th className="px-3 py-2 text-left font-normal">email</th><th className="px-3 py-2 text-left font-normal">provider</th><th className="px-3 py-2 text-left font-normal">last sign-in</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  ['akua@nebulaos.app', 'github', '2m'],
                  ['tunde@lagos-rides.com', 'google', '14m'],
                  ['mariama@dakar.dev', 'magic-link', '1h'],
                  ['kwame@ankara.shop', 'email', '3h'],
                ].map(([e, p, t]) => (
                  <tr key={e}><td className="px-3 py-2">{e}</td><td className="px-3 py-2 text-muted-foreground">{p}</td><td className="px-3 py-2 text-muted-foreground">{t}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'storage' && (
        <div className="border border-border">
          <div className="px-4 py-2.5 border-b border-border flex items-center gap-3">
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Buckets</span>
            <button className="ml-auto text-[11px] text-muted-foreground hover:text-foreground"><Plus className="h-3 w-3 inline mr-1" />New bucket</button>
          </div>
          {[
            { b: 'products-images', files: 326, size: '142 MB', public: true },
            { b: 'invoices', files: 1284, size: '38 MB', public: false },
            { b: 'avatars', files: 412, size: '12 MB', public: true },
          ].map((b) => (
            <div key={b.b} className="px-4 py-3 border-b border-border last:border-0 flex items-center gap-3 text-[13px]">
              <FolderTree className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono">{b.b}</span>
              <span className="text-[11px] font-mono text-muted-foreground ml-auto">{b.files} files · {b.size}</span>
              <span className={`text-[10px] uppercase tracking-wide ${b.public ? 'text-primary' : 'text-muted-foreground'}`}>{b.public ? 'public' : 'private'}</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'functions' && (
        <div className="grid grid-cols-12 gap-0 border border-border min-h-[420px]">
          <aside className="col-span-3 border-r border-border p-3 text-[12.5px] font-mono">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">Functions</p>
            {['momo-webhook', 'send-invoice', 'cron-renewal'].map((f, i) => (
              <div key={f} className={`px-2 py-1.5 rounded ${i === 0 ? 'bg-muted text-foreground' : 'text-muted-foreground'}`}>{f}</div>
            ))}
          </aside>
          <div className="col-span-9 flex flex-col">
            <div className="px-4 py-2.5 border-b border-border flex items-center gap-3">
              <span className="font-mono text-[13px]">momo-webhook</span>
              <span className="text-[11px] font-mono text-muted-foreground">https://api.nebula.app/fn/momo-webhook</span>
              <Button size="sm" className="ml-auto h-7 text-[11px]">Deploy</Button>
            </div>
            <pre className="p-4 bg-[#0a0a0c] text-[12px] font-mono overflow-auto flex-1"><code>{`import { handleMomo } from '@nebula/momo';

export default async function (req: Request) {
  const event = await req.json();
  if (event.type === 'payment.succeeded') {
    await db.transaction(async (tx) => {
      await tx.orders.update({ id: event.ref, status: 'paid' });
      await tx.wallet.credit(event.userId, event.amount);
    });
  }
  return new Response('ok');
}`}</code></pre>
          </div>
        </div>
      )}

      {tab === 'secrets' && (
        <div className="border border-border">
          <div className="px-4 py-2.5 border-b border-border flex items-center gap-3">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Project secrets</p>
            <button className="ml-auto text-[11px] text-muted-foreground hover:text-foreground"><Plus className="h-3 w-3 inline mr-1" />Add secret</button>
          </div>
          {[
            { k: 'STRIPE_SECRET_KEY', v: 'sk_live_••••••••••••••a8f2' },
            { k: 'MTN_MOMO_API_KEY', v: 'mom_••••••••••••••3d12' },
            { k: 'ORANGE_MONEY_TOKEN', v: 'om_••••••••••••••7c91' },
            { k: 'DATABASE_URL', v: 'postgres://••••••••••••' },
          ].map((s) => (
            <div key={s.k} className="px-4 py-3 border-b border-border last:border-0 flex items-center gap-3 text-[13px] font-mono">
              <span className="text-foreground">{s.k}</span>
              <span className="text-muted-foreground ml-auto">{showSecret === s.k ? s.v.replace(/•/g, 'X') : s.v}</span>
              <button onClick={() => setShowSecret(showSecret === s.k ? null : s.k)} className="text-muted-foreground hover:text-foreground">
                {showSecret === s.k ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'logs' && (
        <div className="border border-border">
          <div className="px-4 py-2.5 border-b border-border flex items-center gap-3">
            <Input placeholder="filter logs…" className="max-w-xs h-7 text-[12px] font-mono" />
            <span className="ml-auto text-[11px] font-mono text-muted-foreground"><StatusDot tone="success" className="mr-1.5 inline-block" /> live · 142/s</span>
          </div>
          <div className="p-4 font-mono text-[12px] space-y-0.5 bg-[#0a0a0c] max-h-[420px] overflow-auto">
            {[
              ['12:42:18.214', 'INFO', 'web', 'GET /api/products 200 38ms'],
              ['12:42:18.391', 'INFO', 'fn', 'momo-webhook invoked event=payment.succeeded'],
              ['12:42:18.402', 'INFO', 'db', 'UPDATE orders SET status=$1 (1 row)'],
              ['12:42:19.101', 'WARN', 'web', 'rate-limit hit ip=41.207.x.x route=/api/auth'],
              ['12:42:20.009', 'INFO', 'web', 'POST /api/checkout 200 124ms'],
              ['12:42:20.488', 'ERROR', 'fn', 'send-invoice timeout after 30000ms'],
            ].map((l, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-muted-foreground tabular-nums">{l[0]}</span>
                <span className={`w-12 ${l[1] === 'ERROR' ? 'text-destructive' : l[1] === 'WARN' ? 'text-warning' : 'text-muted-foreground'}`}>{l[1]}</span>
                <span className="w-10 text-muted-foreground">{l[2]}</span>
                <span className="text-foreground/85">{l[3]}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
