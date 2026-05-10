import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type Provider = 'vercel' | 'github' | 'zoho' | 'porkbun' | 'cloudflare' | 'stripe';

export interface Connection {
  id: string;
  provider: Provider;
  scopes: string[];
  expires_at: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export function useIntegration(provider: Provider) {
  const { user } = useAuth();
  const [connection, setConnection] = useState<Connection | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setConnection(null); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('connected_accounts')
      .select('id, provider, scopes, expires_at, metadata, created_at')
      .eq('user_id', user.id)
      .eq('provider', provider)
      .maybeSingle();
    setConnection(data as Connection | null);
    setLoading(false);
  }, [user, provider]);

  useEffect(() => { refresh(); }, [refresh]);

  const disconnect = async () => {
    if (!user) return;
    await supabase.from('connected_accounts').delete().eq('user_id', user.id).eq('provider', provider);
    setConnection(null);
  };

  return { connection, connected: !!connection, loading, refresh, disconnect };
}
