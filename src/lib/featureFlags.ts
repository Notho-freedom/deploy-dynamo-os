// Centralized feature flags. Server-side functions read VERCEL_MODE from env directly.
export const FLAGS = {
  // 'admin' = all deployments use the platform's Vercel admin token (single account).
  // 'oauth' = each user connects their own Vercel account (legacy Marketplace flow, kept for later).
  vercelMode: ((import.meta.env.VITE_VERCEL_MODE as string) || 'admin') as 'admin' | 'oauth',
  // When false, the "Connect your own Vercel" UI is hidden. The OAuth code paths remain in the codebase.
  enableUserVercelConnect: false,
};
