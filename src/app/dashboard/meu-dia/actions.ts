'use server';

// R-46b2 — "Salvar e chamar próximo". Wrapper fino sobre `salvarFicha` (contrato completo em
// plans/specs/R-46b2-salvar-chamar-proximo.md §1/§3): salvar + fechar agendamento + notificar
// a secretária já são 1 chamada só ali (origem='modo_consulta' + agendamentoId, sem fichaId).
// Só falta derivar os campos legados que o Meu dia não tem formulário pra preencher (§4, A1).

import { z } from 'zod';
import { salvarFicha, type SalvarFichaResult } from '@/server/patients/salvar-ficha';
import { derivarV2DosEventos } from '@/lib/odontograma/derivar-campos-legado';
import { hojeBRT } from '@/lib/hora-brt';
import type { OdontogramaEventoDraft } from '@/types/odontograma';

const salvarVisitaMeuDiaSchema = z.object({
  pacienteId: z.string().uuid(),
  agendamentoId: z.string().uuid(),
  textoVisita: z.string().trim().max(5000),
  eventosDraft: z.array(z.unknown()),
});

export async function salvarVisitaMeuDia(dados: {
  pacienteId: string;
  agendamentoId: string;
  textoVisita: string;
  eventosDraft: OdontogramaEventoDraft[];
}): Promise<SalvarFichaResult> {
  const parsed = salvarVisitaMeuDiaSchema.safeParse(dados);
  if (!parsed.success) return { ok: false, error: 'Dados inválidos.' };

  // I2 — sempre create (nunca fichaId): é o que dispara fechar agendamento + notificar
  // dentro de salvarFicha (o bloco de efeitos colaterais só roda no ramo de create).
  const derivado = derivarV2DosEventos(dados.eventosDraft);

  return salvarFicha({
    pacienteId: dados.pacienteId,
    origem: 'modo_consulta',
    agendamentoId: dados.agendamentoId,
    dataAtendimento: hojeBRT(),
    queixaPrincipal: '',
    anotacoes: dados.textoVisita,
    dentesAfetados: derivado.dentes,
    dentesObservacoes: derivado.observacoes,
    procedimentos: derivado.procedimentos,
    conduta: '',
    odontogramaEventos: dados.eventosDraft,
  });
}
