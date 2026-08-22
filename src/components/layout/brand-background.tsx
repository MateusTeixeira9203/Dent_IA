import { cn } from '@/lib/utils';

export type BrandBackgroundVariant = 'marketing' | 'product';
export type BrandBackgroundTone = 'theme' | 'charcoal';

export interface BrandBackgroundProps {
  variant?: BrandBackgroundVariant;
  tone?: BrandBackgroundTone;
  position?: 'absolute' | 'fixed';
  opacity?: number;
}

export function BrandBackground({
  variant = 'product',
  tone = 'theme',
  position = 'absolute',
  opacity = 1,
}: BrandBackgroundProps): React.JSX.Element {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'brand-background inset-0 z-0',
        position === 'fixed' ? 'fixed' : 'absolute',
        tone === 'charcoal' ? 'bg-brand-charcoal' : 'bg-bg',
        variant === 'marketing'
          ? 'brand-background--marketing'
          : 'brand-background--product',
      )}
      style={opacity === 1 ? undefined : { opacity }}
    >
      <div className="brand-background__scene">
        <div className="brand-background__grid" />
        <div className="brand-background__glow" />
        <div className="brand-background__frame brand-background__frame--primary" />
        <div className="brand-background__frame brand-background__frame--secondary" />
      </div>
    </div>
  );
}
