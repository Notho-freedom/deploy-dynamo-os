import { useApp } from '@/lib/store';
import { useT } from '@/lib/i18n';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Rocket, Globe, Wallet, Plus, ArrowRight, Activity, GitCommit, AlertTriangle } from 'lucide-react';

const Dashboard = () => {
  const t = useT();
  const navigate = useNavigate();
  const { user, projects, deployments, domains, wallet } = useApp();

  const stats = [
    { label: t.dash.stats.projects, value: projects.length, icon: Sparkles, color: 'from-primary to-secondary' },
    { label: t.dash.stats.deploys, value: deployments.length, icon: Rocket, color: 'from-secondary to-gold' },
    { label: t.dash.stats.domains, value: domains.length, icon: Globe, color: 'from-accent to-primary' },
    { label: t.dash.stats.uptime, value: '99.97%', icon: Activity, color: 'from-gold to-secondary' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-muted-foreground">{t.dash.greeting},</p>
          <h1 className="font-display text-3xl font-bold">{user?.name} 👋</h1>
        </div>
        <Button onClick={() => navigate('/dashboard/builder')} className="gradient-cosmic glow">
          <Plus className="h-4 w-4" /> {t.dash.newProject}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <Card key={i} className="glass p-5 relative overflow-hidden">
            <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br ${s.color} opacity-10`} />
            <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center mb-3`}>
              <s.icon className="h-4 w-4 text-white" />
            </div>
            <p className="text-2xl font-display font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Projects */}
        <Card className="glass p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold">{t.dash.recent}</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/builder')}>
              View all <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
          <div className="space-y-2">
            {projects.slice(0, 4).map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition cursor-pointer" onClick={() => navigate('/dashboard/deploy')}>
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg gradient-cosmic flex items-center justify-center font-mono text-sm font-bold text-primary-foreground">
                    {p.name[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{p.framework} · {p.template}</p>
                  </div>
                </div>
                <Badge variant={p.status === 'ready' ? 'default' : p.status === 'building' ? 'secondary' : 'outline'} className={p.status === 'ready' ? 'gradient-cosmic border-0' : ''}>
                  {p.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Wallet */}
        <Card className="glass p-6 relative overflow-hidden">
          <div className="absolute inset-0 gradient-nebula opacity-20" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="h-4 w-4 text-gold" />
              <h2 className="font-display text-lg font-semibold">{t.dash.wallet}</h2>
            </div>
            <p className="text-3xl font-display font-bold text-gradient-aurora">
              {wallet.balanceFcfa.toLocaleString()} <span className="text-sm">FCFA</span>
            </p>
            <p className="text-sm text-muted-foreground mt-1">≈ ${wallet.balanceUsd.toFixed(2)}</p>
            <Button onClick={() => navigate('/dashboard/billing')} className="w-full mt-4 gradient-gold text-gold-foreground">
              {t.common.recharge}
            </Button>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="glass p-6">
          <h2 className="font-display text-lg font-semibold mb-4">{t.dash.activity}</h2>
          <div className="space-y-3">
            {deployments.slice(0, 4).map((d) => (
              <div key={d.uid} className="flex items-start gap-3 text-sm">
                <GitCommit className="h-4 w-4 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="font-mono text-xs">{d.url}</p>
                  <p className="text-xs text-muted-foreground">{d.commit} · {d.duration}s</p>
                </div>
                <Badge variant={d.state === 'READY' ? 'default' : 'destructive'} className="text-xs">{d.state}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card className="glass p-6">
          <h2 className="font-display text-lg font-semibold mb-4">{t.dash.alerts}</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/10 border border-secondary/30">
              <AlertTriangle className="h-4 w-4 text-secondary mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Domain expires soon</p>
                <p className="text-xs text-muted-foreground">lagosrides.africa · 200 days left</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/10 border border-accent/30">
              <Activity className="h-4 w-4 text-accent mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">All systems operational</p>
                <p className="text-xs text-muted-foreground">99.97% uptime over 30 days</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
