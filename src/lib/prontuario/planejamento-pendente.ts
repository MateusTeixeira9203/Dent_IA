import type { MomentoPlanejado } from '@/types/odontograma';

export function ehPlanejadoParaHoje(momento: MomentoPlanejado): boolean {
  return momento === 'proxima_sessao';
}
