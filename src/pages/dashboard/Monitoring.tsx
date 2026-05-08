import { useI18n } from '@/lib/i18n';
import { Sparkline } from '@/components/Sparkline';
import { useState } from 'react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const ranges = ['1h', '24h', '7d', '30d'] as const;

const reqSeries = Array.from({ length: 48 }, (_, i) => ({ t: i, v: 80 + Math.sin(i / 4) * 30 + Math.random() * 25 }));
const latSeries = Array.from({ length: 48 }, (_, i) => ({ t: i, p50: 80 + Math.random() * 20, p95: 200 + Math.random() * 80, p99: 320 + Math.random() * 120 }));
const errSeries = Array.from({ length: 48 }, (_, i) => ({ t: i, v: Math.max(0, Math.random() * 5 - 3) }));

export default function Monitoring() {
  const { lang } = useI18n();
  const [range, setRange] = useState<typeof ranges[number]>('24h');

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">Monitoring</p>
          <h1 className="font-editorial text-4xl tracking-tight">{lang === 'fr' ? <>Performance & <em className="italic text-muted-foreground">erreurs</em></> : <>Performance & <em className="italic text-muted-foreground">errors</em></>}</h1>
        </div>
        <div className="inline-flex border border-border text-[11px] font-mono">
          {ranges.map((r) => (
            <button key={r} onClick={() => setRange(r)} className={`px-3 py-1.5 transition ${range === r ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}>
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 border-y border-border divide-x divide-border">
        {[
          { l: 'Requests', v: '142.8k', s: reqSeries.map((d) => d.v) },
          { l: 'p50 latency', v: '92ms', s: latSeries.map((d) => d.p50) },
          { l: 'p99 latency', v: '412ms', s: latSeries.map((d) => d.p99) },
          { l: 'Error rate', v: '0.4%', s: errSeries.map((d) => d.v) },
        ].map((k) => (
          <div key={k.l} className="px-5 py-5">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{k.l}</p>
            <p className="font-editorial text-3xl num mt-1">{k.v}</p>
            <Sparkline data={k.s} width={100} height={20} stroke="hsl(var(--primary))" />
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <ChartBlock title="Requests / sec" data={reqSeries} dataKey="v" color="hsl(var(--primary))" />
        <ChartBlock title="Latency p50 / p95 / p99" data={latSeries} multi color="hsl(var(--accent))" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="border border-border">
          <p className="px-4 py-2.5 border-b border-border text-[11px] uppercase tracking-widest text-muted-foreground">Top routes</p>
          <table className="w-full text-[12.5px] font-mono">
            <tbody className="divide-y divide-border">
              {[
                ['/api/products', '42.1k', '38ms'],
                ['/checkout', '18.4k', '142ms'],
                ['/api/momo/webhook', '12.8k', '88ms'],
                ['/_next/static/*', '38.0k', '12ms'],
                ['/dashboard', '4.2k', '210ms'],
              ].map(([r, c, l]) => (
                <tr key={r} className="hover:bg-muted/30"><td className="px-4 py-2.5 truncate">{r}</td><td className="px-4 py-2.5 text-right num">{c}</td><td className="px-4 py-2.5 text-right text-muted-foreground tabular-nums">{l}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border border-border">
          <p className="px-4 py-2.5 border-b border-border text-[11px] uppercase tracking-widest text-muted-foreground">Top errors</p>
          <table className="w-full text-[12.5px] font-mono">
            <tbody className="divide-y divide-border">
              {[
                ['TimeoutError', 'send-invoice', '24'],
                ['ValidationError', '/api/checkout', '12'],
                ['RateLimitExceeded', '/api/auth', '8'],
                ['DBConnectionError', 'orders', '3'],
              ].map(([e, r, c]) => (
                <tr key={e} className="hover:bg-muted/30"><td className="px-4 py-2.5 text-destructive">{e}</td><td className="px-4 py-2.5 text-muted-foreground">{r}</td><td className="px-4 py-2.5 text-right num">{c}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ChartBlock({ title, data, dataKey, color, multi }: { title: string; data: any[]; dataKey?: string; color: string; multi?: boolean }) {
  return (
    <div className="border border-border">
      <p className="px-4 py-2.5 border-b border-border text-[11px] uppercase tracking-widest text-muted-foreground">{title}</p>
      <div className="h-52 px-2 pb-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="2 4" vertical={false} />
            <XAxis dataKey="t" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={32} />
            <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
            {multi ? (
              <>
                <Line type="monotone" dataKey="p50" stroke="hsl(var(--success))" strokeWidth={1.2} dot={false} />
                <Line type="monotone" dataKey="p95" stroke="hsl(var(--warning))" strokeWidth={1.2} dot={false} />
                <Line type="monotone" dataKey="p99" stroke="hsl(var(--destructive))" strokeWidth={1.2} dot={false} />
              </>
            ) : (
              <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.4} dot={false} />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
