'use server';

// R-46c — wrapper fino de importação do histórico do Word/PDF (nível 1, sem IA — D7).
// Mesmo padrão do salvarVisitaMeuDia (R-46b2): fixa a origem no servidor e valida o que
// só ele sabe (data não-futura precisa de hojeBRT(), fora do alcance do Zod puro).

import { z } from 'zod';
import { hojeBRT } from '@/lib/hora-brt';
import { salvarFicha, type SalvarFichaResult } from './salvar-ficha';

const importarSchema = z.object({
  pacienteId:      z.string().uuid(),
  dataAtendimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** O texto extraído/colado, tal qual (D7) — zero parsing, zero normalização. */
  texto:           z.string().trim().min(1, 'Cole o texto antes de salvar.').max(5000),
});

export interface ImportarHistoricoInput {
  pacienteId: string;
  dataAtendimento: string;
  texto: string;
}

export async function importarHistoricoDoWord(dados: ImportarHistoricoInput): Promise<SalvarFichaResult> {
  const parsed = importarSchema.safeParse(dados);
  if (!parsed.success) {
    // I5 — acima do limite falha com mensagem clara, nunca trunca.
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }
  const { pacienteId, dataAtendimento, texto } = parsed.data;

  // I4 — nunca futura. Fica fora do Zod porque precisa de hojeBRT() no servidor.
  if (dataAtendimento > hojeBRT()) {
    return { ok: false, error: 'A data não pode ser no futuro.' };
  }

  // Mapeamento §9 da spec — origem='importado' é o que dispara tudo (status, rótulo,
  // não-efeito). Sem agendamentoId (garante I1: nunca fecha agendamento nem notifica).
  // queixaPrincipal/conduta vazios e dentesAfetados/procedimentos/eventos vazios: nível 1
  // não estrutura nada (D7) — o rótulo vem de `origem`, fonte única (§5).
  return salvarFicha({
    pacienteId,
    origem: 'importado',
    dataAtendimento,
    queixaPrincipal: '',
    anotacoes: texto,
    dentesAfetados: [],
    dentesObservacoes: {},
    procedimentos: [],
    conduta: '',
  });
}
