import { useState } from 'react';
import { useApp } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Eye, EyeOff, Plus } from 'lucide-react';

const sections = ['profile', 'team', 'api', 'webhooks', 'preferences'] as const;

export default function Settings() {
  const { lang } = useI18n();
  const user = useApp((s) => s.user);
  const [tab, setTab] = useState<typeof sections[number]>('profile');
  const [reveal, setReveal] = useState<string | null>(null);

  if (!user) return null;

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
            <Field label="Full name"><Input defaultValue={user.name} /></Field>
            <Field label="Email"><Input defaultValue={user.email} type="email" className="font-mono" /></Field>
            <Field label="Display handle"><Input defaultValue={user.email.split('@')[0]} className="font-mono" /></Field>
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
                { name: 'Akua Mensah', email: 'akua@nebulaos.app', role: 'Owner' },
                { name: 'Tunde Olu', email: 'tunde@nebulaos.app', role: 'Admin' },
                { name: 'Mariama Diop', email: 'mariama@nebulaos.app', role: 'Member' },
              ].map((m) => (
                <div key={m.email} className="px-4 py-3 border-b border-border last:border-0 flex items-center gap-3 text-[13px]">
                  <span className="h-7 w-7 rounded-full bg-primary/20 border border-primary/40 text-primary flex items-center justify-center text-[11px] font-mono">{m.name[0]}</span>
                  <div className="min-w-0"><p className="truncate">{m.name}</p><p className="text-[11px] text-muted-foreground font-mono truncate">{m.email}</p></div>
                  <span className="ml-auto text-[11px] uppercase tracking-wide text-muted-foreground">{m.role}</span>
                </div>
              ))}
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
