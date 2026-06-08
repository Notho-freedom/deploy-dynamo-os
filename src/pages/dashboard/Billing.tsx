import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { useApp } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MobileMoneyDialog } from '@/components/MobileMoneyDialog';
import { ArrowUpRight, CreditCard, Check, Minus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const tabs = ['overview', 'topup', 'transactions', 'plans', 'invoices'] as const;
const presetAmounts = [1000, 5000, 10000, 25000, 50000];
const providers = [
  { k: 'mtn', name: 'MTN MoMo', tint: 'bg-[#FFCC00] text-black', desc: 'Côte d\'Ivoire · Cameroun · Ghana' },
  { k: 'orange', name: 'Orange Money', tint: 'bg-[#FF7900] text-white', desc: 'Sénégal · Mali · CI · Cameroun' },
  { k: 'wave', name: 'Wave', tint: 'bg-[#1DC8E1] text-black', desc: 'Sénégal · Côte d\'Ivoire' },
  { k: 'moov', name: 'Moov Money', tint: 'bg-[#005AAB] text-white', desc: 'Bénin · Togo · Burkina' },
  { k: 'stripe', name: 'Carte (Stripe)', tint: 'bg-foreground text-background', desc: 'Visa · Mastercard · Amex' },
] as const;

export default function Billing() {
  const { lang } = useI18n();
  const { wallet, addWalletTx } = useApp();
  const [tab, setTab] = useState<typeof tabs[number]>('overview');
  const [amount, setAmount] = useState(5000);
  const [providerOpen, setProviderOpen] = useState<typeof providers[number]['k'] | null>(null);

  return (
    <div>
      <DashboardToolbar
        eyebrow="Billing & Wallet"
        title={`${wallet.balanceFcfa.toLocaleString('fr-FR')} FCFA`}
        subtitle={`≈ $${wallet.balanceUsd.toFixed(2)} USD`}
        actions={
          <Button onClick={() => setTab('topup')} className="gap-2" size="sm">
            <ArrowUpRight className="h-3.5 w-3.5" /> {lang === 'fr' ? 'Recharger' : 'Top up'}
          </Button>
        }
      />

      <div className="space-y-8 px-4 py-6 md:px-6">

      <div className="border-b border-border flex gap-1">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-2 text-[12.5px] capitalize border-b-2 -mb-px transition ${tab === t ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 border border-border">
            <p className="px-4 py-2.5 border-b border-border text-[11px] uppercase tracking-widest text-muted-foreground">{lang === 'fr' ? 'Coûts du mois' : 'Month-to-date'}</p>
            {[
              { l: 'Hosting · CDN', v: '4 200 FCFA' },
              { l: 'Postgres · backup', v: '1 800 FCFA' },
              { l: 'Edge Functions', v: '950 FCFA' },
              { l: 'Bandwidth', v: '2 100 FCFA' },
              { l: 'Domain renewals', v: '3 200 FCFA' },
            ].map((c) => (
              <div key={c.l} className="px-4 py-3 border-b border-border last:border-0 flex items-center text-[13px]">
                <span className="flex-1">{c.l}</span><span className="font-mono text-muted-foreground">{c.v}</span>
              </div>
            ))}
          </div>
          <div className="border border-border p-5">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3">Plan</p>
            <p className="font-editorial text-2xl">Starter</p>
            <p className="text-[12px] text-muted-foreground mt-1">2 000 FCFA / mois · renouvelé le 12 mai</p>
            <Button variant="outline" className="w-full mt-4" onClick={() => setTab('plans')}>{lang === 'fr' ? 'Changer de plan' : 'Change plan'}</Button>
          </div>
        </div>
      )}

      {tab === 'topup' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="border border-border p-6">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3">{lang === 'fr' ? 'Montant' : 'Amount'}</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {presetAmounts.map((a) => (
                <button key={a} onClick={() => setAmount(a)} className={`px-3 py-1.5 border text-[12px] font-mono num transition ${amount === a ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:border-foreground'}`}>
                  {a.toLocaleString('fr-FR')} FCFA
                </button>
              ))}
            </div>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
              className="font-mono num"
              placeholder="Custom amount"
            />
          </div>
          <div className="border border-border">
            <p className="px-4 py-2.5 border-b border-border text-[11px] uppercase tracking-widest text-muted-foreground">{lang === 'fr' ? 'Méthode de paiement' : 'Payment method'}</p>
            {providers.map((p) => (
              <button
                key={p.k}
                onClick={() => setProviderOpen(p.k)}
                className="w-full flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/30 transition text-left"
              >
                <span className={`px-2 py-1 text-[11px] font-mono ${p.tint} w-24 text-center`}>{p.k === 'stripe' ? <CreditCard className="h-3 w-3 inline" /> : p.name.split(' ')[0]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px]">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground">{p.desc}</p>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === 'transactions' && (
        <div className="border border-border">
          <table className="w-full">
            <thead className="border-b border-border text-[11px] uppercase tracking-widest text-muted-foreground">
              <tr><th className="text-left font-normal px-4 py-2.5">Type</th><th className="text-left font-normal px-4 py-2.5">Description</th><th className="text-left font-normal px-4 py-2.5">Method</th><th className="text-right font-normal px-4 py-2.5">Amount</th><th className="text-right font-normal px-4 py-2.5">Status</th><th className="text-right font-normal px-4 py-2.5">When</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {wallet.txs.map((tx) => (
                <tr key={tx.id} className="text-[13px] hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">{tx.type}</td>
                  <td className="px-4 py-3">{tx.description}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">{tx.method ?? '—'}</td>
                  <td className={`px-4 py-3 text-right font-mono num ${tx.amount > 0 ? 'text-success' : 'text-foreground'}`}>{tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString('fr-FR')} {tx.currency}</td>
                  <td className="px-4 py-3 text-right text-[11px] uppercase tracking-wide text-muted-foreground">{tx.status}</td>
                  <td className="px-4 py-3 text-right font-mono text-[11px] text-muted-foreground">{formatDistanceToNow(tx.createdAt, { addSuffix: false })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'plans' && <PlansComparison />}

      {tab === 'invoices' && (
        <div className="border border-border">
          <table className="w-full">
            <thead className="border-b border-border text-[11px] uppercase tracking-widest text-muted-foreground">
              <tr><th className="text-left font-normal px-4 py-2.5">Invoice</th><th className="text-left font-normal px-4 py-2.5">Period</th><th className="text-right font-normal px-4 py-2.5">Amount</th><th className="text-right font-normal px-4 py-2.5">Status</th><th></th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                ['INV-2026-04', 'Apr 2026', '12 250 FCFA', 'paid'],
                ['INV-2026-03', 'Mar 2026', '9 800 FCFA', 'paid'],
                ['INV-2026-02', 'Feb 2026', '7 400 FCFA', 'paid'],
              ].map(([id, p, a, s]) => (
                <tr key={id} className="text-[13px] hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono">{id}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p}</td>
                  <td className="px-4 py-3 text-right font-mono num">{a}</td>
                  <td className="px-4 py-3 text-right text-[11px] uppercase tracking-wide text-success">{s}</td>
                  <td className="px-4 py-3 text-right"><a className="text-[12px] text-muted-foreground hover:text-foreground">PDF ↓</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {providerOpen && providerOpen !== 'stripe' && (
        <MobileMoneyDialog
          open
          onOpenChange={() => setProviderOpen(null)}
          provider={providerOpen}
          amountFcfa={amount}
          onSuccess={(ref) => addWalletTx({ type: 'topup', amount, currency: 'XOF', method: providerOpen, description: `Recharge ${providerOpen.toUpperCase()} · ${ref}`, status: 'succeeded' })}
        />
      )}
    </div>
  );
}

function PlansComparison() {
  const plans = [
    { name: 'Free', price: '0', current: false },
    { name: 'Starter', price: '2 000', current: true },
    { name: 'Pro', price: '10 000', current: false },
    { name: 'Business', price: '40 000', current: false },
  ];
  const rows: Array<{ feat: string; v: (string | boolean)[] }> = [
    { feat: 'Projects', v: ['1', '5', 'Unlimited', 'Unlimited'] },
    { feat: 'Bandwidth', v: ['10 GB', '100 GB', '1 TB', '5 TB'] },
    { feat: 'Postgres', v: ['256 MB', '1 GB', '10 GB', '50 GB'] },
    { feat: 'Edge functions', v: [true, true, true, true] },
    { feat: 'Mobile Money', v: [true, true, true, true] },
    { feat: 'Custom domains', v: ['—', '1', '3', '10'] },
    { feat: 'Support', v: ['Community', 'Email', 'Priority', 'Dedicated SLA'] },
  ];
  return (
    <div className="border border-border">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left p-5"></th>
            {plans.map((p) => (
              <th key={p.name} className={`text-left p-5 align-bottom ${p.current ? 'bg-primary/5' : ''}`}>
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">{p.name} {p.current && <span className="ml-1 text-primary normal-case">· current</span>}</p>
                <p className="font-editorial text-2xl num">{p.price} <span className="text-xs text-muted-foreground">FCFA/mo</span></p>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.feat} className="border-b border-border last:border-0">
              <td className="p-3.5 text-[13px] text-muted-foreground">{r.feat}</td>
              {r.v.map((val, i) => (
                <td key={i} className={`p-3.5 text-[13px] ${plans[i].current ? 'bg-primary/5' : ''}`}>
                  {typeof val === 'boolean' ? (val ? <Check className="h-4 w-4 text-success" /> : <Minus className="h-4 w-4 text-muted-foreground/50" />) : <span className="font-mono num">{val}</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
