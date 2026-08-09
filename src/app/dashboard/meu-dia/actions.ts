'use server';

// R-46b2 — "Salvar e chamar próximo". Wrapper fino sobre `salvarFicha` (contrato completo em
// plans/specs/R-46b2-salvar-chamar-proximo.md §1/§3): salvar + fechar agendamento + notificar
// a secretária já são 1 chamada só ali (origem='modo_consulta' + agendamentoId, sem fichaId).
// Só falta derivar os campos legados que o Meu dia não tem formulário pra preencher (§4, A1).

import { z } from 'zod';
import { salvarFicha, type SalvarFichaResult } from '@/server/patients/salvar-ficha';
import { derivarV2DosEventos } from '@/lib/odontograma/derivar-campos-legado';
import { hojeBRT } from '@/lib/hora-brt';
import type { OdontogramaEventoDraft, OrtoManutencaoInfo } from '@/types/odontograma';

const salvarVisitaMeuDiaSchema = z.object({
  pacienteId: z.string().uuid(),
  agendamentoId: z.string().uuid(),
  textoVisita: z.string().trim().max(5000),
  eventosDraft: z.array(z.unknown()),
  alertaNovo: z.string().trim().nullable().optional(), // R-46d D1 — I3
  // R-46d D1.2 (04/08) — chip "Manutenção ortodôntica" da disclosure "Registrar sem IA".
  // salvarFicha já aceita este campo (migration 105) — só faltava esta casca repassar.
  ortoManutencao: z.unknown().nullable().optional(),
  // R-85 — ver comentário na função abaixo.
  fichaId: z.string().uuid().optional(),
  finalizarAtendimento: z.boolean().optional(),
});

export async function salvarVisitaMeuDia(dados: {
  pacienteId: string;
  agendamentoId: string;
  textoVisita: string;
  eventosDraft: OdontogramaEventoDraft[];
  alertaNovo?: string | null;
  ortoManutencao?: OrtoManutencaoInfo | null;
  /** R-85 — quando "Gerar orçamento" já criou a ficha desta consulta antes do Salvar de
   *  verdade (`onAbrirPickerOrcamento` em meu-dia-client.tsx, via esta mesma função com
   *  `finalizarAtendimento: false`), o Salvar final precisa EDITAR essa mesma ficha em vez de
   *  criar uma 2ª — sem isto, os eventos já gravados no orçamento nascem duplicados. */
  fichaId?: string;
  /** R-85 — default `true` (I2 continua valendo no caso normal). `false` é só pra criar a
   *  ficha cedo (a partir do orçamento): grava sem fechar o agendamento nem avisar a secretária. */
  finalizarAtendimento?: boolean;
}): Promise<SalvarFichaResult> {
  const parsed = salvarVisitaMeuDiaSchema.safeParse(dados);
  if (!parsed.success) return { ok: false, error: 'Dados inválidos.' };

  // I2 — sem fichaId, sempre create (dispara fechar agendamento + notificar, se
  // finalizarAtendimento não for false). Com fichaId (R-85), edita a ficha que o orçamento já
  // criou — mesmo bloco de efeitos colaterais, agora também alcançável no ramo de edição.
  const derivado = derivarV2DosEventos(dados.eventosDraft);

  return salvarFicha({
    fichaId: dados.fichaId,
    pacienteId: dados.pacienteId,
    origem: 'modo_consulta',
    agendamentoId: dados.agendamentoId,
    finalizarAtendimento: dados.finalizarAtendimento,
    dataAtendimento: hojeBRT(),
    queixaPrincipal: '',
    anotacoes: dados.textoVisita,
    dentesAfetados: derivado.dentes,
    dentesObservacoes: derivado.observacoes,
    procedimentos: derivado.procedimentos,
    conduta: '',
    odontogramaEventos: dados.eventosDraft,
    alertaNovo: dados.alertaNovo ?? null,
    ortoManutencao: dados.ortoManutencao ?? null,
  });
}
