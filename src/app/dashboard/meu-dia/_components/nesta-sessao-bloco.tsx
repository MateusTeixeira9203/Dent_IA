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
  /** R-84 §3/§4 — ids que JÁ EXISTIAM no banco antes desta sessão (boca, R-61). Card com
   *  qualquer id aqui é trabalho de ficha anterior sendo fechado hoje, não indicação nova
   *  desta ficha — ganha a legenda "de consulta anterior", mesmo card, mesma lista. */
  idsDeAntes: ReadonlySet<string>;
  /** R-108b (artefato bloco 7) — `eventoId → nome do tratamento`. A legenda genérica "de
   *  consulta anterior" vira "→ Reabilitação inf. direita": a pendência passa a dizer PRA ONDE
   *  ela volta, que é a pergunta que a tela deixa de fazer. Fica no fallback antigo quando o
   *  evento não tem tratamento resolvível (ficha só-texto). */
  nomeTratamentoPorEvento: Readonly<Record<string, string>>;
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
    momentoPlanejado: e.momento_planejado,
    observacao: e.observacao,
    detalhe: e.detalhe,
    realizadoEm: e.realizado_em,
    registradoEm: new Date().toISOString(),
    assinaturaId: e.assinaturaId ?? null,
    encaminhadoPara: null,
    revisar_status: e.revisar_status,
  };
}

const TEM_DETALHE = new Set(['endodontia', 'implante', 'exame_periodontal']);

export function NestaSessaoBloco({ vazio, eventosDraft, onEventosDraftChange, onAbrirDenteGrande, idsDeAntes, nomeTratamentoPorEvento }: NestaSessaoBlocoProps) {
  function toggleStatus(ids: string[]) {
    onEventosDraftChange(eventosDraft.map((e) => (ids.includes(e.id)
      ? {
          ...e,
          status: e.status === 'realizado' ? 'indicado' : 'realizado',
          revisar_status: false,
          realizado_em: e.status === 'realizado' ? null : (e.realizado_em ?? hojeBRT()),
          // R-101 — vira realizado aqui: reseta, senão viola a constraint no save (RPC).
          momento_planejado: e.status === 'realizado' ? e.momento_planejado : 'sessao_atual',
        }
      : e)));
  }
  /** R-101 — irmã de toggleStatus. Só é chamada com status='indicado' (RegistroCard já
   *  esconde o controle fora disso), então nunca precisa checar/resetar nada aqui. */
  function toggleMomento(ids: string[]) {
    onEventosDraftChange(eventosDraft.map((e) => (ids.includes(e.id)
      ? { ...e, momento_planejado: e.momento_planejado === 'proxima_sessao' ? 'sessao_atual' : 'proxima_sessao' }
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
      // R-101 — reseta momento_planejado junto (mesma razão do toggleStatus acima).
      ...e, status: 'realizado', origem: 'clinica', momento_planejado: 'sessao_atual', revisar_status: false,
      realizado_em: e.realizado_em ?? hojeBRT(),
    })));
  }
  function marcarTudoIndicado() {
    onEventosDraftChange(eventosDraft.map((e) => (e.status === 'indicado' ? { ...e, revisar_status: false } : {
      ...e, status: 'indicado', realizado_em: null, revisar_status: false,
    })));
  }

  if (eventosDraft.length === 0) {
    return <p className="text-sm text-text-secondary">{vazio}</p>;
  }

  const cards = eventosParaCards(eventosDraft.map(paraCard), 'Você', null);
  const temIndicado = eventosDraft.some((e) => e.status === 'indicado');
  const temRealizado = eventosDraft.some((e) => e.status === 'realizado');

  return (
    <div className="flex flex-col gap-2">
      {(temIndicado || temRealizado) && (
        <div className="flex justify-end gap-2">
          {temRealizado && (
            <button
              type="button"
              onClick={marcarTudoIndicado}
              className="rounded-lg px-2 py-1 text-[11px] font-bold text-coral-ink transition-colors hover:bg-coral-pale"
            >
              Tudo indicado
            </button>
          )}
          {temIndicado && (
          <button
            type="button"
            onClick={marcarTudoFeito}
            className="rounded-lg px-2 py-1 text-[11px] font-bold text-teal-ink transition-colors hover:bg-teal-pale"
          >
            ✓ tudo feito
          </button>
          )}
        </div>
      )}
      <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">
        {cards.map(({ key, ids, data }) => {
          // Só registro de UM evento tem "o" dente e "a" tabela pra abrir — grupo
          // multi-dente (ponte etc.) não tem um perfil único pra ir (mesma regra de
          // FichasTab.tsx, renderCardDraft).
          const dente = ids.length === 1 ? data.ancoras[0]?.dente : undefined;
          const temDetalhe = dente != null && TEM_DETALHE.has(data.tipo);
          // R-84 §4 — grupo misto (ex: ponte que ganhou elemento novo hoje) conta como "de
          // antes" pra marca visual: QUALQUER id do card já existia no banco.
          const deAntes = ids.some((id) => idsDeAntes.has(id));
          // Grupo (ponte etc.) nasce inteiro numa ficha só — o 1º id resolvido basta.
          const tratamento = deAntes
            ? ids.map((id) => nomeTratamentoPorEvento[id]).find(Boolean)
            : undefined;
          return (
            <div key={key} className="flex flex-col gap-0.5">
              <RegistroCard
                data={data}
                editavel
                onToggleStatus={() => toggleStatus(ids)}
                onToggleMomento={() => toggleMomento(ids)}
                onObservacaoChange={(v) => updateObservacao(ids, v)}
                onRemover={() => remover(ids)}
                onAbrirGrande={temDetalhe ? () => onAbrirDenteGrande(dente, ids[0]) : undefined}
              />
              {deAntes && (
                // Artefato bloco 7: DM Mono 11.5px, --tx3, 2px abaixo do card.
                <p className="mt-0.5 px-1 font-mono text-[11.5px] text-text-secondary">
                  {tratamento ? `→ ${tratamento}` : 'de consulta anterior'}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
