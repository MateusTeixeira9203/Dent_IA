/**
 * R-114 — Estado do orçamento, derivado dos fatos.
 *
 * O orçamento deixou de declarar `status`. O que a tela mostra vem de duas coisas que já são
 * verdade no banco: **o que o paciente aprovou** (itens) e **o que ele pagou** (pagamentos).
 * Isso existe porque o status declarado era contradito pelo dinheiro — 14 de 35 `rascunho` da
 * ClinDent tinham pagamento recebido, e o filtro do R-65 escondia R$ 33.203,34 de receita real.
 *
 * ⚠️ Esta função e a view `orcamentos_com_estado` (migration 145) implementam a MESMA fórmula.
 * Toda leitura usa uma das duas — **nunca reimplemente a conta inline**. É a mesma disciplina
 * que `filtro-responsavel.ts` impõe no R-53 (I3 de lá), e pelo mesmo motivo: duas cópias da
 * regra divergem, e aí nenhuma é confiável.
 *
 * Use a **view** quando estiver consultando `orcamentos` direto (o Postgres calcula, e a RLS
 * vale via `security_invoker`). Use **esta função** quando a query já embeda itens e pagamentos
 * e você quer evitar uma segunda ida ao banco.
 */

export type EstadoOrcamento = 'proposto' | 'aceito' | 'quitado';

export interface ItemParaEstado {
  precoTotal: number | null;
  aprovado: boolean;
}

export interface PagamentoParaEstado {
  valor: number;
  status: string;
}

export interface EstadoDerivado {
  /** Soma dos itens aprovados — o que o paciente de fato fechou. */
  valorAprovado: number;
  /**
   * O que ele deve. `valor_acordado` (escrito SÓ pelas RPCs do R-34, plano de pagamento) tem
   * precedência: quando existe, houve negociação formal e ela vence a soma dos itens (I1).
   */
  valorDevido: number;
  valorPago: number;
  estado: EstadoOrcamento;
}

export function deriveEstadoOrcamento(input: {
  valorAcordado: number | null;
  itens: ItemParaEstado[];
  pagamentos: PagamentoParaEstado[];
}): EstadoDerivado {
  const valorAprovado = input.itens
    .filter((i) => i.aprovado)
    .reduce((soma, i) => soma + (i.precoTotal ?? 0), 0);

  const valorDevido = input.valorAcordado ?? valorAprovado;

  const valorPago = input.pagamentos
    .filter((p) => p.status === 'pago')
    .reduce((soma, p) => soma + p.valor, 0);

  // A ordem importa: "nenhum item aprovado" vence tudo. Sem isso um orçamento sem nada aprovado
  // e sem nada pago cairia em `quitado` (0 >= 0), dizendo que está fechado sem nunca ter sido
  // aceito. `proposto` é o que hoje se chama `rascunho`.
  const estado: EstadoOrcamento =
    valorAprovado === 0 ? 'proposto' : valorPago >= valorDevido ? 'quitado' : 'aceito';

  return { valorAprovado, valorDevido, valorPago, estado };
}

/**
 * Rótulo do estado na tela. `aceito` carrega o saldo porque "aceito" sozinho não responde a
 * pergunta que o dentista faz olhando a lista: quanto ainda entra.
 */
export function rotuloEstado(d: EstadoDerivado): string {
  if (d.estado === 'proposto') return 'Proposto';
  if (d.estado === 'quitado') return 'Quitado';
  const falta = Math.max(0, Math.round((d.valorDevido - d.valorPago) * 100) / 100);
  return `Aceito — falta ${falta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
}

/**
 * Substitui `STATUS_ORCAMENTO_SEM_PAGAMENTO` (R-65). Bloqueia por FATO — zero item aprovado —
 * em vez de por status declarado, que era o que escondia receita verdadeira.
 */
export function orcamentoAceitaPagamento(estado: EstadoOrcamento): boolean {
  return estado !== 'proposto';
}

export const ERRO_ORCAMENTO_SEM_APROVACAO =
  'Nenhum procedimento foi aprovado neste orçamento — marque o que o paciente aceitou antes de registrar o pagamento.';
