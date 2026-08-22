import type { CanalDetalhe, EndoDetalhe } from './endo';
import type { DuvidaEndo, OrigemCelulaEndo } from './extrair-endo-deterministico';

export interface RevisaoEndo {
  origemPorCampo: Record<string, OrigemCelulaEndo>;
  duvidas: DuvidaEndo[];
}

const chaveCanal = (nome: string) => nome.trim().normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase();
const chavesCanal: Array<keyof CanalDetalhe> = ['nome', 'referencia', 'comprimentoRaiz', 'limaInicial', 'limaFinal'];

function chaveDuvida(duvida: DuvidaEndo): string {
  return `${duvida.campo}|${duvida.trecho}|${duvida.motivo}`;
}

/** R-49: dado presente (manual ou já revisado) vence sugestão nova. A função é pura para
 * poder ser usada tanto pelo pass determinístico quanto pelo complemento de IA. */
export function mesclarDetalheEndo(
  atual: EndoDetalhe | null | undefined,
  recebido: EndoDetalhe,
  revisaoAtual: RevisaoEndo | undefined,
  origemRecebida: OrigemCelulaEndo,
): { detalhe: EndoDetalhe; revisao: RevisaoEndo } {
  const origemPorCampo = { ...(revisaoAtual?.origemPorCampo ?? {}) };
  const duvidas = [...(revisaoAtual?.duvidas ?? [])];
  const canais = [...(atual?.canais ?? [])];

  recebido.canais.forEach((novo) => {
    const existenteIdx = canais.findIndex((canal) => chaveCanal(canal.nome) === chaveCanal(novo.nome));
    if (existenteIdx < 0) {
      const idx = canais.length;
      canais.push({ ...novo });
      chavesCanal.forEach((campo) => {
        if (novo[campo] != null && novo[campo] !== '') origemPorCampo[`canais.${idx}.${campo}`] = origemRecebida;
      });
      return;
    }

    const existente = canais[existenteIdx];
    chavesCanal.forEach((campo) => {
      const anterior = existente[campo];
      const proposto = novo[campo];
      if (proposto == null || proposto === '') return;
      if (anterior == null || anterior === '') {
        canais[existenteIdx] = { ...canais[existenteIdx], [campo]: proposto };
        origemPorCampo[`canais.${existenteIdx}.${campo}`] = origemRecebida;
      } else if (anterior !== proposto) {
        duvidas.push({ campo: `canais.${existenteIdx}.${campo}`, trecho: String(proposto), motivo: 'conflito' });
      }
    });
  });

  const completarTexto = (campo: 'obturacao' | 'cimento'): string | null => {
    const anterior = atual?.[campo] ?? null;
    const proposto = recebido[campo];
    if (proposto == null) return anterior;
    if (anterior == null) {
      origemPorCampo[campo] = origemRecebida;
      return proposto;
    }
    if (anterior !== proposto) duvidas.push({ campo, trecho: proposto, motivo: 'conflito' });
    return anterior;
  };

  const semDuplicatas = [...new Map(duvidas.map((duvida) => [chaveDuvida(duvida), duvida])).values()];
  return {
    detalhe: { canais: canais.length > 0 ? canais : recebido.canais, obturacao: completarTexto('obturacao'), cimento: completarTexto('cimento') },
    revisao: { origemPorCampo, duvidas: semDuplicatas },
  };
}
