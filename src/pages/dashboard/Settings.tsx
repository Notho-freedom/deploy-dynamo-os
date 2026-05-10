import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useIntegration, Provider } from '@/hooks/useIntegration';
import { useI18n } from '@/lib/i18n';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Eye, EyeOff, Plus, Triangle, Github, Mail, Globe, CreditCard } from 'lucide-react';
import { VercelConnectDialog } from '@/components/VercelConnectDialog';
import { toast } from 'sonner';

const sections = ['profile', 'team', 'integrations', 'api', 'webhooks', 'preferences'] as const;

type IntegrationDef = {
  id: string;
  provider?: Provider;
  name: string;
  desc: string;
  cat: string;
  icon: any;
  // 'managed' = lovable cloud built-in; 'oauth' = needs user creds
  kind: 'managed' | 'token' | 'oauth' | 'soon';
};

const INTEGRATIONS: IntegrationDef[] = [
  { id: 'lovable-ai', name: 'Lovable AI', desc: 'Streaming Gemini & GPT models for the Builder', cat: 'AI', icon: () => <span>✨</span>, kind: 'managed' },
  { id: 'resend', name: 'Resend', desc: 'Transactional email (invites, alerts, receipts)', cat: 'Email', icon: Mail, kind: 'managed' },
  { id: 'auth-google', name: 'Google Sign-in', desc: 'Social login enabled on /auth', cat: 'Auth', icon: () => <span>G</span>, kind: 'managed' },
  { id: 'vercel', provider: 'vercel', name: 'Vercel', desc: 'Deploy via Personal Access Token', cat: 'Hosting', icon: Triangle, kind: 'token' },
  { id: 'github', provider: 'github', name: 'GitHub', desc: 'OAuth for repository import & CI/CD', cat: 'Source', icon: Github, kind: 'oauth' },
  { id: 'zoho', provider: 'zoho', name: 'Zoho Mail', desc: 'Provision mailboxes on your domain', cat: 'Email', icon: Mail, kind: 'oauth' },
  { id: 'porkbun', provider: 'porkbun', name: 'Porkbun', desc: 'Domain registration & DNS (low fees, global TLDs)', cat: 'Domains', icon: Globe, kind: 'oauth' },
  { id: 'cloudflare', provider: 'cloudflare', name: 'Cloudflare', desc: 'Domains at cost + edge DNS', cat: 'Domains', icon: Globe, kind: 'oauth' },
  { id: 'stripe', name: 'Stripe', desc: 'International cards & subscriptions', cat: 'Payments', icon: CreditCard, kind: 'soon' },
  { id: 'mtn', name: 'MTN MoMo', desc: 'Mobile Money (XOF / GHS) — via aggregator', cat: 'Payments', icon: CreditCard, kind: 'soon' },
  { id: 'orange', name: 'Orange Money', desc: 'CIV, SEN, MLI — via aggregator', cat: 'Payments', icon: CreditCard, kind: 'soon' },
];

function StatusBadge({ live }: { live: boolean | 'soon' }) {
  if (live === 'soon') return <span className="text-[10px] uppercase tracking-widest font-mono px-1.5 py-0.5 rounded border border-border text-muted-foreground">Soon</span>;
  if (live) return <span className="text-[10px] uppercase tracking-widest font-mono px-1.5 py-0.5 rounded bg-success/15 text-success border border-success/30">Live</span>;
  return <span className="text-[10px] uppercase tracking-widest font-mono px-1.5 py-0.5 rounded border border-border text-muted-foreground">Demo</span>;
}

function IntegrationRow({ def, lang }: { def: IntegrationDef; lang: 'fr' | 'en' }) {
  const intg = useIntegration((def.provider ?? 'vercel') as Provider);
  const [openVercel, setOpenVercel] = useState(false);

  const isManaged = def.kind === 'managed';
  const isSoon = def.kind === 'soon';
  const connected = !!def.provider && intg.connected;
  const live: boolean | 'soon' = isSoon ? 'soon' : isManaged || connected;

  const handleConnect = () => {
    if (def.provider === 'vercel') setOpenVercel(true);
    else toast.info(`${def.name} OAuth bientôt — credentials provider requis`);
  };

  return (
    <>
      <div className="px-4 py-3.5 flex items-center gap-4 text-[13px]">
        <span className="h-8 w-8 rounded border border-border flex items-center justify-center text-[11px] font-mono text-muted-foreground shrink-0">
          <def.icon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">{def.name}</p>
            <StatusBadge live={live} />
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground/70 font-mono">{def.cat}</span>
          </div>
          <p className="text-[12px] text-muted-foreground truncate mt-0.5">
            {connected && intg.connection?.metadata?.username ? `Connected as ${intg.connection.metadata.username}` : def.desc}
          </p>
        </div>
        {isManaged ? (
          <Button variant="outline" size="sm" disabled>{lang === 'fr' ? 'Géré' : 'Managed'}</Button>
        ) : isSoon ? (
          <Button variant="outline" size="sm" disabled>Soon</Button>
        ) : connected ? (
          <Button variant="outline" size="sm" onClick={async () => { await intg.disconnect(); toast.success('Disconnected'); }}>
            {lang === 'fr' ? 'Déconnecter' : 'Disconnect'}
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={handleConnect}>{lang === 'fr' ? 'Connecter' : 'Connect'}</Button>
        )}
      </div>
      {def.provider === 'vercel' && (
        <VercelConnectDialog open={openVercel} onOpenChange={setOpenVercel} onConnected={intg.refresh} />
      )}
    </>
  );
}

