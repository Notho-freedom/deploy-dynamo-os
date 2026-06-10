import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow as fnsFormatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Safely coerce a value (number, ISO string, Date, null, undefined) into a valid Date or null. */
export function safeDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const d = value instanceof Date ? value : new Date(value as string | number);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Safe wrapper around date-fns formatDistanceToNow that never throws on invalid input. */
export function safeFormatDistance(value: unknown, opts?: { addSuffix?: boolean; fallback?: string }): string {
  const d = safeDate(value);
  if (!d) return opts?.fallback ?? "—";
  try {
    return fnsFormatDistanceToNow(d, { addSuffix: opts?.addSuffix });
  } catch {
    return opts?.fallback ?? "—";
  }
}

export function safeDateString(value: unknown, fallback = "—"): string {
  const d = safeDate(value);
  return d ? d.toLocaleDateString() : fallback;
}

/** Short deployment id form: dpl_abc1234 → dpl_abc1234 (kept), or full uid abbreviated. */
export function shortDeploymentId(uid: string | undefined | null): string {
  if (!uid) return "—";
  if (uid.startsWith("dpl_")) return uid.length <= 16 ? uid : `dpl_${uid.slice(4, 11)}`;
  return uid.length <= 12 ? uid : `${uid.slice(0, 10)}…`;
}

/** Map raw API errors (Vercel/Render/Supabase) to a short, user-friendly sentence. */
export function humanizeApiError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  if (!msg) return "Something went wrong. Please try again.";
  const code = msg.match(/\b(401|403|404|409|410|422|429|5\d{2})\b/)?.[1];
  switch (code) {
    case "401": return "Authentication required. Please sign in again.";
    case "403": return "You don't have access to this resource.";
    case "404": return "This resource was not found or was removed.";
    case "409": return "This resource conflicts with an existing one.";
    case "410": return "This resource is no longer available.";
    case "422": return "The request was rejected. Check the input and retry.";
    case "429": return "Rate limit reached. Please wait a moment and retry.";
  }
  if (code && code.startsWith("5")) return "Upstream service is temporarily unavailable. Retrying...";
  return msg.replace(/^(Vercel|Render|Supabase)\s*\d+:\s*/, "").slice(0, 240);
}
