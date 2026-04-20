import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/lib/store';
import { Github, GitBranch, GitCommit, RotateCcw, Check, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

const fakeRepos = [
  { name: 'akua/kente-shop', branch: 'main', private: false, lastPush: '2h ago' },
  { name: 'akua/sahel-blog', branch: 'develop', private: true, lastPush: '1d ago' },
  { name: 'akua/cfa-pay-api', branch: 'main', private: true, lastPush: '3d ago' },
  { name: 'akua/portfolio', branch: 'main', private: false, lastPush: '1w ago' },
];

const CICD = () => {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [linkedRepos, setLinkedRepos] = useState<string[]>(['akua/kente-shop']);
  const { deployments, updateDeployment } = useApp();

  const connectGithub = () => {
    setConnecting(true);
    setTimeout(() => {
      setConnected(true);
      setConnecting(false);
      toast({ title: '✓ GitHub connected', description: '@akua' });
    }, 1500);
  };

  const toggle = (r: string) => setLinkedRepos((p) => p.includes(r) ? p.filter((x) => x !== r) : [...p, r]);

  const rollback = (uid: string) => {
    updateDeployment(uid, { state: 'BUILDING' });
    setTimeout(() => {
      updateDeployment(uid, { state: 'READY' });
      toast({ title: '↩ Rolled back successfully' });
    }, 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl font-bold mb-1">CI/CD Automation</h1>
        <p className="text-muted-foreground">Auto-deploy on every push. Rollback in 1 click.</p>
      </div>

      {!connected ? (
        <Card className="glass p-12 text-center">
          <Github className="h-12 w-12 mx-auto mb-4 text-foreground/60" />
          <h2 className="font-display text-xl font-semibold mb-2">Connect your GitHub</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            We'll set up GitHub Actions workflows so your projects auto-deploy on every push to main.
          </p>
          <Button onClick={connectGithub} disabled={connecting} className="gradient-cosmic glow">
            {connecting ? <><Loader2 className="h-4 w-4 animate-spin" /> Connecting...</> : <><Github className="h-4 w-4" /> Connect GitHub</>}
          </Button>
        </Card>
      ) : (
        <>
          <Card className="glass p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold flex items-center gap-2"><Github className="h-4 w-4" /> Linked repositories</h2>
              <Badge className="gradient-cosmic border-0"><Check className="h-3 w-3 mr-1" /> @akua</Badge>
            </div>
            <div className="space-y-2">
              {fakeRepos.map((r) => (
                <div key={r.name} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30">
                  <div className="flex items-center gap-3">
                    <Github className="h-4 w-4" />
                    <div>
                      <p className="font-mono text-sm">{r.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <GitBranch className="h-3 w-3" /> {r.branch} · {r.lastPush}
                      </p>
                    </div>
                    {r.private && <Badge variant="outline" className="text-xs">private</Badge>}
                  </div>
                  <Button
                    size="sm"
                    variant={linkedRepos.includes(r.name) ? 'default' : 'outline'}
                    onClick={() => toggle(r.name)}
                    className={linkedRepos.includes(r.name) ? 'gradient-cosmic' : ''}
                  >
                    {linkedRepos.includes(r.name) ? '✓ Linked' : 'Link'}
                  </Button>
                </div>
              ))}
            </div>
          </Card>

          <Card className="glass p-5">
            <h2 className="font-display text-lg font-semibold mb-3">Workflow config</h2>
            <pre className="text-xs font-mono p-4 rounded-lg bg-muted/50 overflow-auto">{`# .github/workflows/nebula.yml
name: NebulaOS Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: nebula/deploy@v1
        with:
          token: \${{ secrets.NEBULA_TOKEN }}`}</pre>
          </Card>

          <Card className="glass p-5">
            <h2 className="font-display text-lg font-semibold mb-3">Deployment history</h2>
            <div className="space-y-2">
              {deployments.map((d) => (
                <div key={d.uid} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50">
                  <GitCommit className="h-4 w-4 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-sm truncate">{d.commit}</p>
                    <p className="text-xs text-muted-foreground">{d.url} · {formatDistanceToNow(d.createdAt)} ago</p>
                  </div>
                  <Badge variant={d.state === 'READY' ? 'default' : d.state === 'BUILDING' ? 'secondary' : 'destructive'} className={d.state === 'READY' ? 'gradient-cosmic border-0' : ''}>{d.state}</Badge>
                  {d.state === 'READY' && (
                    <Button variant="ghost" size="sm" onClick={() => rollback(d.uid)}><RotateCcw className="h-3 w-3" /> Rollback</Button>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default CICD;
