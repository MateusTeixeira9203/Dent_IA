import { hojeBRT } from '@/lib/hora-brt';
import type { OdontogramaEventoDraft } from '@/types/odontograma';

/**
 * Monta as linhas de `odontograma_eventos` pro payload da RPC `salvar_eventos_odontograma`.
 *
 * R-108b — extraído de `salvar-ficha.ts`, que já carregava a nota de que esta função vive
 * duplicada com `registro-actions.ts:montarRowsEventos` (a Fase 2 daquela migração era quem ia
 * matar a duplicação). O roteamento da visita precisa dela num 3º lugar, e uma 3ª cópia é o
 * caminho curto pro bug que a migration 137 documenta: coluna que entra numa cópia e não na
 * outra some em silêncio, sem erro. Módulo puro de propósito — `salvar-ficha.ts` é `'use
 * server'` e não pode exportar função síncrona.
 *
 * `dentista_id` é sempre o de quem está salvando AGORA. Isso não reescreve autoria de evento
 * alheio: `dentista_id` fica de fora do `on conflict do update set` da RPC, então linha que já
 * existe mantém o autor original — só INSERT usa este valor.
 */
export function montarRowsEventos(
  eventos: OdontogramaEventoDraft[],
  ctx: { clinicId: string; pacienteId: string; dentistaId: string; fichaId: string },
) {
  const hoje = hojeBRT();
  return eventos.map((ev) => ({
    id:             ev.id,
    clinica_id:     ctx.clinicId,
    paciente_id:    ctx.pacienteId,
    dentista_id:    ctx.dentistaId,
    ficha_id:       ctx.fichaId,
    grupo_id:       ev.grupo_id,
    tipo:           ev.tipo,
    procedimento_id: ev.procedimentoId ?? null,
    procedimento_nome: ev.procedimentoNome?.trim() || null,
    status:         ev.status,
    origem:         ev.origem,
    // R-101 — sem isso, todo save reseta silenciosamente pro default da RPC (sessao_atual),
    // mesmo que o dentista tenha marcado "próxima seção" na tela. É o R1 daquela spec.
    momento_planejado: ev.momento_planejado,
    nivel:          ev.ancora.nivel,
    arcada:         ev.ancora.arcada ?? null,
    quadrante:      ev.ancora.quadrante ?? null,
    dente:          ev.ancora.dente ?? null,
    faces:          ev.ancora.faces ?? [],
    papel_no_grupo: ev.papel_no_grupo,
    // `undefined` some do JSON e manda a RPC preservar um encaminhamento antigo; null é a
    // remoção deliberada escolhida pelo dentista no card.
    encaminhado_para: ev.encaminhadoParaId,
    observacao:     ev.observacao || null,
    detalhe:        ev.detalhe ?? null,
    realizado_em:
      ev.status === 'realizado'
        ? (ev.realizado_em ?? (ev.origem === 'clinica' ? hoje : null))
        : null,
  }));
}
