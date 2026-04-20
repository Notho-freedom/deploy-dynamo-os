import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/lib/store';
import { Search, Globe, Loader2, Check, ShoppingCart, ShieldCheck } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const tlds = [
  { ext: '.com', price: 8500 },
  { ext: '.africa', price: 12000 },
  { ext: '.io', price: 24000 },
  { ext: '.dev', price: 9000 },
  { ext: '.app', price: 11000 },
  { ext: '.ng', price: 7500 },
  { ext: '.ci', price: 18000 },
  { ext: '.sn', price: 22000 },
];

const Domains = () => {
  const { domains, addDomain, addWalletTx } = useApp();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Array<{ name: string; price: number; available: boolean }>>([]);
  const [step, setStep] = useState<'search' | 'checkout' | 'dns'>('search');
  const [picked, setPicked] = useState<{ name: string; price: number } | null>(null);

  const handleSearch = () => {
    if (!query) return;
    setSearching(true);
    setTimeout(() => {
      const base = query.toLowerCase().replace(/[^a-z0-9-]/g, '');
      setResults(tlds.map((t) => ({ name: `${base}${t.ext}`, price: t.price, available: Math.random() > 0.25 })));
      setSearching(false);
    }, 1200);
  };

  const handleBuy = (r: { name: string; price: number }) => {
    setPicked(r);
    setStep('checkout');
  };

  const confirmPurchase = () => {
    if (!picked) return;
    setTimeout(() => {
      addDomain({ name: picked.name, status: 'active', expiresAt: '2027-04-20', autoRenew: true, registrar: 'namecheap' });
      addWalletTx({ type: 'usage', amount: -picked.price, currency: 'XOF', description: `Domain ${picked.name}`, status: 'succeeded' });
      setStep('dns');
      toast({ title: '🎉 Domain purchased', description: picked.name });
    }, 1500);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl font-bold mb-1">Domain Management</h1>
        <p className="text-muted-foreground">Achète et configure ton domaine en 30 secondes.</p>
      </div>

      {step === 'search' && (
        <Card className="glass p-6">
          <div className="flex gap-2 mb-4">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="my-awesome-app" className="font-mono" onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
            <Button onClick={handleSearch} disabled={!query || searching} className="gradient-cosmic">
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Search
            </Button>
          </div>

          {results.length > 0 && (
            <div className="space-y-2">
              {results.map((r) => (
                <div key={r.name} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-primary" />
                    <span className="font-mono">{r.name}</span>
                    {r.available ? <Badge className="gradient-cosmic border-0">Available</Badge> : <Badge variant="outline">Taken</Badge>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm">{r.price.toLocaleString()} FCFA/yr</span>
                    <Button size="sm" disabled={!r.available} onClick={() => handleBuy(r)} className={r.available ? 'gradient-cosmic' : ''}>
                      <ShoppingCart className="h-3 w-3" /> Buy
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {step === 'checkout' && picked && (
        <Card className="glass p-6 max-w-lg">
          <h2 className="font-display text-xl font-semibold mb-4">Checkout</h2>
          <div className="space-y-3 mb-6 p-4 rounded-lg bg-muted/50">
            <div className="flex justify-between"><span>Domain</span><span className="font-mono">{picked.name}</span></div>
            <div className="flex justify-between"><span>Period</span><span>1 year</span></div>
            <div className="flex justify-between"><span>WHOIS Privacy</span><span className="text-accent">Free</span></div>
            <div className="border-t border-border pt-3 flex justify-between font-bold">
              <span>Total</span><span className="font-mono">{picked.price.toLocaleString()} FCFA</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep('search')}>Back</Button>
            <Button onClick={confirmPurchase} className="gradient-cosmic glow flex-1">Confirm purchase</Button>
          </div>
        </Card>
      )}

      {step === 'dns' && picked && (
        <Card className="glass p-6 max-w-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full gradient-cosmic flex items-center justify-center">
              <Check className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold">{picked.name} is yours</h2>
              <p className="text-sm text-muted-foreground">DNS auto-configured. Propagation: ~30s.</p>
            </div>
          </div>
          <div className="space-y-2 font-mono text-xs bg-muted/50 p-4 rounded-lg">
            <div className="flex justify-between"><span className="text-muted-foreground">A</span><span>@ → 76.76.21.21</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">CNAME</span><span>www → cname.nebula.app</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">TXT</span><span>nebula-verify=xa42z9</span></div>
            <div className="flex items-center gap-2 mt-2 text-accent"><ShieldCheck className="h-3 w-3" /> SSL auto-issued</div>
          </div>
          <Button onClick={() => setStep('search')} className="mt-4">Buy another</Button>
        </Card>
      )}

      <Card className="glass p-5">
        <h3 className="font-display text-lg font-semibold mb-3">Your domains</h3>
        <div className="space-y-2">
          {domains.map((d) => (
            <div key={d.name} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50">
              <Globe className="h-4 w-4 text-primary" />
              <div className="flex-1">
                <p className="font-mono">{d.name}</p>
                <p className="text-xs text-muted-foreground">Expires {d.expiresAt} · {d.registrar}</p>
              </div>
              <Badge className={d.status === 'active' ? 'gradient-cosmic border-0' : ''}>{d.status}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default Domains;
