/**
 * R-02 Fase 3 (alicerce) — reduz eventos crus (de TODAS as fichas do paciente, não só
 * a consulta aberta agora) aos grupos que ainda têm trabalho pendente (algum evento
 * `indicado`). Só considera eventos COM `grupo_id` — um evento isolado não tem
 * "trabalho multi-consulta" pra continuar. Pura, sem IO — quem busca as linhas é
 * `buscarGruposAbertos` (src/server/patients/get-grupos-abertos.ts).
 */
import type { TipoRegistroOdontograma, StatusRegistro } from '@/types/odontograma';

export interface EventoGrupoAbertoRow {
  grupo_id: string | null;
  tipo: TipoRegistroOdontograma;
  dente: number | null;
  status: StatusRegistro;
  registrado_em: string;
}

export interface GrupoAberto {
  grupoId: string;
  tipo: TipoRegistroOdontograma;
  dentes: number[];
  /** `registrado_em` do evento mais antigo do grupo — "trabalho iniciado em". */
  iniciadoEm: string;
}

/** Agrupa por grupo_id e filtra pros que ainda têm QUALQUER evento indicado (I4 — mesmo critério do R-02 Fase 2, nunca um campo persistido). */
export function agregarGruposAbertos(rows: EventoGrupoAbertoRow[]): GrupoAberto[] {
  const porGrupo = new Map<string, { tipo: TipoRegistroOdontograma; dentes: Set<number>; aberto: boolean; datas: string[] }>();
  for (const row of rows) {
    if (!row.grupo_id) continue;
    const g = porGrupo.get(row.grupo_id) ?? { tipo: row.tipo, dentes: new Set<number>(), aberto: false, datas: [] };
    if (row.dente != null) g.dentes.add(row.dente);
    if (row.status === 'indicado') g.aberto = true;
    g.datas.push(row.registrado_em);
    porGrupo.set(row.grupo_id, g);
  }
  const abertos: GrupoAberto[] = [];
  for (const [grupoId, g] of porGrupo) {
    if (!g.aberto) continue;
    abertos.push({
      grupoId,
      tipo: g.tipo,
      dentes: [...g.dentes].sort((a, b) => a - b),
      iniciadoEm: [...g.datas].sort()[0],
    });
  }
  return abertos.sort((a, b) => a.iniciadoEm.localeCompare(b.iniciadoEm));
}
