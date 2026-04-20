import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/lib/store';
import { Mail, Loader2, Check, Copy } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const EmailSetup = () => {
  const domains = useApp((s) => s.domains);
  const [domain, setDomain] = useState(domains[0]?.name || '');
  const [alias, setAlias] = useState('contact');
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<{ email: string; smtp: any } | null>(null);

  const handleCreate = () => {
    if (!domain || !alias) return;
    setCreating(true);
    setTimeout(() => {
      const email = `${alias}@${domain}`;
      setCreated({
        email,
        smtp: {
          host: 'smtp.zoho.com',
          port: 587,
          security: 'STARTTLS',
          username: email,
          password: 'zh_••••••••8f2a',
        },
      });
      setCreating(false);
      toast({ title: '✉️ Email created', description: email });
    }, 1800);
  };

  const copy = (s: string) => { navigator.clipboard.writeText(s); toast({ title: 'Copied' }); };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h1 className="font-display text-3xl font-bold mb-1">Email Setup</h1>
        <p className="text-muted-foreground">Email pro instantané, branché sur ton domaine.</p>
      </div>

      <Card className="glass p-6">
        <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2"><Mail className="h-4 w-4" /> Create new mailbox</h2>
        <div className="grid md:grid-cols-[1fr,auto,2fr,auto] gap-2 items-end">
          <div>
            <label className="text-xs font-medium mb-1 block">Alias</label>
            <Input value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="contact" className="font-mono" />
          </div>
          <span className="pb-2 font-mono text-muted-foreground">@</span>
          <div>
            <label className="text-xs font-medium mb-1 block">Domain</label>
            <select value={domain} onChange={(e) => setDomain(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm font-mono">
              {domains.map((d) => <option key={d.name}>{d.name}</option>)}
            </select>
          </div>
          <Button onClick={handleCreate} disabled={creating} className="gradient-cosmic glow">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
          </Button>
        </div>
      </Card>

      {created && (
        <Card className="glass p-6 glow">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full gradient-cosmic flex items-center justify-center">
              <Check className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold">{created.email}</h3>
              <p className="text-sm text-muted-foreground">Mailbox provisioned · 5GB storage</p>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground">SMTP / IMAP credentials</p>
            <div className="font-mono text-xs space-y-1 p-4 rounded-lg bg-muted/50">
              {Object.entries(created.smtp).map(([k, v]) => (
                <div key={k} className="flex justify-between items-center">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="flex items-center gap-2">{String(v)} <button onClick={() => copy(String(v))}><Copy className="h-3 w-3" /></button></span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              <Badge variant="outline" className="text-xs">SPF ✓</Badge>
              <Badge variant="outline" className="text-xs">DKIM ✓</Badge>
              <Badge variant="outline" className="text-xs">DMARC ✓</Badge>
            </div>
          </div>
        </Card>
      )}

      <Card className="glass p-6">
        <h3 className="font-display text-lg font-semibold mb-3">Existing mailboxes</h3>
        <div className="space-y-1">
          {['contact@kente-shop.com', 'support@kente-shop.com', 'hello@lagosrides.africa'].map((e) => (
            <div key={e} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50">
              <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /><span className="font-mono text-sm">{e}</span></div>
              <Badge className="gradient-cosmic border-0">active</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default EmailSetup;
