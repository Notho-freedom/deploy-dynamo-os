import { cn } from '@/lib/utils';

type Tone = 'success' | 'warning' | 'destructive' | 'muted' | 'primary' | 'accent';

const toneClass: Record<Tone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
  muted: 'bg-muted-foreground/40',
  primary: 'bg-primary',
  accent: 'bg-accent',
};

export function StatusDot({ tone = 'success', pulse, className }: { tone?: Tone; pulse?: boolean; className?: string }) {
  return (
    <span className={cn('relative inline-flex h-2 w-2 shrink-0', className)}>
      {pulse && <span className={cn('absolute inset-0 rounded-full opacity-60 animate-ping', toneClass[tone])} />}
      <span className={cn('relative inline-flex h-2 w-2 rounded-full', toneClass[tone])} />
    </span>
  );
}
