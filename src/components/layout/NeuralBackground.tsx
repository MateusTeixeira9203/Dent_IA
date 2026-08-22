import { BrandBackground } from '@/components/layout/brand-background';

export function NeuralBackground({ opacity = 1 }: { opacity?: number }) {
  return <BrandBackground variant="marketing" opacity={opacity} />;
}
