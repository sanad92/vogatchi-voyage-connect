import { cn } from '@/lib/utils';

interface VogantraLogoProps {
  variant?: 'full' | 'mark' | 'white';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { mark: 28, text: 'text-base', tag: 'text-[9px]' },
  md: { mark: 36, text: 'text-lg', tag: 'text-[10px]' },
  lg: { mark: 44, text: 'text-2xl', tag: 'text-xs' },
  xl: { mark: 56, text: 'text-3xl', tag: 'text-sm' },
};

/**
 * Vogantra brand logo.
 * NOTE: When the official PNG/SVG logo file is uploaded, swap the inline SVG
 * below with `<img src="/vogantra-logo.png" />`. Component API stays the same.
 */
const VogantraLogo = ({
  variant = 'full',
  size = 'md',
  showTagline = false,
  className,
}: VogantraLogoProps) => {
  const s = sizeMap[size];
  const isWhite = variant === 'white';

  const Mark = (
    <svg
      width={s.mark}
      height={s.mark}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0"
      aria-label="Vogantra"
    >
      <rect
        width="64"
        height="64"
        rx="14"
        fill={isWhite ? 'white' : '#0F172A'}
      />
      <path
        d="M14 18 L32 50 L50 18 L42 18 L32 36 L22 18 Z"
        fill={isWhite ? 'url(#vog-w)' : 'url(#vog-c)'}
      />
      {/* Wing accent */}
      <path
        d="M48 14 L56 14 L52 22 Z"
        fill={isWhite ? '#0EA5E9' : '#10B981'}
        opacity="0.85"
      />
      <defs>
        <linearGradient id="vog-c" x1="14" y1="18" x2="50" y2="50" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0EA5E9" />
          <stop offset="1" stopColor="#10B981" />
        </linearGradient>
        <linearGradient id="vog-w" x1="14" y1="18" x2="50" y2="50" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0F172A" />
          <stop offset="1" stopColor="#0EA5E9" />
        </linearGradient>
      </defs>
    </svg>
  );

  if (variant === 'mark') {
    return <span className={cn('inline-flex', className)}>{Mark}</span>;
  }

  return (
    <div className={cn('inline-flex items-center gap-2.5', className)}>
      {Mark}
      <div className="flex flex-col leading-none">
        <span
          className={cn(
            'font-inter font-bold tracking-tight',
            s.text,
            isWhite ? 'text-white' : 'text-foreground'
          )}
        >
          Vogantra
        </span>
        {showTagline && (
          <span
            className={cn(
              'font-inter font-medium uppercase tracking-[0.18em] mt-1',
              s.tag,
              isWhite ? 'text-white/70' : 'text-muted-foreground'
            )}
          >
            Powering Travel
          </span>
        )}
      </div>
    </div>
  );
};

export default VogantraLogo;