export default function Settings() {
  const { lang } = useI18n();
  const { user, profile } = useAuth();
  const [tab, setTab] = useState<typeof sections[number]>('profile');
  const [reveal, setReveal] = useState<string | null>(null);

  if (!user) return null;
  const displayName = profile?.display_name || user.email?.split('@')[0] || '';

  return (
    <div className="grid grid-cols-12 gap-8">
      <aside className="col-span-12 md:col-span-3">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3">Settings</p>
        <ul className="space-y-0.5">
          {sections.map((s) => (
            <li key={s}>
              <button onClick={() => setTab(s)} className={`w-full text-left px-2.5 py-1.5 rounded text-[13px] capitalize font-mono transition ${tab === s ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{s}</button>
            </li>
          ))}
        </ul>
      </aside>

      <div className="col-span-12 md:col-span-9 space-y-6">
        {tab === 'profile' && (
          <div className="space-y-5 max-w-lg">
            <h2 className="font-editorial text-2xl">Profile</h2>
            <Field label="Full name"><Input defaultValue={displayName} /></Field>
            <Field label="Email"><Input defaultValue={user.email || ''} type="email" className="font-mono" disabled /></Field>
            <Field label="Plan"><Input defaultValue={profile?.plan || 'free'} className="font-mono" disabled /></Field>
            <Button>{lang === 'fr' ? 'Enregistrer' : 'Save changes'}</Button>
          </div>
        )}

        {tab === 'team' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-editorial text-2xl">Team</h2>
              <Button variant="outline" size="sm"><Plus className="h-3 w-3" /> Invite</Button>
            </div>
            <div className="border border-border">
              {[
                { name: displayName, email: user.email || '', role: 'Owner' },
              ].map((m) => (
                <div key={m.email} className="px-4 py-3 border-b border-border last:border-0 flex items-center gap-3 text-[13px]">
                  <span className="h-7 w-7 rounded-full bg-primary/20 border border-primary/40 text-primary flex items-center justify-center text-[11px] font-mono">{m.name[0]?.toUpperCase()}</span>
                  <div className="min-w-0"><p className="truncate">{m.name}</p><p className="text-[11px] text-muted-foreground font-mono truncate">{m.email}</p></div>
                  <span className="ml-auto text-[11px] uppercase tracking-wide text-muted-foreground">{m.role}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'integrations' && (
          <div className="space-y-5">
            <div>
              <h2 className="font-editorial text-2xl">Integrations</h2>
              <p className="text-[13px] text-muted-foreground mt-1">{lang === 'fr' ? 'Live = données réelles. Managed = activé par défaut. Soon = via agrégateur, à venir.' : 'Live = real data. Managed = enabled by default. Soon = via aggregator, coming.'}</p>
            </div>
            <div className="border border-border divide-y divide-border">
              {INTEGRATIONS.map((it) => <IntegrationRow key={it.id} def={it} lang={lang} />)}
            </div>
          </div>
        )}

        {tab === 'api' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-editorial text-2xl">API Keys</h2>
              <Button variant="outline" size="sm"><Plus className="h-3 w-3" /> Generate key</Button>
            </div>
            <div className="border border-border">
              {[
                { name: 'production', key: 'nbl_live_a8f2c1d3e4b5a6c7d8e9f0' },
                { name: 'staging', key: 'nbl_test_b9e3d2c1a4f5b6e7c8d9a0' },
              ].map((k) => (
                <div key={k.name} className="px-4 py-3 border-b border-border last:border-0 flex items-center gap-3 text-[13px] font-mono">
                  <span>{k.name}</span>
                  <span className="text-muted-foreground ml-auto">{reveal === k.name ? k.key : k.key.slice(0, 8) + '••••••••••••••' + k.key.slice(-4)}</span>
                  <button onClick={() => setReveal(reveal === k.name ? null : k.name)} className="text-muted-foreground hover:text-foreground">
                    {reveal === k.name ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'webhooks' && (
          <div className="space-y-5">
            <h2 className="font-editorial text-2xl">Webhooks</h2>
            <div className="border border-border">
              {[
                { url: 'https://api.kente-shop.com/hooks/momo', events: 'payment.*', status: 'active' },
                { url: 'https://lagos-rides.com/hooks/ride', events: 'ride.completed', status: 'active' },
              ].map((w) => (
                <div key={w.url} className="px-4 py-3 border-b border-border last:border-0 flex items-center gap-3 text-[13px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  <span className="font-mono text-[12px] truncate flex-1">{w.url}</span>
                  <span className="text-[11px] font-mono text-muted-foreground">{w.events}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'preferences' && (
          <div className="space-y-5 max-w-lg">
            <h2 className="font-editorial text-2xl">Preferences</h2>
            {[
              { l: 'Email notifications for deploys', d: true },
              { l: 'Email notifications for billing', d: true },
              { l: 'Weekly performance digest', d: false },
              { l: 'Auto-renew domains', d: true },
            ].map((p) => (
              <div key={p.l} className="flex items-center gap-4 py-3 border-b border-border last:border-0 text-[13px]"><span className="flex-1">{p.l}</span><Switch defaultChecked={p.d} /></div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">{label}</label>
      {children}
    </div>
  );
}
