/**
 * R-58 — extraído de FichasTab.tsx (`eventosParaCards`, R-02 Fase 1/2) pra ser reusado pelo
 * histórico do Meu dia, que precisa do mesmo agrupamento §11 sem o resto da ficha rápida.
 * Behavior-preserving: mesma lógica, mesmo comportamento — só muda de casa e vira genérica
 * sobre T (mesmo padrão de `agruparRegistros`) em vez de amarrada ao `EventoView` local.
 */
import { agruparRegistros, type RegistroAgrupavel } from './agrupar-registros.ts';
import type { RegistroCardData } from '@/components/fichas/registro-card';
import type { OrigemRegistro, MomentoPlanejado } from '@/types/odontograma';

/** Shape mínimo pra virar card — cada chamador adapta seu tipo real pra este. */
export interface EventoParaCard extends RegistroAgrupavel {
  origem: OrigemRegistro;
  /** R-101 — ver corDoRegistro. Default 'sessao_atual'. */
  momentoPlanejado: MomentoPlanejado;
  observacao: string | null;
  detalhe: unknown | null;
  realizadoEm: string | null;
  registradoEm: string;
  assinaturaId: string | null;
  encaminhadoPara: { id: string; nome: string } | null;
  revisar_status?: boolean;
}

/**
 * Agrupa eventos em cards §11 (camada 2): eventos com o MESMO grupo_id viram UM card
 * multi-dente ("Exodontia · dentes 31–41"); os isolados, um card cada. `autorNome`/`autorCro`
 * são um por chamada (um autor por ficha) — não por evento.
 */
export function eventosParaCards<T extends EventoParaCard>(
  eventos: T[], autorNome: string, autorCro: string | null,
): Array<{ key: string; ids: string[]; data: RegistroCardData }> {
  return agruparRegistros(eventos).map(({ itens }) => {
    const primeiro = itens[0];
    return {
      key: primeiro.id,
      ids: itens.map((e) => e.id),
      data: {
        tipo: primeiro.tipo,
        status: primeiro.status,
        origem: primeiro.origem,
        momentoPlanejado: primeiro.momentoPlanejado,
        ancoras: itens.map((e) => e.ancora),
        observacao: primeiro.observacao,
        detalhe: primeiro.detalhe,
        realizadoEm: primeiro.realizadoEm,
        registradoEm: primeiro.registradoEm,
        autorNome,
        autorCro,
        assinada: primeiro.assinaturaId != null,
        encaminhadoPara: primeiro.encaminhadoPara,
        revisarStatus: itens.some((e) => e.revisar_status),
      },
    };
  });
}
