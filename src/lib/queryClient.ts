import { QueryClient } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { persistQueryClient } from '@tanstack/react-query-persist-client';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Instant from cache, revalidate in background.
      staleTime: 30_000,
      gcTime: 24 * 60 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
      retry: (failureCount, error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        if (/40[134]/.test(message)) return false;
        return failureCount < 2;
      },
    },
  },
});

if (typeof window !== 'undefined') {
  const persister = createSyncStoragePersister({
    storage: window.localStorage,
    key: 'nebula-query-cache-v1',
    throttleTime: 1000,
  });
  void persistQueryClient({
    queryClient,
    persister,
    maxAge: 24 * 60 * 60 * 1000,
    buster: 'v1',
    dehydrateOptions: {
      // Don't persist huge log streams.
      shouldDehydrateQuery: (q) => {
        const k0 = q.queryKey?.[0];
        if (k0 === 'vercel-events' || k0 === 'logs-stream') return false;
        return q.state.status === 'success';
      },
    },
  });
}
