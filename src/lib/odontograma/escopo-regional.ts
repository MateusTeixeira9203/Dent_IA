import type { MeuDiaCatalogoProcedimento } from '@/server/dashboard/get-meu-dia';
import {
  TIPO_LABEL,
  type AncoraClinica,
  type TipoRegistroOdontograma,
} from '../../types/odontograma.ts';

export type EscopoRegional =
  | 'geral'
  | 'boca'
  | 'arcada_superior'
  | 'arcada_inferior'
  | 'quadrante_1'
  | 'quadrante_2'
  | 'quadrante_3'
  | 'quadrante_4';

export const ESCOPOS_REGIONAIS: Array<{ id: EscopoRegional; label: string }> = [
  { id: 'geral', label: 'Sem localização' },
  { id: 'boca', label: 'Boca toda' },
  { id: 'arcada_superior', label: 'Arcada superior' },
  { id: 'arcada_inferior', label: 'Arcada inferior' },
  { id: 'quadrante_1', label: 'Q1' },
  { id: 'quadrante_2', label: 'Q2' },
  { id: 'quadrante_3', label: 'Q3' },
  { id: 'quadrante_4', label: 'Q4' },
];

const TIPOS_REGIONAIS: TipoRegistroOdontograma[] = [
  'profilaxia',
  'raspagem',
  'clareamento',
  'fluor',
  'exame_periodontal',
];

export interface OpcaoProcedimentoRegional {
  id: string;
  label: string;
  tipo: TipoRegistroOdontograma | null;
  procedimentoId: string | null;
}

export function ancoraDoEscopoRegional(escopo: EscopoRegional): AncoraClinica {
  if (escopo === 'geral') return { nivel: 'geral' };
  if (escopo === 'boca') return { nivel: 'boca' };
  if (escopo.startsWith('quadrante_')) {
    return { nivel: 'quadrante', quadrante: Number(escopo.slice(-1)) as 1 | 2 | 3 | 4 };
  }
  return {
    nivel: 'arcada',
    arcada: escopo === 'arcada_superior' ? 'superior' : 'inferior',
  };
}

export function labelDoEscopoRegional(escopo: EscopoRegional): string {
  return ESCOPOS_REGIONAIS.find((item) => item.id === escopo)?.label ?? 'Região';
}

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

/** Busca curta e local. Tipos que exigem dente não são convertidos em âncora regional:
 * nesse contexto entram como texto livre (`outro`), preservando o que o dentista escreveu. */
export function buscarProcedimentosRegionais(
  busca: string,
  catalogo: MeuDiaCatalogoProcedimento[],
): OpcaoProcedimentoRegional[] {
  const termo = normalizar(busca);
  if (!termo) return [];

  const tipos = TIPOS_REGIONAIS
    .filter((tipo) => normalizar(TIPO_LABEL[tipo]).includes(termo))
    .map((tipo): OpcaoProcedimentoRegional => ({
      id: `tipo:${tipo}`,
      label: TIPO_LABEL[tipo],
      tipo,
      procedimentoId: null,
    }));

  const itens = catalogo
    .filter((item) => normalizar(item.nome).includes(termo))
    .map((item): OpcaoProcedimentoRegional => ({
      id: `catalogo:${item.id}`,
      label: item.nome,
      tipo: null,
      procedimentoId: item.id,
    }));

  return [...tipos, ...itens].slice(0, 6);
}
