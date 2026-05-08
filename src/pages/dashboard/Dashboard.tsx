import { Link } from 'react-router-dom';
import { useApp } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import { Sparkline } from '@/components/Sparkline';
import { StatusDot } from '@/components/StatusDot';
import { ArrowUpRight, ExternalLink, GitCommit, Rocket, Wallet, AlertCircle, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const seriesA = [12, 18, 14, 22, 28, 24, 31, 27, 35, 30, 42, 38, 44];
const seriesB = [4, 5, 4, 6, 5, 7, 6, 8, 9, 7, 10, 9, 11];
const seriesC = [22, 18, 24, 20, 19, 21, 16, 18, 14, 12, 11, 9, 8];
const seriesD = [0, 1, 0, 0, 2, 0, 1, 0, 0, 0, 1, 0, 0];

export default function Dashboard() {
  const { projects, deployments, wallet } = useApp();
  const { lang } = useI18n();
  const recentDeploys = deployments.slice(0, 6);

  return (
    <div className="space-y-12">
      {/* HEADER */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">{lang === 'fr' ? 'Vue d\'ensemble' : 'Overview'}</p>
          <h1 className="font-editorial text-4xl tracking-tight">{lang === 'fr' ? 'Bonjour Akua,' : 'Hello Akua,'} <span className="italic text-muted-foreground">{lang === 'fr' ? 'voici votre matin.' : 'here is your morning.'}</span></h1>
        </div>
        <Link
          to="/dashboard/builder"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-foreground text-background text-[12.5px] rounded-md hover:bg-foreground/90 transition"
        >
          <Plus className="h-3.5 w-3.5" /> {lang === 'fr' ? 'Nouveau projet' : 'New project'}
        </Link>
      </div>

      {/* KPI ROW — no cards, dividers */}
      <div className="grid grid-cols-2 md:grid-cols-4 border-y border-border divide-x divide-border">
        {[
          { label: 'Requests', value: '142.8k', delta: '+12.4%', series: seriesA, tone: 'text-success' },
          { label: 'Bandwidth', value: '38.2 GB', delta: '+4.1%', series: seriesB, tone: 'text-success' },
          { label: 'Build mins', value: '1 280', delta: '−2.0%', series: seriesC, tone: 'text-muted-foreground' },
          { label: 'Errors', value: '4', delta: '−66%', series: seriesD, tone: 'text-success' },
        ].map((k) => (
          <div key={k.label} className="px-5 py-5">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{k.label}</p>
            <div className="flex items-end justify-between mt-2">
              <p className="font-editorial text-3xl num">{k.value}</p>
              <Sparkline data={k.series} width={56} height={20} stroke="currentColor" />
            </div>
            <p className={`text-[11px] font-mono mt-1 ${k.tone}`}>{k.delta} <span className="text-muted-foreground">vs 7d</span></p>
          </div>
        ))}
      </div>

      {/* MAIN GRID */}
      <div className="grid lg:grid-cols-12 gap-10">
        {/* Activity */}
        <div className="lg:col-span-5">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-[13px] uppercase tracking-widest text-muted-foreground">{lang === 'fr' ? 'Activité' : 'Activity'}</h2>
            <span className="text-[11px] font-mono text-muted-foreground">live</span>
          </div>
          <ol className="relative pl-4 border-l border-border space-y-5">
            {[
              { icon: Rocket, time: '2m', text: 'Deployment kente-shop succeeded', meta: '28.3s · main@a8f2c1d', tone: 'success' as const },
              { icon: GitCommit, time: '14m', text: 'Push akua/kente-shop main', meta: 'feat: bogolan checkout · 3 files', tone: 'muted' as const },
              { icon: Wallet, time: '1h', text: 'Wallet topped up via MTN MoMo', meta: '+10 000 FCFA · MTN-48372001', tone: 'success' as const },
              { icon: AlertCircle, time: '3h', text: 'lagos-rides p99 latency > 800ms', meta: 'auto-resolved at 09:42', tone: 'warning' as const },
              { icon: GitCommit, time: '6h', text: 'Push tunde/lagos-rides feat/dispatch', meta: 'wip: dispatcher v2 · 12 files', tone: 'muted' as const },
              { icon: Rocket, time: '1d', text: 'Domain kente-shop.com renewed', meta: 'auto · 12 mo · 8 200 FCFA', tone: 'muted' as const },
            ].map((e, i) => (
              <li key={i} className="flex gap-3 -ml-[22px] items-start">
                <span className="h-6 w-6 rounded-full bg-background border border-border flex items-center justify-center shrink-0">
                  <e.icon className="h-3 w-3 text-muted-foreground" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <p className="text-[13px]">{e.text}</p>
                    <span className="font-mono text-[11px] text-muted-foreground tabular-nums ml-auto">{e.time}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{e.meta}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Projects table */}
        <div className="lg:col-span-7">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-[13px] uppercase tracking-widest text-muted-foreground">{lang === 'fr' ? 'Projets' : 'Projects'}</h2>
            <Link to="/dashboard/builder" className="text-[12px] text-muted-foreground hover:text-foreground">{lang === 'fr' ? 'Tous →' : 'All →'}</Link>
          </div>
          <div className="border border-border">
            <table className="w-full">
              <thead className="border-b border-border">
                <tr className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  <th className="text-left font-normal px-4 py-2.5">Project</th>
                  <th className="text-left font-normal px-4 py-2.5">Framework</th>
                  <th className="text-left font-normal px-4 py-2.5">Last deploy</th>
                  <th className="text-left font-normal px-4 py-2.5">Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {projects.map((p) => {
                  const last = deployments.find((d) => d.projectId === p.id);
                  return (
                    <tr key={p.id} className="hover:bg-muted/30 transition">
                      <td className="px-4 py-3">
                        <p className="font-mono text-[13px]">{p.name}</p>
                        {p.url && <p className="text-[11px] text-muted-foreground truncate">{p.url.replace('https://', '')}</p>}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-muted-foreground font-mono">{p.framework}</td>
                      <td className="px-4 py-3 text-[12px] text-muted-foreground font-mono">{last ? formatDistanceToNow(last.createdAt, { addSuffix: false }) : '—'}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-[12px]">
                          <StatusDot tone={p.status === 'ready' ? 'success' : p.status === 'building' ? 'warning' : p.status === 'error' ? 'destructive' : 'muted'} pulse={p.status === 'building'} />
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {p.url && (
                          <a href={p.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground inline-block">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Wallet summary */}
          <div className="mt-8 border border-border p-5 flex items-center gap-6">
            <div className="flex-1">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">{lang === 'fr' ? 'Solde wallet' : 'Wallet balance'}</p>
              <p className="font-editorial text-3xl num">{wallet.balanceFcfa.toLocaleString('fr-FR')} <span className="text-base text-muted-foreground">FCFA</span></p>
              <p className="text-[11px] text-muted-foreground font-mono mt-1">≈ ${wallet.balanceUsd.toFixed(2)} USD</p>
            </div>
            <Link to="/dashboard/billing" className="px-3 py-1.5 border border-border hover:border-foreground text-[12px] rounded-md inline-flex items-center gap-1.5 transition">
              {lang === 'fr' ? 'Recharger' : 'Top up'} <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* USAGE BARS */}
      <div>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-[13px] uppercase tracking-widest text-muted-foreground">{lang === 'fr' ? 'Usage du mois' : 'Usage this month'}</h2>
          <span className="text-[11px] font-mono text-muted-foreground">Apr 2026</span>
        </div>
        <div className="border-t border-border divide-y divide-border">
          {[
            { name: 'Bandwidth', used: 38, total: 100, unit: 'GB' },
            { name: 'Build minutes', used: 1280, total: 2000, unit: 'min' },
            { name: 'Postgres storage', used: 412, total: 1024, unit: 'MB' },
            { name: 'Function invocations', used: 84_122, total: 1_000_000, unit: '' },
          ].map((u) => {
            const pct = (u.used / u.total) * 100;
            return (
              <div key={u.name} className="py-4 grid grid-cols-12 items-center gap-4">
                <p className="col-span-3 text-[13px]">{u.name}</p>
                <div className="col-span-7 h-1 bg-muted relative">
                  <div className="absolute inset-y-0 left-0 bg-primary" style={{ width: `${pct}%` }} />
                </div>
                <p className="col-span-2 text-right font-mono text-[12px] text-muted-foreground tabular-nums">
                  {u.used.toLocaleString()} <span className="text-muted-foreground/60">/ {u.total.toLocaleString()}{u.unit && ' ' + u.unit}</span>
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
