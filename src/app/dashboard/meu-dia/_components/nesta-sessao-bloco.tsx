'use client';

// R-78 F1 (08/08) — "Nesta ficha" vira o mesmo card-fonte da ficha salva (`RegistroCard`,
// R-02 I1: "o mesmo componente desenha criação E leitura"), em vez do `ToothGroupList`
// só-leitura que F0 usou como placeholder. Pill de status clicável, observação editável
// inline, detalhe de especialidade colapsável — tudo já pronto no `RegistroCard`
// (`editavel`), só faltava alguém no Meu dia chamar com os handlers certos. Mesmo padrão
// que `FichasTab.tsx` já usa pro rascunho dela (`draftsParaCards`/`renderCardDraft`) — aqui
// reusa `eventosParaCards` (a versão genérica e exportada, R-58) com o adaptador inline em
// vez de duplicar uma função idêntica só pra este card.
//
// `onDenteClick` SAIU: o gesto de abrir o perfil do dente agora é só tocar o dente no
// espelho (F2) — a lista não tem mais motivo pra abrir o mesmo painel por um caminho
// paralelo.
//
// R-78 (achado dele 08/08, testando ao vivo) — tabela de especialidade (endo/implante)
// NÃO expande mais inline aqui: essa coluna (~832px, mas o card em si é bem mais estreito
// que isso) espreme demais uma ficha endodôntica de verdade (mesmo problema §1.4/§1.5 da
// spec, agora concreto). O card com detalhe vira `onAbrirGrande` — ⤢ leva pro perfil do
// dente (`ToothDetailPanel`, mais largo, já testado como o editor de faces/chips) com a
// tabela já expandida, em vez de `children` (que só sobra pros cards sem detalhe — hoje
// nenhum, mas o mecanismo do RegistroCard continua aí pra quem precisar).

import type { OdontogramaEventoDraft } from '@/types/odontograma';
import { RegistroCard } from '@/components/fichas/registro-card';
import { eventosParaCards, type EventoParaCard } from '@/lib/odontograma/eventos-para-cards';
import { hojeBRT } from '@/lib/hora-brt';

export interface NestaSessaoBlocoProps {
  vazio: string;
  eventosDraft: OdontogramaEventoDraft[];
  onEventosDraftChange: (eventos: OdontogramaEventoDraft[]) => void;
  /** R-78 — ⤢ num card com tabela de especialidade chama isto em vez de expandir aqui. */
  onAbrirDenteGrande: (dente: number, eventoId: string) => void;
}

/** `OdontogramaEventoDraft` é snake_case (`grupo_id`/`realizado_em`) — `EventoParaCard` não
 *  é. Mesmo adaptador que `historico-bloco.tsx`/`corpo-especialidade` já fazem pros seus
 *  tipos; `registradoEm` usa "agora" porque o rascunho ainda não foi salvo (mesma lógica
 *  de `draftsParaCards` no FichasTab). */
function paraCard(e: OdontogramaEventoDraft): EventoParaCard {
  return {
    id: e.id,
    grupoId: e.grupo_id,
    tipo: e.tipo,
    status: e.status,
    ancora: e.ancora,
    origem: e.origem,
    observacao: e.observacao,
    detalhe: e.detalhe,
    realizadoEm: e.realizado_em,
    registradoEm: new Date().toISOString(),
    assinaturaId: e.assinaturaId ?? null,
    encaminhadoPara: null,
  };
}

const TEM_DETALHE = new Set(['endodontia', 'implante', 'exame_periodontal']);

export function NestaSessaoBloco({ vazio, eventosDraft, onEventosDraftChange, onAbrirDenteGrande }: NestaSessaoBlocoProps) {
  function toggleStatus(ids: string[]) {
    onEventosDraftChange(eventosDraft.map((e) => (ids.includes(e.id)
      ? { ...e, status: e.status === 'realizado' ? 'indicado' : 'realizado' }
      : e)));
  }
  function updateObservacao(ids: string[], observacao: string) {
    onEventosDraftChange(eventosDraft.map((e) => (ids.includes(e.id) ? { ...e, observacao } : e)));
  }
  function remover(ids: string[]) {
    onEventosDraftChange(eventosDraft.filter((e) => !ids.includes(e.id)));
  }
  /** "no alto fluxo o normal é ter feito tudo que ditou" (artefato) — 1 toque em vez de N. */
  function marcarTudoFeito() {
    onEventosDraftChange(eventosDraft.map((e) => (e.status === 'realizado' ? e : {
      ...e, status: 'realizado', origem: 'clinica', realizado_em: e.realizado_em ?? hojeBRT(),
    })));
  }

  if (eventosDraft.length === 0) {
    return <p className="text-sm text-text-secondary">{vazio}</p>;
  }

  const cards = eventosParaCards(eventosDraft.map(paraCard), 'Você', null);
  const temIndicado = eventosDraft.some((e) => e.status === 'indicado');

  return (
    <div className="flex flex-col gap-2">
      {temIndicado && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={marcarTudoFeito}
            className="rounded-lg px-2 py-1 text-[11px] font-bold text-teal-ink transition-colors hover:bg-teal-pale"
          >
            ✓ tudo feito
          </button>
        </div>
      )}
      <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">
        {cards.map(({ key, ids, data }) => {
          // Só registro de UM evento tem "o" dente e "a" tabela pra abrir — grupo
          // multi-dente (ponte etc.) não tem um perfil único pra ir (mesma regra de
          // FichasTab.tsx, renderCardDraft).
          const dente = ids.length === 1 ? data.ancoras[0]?.dente : undefined;
          const temDetalhe = dente != null && TEM_DETALHE.has(data.tipo);
          return (
            <RegistroCard
              key={key}
              data={data}
              editavel
              onToggleStatus={() => toggleStatus(ids)}
              onObservacaoChange={(v) => updateObservacao(ids, v)}
              onRemover={() => remover(ids)}
              onAbrirGrande={temDetalhe ? () => onAbrirDenteGrande(dente, ids[0]) : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}
