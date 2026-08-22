// src/lib/especialidades/endo.ts
//
// Plugin de Endodontia (Roadmap A — migration 106).
// Spec: plans/specs/spec-106-detalhe-especialidade.md §5.1.
//
// A tabela de odontometria (canal por canal) é o `detalhe` do evento tipo='endodontia'
// (persistencia: 'evento-detalhe', coluna `odontograma_eventos.detalhe` jsonb — migration
// 106). Campo não ditado fica null, nunca inferido (invariante I5).

import { z } from 'zod';
import { Type, type Schema } from '@google/genai';
import type { EspecialidadePlugin } from './plugin';
import type { ExtractorRequest, ExtractorResult } from './plugin';
import { EndoForm } from '@/components/fichas/endo-form';
import { EndoCard } from '@/components/fichas/endo-card';
import { generateStructuredGemini } from '@/lib/ai/provider';

export const canalSchema = z.object({
  nome:            z.string().trim().max(24),               // "MV", "DV", "P", "Único" — vazio ok (R-01)
  referencia:       z.string().trim().max(40).nullable(),
  comprimentoRaiz:  z.number().min(0).max(40).nullable(),    // mm
  limaInicial:      z.string().trim().max(8).nullable(),     // "#15" — troca do CT (22/07)
  limaFinal:        z.string().trim().max(8).nullable(),     // "#35"
});
export type CanalDetalhe = z.infer<typeof canalSchema>;

export const endoDetalheSchema = z.object({
  canais:    z.array(canalSchema).min(1).max(6),
  obturacao: z.string().trim().max(60).nullable(),  // "condensação lateral"
  cimento:   z.string().trim().max(60).nullable(),  // "AH Plus"
});
export type EndoDetalhe = z.infer<typeof endoDetalheSchema>;

/** Sinal (nível 1 de densidade) — "3 canais". Nunca digitado, sempre derivado. */
export function sinalEndo(v: EndoDetalhe): string {
  return `${v.canais.length} canal${v.canais.length > 1 ? 'is' : ''}`;
}

const ENDO_EXTRACAO_SCHEMA: Schema = {
  type: Type.OBJECT,
  required: ['itens'],
  properties: {
    itens: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ['dente', 'canais', 'obturacao', 'cimento'],
        properties: {
          dente: { type: Type.INTEGER },
          canais: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              required: ['nome', 'referencia', 'comprimentoRaiz', 'limaInicial', 'limaFinal'],
              properties: {
                nome: { type: Type.STRING },
                referencia: { type: Type.STRING, nullable: true },
                comprimentoRaiz: { type: Type.NUMBER, nullable: true },
                limaInicial: { type: Type.STRING, nullable: true },
                limaFinal: { type: Type.STRING, nullable: true },
              },
            },
          },
          obturacao: { type: Type.STRING, nullable: true },
          cimento: { type: Type.STRING, nullable: true },
        },
      },
    },
  },
};

type EndoWire = { itens: Array<{ dente: number; canais: unknown[]; obturacao: string | null; cimento: string | null }> };

/** Passo complementar do R-49. A IA só devolve campos explicitamente narrados; o cliente
 * preserva valores já existentes antes de aplicar esta resposta. */
async function extrairEndoComIA(input: ExtractorRequest): Promise<ExtractorResult<EndoDetalhe>> {
  const { data } = await generateStructuredGemini<EndoWire>({
    feature: 'endo-extracao',
    responseSchema: ENDO_EXTRACAO_SCHEMA,
    prompt: `Extraia apenas os detalhes endodônticos explicitamente ditos no relato.\n\nRelato: "${input.texto}"\n\nDentes elegíveis: ${input.contexto.dentes.join(', ')}\n\nRegras duras:\n- Só retorne dente da lista elegível.\n- Não invente canal, medida, lima, referência, obturação ou cimento. Campo não mencionado = null; não use 0.\n- Comprimento só é válido entre 8 e 30 mm em passos de 0,5. Número inválido ou ambíguo fica null.\n- Cada item precisa ter ao menos um canal com nome explícito; se não houver, omita o item inteiro.\n- Preserve abreviações brasileiras: MV, MV2, DV, ML, DL, MB, DB, P, V, L, Único.\n- Responda somente no schema solicitado.`,
  });

  const itens = data.itens.flatMap((item) => {
    if (!input.contexto.dentes.includes(item.dente)) return [];
    const parsed = endoDetalheSchema.safeParse({
      canais: item.canais,
      obturacao: item.obturacao,
      cimento: item.cimento,
    });
    return parsed.success ? [{ dente: item.dente, detalhe: parsed.data }] : [];
  });

  return itens.length > 0
    ? { ok: true, especialidade: 'endodontia', itens }
    : { ok: false, motivo: 'nada-extraido' };
}

export const endoPlugin: EspecialidadePlugin<EndoDetalhe> = {
  id: 'endodontia',
  label: 'Endodontia',
  tiposEvento: ['endodontia', 'lesao_periapical'],
  persistencia: { forma: 'evento-detalhe' },
  detalheSchema: endoDetalheSchema,
  extractor: { modo: 'ia', extrair: extrairEndoComIA },
  Form: EndoForm,
  Card: EndoCard,
  render: { pinta: true, camadas: ['raiz', 'selo'] },
};
