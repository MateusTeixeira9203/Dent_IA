// R-03c-1 — aceite assinado do orçamento (prova comercial, distinta da assinatura
// clínica do R-03a). Ver plans/_arquivo/specs/R-03c-1-aceite-assinado-orcamento.md.

/** Termos congelados no ato do aceite. Montado no servidor (RPC aceitar_orcamento), nunca pelo client. */
export interface TermosSnapshot {
  versao: 1;
  subtotal: number;
  desconto: number;
  total: number;
  validadeDias: number;
  condicoesPagamento: string | null;
  /** R-38 — flag vigente no momento do aceite. A re-renderização do aceite respeita
   *  este valor, não o `orcamentos.mostrar_valor_por_item` corrente. */
  mostrarValorPorItem: boolean;
  /** Status do orçamento no momento do aceite — o aceite não muda status. */
  statusNoAto: 'rascunho' | 'enviado' | 'aprovado';
  itens: Array<{
    descricao: string | null;
    dente: string | null;
    quantidade: number;
    precoUnitario: number | null;
    precoTotal: number | null;
  }>;
}

export interface AceiteOrcamento {
  id: string;
  assinadoPor: string;
  croNoAto: string | null;
  assinadoEm: string;
  assinaturaRef: string;
  termos: TermosSnapshot;
}
