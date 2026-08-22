import { OdontoIALogo } from '@/components/ui/dent-ia-logo';

/**
 * Lockup canônico do Odonto.IA — ícone + wordmark.
 *
 * variant="dark"  → fundo escuro/teal  (texto branco, .IA em branco itálico)
 * variant="light" → fundo claro        (texto escuro, .IA em teal-lt itálico)
 */
export function BrandLockup({
  variant = 'dark',
  size = 'md',
}: {
  variant?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg';
}) {
  const iconSize = { sm: 'w-7 h-7', md: 'w-9 h-9', lg: 'w-12 h-12' }[size];
  const textSize = { sm: 'text-xl', md: 'text-2xl', lg: 'text-3xl' }[size];

  const iconColor = variant === 'dark' ? 'text-white' : 'text-teal';
  const wordColor = variant === 'dark' ? 'text-white' : 'text-text-primary dark:text-white';
  const iaColor   = variant === 'dark' ? '' : 'text-teal-lt';

  return (
    <div className="flex items-center gap-3">
      <OdontoIALogo className={`${iconSize} ${iconColor} shrink-0`} />
      <span className={`font-heading ${textSize} ${wordColor} tracking-widest leading-none`}>
        Odonto<em className={`italic ${iaColor}`}>.IA</em>
      </span>
    </div>
  );
}
