/**
 * R-07 (origem) / R-107a (extração) — ciclo dos procedimentos de rotina em nível boca/quadrante
 * (profilaxia, flúor, clareamento, exame periodontal, raspagem por quadrante): sem registro →
 * indicado → realizado → remove. Vivia só dentro de `FichasTab.tsx`; R-107a passou a precisar
 * do mesmo ciclo no Meu dia (chips de Profilaxia/Clareamento na barra do campo mágico) — extraído
 * pra util compartilhado em vez de duplicar (mesma classe de bug que já mordeu o projeto quando
 * 2 cópias da mesma lógica divergiram em silêncio: R-44, R-56, R-67).
 */
import { hojeBRT } from '@/lib/hora-brt';
import type { OdontogramaEventoDraft, QuadranteFDI, TipoRegistroOdontograma } from '@/types/odontograma';

function achaRotina(
  eventos: OdontogramaEventoDraft[],
  tipo: TipoRegistroOdontograma,
  quadrante?: QuadranteFDI,
): number {
  return eventos.findIndex((e) =>
    e.tipo === tipo && (quadrante == null ? e.ancora.nivel === 'boca' : e.ancora.quadrante === quadrante),
  );
}

/** Evento de rotina já no rascunho pro tipo/quadrante dado — null se ainda não registrado. */
export function eventoRotina(
  eventos: OdontogramaEventoDraft[],
  tipo: TipoRegistroOdontograma,
  quadrante?: QuadranteFDI,
): OdontogramaEventoDraft | null {
  const i = achaRotina(eventos, tipo, quadrante);
  return i === -1 ? null : eventos[i];
}

/** Devolve a lista de eventos com o ciclo aplicado — call site faz `setEventosDraft(...)`. */
export function cycleRotina(
  eventos: OdontogramaEventoDraft[],
  tipo: TipoRegistroOdontograma,
  quadrante?: QuadranteFDI,
): OdontogramaEventoDraft[] {
  const i = achaRotina(eventos, tipo, quadrante);
  if (i === -1) {
    return [...eventos, {
      id: crypto.randomUUID(),
      tipo,
      status: 'indicado' as const,
      origem: 'clinica' as const,
      // R-101 §1 — boca/quadrante ficam fora do v1 (sem UI de 3 vias); sempre sessao_atual.
      momento_planejado: 'sessao_atual' as const,
      ancora: quadrante != null ? { nivel: 'quadrante' as const, quadrante } : { nivel: 'boca' as const },
      grupo_id: null,
      papel_no_grupo: null,
      observacao: '',
      realizado_em: null,
    }];
  }
  const e = eventos[i];
  if (e.status === 'indicado') {
    return eventos.map((ev, j) =>
      j === i
        ? { ...ev, status: 'realizado' as const, origem: 'clinica' as const, momento_planejado: 'sessao_atual' as const, realizado_em: ev.realizado_em ?? hojeBRT() }
        : ev,
    );
  }
  return eventos.filter((_, j) => j !== i);
}
