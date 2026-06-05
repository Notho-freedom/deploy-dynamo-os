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
