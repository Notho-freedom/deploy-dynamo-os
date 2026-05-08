import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center py-16 px-6', className)}>
      {icon && <div className="mb-5 text-muted-foreground/60">{icon}</div>}
      <h3 className="font-editorial text-2xl text-foreground mb-2 italic">{title}</h3>
      {description && <p className="text-sm text-muted-foreground max-w-md mb-6">{description}</p>}
      {action}
    </div>
  );
}
