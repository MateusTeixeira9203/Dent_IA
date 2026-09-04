// src/lib/especialidades/orto.ts
//
// Plugin de Ortodontia (Roadmap A — Fatia A0).
// Spec: plans/specs/spec-a0-fundacao-plugins-especialidade.md §2.7.
//
// Orto é o 1º plugin: prova o contrato SEM IA nova. Manutenção é registro de
// ARCADA, não de dente — não pinta o odontograma (render.pinta=false) e persiste
// como coluna JSONB em `fichas` (não como evento). O `detalheSchema` e a `detecta`
// entram já na A0 (a detecção precisa deles); Form/Card completos ficam pra Fase 3.

import { z } from 'zod';
import type { EspecialidadePlugin } from './plugin';
import { OrtoCard } from '@/components/fichas/orto-card';
import { OrtoForm } from '@/components/fichas/orto-form';
import { normalizarBitolaEmRegistroOrto } from './normalizar-bitola-orto';

/** Espelha OrtoManutencaoInfo (src/types/odontograma.ts §1.5). Contrato de forma na escrita e no form manual. */
export const ortoManutencaoSchema = z.object({
  arcada: z.enum(['superior', 'inferior', 'ambas']),
  registro_superior: z.string().trim().min(1).nullable().optional(),
  registro_inferior: z.string().trim().min(1).nullable().optional(),
  observacao_geral: z.string().trim().min(1).nullable().optional(),
  fio: z.string().trim().min(1).nullable(),
  ativacao: z.string().trim().min(1).nullable(),
  elastico_corrente: z.string().trim().min(1).nullable(),
  elastico_intermaxilar: z.string().trim().min(1).nullable(),
  // 04/08 — só usados com arcada 'ambas' (form manual). Opcionais: IA/registro antigo não têm.
  fio_inferior: z.string().trim().min(1).nullable().optional(),
  ativacao_inferior: z.string().trim().min(1).nullable().optional(),
  elastico_corrente_inferior: z.string().trim().min(1).nullable().optional(),
  elastico_intermaxilar_inferior: z.string().trim().min(1).nullable().optional(),
});
export type OrtoManutencaoDetalhe = z.infer<typeof ortoManutencaoSchema>;

const textoOuNull = (valor: string | null | undefined): string | null => {
  const texto = valor?.trim() ?? '';
  return texto === '' ? null : texto;
};

/**
 * R-60 — evita uma manutenção vazia quando o dentista só abre o painel.
 * Também é a única regra que deriva a arcada no preenchimento livre.
 * O formato estruturado de voz/registros antigos segue válido e é preservado.
 */
export function normalizarOrtoManutencao(
  valor: OrtoManutencaoDetalhe | null,
): OrtoManutencaoDetalhe | null {
  if (!valor) return null;

  const registroSuperiorOriginal = textoOuNull(valor.registro_superior);
  const registroInferiorOriginal = textoOuNull(valor.registro_inferior);
  const registroSuperior = registroSuperiorOriginal ? normalizarBitolaEmRegistroOrto(registroSuperiorOriginal) : null;
  const registroInferior = registroInferiorOriginal ? normalizarBitolaEmRegistroOrto(registroInferiorOriginal) : null;
  const observacaoGeral = textoOuNull(valor.observacao_geral);
  const temRegistroLivre = registroSuperior != null || registroInferior != null;
  const temRegistroLegado = [
    valor.fio,
    valor.ativacao,
    valor.elastico_corrente,
    valor.elastico_intermaxilar,
    valor.fio_inferior,
    valor.ativacao_inferior,
    valor.elastico_corrente_inferior,
    valor.elastico_intermaxilar_inferior,
  ].some((campo) => textoOuNull(campo) != null);

  if (!temRegistroLivre && !temRegistroLegado) return null;

  return {
    ...valor,
    ...(temRegistroLivre && {
      arcada: registroSuperior && registroInferior
        ? 'ambas'
        : registroSuperior
          ? 'superior'
          : 'inferior',
    }),
    registro_superior: registroSuperior,
    registro_inferior: registroInferior,
    observacao_geral: observacaoGeral,
  };
}

export const ortoPlugin: EspecialidadePlugin<OrtoManutencaoDetalhe> = {
  id: 'ortodontia',
  label: 'Ortodontia',
  // Orto não emite evento de odontograma — a detecção é por sinal não-evento (detecta).
  tiposEvento: [],
  persistencia: { forma: 'ficha-coluna', coluna: 'orto_manutencao' },
  detalheSchema: ortoManutencaoSchema,
  // Sem IA nova: o pass 1 (formatar-evolucao) já extrai orto_manutencao. Nada a enriquecer no pass 2.
  extractor: null,
  Form: OrtoForm,
  Card: OrtoCard,
  render: { pinta: false },
  detecta: (evo) => evo.orto_manutencao != null,
};
