import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, AlertTriangle, Clock, Server } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart, Bar } from 'recharts';

const requestsData = Array.from({ length: 24 }, (_, i) => ({
  hour: `${i}h`,
  requests: Math.round(800 + Math.random() * 1200 + (i > 8 && i < 22 ? 600 : 0)),
  errors: Math.round(Math.random() * 30),
}));

const responseData = Array.from({ length: 12 }, (_, i) => ({
  time: `${i * 2}h`,
  p50: 80 + Math.random() * 30,
  p95: 180 + Math.random() * 80,
  p99: 350 + Math.random() * 120,
}));

const recentLogs = [
  { ts: '14:32:11', method: 'POST', path: '/api/orders', status: 201, dur: 142 },
  { ts: '14:32:09', method: 'GET', path: '/api/products', status: 200, dur: 38 },
  { ts: '14:32:05', method: 'POST', path: '/api/payment/mtn', status: 200, dur: 1820 },
  { ts: '14:31:58', method: 'GET', path: '/api/products/2', status: 200, dur: 22 },
  { ts: '14:31:52', method: 'POST', path: '/api/auth/login', status: 401, dur: 89 },
  { ts: '14:31:47', method: 'GET', path: '/api/dashboard', status: 200, dur: 156 },
  { ts: '14:31:40', method: 'PATCH', path: '/api/users/me', status: 500, dur: 2104 },
];

const Monitoring = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl font-bold mb-1">Monitoring</h1>
        <p className="text-muted-foreground">Real-time logs, errors, performance & uptime.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Uptime (30d)', value: '99.97%', icon: Activity, color: 'text-accent' },
          { label: 'Avg latency', value: '142ms', icon: Clock, color: 'text-primary' },
          { label: 'Requests / 24h', value: '24.8K', icon: Server, color: 'text-gold' },
          { label: 'Errors / 24h', value: '127', icon: AlertTriangle, color: 'text-destructive' },
        ].map((s, i) => (
          <Card key={i} className="glass p-5">
            <s.icon className={`h-5 w-5 ${s.color} mb-2`} />
            <p className="text-2xl font-display font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="glass p-5">
          <h3 className="font-display text-lg font-semibold mb-4">Requests (last 24h)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={requestsData}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
              <Area type="monotone" dataKey="requests" stroke="hsl(var(--primary))" fill="url(#g1)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="glass p-5">
          <h3 className="font-display text-lg font-semibold mb-4">Response time (p50/p95/p99)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={responseData}>
              <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
              <Line type="monotone" dataKey="p50" stroke="hsl(var(--accent))" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="p95" stroke="hsl(var(--gold))" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="p99" stroke="hsl(var(--secondary))" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="glass p-5">
          <h3 className="font-display text-lg font-semibold mb-4">Errors (24h)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={requestsData}>
              <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
              <Bar dataKey="errors" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="glass p-5">
          <h3 className="font-display text-lg font-semibold mb-4">Live logs</h3>
          <div className="font-mono text-xs space-y-1 max-h-56 overflow-auto">
            {recentLogs.map((l, i) => (
              <div key={i} className="flex gap-2 items-center py-1 border-b border-border/30">
                <span className="text-muted-foreground">{l.ts}</span>
                <Badge variant="outline" className="text-[10px] py-0 px-1.5">{l.method}</Badge>
                <span className="flex-1 truncate">{l.path}</span>
                <span className={l.status >= 500 ? 'text-destructive' : l.status >= 400 ? 'text-gold' : 'text-accent'}>{l.status}</span>
                <span className="text-muted-foreground">{l.dur}ms</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Monitoring;
