/**
 * R-07 (origem) / R-107a (extração) — ciclo dos procedimentos de rotina em nível boca/quadrante
 * (profilaxia, flúor, clareamento, exame periodontal, raspagem por quadrante): sem registro →
 * indicado → realizado → remove. Vivia só dentro de `FichasTab.tsx`; R-107a passou a precisar
 * do mesmo ciclo no Meu dia (chips de Profilaxia/Clareamento na barra do campo mágico) — extraído
 * pra util compartilhado em vez de duplicar (mesma classe de bug que já mordeu o projeto quando
 * 2 cópias da mesma lógica divergiram em silêncio: R-44, R-56, R-67).
 */
import { hojeBRT } from '@/lib/hora-brt';
import type {
  AncoraClinica,
  ModoLancamento,
  OdontogramaEventoDraft,
  QuadranteFDI,
  TipoRegistroOdontograma,
} from '@/types/odontograma';
import { camposDoModoLancamento } from './criar-eventos-contextuais';

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

/**
 * R-125a — versão contextual da rotina usada no Meu Dia. Diferente do ciclo histórico da
 * ficha completa, o clique aplica a decisão explícita do dentista e nunca apaga um registro
 * por acidente. O mesmo procedimento de boca/quadrante é atualizado no rascunho atual;
 * quando ainda não existe, nasce com os eixos clínicos derivados do modo manual ativo.
 */
export function aplicarRotinaComModo(
  eventos: OdontogramaEventoDraft[],
  tipo: TipoRegistroOdontograma,
  modo: ModoLancamento,
  dataPadrao: string,
  quadrante?: QuadranteFDI,
): OdontogramaEventoDraft[] {
  const i = achaRotina(eventos, tipo, quadrante);
  const ancora: AncoraClinica = quadrante != null
    ? { nivel: 'quadrante', quadrante }
    : { nivel: 'boca' };
  const estado = camposDoModoLancamento(modo, dataPadrao);

  if (i === -1) {
    return [...eventos, {
      id: crypto.randomUUID(),
      tipo,
      ancora,
      grupo_id: null,
      papel_no_grupo: null,
      observacao: '',
      fonteFluxo: 'novo',
      ...estado,
    }];
  }

  return eventos.map((evento, index) =>
    index === i
      ? { ...evento, ...estado, fonteFluxo: 'novo' }
      : evento,
  );
}
