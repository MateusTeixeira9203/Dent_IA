import { TIPO_LABEL, type OdontogramaEventoDraft, type TipoRegistroOdontograma } from '@/types/odontograma';

// FDI: 1º dígito é o quadrante (1-4 permanente, 5-8 decíduo equivalente) — mesma convenção
// documentada em odonto-dictionary.ts:297. Sem tabela própria de região no projeto; a leitura
// aqui é aritmética, não copiada de outro lugar.
const QUADRANTE_LABEL: Record<number, string> = {
  1: 'superior direito', 5: 'superior direito',
  2: 'superior esquerdo', 6: 'superior esquerdo',
  3: 'inferior esquerdo', 7: 'inferior esquerdo',
  4: 'inferior direito', 8: 'inferior direito',
};
const ARCO_LABEL: Record<number, 'superior' | 'inferior'> = {
  1: 'superior', 5: 'superior', 2: 'superior', 6: 'superior',
  3: 'inferior', 7: 'inferior', 4: 'inferior', 8: 'inferior',
};

function quadranteDoDente(dente: number): number {
  return Math.floor(dente / 10);
}

function tipoDominante(porDente: { tipo: TipoRegistroOdontograma }[]): TipoRegistroOdontograma {
  const contagem = new Map<TipoRegistroOdontograma, number>();
  for (const { tipo } of porDente) contagem.set(tipo, (contagem.get(tipo) ?? 0) + 1);
  return [...contagem.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

/**
 * R-108 §4.3 — nome do tratamento, determinístico e sem IA (previsível, sem custo — CLAUDE.md
 * §IA). Calculado a partir dos eventos da ficha; renomeável inline depois, nunca reescrito
 * automaticamente por cima de um nome que já existe (isso é responsabilidade do chamador —
 * esta função só deriva, nunca decide QUANDO aplicar).
 *
 * Cobre os 4 casos da spec (1 tipo/1 dente · N tipos mesma região · N tipos espalhados · só
 * nível-boca) e estende a mesma lógica de região pro caso não-tabelado "1 tipo, N dentes"
 * (ex.: Canal em 44 e 45 → "Canal · inferior direito", não "Reabilitação" — só 1 tipo não é
 * uma reabilitação).
 */
export function nomeTratamentoDerivado(eventos: OdontogramaEventoDraft[]): string {
  const rotulo = (evento: OdontogramaEventoDraft): string => (
    evento.procedimentoNome?.trim()
    || (evento.tipo === 'outro' ? evento.observacao.trim() : '')
    || TIPO_LABEL[evento.tipo]
  );
  if (eventos.length === 0) return 'Tratamento';
  const porDente = eventos
    .filter((e): e is typeof e & { ancora: { dente: number } } => e.ancora.dente != null)
    .map((e) => ({ tipo: e.tipo, dente: e.ancora.dente }));

  const tiposUnicos = [...new Set(eventos.map((e) => e.tipo))];

  // Só nível-boca (profilaxia/flúor/exame periodontal/…) — nenhum evento ancorado em dente.
  if (porDente.length === 0) {
    return rotulo(eventos[0]);
  }

  const dentes = [...new Set(porDente.map((e) => e.dente))];

  if (tiposUnicos.length === 1 && dentes.length === 1) {
    return `${rotulo(eventos[0])} · ${dentes[0]}`;
  }

  const label = tiposUnicos.length === 1 ? rotulo(eventos[0]) : 'Reabilitação';
  const quadrantes = new Set(dentes.map(quadranteDoDente));

  if (quadrantes.size === 1) {
    return `${label} · ${QUADRANTE_LABEL[[...quadrantes][0]]}`;
  }

  const arcos = new Set([...quadrantes].map((q) => ARCO_LABEL[q]));
  if (arcos.size === 1) {
    return `${label} · ${[...arcos][0]}`;
  }

  // Espalhados — dentes em mais de um arco.
  if (tiposUnicos.length === 1) {
    return `${rotulo(eventos[0])} · vários dentes`;
  }
  return `${TIPO_LABEL[tipoDominante(porDente)]} + ${tiposUnicos.length - 1} · vários dentes`;
}
