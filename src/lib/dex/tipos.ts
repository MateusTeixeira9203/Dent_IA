import type { TipoNotificacao } from '@/lib/notificacoes';

export type DexSeveridade = 'alta' | 'media' | 'baixa';

/** R-103b — os 3 tipos de pendência de retenção (dedup: um paciente, no máximo 1). */
export type DexRetencaoTipo = 'faltou_nao_voltou' | 'cancelou_nao_remarcou' | 'parou_de_vir';

/** Card da zona "Precisa de você". Some quando resolve. */
export interface DexPendencia {
  id: string;                    // estável entre fetches (key + dedup)
  severidade: DexSeveridade;
  titulo: string;                // "1 orçamento sem resposta há 12 dias"
  descricao: string;
  valorParado: number | null;    // R$ em jogo, quando existe
  chips: string[];                // até 4 nomes/datas
  cta: { label: string; href: string };
  /** Presente só nos 3 cards de retenção (R-103b) — discrimina qual dos 3 tipos é. */
  retencaoTipo?: DexRetencaoTipo;
}

/** R-103b — paciente num bucket de retenção; diasAtras negativo = evento ainda no futuro
 *  (consulta cancelada de amanhã, D9). */
export interface DexRetencaoPaciente {
  id: string;
  nome: string;
  diasAtras: number;
}

/** R-103b — saída de `classificarRetencao`. Os 3 buckets já vêm deduplicados entre si
 *  (precedência faltou > cancelou > parou, A2/D7). */
export interface DexRetencaoData {
  faltouNaoVoltou: { total: number; pacientes: DexRetencaoPaciente[] };
  cancelouNaoRemarcou: { total: number; pacientes: DexRetencaoPaciente[] };
  parouDeVir: {
    total60: number;                   // limiar de corte — o que o card mostra (A4)
    total30: number;                   // sublinha — sempre >= total60 (I5)
    pacientes: DexRetencaoPaciente[];  // bucket 60d, fonte dos chips
  };
}

/** Notificação do banco, na zona "Aconteceu". */
export interface DexEvento {
  id: string;                    // "notif_<uuid>" — formato que o PATCH já espera
  tipo: TipoNotificacao;
  titulo: string;
  mensagem: string;
  href: string | null;
  createdAt: string;             // ISO
}

export interface DexNumero {
  label: string;
  valor: string;                  // já formatado pt-BR
  detalhe: string | null;         // null = sem sublinha (nunca "demo")
}

/** R-103c — saída de `calcularNumerosMes`. Sem métrica de "recorrente" (D2 — cortada). */
export interface DexMesData {
  atendimentos: number;
  atendimentosMesAnterior: number;
  /** null = mês anterior sem atendimentos, sem base pra calcular % */
  crescimentoPct: number | null;
  pacientesAtendidos: number;      // distintos este mês
  visitasPorPaciente: number;      // atendimentos / pacientesAtendidos; 0 se pacientesAtendidos = 0
}

export interface DexNovidade {
  id: string;                     // slug estável; a chave de "visto" deriva dele
  titulo: string;
  data: string;                   // ISO YYYY-MM-DD
  resumo: string;
  detalhe: string;
}

export interface DexHubData {
  pendencias: DexPendencia[];
  eventos: DexEvento[];
  agora: { proximo: string | null; consultasHoje: number; entrouHoje: number; amanha: number };
  numeros: DexNumero[];
  /** pendencias.length + eventos.length — o único número do badge (D5) */
  badge: number;
}
