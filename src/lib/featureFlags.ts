// Centralized feature flags. Server-side functions read mode env vars directly.
export const FLAGS = {
  vercelMode: ((import.meta.env.VITE_VERCEL_MODE as string) || 'admin') as 'admin' | 'oauth',
  renderMode: ((import.meta.env.VITE_RENDER_MODE as string) || 'admin') as 'admin' | 'oauth',
  enableUserVercelConnect: false,
  enableUserRenderConnect: false,
};
