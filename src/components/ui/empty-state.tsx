import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    onClick?: () => void;
  };
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Universal Empty State — used across tables, lists, panels.
 * Design: soft muted background, centered icon, generous spacing,
 * optional CTA. Fully token-driven, works in light + dark.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  size = 'md',
}) => {
  const sizes = {
    sm: { pad: 'py-8 px-4', icon: 'h-10 w-10', ring: 'h-14 w-14' },
    md: { pad: 'py-12 px-6', icon: 'h-12 w-12', ring: 'h-20 w-20' },
    lg: { pad: 'py-20 px-8', icon: 'h-14 w-14', ring: 'h-24 w-24' },
  }[size];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center animate-in fade-in',
        sizes.pad,
        className
      )}
    >
      {Icon && (
        <div
          className={cn(
            'rounded-2xl bg-muted/60 flex items-center justify-center mb-4 ring-1 ring-border/50',
            sizes.ring
          )}
        >
          <Icon className={cn('text-muted-foreground', sizes.icon)} strokeWidth={1.5} />
        </div>
      )}
      <h3 className="text-base font-semibold text-foreground mb-1.5 tracking-tight">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-6 leading-relaxed">
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {action &&
            (action.href ? (
              <Button asChild size="sm">
                <a href={action.href}>
                  {action.icon && <action.icon className="h-4 w-4 me-1.5" />}
                  {action.label}
                </a>
              </Button>
            ) : (
              <Button size="sm" onClick={action.onClick}>
                {action.icon && <action.icon className="h-4 w-4 me-1.5" />}
                {action.label}
              </Button>
            ))}
          {secondaryAction && (
            <Button size="sm" variant="ghost" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
