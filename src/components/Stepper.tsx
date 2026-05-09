import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export interface Step {
  label: string;
  description?: string;
  duration?: string;
}

export function Stepper({
  steps,
  current,
  className,
  orientation = 'vertical',
}: {
  steps: Step[];
  current: number; // index of current step (already-active). previous are done.
  className?: string;
  orientation?: 'vertical' | 'horizontal';
}) {
  const safeSteps = (steps ?? []).filter(Boolean) as Step[];
  if (orientation === 'horizontal') {
    return (
      <ol className={cn('flex items-center w-full gap-0', className)}>
        {safeSteps.map((s, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={i} className="flex-1 flex items-center gap-3 min-w-0">
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={cn(
                    'h-6 w-6 shrink-0 rounded-full border flex items-center justify-center text-[11px] font-mono',
                    done && 'border-success bg-success text-success-foreground',
                    active && 'border-primary text-primary',
                    !done && !active && 'border-border text-muted-foreground',
                  )}
                >
                  {done ? <Check className="h-3 w-3" /> : String(i + 1).padStart(2, '0')}
                </span>
                <span className={cn('text-sm truncate', active ? 'text-foreground' : 'text-muted-foreground')}>{s.label}</span>
              </div>
              {i < safeSteps.length - 1 && <div className="flex-1 h-px bg-border mx-3" />}
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <ol className={cn('relative space-y-5', className)}>
      {safeSteps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  'h-6 w-6 rounded-full border flex items-center justify-center text-[10px] font-mono shrink-0',
                  done && 'border-success bg-success text-success-foreground',
                  active && 'border-primary text-primary animate-pulse',
                  !done && !active && 'border-border text-muted-foreground',
                )}
              >
                {done ? <Check className="h-3 w-3" /> : String(i + 1).padStart(2, '0')}
              </span>
              {i < steps.length - 1 && <span className="w-px flex-1 bg-border mt-1" />}
            </div>
            <div className="pb-2 -mt-0.5 min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <p className={cn('text-sm', active ? 'text-foreground' : done ? 'text-muted-foreground' : 'text-muted-foreground/70')}>
                  {s.label}
                </p>
                {s.duration && <span className="font-mono text-[11px] text-muted-foreground tabular-nums">{s.duration}</span>}
              </div>
              {s.description && <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
