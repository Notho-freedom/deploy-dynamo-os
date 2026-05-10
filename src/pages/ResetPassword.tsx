import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Wordmark } from '@/components/Logo';
import { toast } from 'sonner';

export default function ResetPassword() {
  const nav = useNavigate();
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [valid, setValid] = useState(false);

  useEffect(() => {
    // Recovery tokens arrive in URL hash; supabase auto-handles them
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setValid(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Password updated');
    nav('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm">
        <Wordmark />
        <h1 className="font-editorial text-3xl mt-8 mb-2">Reset password</h1>
        <p className="text-[13px] text-muted-foreground mb-6">Enter a new password for your account.</p>
        <form onSubmit={submit} className="space-y-3">
          <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password" required minLength={8} className="h-10" />
          <Button type="submit" disabled={busy || !valid} className="w-full h-10">
            {busy ? 'Updating…' : valid ? 'Update password' : 'Waiting for recovery link…'}
          </Button>
        </form>
      </div>
    </div>
  );
}
