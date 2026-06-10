import { useMemo } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { vercel } from '@/lib/vercel';

export interface SparkPoint { t: number; v: number }
export interface UsageMetric { label: string; total: number; series: SparkPoint[]; unit?: string }

export function useVercelUsage(range: '24h' | '7d' | '30d' = '24h') {
  const { from, to } = useMemo(() => {
    const now = Date.now();
    const hours = { '24h': 24, '7d': 24 * 7, '30d': 24 * 30 }[range];
    return { from: now - hours * 60 * 60 * 1000, to: now };
  }, [range]);

  const query = useQuery({
    queryKey: ['vercel-usage', range],
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    refetchInterval: 120_000,
    queryFn: async () => normalize(await vercel.getUsage(from, to).catch(() => null), from, to),
  });

  return { metrics: query.data ?? emptyMetrics(), loading: query.isLoading && !query.data, isFetching: query.isFetching };
}

function emptyMetrics() {
  return {
    edgeRequests: { label: 'Edge Requests', total: 0, series: [] as SparkPoint[] } as UsageMetric,
    fastData: { label: 'Fast Data Transfer', total: 0, series: [] as SparkPoint[], unit: 'B' } as UsageMetric,
    functionInvocations: { label: 'Function Invocations', total: 0, series: [] as SparkPoint[] } as UsageMetric,
    middleware: { label: 'Middleware Invocations', total: 0, series: [] as SparkPoint[] } as UsageMetric,
  };
}

function pickSeries(blob: any, ...keys: string[]): SparkPoint[] {
  for (const k of keys) {
    const node = blob?.[k];
    if (Array.isArray(node)) {
      return node
        .filter((p: any) => p && typeof p === 'object')
        .map((p: any) => ({ t: Number(p.t ?? p.time ?? p.timestamp ?? 0), v: Number(p.v ?? p.value ?? p.total ?? 0) }));
    }
    if (Array.isArray(node?.series)) {
      return node.series.map((p: any) => ({ t: Number(p.t ?? p.time ?? 0), v: Number(p.v ?? p.value ?? 0) }));
    }
  }
  return [];
}
function pickTotal(blob: any, ...keys: string[]): number {
  for (const k of keys) {
    const node = blob?.[k];
    if (typeof node === 'number') return node;
    if (typeof node?.total === 'number') return node.total;
  }
  return 0;
}
function normalize(blob: any, from: number, to: number) {
  const base = emptyMetrics();
  if (!blob || typeof blob !== 'object') {
    // Synthetic placeholder so the chart is never empty when realtime is enabled.
    const pts = 24;
    const span = (to - from) / pts;
    const synth = Array.from({ length: pts }, (_, i) => ({ t: from + i * span, v: 0 }));
    base.edgeRequests.series = synth;
    base.fastData.series = synth;
    base.functionInvocations.series = synth;
    base.middleware.series = synth;
    return base;
  }
  base.edgeRequests.total = pickTotal(blob, 'edgeRequests', 'requests');
  base.edgeRequests.series = pickSeries(blob, 'edgeRequests', 'requests');
  base.fastData.total = pickTotal(blob, 'fastDataTransfer', 'bandwidth', 'dataTransfer');
  base.fastData.series = pickSeries(blob, 'fastDataTransfer', 'bandwidth');
  base.functionInvocations.total = pickTotal(blob, 'serverlessFunctionExecution', 'functionInvocations', 'invocations');
  base.functionInvocations.series = pickSeries(blob, 'serverlessFunctionExecution', 'invocations');
  base.middleware.total = pickTotal(blob, 'edgeMiddlewareInvocations', 'middlewareInvocations');
  base.middleware.series = pickSeries(blob, 'edgeMiddlewareInvocations', 'middlewareInvocations');
  return base;
}
