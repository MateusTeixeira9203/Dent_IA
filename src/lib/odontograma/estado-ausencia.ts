import type { OdontogramaEventoInput } from '@/types/odontograma';

/** FDI permanente (11–48) ou decíduo (51–85). Mantido local para que esta regra pura possa
 *  ser usada tanto no browser quanto na rota do Dex sem importar componentes de UI. */
function isDenteFDI(numero: number): boolean {
  const quadrante = Math.floor(numero / 10);
  const posicao = numero % 10;
  return (quadrante >= 1 && quadrante <= 4 && posicao >= 1 && posicao <= 8)
    || (quadrante >= 5 && quadrante <= 8 && posicao >= 1 && posicao <= 5);
}

/** Quebra uma sequência de procedimentos sem separar “35 e 36” nem “também é ausente”. */
export function fragmentarRelatoClinico(texto: string): string[] {
  const inicioNovoTrecho = /\s+e\s+(?=(?:(?:o|a)\s+)?dente\s+\d{2}\b|[^\s]+\s+(?:no|na|nos|nas)\s+(?:dente\s+)?\d{2}\b|(?:vou|preciso|fiz|foi|sera|será|tenho|canal|implante|extracao|extração|restauracao|restauração|fratura|coroa|ponte)\b)/i;
  return texto.split(new RegExp(`[,.!?;]+|${inicioNovoTrecho.source}`, 'i'))
    .map((frase) => frase.trim())
    .filter(Boolean);
}

/**
 * Extrai somente declarações de estado atuais e explícitas. “Ausente” não é uma extração
 * proposta: é o estado que já existia quando o paciente chegou. A regra deliberadamente não
 * tenta deduzir isso de radiografia, implante ou contexto implícito.
 */
export function extrairDentesExplicitamenteAusentes(texto: string): number[] {
  const dentes: number[] = [];
  const vistos = new Set<number>();
  const frases = fragmentarRelatoClinico(texto)
    .map((frase) => frase.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR'));

  for (const frase of frases) {
    if (!/\bausente\b/.test(frase) || /\bnao\s+(?:esta|e|se encontra)\s+ausente\b/.test(frase)) {
      continue;
    }
    for (const valor of frase.match(/(?<![\d/])\d{2}(?![\d/,]|\s*mm\b)/g) ?? []) {
      const dente = Number(valor);
      if (isDenteFDI(dente) && !vistos.has(dente)) {
        vistos.add(dente);
        dentes.push(dente);
      }
    }
  }
  return dentes;
}

/**
 * O modelo organiza o texto, mas esta condição é declarada literalmente pelo dentista. Para
 * não depender de ele escolher o eixo clínico correto, normalizamos somente a ausência explícita
 * para `exodontia` pré-existente. Preserva implantes e todos os demais eventos no mesmo dente.
 */
export function aplicarAusenciasExplicitamenteNarradas(
  texto: string,
  eventos: readonly OdontogramaEventoInput[],
): OdontogramaEventoInput[] {
  const ausentes = extrairDentesExplicitamenteAusentes(texto);
  if (ausentes.length === 0) return [...eventos];

  const ausentesSet = new Set(ausentes);
  const normalizados = eventos.map((evento) => {
    if (evento.tipo !== 'exodontia' || evento.ancora.nivel !== 'dente'
      || evento.ancora.dente == null || !ausentesSet.has(evento.ancora.dente)) {
      return evento;
    }
    return {
      ...evento,
      status: 'realizado' as const,
      origem: 'preexistente' as const,
      momento_planejado: 'sessao_atual' as const,
      evidencia_status: 'historico' as const,
      revisar_status: false,
      observacao: evento.observacao || 'Dente ausente (pré-existente).',
    };
  });

  const jaCobertos = new Set(
    normalizados
      .filter((evento) => evento.tipo === 'exodontia' && evento.ancora.nivel === 'dente'
        && evento.ancora.dente != null && ausentesSet.has(evento.ancora.dente))
      .map((evento) => evento.ancora.dente as number),
  );

  for (const dente of ausentes) {
    if (jaCobertos.has(dente)) continue;
    normalizados.push({
      tipo: 'exodontia',
      status: 'realizado',
      origem: 'preexistente',
      momento_planejado: 'sessao_atual',
      ancora: { nivel: 'dente', dente },
      grupo_id: null,
      papel_no_grupo: null,
      observacao: 'Dente ausente (pré-existente).',
      evidencia_status: 'historico',
      revisar_status: false,
    });
  }

  return normalizados;
}
