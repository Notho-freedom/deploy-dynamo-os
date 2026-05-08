import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Check, Smartphone } from 'lucide-react';

type Provider = 'mtn' | 'orange' | 'wave' | 'moov';

const providers: Record<Provider, { name: string; ussd: string; brand: string; tint: string }> = {
  mtn: { name: 'MTN MoMo', ussd: '*126#', brand: 'MTN', tint: 'bg-[#FFCC00] text-black' },
  orange: { name: 'Orange Money', ussd: '#144#', brand: 'Orange', tint: 'bg-[#FF7900] text-white' },
  wave: { name: 'Wave', ussd: 'app push', brand: 'Wave', tint: 'bg-[#1DC8E1] text-black' },
  moov: { name: 'Moov Money', ussd: '*155#', brand: 'Moov', tint: 'bg-[#005AAB] text-white' },
};

export function MobileMoneyDialog({
  open,
  onOpenChange,
  provider,
  amountFcfa,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  provider: Provider;
  amountFcfa: number;
  onSuccess: (ref: string) => void;
}) {
  const [phone, setPhone] = useState('');
  const [stage, setStage] = useState<'enter' | 'awaiting' | 'success'>('enter');
  const [ref, setRef] = useState('');

  useEffect(() => {
    if (!open) {
      setStage('enter');
      setPhone('');
    }
  }, [open]);

  const p = providers[provider];

  const submit = () => {
    if (!/^[0-9 +]{8,}$/.test(phone)) return;
    const r = `${p.brand.toUpperCase().slice(0, 3)}-${Date.now().toString().slice(-8)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
    setRef(r);
    setStage('awaiting');
    setTimeout(() => {
      setStage('success');
      setTimeout(() => {
        onSuccess(r);
        onOpenChange(false);
      }, 900);
    }, 2600);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className={`px-2 py-1 text-[11px] font-mono ${p.tint}`}>{p.brand}</span>
            <DialogTitle className="font-editorial italic text-xl">{p.name}</DialogTitle>
          </div>
        </DialogHeader>

        {stage === 'enter' && (
          <div className="space-y-4">
            <div className="border border-border p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Montant</p>
              <p className="text-3xl font-editorial num">{amountFcfa.toLocaleString('fr-FR')} <span className="text-base text-muted-foreground">FCFA</span></p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Numéro de téléphone</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+225 07 00 00 00 00"
                className="mt-1 font-mono"
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground mt-1.5">Composez {p.ussd} sur votre mobile pour confirmer.</p>
            </div>
            <Button onClick={submit} className="w-full" disabled={!phone}>Envoyer la requête</Button>
          </div>
        )}

        {stage === 'awaiting' && (
          <div className="space-y-4 py-2">
            <div className="border border-border p-4 flex items-center gap-4">
              <Smartphone className="h-8 w-8 text-primary shrink-0" />
              <div className="text-sm">
                <p className="font-medium">Vérifiez votre téléphone</p>
                <p className="text-xs text-muted-foreground">Une notification {p.brand} vient d'être envoyée au {phone}.</p>
              </div>
            </div>
            <div className="border border-dashed border-border p-3 font-mono text-xs text-muted-foreground">
              Composez <span className="text-primary">{p.ussd}</span> ou validez la pop-up STK Push
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> En attente de confirmation… <span className="font-mono ml-auto">{ref}</span>
            </div>
          </div>
        )}

        {stage === 'success' && (
          <div className="py-6 flex flex-col items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-success flex items-center justify-center">
              <Check className="h-6 w-6 text-success-foreground" />
            </div>
            <p className="font-editorial italic text-lg">Paiement confirmé</p>
            <p className="font-mono text-xs text-muted-foreground">{ref}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
