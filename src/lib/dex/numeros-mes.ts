import type { DexMesData } from './tipos';

export interface FichaMesRaw {
  pacienteId: string;
}

/**
 * (FichaMesRaw[], number) -> DexMesData. Função PURA, sem fetch, sem React (molde de
 * retencao.ts) — R-103c §4.2. Sem métrica de "recorrente" (D2 — cortada, sem definição
 * confiável hoje).
 */
export function calcularNumerosMes(
  fichasMesAtual: FichaMesRaw[],
  atendimentosMesAnterior: number,
): DexMesData {
  const atendimentos = fichasMesAtual.length;
  const pacientesAtendidos = new Set(fichasMesAtual.map((f) => f.pacienteId)).size;
  const visitasPorPaciente = pacientesAtendidos > 0 ? atendimentos / pacientesAtendidos : 0;
  const crescimentoPct = atendimentosMesAnterior > 0
    ? Math.round((atendimentos - atendimentosMesAnterior) / atendimentosMesAnterior * 100)
    : null;

  return {
    atendimentos,
    atendimentosMesAnterior,
    crescimentoPct,
    pacientesAtendidos,
    visitasPorPaciente,
  };
}
