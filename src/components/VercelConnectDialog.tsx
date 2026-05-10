import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ExternalLink, Loader2, Triangle } from 'lucide-react';
import { vercelConnect } from '@/lib/vercel';
import { toast } from 'sonner';

export function VercelConnectDialog({
  open, onOpenChange, onConnected,
}: { open: boolean; onOpenChange: (v: boolean) => void; onConnected: () => void }) {
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    try {
      const res = await vercelConnect(token.trim());
      toast.success(`Connected as ${res.user?.username || res.user?.email || 'Vercel user'}`);
      setToken('');
      onConnected();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Connection failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Triangle className="h-4 w-4 fill-current" /> Connect Vercel
          </DialogTitle>
          <DialogDescription>
            Paste a Personal Access Token from your Vercel account. Stored encrypted, scoped to you.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <a
            href="https://vercel.com/account/tokens"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[12px] text-primary hover:underline"
          >
            Create a token on vercel.com <ExternalLink className="h-3 w-3" />
          </a>
          <Input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="vercel_xxxxxxxxxxxxxxxx"
            className="font-mono text-[12px]"
            type="password"
            required
            minLength={10}
          />
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Connect'}
          </Button>
          <p className="text-[10.5px] text-muted-foreground">
            Recommended scope: <span className="font-mono">Full Account</span>. The token is never exposed to the browser; all Vercel calls go through a server-side proxy.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
