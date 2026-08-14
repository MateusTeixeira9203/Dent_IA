'use server';

// R-46b2 — "Salvar e chamar próximo". Wrapper fino sobre a escrita da ficha (contrato completo
// em plans/specs/R-46b2-salvar-chamar-proximo.md §1/§3).
//
// R-108b — o wrapper continua fino, mas o que ele chama mudou: em vez de `salvarFicha` direto
// (que sempre criava ficha nova a cada visita), chama `rotearVisitaMeuDia`, que distribui o que
// foi feito hoje entre as fichas certas — pendência volta pra ficha onde foi planejada, só o
// que nasce na sessão tem destino escolhível. A lógica mora no server, não aqui
// (CLAUDE.md §Regras de código).

import { z } from 'zod';
import { rotearVisitaMeuDia } from '@/server/patients/rotear-visita';
import type { SalvarFichaResult } from '@/server/patients/salvar-ficha';
import type { OdontogramaEventoDraft, OrtoManutencaoInfo } from '@/types/odontograma';

const salvarVisitaMeuDiaSchema = z.object({
  pacienteId: z.string().uuid(),
  agendamentoId: z.string().uuid(),
  textoVisita: z.string().trim().max(5000),
  eventosDraft: z.array(z.unknown()),
  alertaNovo: z.string().trim().nullable().optional(), // R-46d D1 — I3
  // R-46d D1.2 (04/08) — chip "Manutenção ortodôntica" da disclosure "Registrar sem IA".
  ortoManutencao: z.unknown().nullable().optional(),
  // R-85 — ver comentário na função abaixo.
  fichaId: z.string().uuid().optional(),
  finalizarAtendimento: z.boolean().optional(),
  // R-108b — destino dos eventos que NASCEM nesta sessão. `null` = tratamento novo (ficha
  // nova); ausente = idem. Pendência não passa por aqui: ela volta pra ficha onde nasceu, sem
  // pergunta nenhuma (spec §2).
  destinoNovos: z.object({ fichaId: z.string().uuid().nullable() }).optional(),
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
   *  criar uma 2ª — sem isto, os eventos já gravados no orçamento nascem duplicados.
   *  R-108b: este `fichaId` **vence o roteamento** (invariante §7) — com ele, o destino já
   *  está decidido e o seletor nem aparece na tela. */
  fichaId?: string;
  /** R-85 — default `true` (I2 continua valendo no caso normal). `false` é só pra criar a
   *  ficha cedo (a partir do orçamento): grava sem fechar o agendamento nem avisar a secretária. */
  finalizarAtendimento?: boolean;
  /** R-108b — destino escolhido no seletor "o novo vai para". */
  destinoNovos?: { fichaId: string | null };
}): Promise<SalvarFichaResult> {
  const parsed = salvarVisitaMeuDiaSchema.safeParse(dados);
  if (!parsed.success) return { ok: false, error: 'Dados inválidos.' };

  return rotearVisitaMeuDia({
    pacienteId: dados.pacienteId,
    agendamentoId: dados.agendamentoId,
    textoVisita: dados.textoVisita,
    eventosDraft: dados.eventosDraft,
    alertaNovo: dados.alertaNovo ?? null,
    ortoManutencao: dados.ortoManutencao ?? null,
    fichaId: dados.fichaId,
    finalizarAtendimento: dados.finalizarAtendimento,
    destinoNovos: dados.destinoNovos,
  });
}
