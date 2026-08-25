import type { MeuDiaCatalogoProcedimento } from '@/server/dashboard/get-meu-dia';
import {
  TIPO_LABEL,
  type AncoraClinica,
  type TipoRegistroOdontograma,
} from '../../types/odontograma.ts';

export type EscopoRegional = 'boca' | 'arcada_superior' | 'arcada_inferior';

export const ESCOPOS_REGIONAIS: Array<{ id: EscopoRegional; label: string }> = [
  { id: 'boca', label: 'Boca toda' },
  { id: 'arcada_superior', label: 'Arcada superior' },
  { id: 'arcada_inferior', label: 'Arcada inferior' },
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
}

export function ancoraDoEscopoRegional(escopo: EscopoRegional): AncoraClinica {
  if (escopo === 'boca') return { nivel: 'boca' };
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
    }));

  const itens = catalogo
    .filter((item) => normalizar(item.nome).includes(termo))
    .map((item): OpcaoProcedimentoRegional => ({
      id: `catalogo:${item.id}`,
      label: item.nome,
      tipo: null,
    }));

  return [...tipos, ...itens].slice(0, 6);
}
