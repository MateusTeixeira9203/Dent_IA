/**
 * R-62 — casamento LOCAL de texto → tipo estrutural/catálogo, zero IA, zero rede. Alimenta a
 * faixa de chips do campo mágico (`captura-livre-card.tsx`) além da detecção por IA
 * (`/api/dex/detectar-consulta`) que já existe — as duas convivem (spec §2), esta é a que
 * sustenta o registro funcionar com a IA fora do ar (I1).
 */
import { TIPO_LABEL, type TipoRegistroOdontograma } from '@/types/odontograma';
import { TEETH_UPPER, TEETH_LOWER, TEETH_UPPER_DEC, TEETH_LOWER_DEC } from '@/components/odontograma/Odontograma';
import type { MeuDiaCatalogoProcedimento } from '@/server/dashboard/get-meu-dia';

const DENTES_VALIDOS = new Set([...TEETH_UPPER, ...TEETH_LOWER, ...TEETH_UPPER_DEC, ...TEETH_LOWER_DEC]);

/** 4 tipos cuja âncora é 100% determinada pelo tipo (odontograma.ts:85-90) — nunca pedem
 *  dente. Mesmo conjunto que vivia em `registrar-painel.tsx` antes da disclosure sair. */
const TIPOS_NIVEL_BOCA = new Set<TipoRegistroOdontograma>(['profilaxia', 'clareamento', 'fluor', 'exame_periodontal']);

const TETO_SUGESTOES = 8;

export interface SugestaoLocal {
  /** Tipo estrutural (sempre resolvido pro caminho de tipo). Item de catálogo → `null`. */
  tipo: TipoRegistroOdontograma | null;
  /** Nome comercial quando o casamento veio do catálogo — pede o tipo clínico em seguida. */
  catalogo: MeuDiaCatalogoProcedimento | null;
  /** Dentes extraídos do MESMO texto. Vazio = precisa de clique no odontograma (ou é nível boca). */
  dentes: number[];
  /** Rótulo pronto pro chip mostrar — não é o texto inteiro. */
  trecho: string;
}

// Marcas de combinação Unicode (U+0300–U+036F), o que sobra de "ç"/"ã" depois do
// normalize('NFD'). Montado por code point via `String.fromCodePoint`, não colado como
// regex literal no fonte — combining marks coladas em texto viram bytes invisíveis e
// frágeis de revisar (e de fato quebraram 2x ao digitar isto).
const INICIO_MARCAS = 0x0300;
const FIM_MARCAS = 0x036f;
const MARCAS_DIACRITICAS = new RegExp(
  `[${String.fromCodePoint(INICIO_MARCAS)}-${String.fromCodePoint(FIM_MARCAS)}]`,
  'g',
);

/** Sem acento e sem caixa — "extracao" tem que achar "Extração" (família de bug do R-44). */
function normalizar(s: string): string {
  return s.normalize('NFD').replace(MARCAS_DIACRITICAS, '').toLowerCase();
}

/** Generaliza o antigo `extrairDenteDoTexto` (singular) pra multi-dente — "restauração 35 e
 *  36" precisa dos dois. Único parser de número de dente do projeto; não duplicar.
 *
 *  `(?<!\d)\d{2}(?!\d)` — 2 dígitos ISOLADOS, não um trecho de número maior. Sem os
 *  lookarounds, "Z350" (nome comercial real de resina — Filtek Z350) casava "35" e virava
 *  dente fantasma (achado pelo teste do catálogo, não por inspeção). O código antigo
 *  (`extrairDenteDoTexto`, buscava só na caixa de busca curta) tinha o mesmo regex cru — o
 *  campo mágico varre um texto livre bem maior, onde hora/idade/código colidem mais. */
export function extrairDentesDoTexto(texto: string): number[] {
  const vistos = new Set<number>();
  const dentes: number[] = [];
  for (const n of texto.match(/(?<!\d)\d{2}(?!\d)/g) ?? []) {
    const d = Number(n);
    if (DENTES_VALIDOS.has(d) && !vistos.has(d)) {
      vistos.add(d);
      dentes.push(d);
    }
  }
  return dentes;
}

export function casarProcedimentoLocal(
  texto: string,
  catalogo: MeuDiaCatalogoProcedimento[],
): SugestaoLocal[] {
  const norm = normalizar(texto);
  if (!norm.trim()) return [];

  const dentes = extrairDentesDoTexto(texto);
  const sugestoes: SugestaoLocal[] = [];

  // Tipo estrutural antes de catálogo (regra 4 da spec) — a ordem de inserção já garante isso.
  for (const [tipo, label] of Object.entries(TIPO_LABEL) as [TipoRegistroOdontograma, string][]) {
    if (!norm.includes(normalizar(label))) continue;
    const nivelBoca = TIPOS_NIVEL_BOCA.has(tipo);
    sugestoes.push({
      tipo,
      catalogo: null,
      dentes: nivelBoca ? [] : dentes,
      trecho: !nivelBoca && dentes.length > 0 ? `${label} – dente ${dentes.join(', ')}` : label,
    });
  }

  for (const item of catalogo) {
    if (!norm.includes(normalizar(item.nome))) continue;
    sugestoes.push({
      tipo: null,
      catalogo: item,
      dentes,
      trecho: dentes.length > 0 ? `${item.nome} – dente ${dentes.join(', ')}` : item.nome,
    });
  }

  return sugestoes.slice(0, TETO_SUGESTOES);
}
