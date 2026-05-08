import { cn } from '@/lib/utils';

export function Logo({ className, size = 20 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className)}
      aria-hidden="true"
    >
      {/* Adinkra-inspired mark: Nyame Dua simplified — central vertical, four arms, ringed */}
      <rect x="0.5" y="0.5" width="31" height="31" rx="3" stroke="currentColor" strokeOpacity="0.25" />
      <path
        d="M16 5v22M5 16h22M9.5 9.5l13 13M22.5 9.5l-13 13"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <circle cx="16" cy="16" r="3.2" fill="currentColor" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-editorial text-[17px] tracking-tight', className)}>
      <Logo size={18} className="text-primary" />
      <span className="font-medium">
        nebula<span className="italic text-muted-foreground">os</span>
      </span>
    </span>
  );
}
