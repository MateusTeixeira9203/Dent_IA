import type { TipoNotificacao } from '@/lib/notificacoes';

export type DexSeveridade = 'alta' | 'media' | 'baixa';

/** Card da zona "Precisa de você". Some quando resolve. */
export interface DexPendencia {
  id: string;                    // estável entre fetches (key + dedup)
  severidade: DexSeveridade;
  titulo: string;                // "1 orçamento sem resposta há 12 dias"
  descricao: string;
  valorParado: number | null;    // R$ em jogo, quando existe
  chips: string[];                // até 4 nomes/datas
  cta: { label: string; href: string };
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
