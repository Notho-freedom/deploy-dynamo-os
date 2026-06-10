import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface LogStreamEntry {
  ts: number;
  text: string;
  level?: 'info' | 'warn' | 'error' | 'debug';
  raw?: unknown;
}

interface Options {
  active: boolean;
  source: 'vercel' | 'render';
  renderType?: 'app' | 'build' | 'request';
  bufferSize?: number;
}

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID;

/** Real-time log stream with SSE + exponential reconnect (1s → 30s). */
export function useDeploymentLogStream(
  id: string | null | undefined,
  { active, source, renderType = 'build', bufferSize = 2000 }: Options,
) {
  const [lines, setLines] = useState<LogStreamEntry[]>([]);
  const [live, setLive] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const retryRef = useRef(0);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    setLines([]);
    if (!id || !active) {
      setLive(false);
      return () => {
        cancelledRef.current = true;
        esRef.current?.close();
      };
    }

    const append = (entry: LogStreamEntry) => {
      setLines((prev) => {
        const next = prev.length >= bufferSize ? prev.slice(prev.length - bufferSize + 1) : prev.slice();
        next.push(entry);
        return next;
      });
    };

    const connect = async () => {
      if (cancelledRef.current) return;
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token || cancelledRef.current) return;
      const url =
        source === 'vercel'
          ? `https://${projectRef}.supabase.co/functions/v1/vercel-logs-stream?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`
          : `https://${projectRef}.supabase.co/functions/v1/render-logs-stream?resource=${encodeURIComponent(id)}&type=${renderType}&token=${encodeURIComponent(token)}`;

      esRef.current?.close();
      const es = new EventSource(url);
      esRef.current = es;
      setLive(true);

      es.onopen = () => { retryRef.current = 0; };
      es.onmessage = (ev) => {
        if (!ev.data) return;
        try {
          const parsed = JSON.parse(ev.data);
          const text =
            source === 'vercel'
              ? parsed?.payload?.text ?? parsed?.text ?? ''
              : parsed?.message ?? parsed?.text ?? '';
          if (!text) return;
          const tsRaw = source === 'vercel' ? parsed?.created : parsed?.timestamp;
          const ts = typeof tsRaw === 'number' ? tsRaw : tsRaw ? Date.parse(tsRaw) : Date.now();
          const lvl: string = (parsed?.level || parsed?.payload?.info?.type || '').toLowerCase();
          const level: LogStreamEntry['level'] =
            lvl.includes('err') || lvl === 'stderr' ? 'error'
              : lvl.includes('warn') ? 'warn'
              : lvl === 'debug' ? 'debug'
              : 'info';
          append({ ts, text: String(text), level, raw: parsed });
        } catch { /* ignore */ }
      };
      es.onerror = () => {
        es.close();
        esRef.current = null;
        setLive(false);
        if (cancelledRef.current) return;
        retryRef.current = Math.min(retryRef.current + 1, 6);
        const backoff = Math.min(30000, 1000 * 2 ** retryRef.current);
        setTimeout(() => { if (!cancelledRef.current) void connect(); }, backoff);
      };
    };

    void connect();
    return () => {
      cancelledRef.current = true;
      esRef.current?.close();
      esRef.current = null;
      setLive(false);
    };
  }, [id, active, source, renderType, bufferSize]);

  return { lines, live };
}
