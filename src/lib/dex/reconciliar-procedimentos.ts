import type {
  OdontogramaEventoInput,
  TipoRegistroOdontograma,
} from '@/types/odontograma';
import type { ModoFormatacaoDex } from './classificar-status';

export interface ResultadoReconciliacaoDex {
  eventos: OdontogramaEventoInput[];
  adicionadosComoOutro: number;
  procedimentosSemCobertura: string[];
}

const ALIASES_POR_TIPO: Readonly<Record<TipoRegistroOdontograma, readonly string[]>> = {
  carie_restauracao: ['restauracao', 'restauracao com resina'],
  exodontia: ['extracao', 'exodontia'],
  endodontia: ['canal', 'tratamento de canal', 'tratamento endodontico', 'endodontia'],
  lesao_periapical: ['lesao periapical'],
  implante: ['implante'],
  coroa: ['coroa', 'coroa total'],
  ponte: ['ponte', 'protese fixa'],
  selante: ['selante'],
  inclusao: ['inclusao', 'dente incluso', 'dente impactado'],
  esfoliacao: ['esfoliacao'],
  fratura: ['fratura'],
  pino_nucleo: ['pino', 'nucleo'],
  profilaxia: ['profilaxia', 'limpeza'],
  raspagem: ['raspagem', 'alisamento radicular'],
  clareamento: ['clareamento'],
  fluor: ['fluor', 'aplicacao de fluor'],
  exame_periodontal: ['exame periodontal'],
  outro: [],
};

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** A frase precisa aparecer como palavras completas, nunca como fragmento solto. */
function contemFrase(texto: string, frase: string): boolean {
  const normalizado = normalizar(texto);
  const alvo = normalizar(frase);
  return normalizado === alvo
    || normalizado.startsWith(`${alvo} `)
    || normalizado.endsWith(` ${alvo}`)
    || normalizado.includes(` ${alvo} `);
}

function procedimentoEstaCoberto(procedimento: string, eventos: readonly OdontogramaEventoInput[]): boolean {
  return eventos.some((evento) => {
    if (evento.tipo === 'outro') {
      const nome = evento.procedimentoNome?.trim() || evento.observacao.trim();
      if (nome) return contemFrase(nome, procedimento);
    }
    return ALIASES_POR_TIPO[evento.tipo].some((alias) => contemFrase(procedimento, alias));
  });
}

function dentesDoProcedimento(
  procedimento: string,
  dentesObservacoes: Readonly<Record<string, string>>,
): number[] {
  return Object.entries(dentesObservacoes)
    .filter(([, observacao]) => contemFrase(observacao, procedimento))
    .map(([dente]) => Number(dente))
    .filter((dente) => Number.isInteger(dente));
}

export function reconciliarProcedimentosDex(input: {
  procedimentos: readonly string[];
  eventos: readonly OdontogramaEventoInput[];
  dentesObservacoes: Readonly<Record<string, string>>;
  modo: ModoFormatacaoDex;
}): ResultadoReconciliacaoDex {
  const eventos = [...input.eventos];
  const vistos = new Set<string>();
  const procedimentos = input.procedimentos.filter((procedimento) => {
    const chave = normalizar(procedimento);
    if (!chave || vistos.has(chave)) return false;
    vistos.add(chave);
    return true;
  });
  const semCobertura = procedimentos.filter((procedimento) => !procedimentoEstaCoberto(procedimento, eventos));

  for (const procedimento of semCobertura) {
    const dentes = dentesDoProcedimento(procedimento, input.dentesObservacoes);
    const grupoId = dentes.length > 1 ? crypto.randomUUID() : null;
    const ancoras = dentes.length > 0
      ? dentes.map((dente) => ({ nivel: 'dente' as const, dente }))
      : [{ nivel: 'geral' as const }];

    for (const ancora of ancoras) {
      eventos.push({
        tipo: 'outro',
        procedimentoId: null,
        procedimentoNome: procedimento.trim(),
        status: 'indicado',
        origem: input.modo === 'exame_inicial' ? 'preexistente' : 'clinica',
        momento_planejado: 'sessao_atual',
        ancora,
        grupo_id: grupoId,
        papel_no_grupo: null,
        observacao: '',
        evidencia_status: 'ambiguo',
        revisar_status: true,
      });
    }
  }

  return {
    eventos,
    adicionadosComoOutro: eventos.length - input.eventos.length,
    procedimentosSemCobertura: semCobertura,
  };
}
