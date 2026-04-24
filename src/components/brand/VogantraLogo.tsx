import { cn } from '@/lib/utils';
import logoUrl from '@/assets/vogantra-logo.png';

interface VogantraLogoProps {
  variant?: 'full' | 'mark' | 'white';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { full: 'h-8', mark: 'h-7 w-7' },
  md: { full: 'h-10', mark: 'h-9 w-9' },
  lg: { full: 'h-14', mark: 'h-12 w-12' },
  xl: { full: 'h-20', mark: 'h-16 w-16' },
};

/**
 * Vogantra brand logo (official asset).
 * - `full`  → full lockup (mark + wordmark + tagline baked in the artwork)
 * - `mark`  → V monogram only (cropped from the same asset)
 * - `white` → inverted version on dark surfaces (uses CSS filter for now)
 */
const VogantraLogo = ({
  variant = 'full',
  size = 'md',
  showTagline: _showTagline,
  className,
}: VogantraLogoProps) => {
  const s = sizeMap[size];
  const isWhite = variant === 'white';

  if (variant === 'mark') {
    return (
      <span
        className={cn(
          'inline-block overflow-hidden flex-shrink-0',
          s.mark,
          className
        )}
        aria-label="Vogantra"
      >
        <img
          src={logoUrl}
          alt="Vogantra"
          className="h-full w-auto max-w-none object-cover object-left"
          style={{
            // Crop to the V mark area (top portion of the artwork)
            objectPosition: 'center 18%',
            transform: 'scale(2.4)',
            transformOrigin: 'center 22%',
          }}
        />
      </span>
    );
  }

  return (
    <img
      src={logoUrl}
      alt="Vogantra — Smart Solutions. Better Business."
      className={cn(
        s.full,
        'w-auto object-contain',
        isWhite && 'brightness-0 invert',
        className
      )}
    />
  );
};

export default VogantraLogo;
