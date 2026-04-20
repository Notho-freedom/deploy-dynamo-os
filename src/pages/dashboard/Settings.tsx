import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import { Key, Eye, Plus, User, Globe, Shield, Users } from 'lucide-react';
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';

const Settings = () => {
  const { user } = useApp();
  const { lang, setLang } = useI18n();
  const [revealed, setRevealed] = useState<string | null>(null);

  const apiKeys = [
    { name: 'production', key: 'sk_live_a4f2_••••••••_x9k2', created: '2026-03-12' },
    { name: 'staging', key: 'sk_test_b8d1_••••••••_p2m7', created: '2026-04-02' },
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h1 className="font-display text-3xl font-bold mb-1">Settings</h1>
        <p className="text-muted-foreground">Profil, préférences, sécurité.</p>
      </div>

      <Card className="glass p-6">
        <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2"><User className="h-4 w-4" /> Profile</h2>
        <div className="flex items-center gap-4 mb-4">
          <div className="h-16 w-16 rounded-full gradient-cosmic flex items-center justify-center text-2xl font-display font-bold text-primary-foreground glow">
            {user?.name[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-semibold">{user?.name}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <Badge className="mt-1 gradient-cosmic border-0">{user?.plan}</Badge>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div><Label>Name</Label><Input defaultValue={user?.name} /></div>
          <div><Label>Email</Label><Input defaultValue={user?.email} /></div>
        </div>
      </Card>

      <Card className="glass p-6">
        <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2"><Globe className="h-4 w-4" /> Preferences</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div><p className="font-medium">Language</p><p className="text-xs text-muted-foreground">Interface language</p></div>
            <div className="flex gap-1">
              {(['fr', 'en'] as const).map((l) => (
                <button key={l} onClick={() => setLang(l)} className={`px-3 py-1.5 rounded-md text-sm font-mono ${lang === l ? 'gradient-cosmic text-primary-foreground' : 'border border-border'}`}>{l.toUpperCase()}</button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div><p className="font-medium">Dark mode</p><p className="text-xs text-muted-foreground">Cosmic theme by default</p></div>
            <Switch defaultChecked />
          </div>
        </div>
      </Card>

      <Card className="glass p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2"><Key className="h-4 w-4" /> API keys vault</h2>
          <Button size="sm" className="gradient-cosmic"><Plus className="h-3 w-3" /> Generate</Button>
        </div>
        <div className="space-y-2">
          {apiKeys.map((k) => (
            <div key={k.name} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
              <Badge variant="outline">{k.name}</Badge>
              <code className="font-mono text-xs flex-1">{revealed === k.name ? k.key.replace(/•/g, 'X') : k.key}</code>
              <Button variant="ghost" size="icon" onClick={() => { setRevealed(revealed === k.name ? null : k.name); toast({ title: 'Key revealed (5s)' }); }}>
                <Eye className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground">{k.created}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="glass p-6">
        <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2"><Users className="h-4 w-4" /> Team</h2>
        <p className="text-sm text-muted-foreground mb-3">Invite teammates to collaborate.</p>
        <div className="flex gap-2"><Input placeholder="teammate@email.com" /><Button>Invite</Button></div>
      </Card>

      <Card className="glass p-6">
        <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2"><Shield className="h-4 w-4" /> Security</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div><p className="font-medium">Two-factor auth</p><p className="text-xs text-muted-foreground">Adds an extra layer</p></div>
            <Switch />
          </div>
          <div className="flex items-center justify-between">
            <div><p className="font-medium">Email alerts</p><p className="text-xs text-muted-foreground">Notify on new sign-in</p></div>
            <Switch defaultChecked />
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Settings;
