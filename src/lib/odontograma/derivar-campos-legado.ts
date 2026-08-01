/**
 * Deriva os campos legados (`dentes_afetados` / `dentes_observacoes` / `procedimentos`) a
 * partir dos EVENTOS do odontograma. Extraído de FichasTab.tsx (R-46b2, spec §4/A1) pra ser
 * reusado pelo Meu dia, que não tem formulário manual nenhum pra alimentar esses campos.
 *
 * Por que existe: no design definitivo (21/07) o seletor manual de dentes deixou de existir —
 * quem lança à mão passa pelo perfil do dente, que produz **evento**, não seleção. Sem esta
 * derivação, orçamento, PDF e progresso (que leem os campos v2) ficariam vazios numa ficha
 * lançada só por evento.
 */
import { TIPO_LABEL, type OdontogramaEventoDraft } from '@/types/odontograma';

export function derivarV2DosEventos(eventos: OdontogramaEventoDraft[]): {
  dentes: number[];
  observacoes: Record<string, string>;
  procedimentos: string[];
} {
  const porDente = new Map<number, string[]>();
  const procedimentos: string[] = [];
  for (const ev of eventos) {
    // R-10: sem " - planejado" — o status é jargão redundante (vive em procedimentos_status) e
    // poluía o orçamento/PDF que o paciente lê.
    const rotulo = TIPO_LABEL[ev.tipo];
    const linha = ev.observacao ? `${rotulo} (${ev.observacao})` : rotulo;
    const d = ev.ancora.dente;
    if (d != null) {
      const arr = porDente.get(d);
      if (arr) arr.push(linha); else porDente.set(d, [linha]);
    }
    if (!procedimentos.includes(rotulo)) procedimentos.push(rotulo);
  }
  return {
    dentes: [...porDente.keys()],
    observacoes: Object.fromEntries([...porDente].map(([d, ls]) => [String(d), ls.join('\n')])),
    procedimentos,
  };
}
