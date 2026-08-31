import type { EvidenciaStatus, StatusRegistro } from '@/types/odontograma';

export type ModoFormatacaoDex = 'consulta' | 'exame_inicial';

export interface ClassificacaoStatusDex {
  status: StatusRegistro;
  revisarStatus: boolean;
}

/**
 * A IA informa a evidência; o produto decide o status persistível.
 * Em consulta, só execução explicitamente narrada pode virar realizado.
 */
export function classificarStatusDex(
  evidencia: EvidenciaStatus,
  modo: ModoFormatacaoDex,
  statusSugerido: StatusRegistro,
): ClassificacaoStatusDex {
  if (modo === 'exame_inicial') {
    return { status: statusSugerido, revisarStatus: false };
  }

  return {
    status: evidencia === 'execucao_explicita' ? 'realizado' : 'indicado',
    revisarStatus: evidencia === 'ambiguo' || evidencia === 'historico',
  };
}
