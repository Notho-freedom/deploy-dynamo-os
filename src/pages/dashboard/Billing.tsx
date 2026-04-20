import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useApp } from '@/lib/store';
import { Wallet, Plus, ArrowDownLeft, ArrowUpRight, Smartphone, CreditCard, Loader2, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

const Billing = () => {
  const { wallet, addWalletTx } = useApp();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(5000);
  const [method, setMethod] = useState<'mtn' | 'orange' | 'wave' | 'stripe'>('mtn');
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState<'choose' | 'confirm' | 'pending' | 'done'>('choose');

  const proceed = () => {
    setStep('pending');
    setTimeout(() => {
      addWalletTx({
        type: 'topup',
        amount,
        currency: method === 'stripe' ? 'USD' : 'XOF',
        method,
        description: `Recharge via ${method.toUpperCase()}`,
        status: 'succeeded',
      });
      setStep('done');
      toast({ title: '✅ Top-up successful', description: `${amount.toLocaleString()} ${method === 'stripe' ? 'USD' : 'FCFA'}` });
    }, method === 'stripe' ? 1500 : 3000);
  };

  const reset = () => { setStep('choose'); setOpen(false); setAmount(5000); setPhone(''); };

  const methods = [
    { id: 'mtn' as const, name: 'MTN MoMo', color: 'from-gold to-secondary', icon: Smartphone },
    { id: 'orange' as const, name: 'Orange Money', color: 'from-secondary to-gold', icon: Smartphone },
    { id: 'wave' as const, name: 'Wave', color: 'from-accent to-primary', icon: Smartphone },
    { id: 'stripe' as const, name: 'Stripe (Card)', color: 'from-primary to-accent', icon: CreditCard },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl font-bold mb-1">Billing & Wallet</h1>
        <p className="text-muted-foreground">Pay-as-you-go. Mobile Money + Stripe.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="glass p-6 lg:col-span-2 relative overflow-hidden glow">
          <div className="absolute inset-0 gradient-nebula opacity-20" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2 text-muted-foreground text-sm">
              <Wallet className="h-4 w-4" /> Available balance
            </div>
            <p className="text-5xl font-display font-bold text-gradient-aurora mb-2">
              {wallet.balanceFcfa.toLocaleString()} <span className="text-2xl">FCFA</span>
            </p>
            <p className="text-muted-foreground">≈ ${wallet.balanceUsd.toFixed(2)} USD</p>
            <Button onClick={() => setOpen(true)} className="mt-6 gradient-gold text-gold-foreground glow-gold">
              <Plus className="h-4 w-4" /> Top up
            </Button>
          </div>
        </Card>

        <Card className="glass p-6">
          <h3 className="font-display text-lg font-semibold mb-3">This month</h3>
          <div className="space-y-3">
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Hosting</span><span className="font-mono text-sm">2 100 FCFA</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Domains</span><span className="font-mono text-sm">800 FCFA</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Email</span><span className="font-mono text-sm">450 FCFA</span></div>
            <div className="flex justify-between border-t border-border pt-3 font-bold"><span>Total</span><span className="font-mono">3 350 FCFA</span></div>
          </div>
        </Card>
      </div>

      <Card className="glass p-6">
        <h3 className="font-display text-lg font-semibold mb-4">Transaction history</h3>
        <div className="space-y-2">
          {wallet.txs.map((tx) => (
            <div key={tx.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50">
              <div className={`h-9 w-9 rounded-full flex items-center justify-center ${tx.amount > 0 ? 'bg-accent/20 text-accent' : 'bg-secondary/20 text-secondary'}`}>
                {tx.amount > 0 ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">{tx.description}</p>
                <p className="text-xs text-muted-foreground">{formatDistanceToNow(tx.createdAt)} ago{tx.method && ` · ${tx.method.toUpperCase()}`}</p>
              </div>
              <div className="text-right">
                <p className={`font-mono font-semibold ${tx.amount > 0 ? 'text-accent' : ''}`}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()} {tx.currency}
                </p>
                <Badge variant="outline" className="text-xs">{tx.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); setOpen(o); }}>
        <DialogContent className="glass">
          <DialogHeader>
            <DialogTitle className="font-display">
              {step === 'choose' && 'Top up wallet'}
              {step === 'confirm' && 'Confirm payment'}
              {step === 'pending' && 'Processing...'}
              {step === 'done' && 'Success!'}
            </DialogTitle>
          </DialogHeader>

          {step === 'choose' && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Amount</label>
                <Input type="number" value={amount} onChange={(e) => setAmount(+e.target.value)} className="font-mono text-lg" />
                <div className="flex gap-2 mt-2">
                  {[2000, 5000, 10000, 25000].map((v) => (
                    <button key={v} onClick={() => setAmount(v)} className="text-xs px-3 py-1 rounded-full border border-border hover:border-primary">{v.toLocaleString()}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Method</label>
                <div className="grid grid-cols-2 gap-2">
                  {methods.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setMethod(m.id)}
                      className={`p-3 rounded-lg border text-left transition ${method === m.id ? 'border-primary glow' : 'border-border'}`}
                    >
                      <div className={`h-8 w-8 rounded-md bg-gradient-to-br ${m.color} flex items-center justify-center mb-2`}>
                        <m.icon className="h-4 w-4 text-white" />
                      </div>
                      <p className="text-sm font-medium">{m.name}</p>
                    </button>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setStep('confirm')} className="gradient-cosmic glow w-full">Continue</Button>
              </DialogFooter>
            </div>
          )}

          {step === 'confirm' && (
            <div className="space-y-4">
              {method !== 'stripe' && (
                <div>
                  <label className="text-sm font-medium mb-1 block">Phone number</label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+225 07 00 00 00 00" className="font-mono" />
                  <p className="text-xs text-muted-foreground mt-1">You'll receive a confirmation prompt on your phone.</p>
                </div>
              )}
              {method === 'stripe' && (
                <div className="text-sm text-muted-foreground">Redirecting to Stripe Checkout (simulated)...</div>
              )}
              <div className="p-4 rounded-lg bg-muted/50 space-y-1 text-sm">
                <div className="flex justify-between"><span>Amount</span><span className="font-mono">{amount.toLocaleString()} {method === 'stripe' ? 'USD' : 'FCFA'}</span></div>
                <div className="flex justify-between"><span>Method</span><span>{methods.find((m) => m.id === method)?.name}</span></div>
                <div className="flex justify-between"><span>Fee</span><span>0</span></div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setStep('choose')}>Back</Button>
                <Button onClick={proceed} className="gradient-cosmic glow">Pay now</Button>
              </DialogFooter>
            </div>
          )}

          {step === 'pending' && (
            <div className="py-8 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
              <p className="font-medium">Awaiting confirmation...</p>
              <p className="text-sm text-muted-foreground mt-1">{method !== 'stripe' ? 'Check your phone' : 'Processing payment'}</p>
            </div>
          )}

          {step === 'done' && (
            <div className="py-6 text-center">
              <div className="h-14 w-14 rounded-full gradient-cosmic mx-auto flex items-center justify-center mb-4 glow">
                <Check className="h-7 w-7 text-primary-foreground" />
              </div>
              <p className="font-display text-lg font-semibold">Wallet topped up</p>
              <p className="text-sm text-muted-foreground">+{amount.toLocaleString()} {method === 'stripe' ? 'USD' : 'FCFA'}</p>
              <Button onClick={reset} className="mt-4 w-full">Done</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Billing;
