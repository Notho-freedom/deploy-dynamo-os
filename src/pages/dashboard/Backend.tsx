import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Database, Trash2, Key, Lock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Field { name: string; type: string; }
interface Table { name: string; fields: Field[]; }

const Backend = () => {
  const [tables, setTables] = useState<Table[]>([
    { name: 'users', fields: [{ name: 'id', type: 'uuid' }, { name: 'email', type: 'text' }, { name: 'created_at', type: 'timestamp' }] },
    { name: 'posts', fields: [{ name: 'id', type: 'uuid' }, { name: 'title', type: 'text' }, { name: 'author_id', type: 'uuid' }] },
  ]);
  const [auth, setAuth] = useState({ email: true, google: false, github: false, magic: false });

  const addTable = () => {
    const name = prompt('Table name?');
    if (name) setTables([...tables, { name, fields: [{ name: 'id', type: 'uuid' }] }]);
  };

  const generateEndpoints = (table: string) => ['GET', 'POST', 'PATCH', 'DELETE'].map((m) => `${m} /api/${table}`);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl font-bold mb-1">Backend Builder</h1>
        <p className="text-muted-foreground">Schema designer + API endpoints + auth — auto.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2"><Database className="h-4 w-4" /> Schema</h2>
            <Button size="sm" onClick={addTable} className="gradient-cosmic"><Plus className="h-3 w-3" /> Add table</Button>
          </div>

          {tables.map((tbl, ti) => (
            <Card key={ti} className="glass p-5">
              <div className="flex items-center justify-between mb-3">
                <Input value={tbl.name} onChange={(e) => { const n = [...tables]; n[ti].name = e.target.value; setTables(n); }} className="font-mono w-48 h-8" />
                <Button variant="ghost" size="icon" onClick={() => setTables(tables.filter((_, i) => i !== ti))}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="space-y-1">
                {tbl.fields.map((f, fi) => (
                  <div key={fi} className="grid grid-cols-[1fr,1fr,auto] gap-2">
                    <Input value={f.name} onChange={(e) => { const n = [...tables]; n[ti].fields[fi].name = e.target.value; setTables(n); }} className="h-8 font-mono text-xs" />
                    <select
                      value={f.type}
                      onChange={(e) => { const n = [...tables]; n[ti].fields[fi].type = e.target.value; setTables(n); }}
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs font-mono"
                    >
                      {['uuid', 'text', 'integer', 'boolean', 'timestamp', 'jsonb'].map((t) => <option key={t}>{t}</option>)}
                    </select>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { const n = [...tables]; n[ti].fields = n[ti].fields.filter((_, i) => i !== fi); setTables(n); }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <Button variant="ghost" size="sm" onClick={() => { const n = [...tables]; n[ti].fields.push({ name: 'new_field', type: 'text' }); setTables(n); }}>
                  <Plus className="h-3 w-3" /> Field
                </Button>
              </div>

              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Auto-generated endpoints</p>
                <div className="flex flex-wrap gap-1">
                  {generateEndpoints(tbl.name).map((e) => (
                    <code key={e} className="text-xs px-2 py-0.5 rounded bg-muted font-mono">{e}</code>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          <Card className="glass p-5">
            <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-4"><Lock className="h-4 w-4" /> Authentication</h3>
            {[
              { key: 'email', label: 'Email + password' },
              { key: 'google', label: 'Google OAuth' },
              { key: 'github', label: 'GitHub OAuth' },
              { key: 'magic', label: 'Magic link' },
            ].map((p) => (
              <div key={p.key} className="flex items-center justify-between py-2">
                <span className="text-sm">{p.label}</span>
                <Switch checked={(auth as any)[p.key]} onCheckedChange={(v) => setAuth({ ...auth, [p.key]: v })} />
              </div>
            ))}
          </Card>

          <Card className="glass p-5">
            <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-3"><Key className="h-4 w-4" /> API keys</h3>
            <code className="block text-xs p-2 rounded bg-muted font-mono break-all">sk_live_••••••••a4f2</code>
            <Badge className="mt-2" variant="outline">production</Badge>
          </Card>

          <Button className="w-full gradient-cosmic glow" onClick={() => toast({ title: '✅ Backend deployed', description: 'API live at api.nebula.app' })}>
            Deploy backend
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Backend;
