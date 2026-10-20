import { cn } from '@/lib/utils';
import lightLogo from '@/assets/safar-logo-light.asset.json';
import darkLogo from '@/assets/safar-logo-dark.asset.json';
import markLogo from '@/assets/safar-mark.asset.json';

interface SafarLogoProps {
  variant?: 'full' | 'mark' | 'white';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  className?: string;
}
const sizeMap = {
  sm: { full: 'h-10', mark: 'h-8 w-8' },
  md: { full: 'h-12', mark: 'h-9 w-9' },
  lg: { full: 'h-16', mark: 'h-12 w-12' },
  xl: { full: 'h-24', mark: 'h-16 w-16' },
};
// Original bilingual artwork; both variants retain the gold details.
export default function SafarLogo({ variant = 'full', size = 'md', className }: SafarLogoProps) {
  if (variant === 'mark') return <img src={markLogo.url} alt="SafarERP" className={cn('shrink-0 object-contain', sizeMap[size].mark, className)} />;
  if (variant === 'white') return <img src={darkLogo.url} alt="SafarERP — نظام إدارة شركات السياحة" className={cn('w-auto object-contain shrink-0', sizeMap[size].full, className)} />;
  return <span className={cn('inline-flex shrink-0', className)}>
    <img src={lightLogo.url} alt="SafarERP — نظام إدارة شركات السياحة" className={cn('w-auto object-contain dark:hidden', sizeMap[size].full)} />
    <img src={darkLogo.url} alt="SafarERP — نظام إدارة شركات السياحة" className={cn('hidden w-auto object-contain dark:block', sizeMap[size].full)} />
  </span>;
}
