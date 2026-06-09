import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Subscribe to postgres_changes on a table and invalidate queryKeys silently.
 * Triggers React Query to refetch in the background while the stale cache stays visible.
 */
export function useRealtimeInvalidate(table: string, queryKeys: ReadonlyArray<ReadonlyArray<unknown>>) {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel(`rt-${table}-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes' as never, { event: '*', schema: 'public', table } as never, () => {
        for (const key of queryKeys) qc.invalidateQueries({ queryKey: key });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, JSON.stringify(queryKeys)]);
}
