'use client';

// C1 — coluna direita, topo. Migra a leitura de pendências de contexto-coluna.tsx (SAI) e
// ganha o "fazer hoje →" que antes vivia solto como pílulas dentro do RegistrarPainel — o
// artefato v2 não mostra essa duplicata no centro, só aqui (§0 do contrato: centro vira só
// entrada). Nasce aberto (§5.1 — "direita → aFazer").
//
// Decisão dele (03/08): mostra as 5 mais ANTIGAS por padrão — são as que estão apodrecendo
// na fila, não as últimas. "ver todas" expande com rolagem interna como rede de segurança.

import { useState } from 'react';
import { Check, Forward } from 'lucide-react';
import { TIPO_LABEL, type OdontogramaEventoDraft } from '@/types/odontograma';
import type { MeuDiaPendencia } from '@/server/dashboard/get-meu-dia';
import { fmtData, ondeLabel } from './meu-dia-format';

export interface AFazerBlocoProps {
  /** R-63 F2 — já filtrada pelo pai ("responsável = eu", `responsavelPassaFiltro`/X1): o
   *  mesmo array alimenta esta lista E o contador da aba, nunca duas leituras da regra. */
  pendencias: MeuDiaPendencia[];
  /** Pra desabilitar "fazer hoje" na pendência que já virou rascunho nesta sessão. */
  eventosDraft: OdontogramaEventoDraft[];
  onFazerHoje: (p: MeuDiaPendencia) => void;
  /** R-52 — conclui pendência encaminhada A MIM. Caminho de escrita separado (RPC 109):
   *  o evento é de outro autor, não passa pelo rascunho. */
  onConcluirRecebida: (p: MeuDiaPendencia) => void;
  /** Id da pendência recebida sendo concluída agora (trava o botão durante a escrita). */
  concluindoId: string | null;
  /** R-52 — quem sou eu. Define o que é "minha" e o que é "recebida". */
  meuDentistaId: string;
  /** R-52 — modo seleção pra encaminhar em lote (barra fica em `meu-dia-client`). */
  modoEncaminhar: boolean;
  selecionados: Set<string>;
  onToggleModoEncaminhar: () => void;
  onToggleSelecao: (id: string) => void;
}

const PREVIA = 5;

function PendenciaLinha({
  p, jaFeito, recebida, ocupada, onFazerHoje, onConcluirRecebida,
  modoEncaminhar, selecionado, onToggleSelecao,
}: {
  p: MeuDiaPendencia;
  jaFeito: boolean;
  /** R-52 — encaminhada PRA mim: o evento é de outro autor, tem caminho de escrita próprio. */
  recebida: boolean;
  ocupada: boolean;
  onFazerHoje: (p: MeuDiaPendencia) => void;
  onConcluirRecebida: (p: MeuDiaPendencia) => void;
  modoEncaminhar: boolean;
  selecionado: boolean;
  onToggleSelecao: (id: string) => void;
}) {
  // R-52 — só "minha, não encaminhada, sem rascunho ainda" pode entrar no lote:
  // `encaminharProcedimento` exige autoria (dentista_id = eu), então "recebida" nunca
  // qualifica — eu não sou o autor. `jaFeito` (já virou rascunho nesta sessão) fica de
  // fora pelo mesmo motivo que desabilita o botão normal: já está a caminho de ser feito.
  const encaminhavel = !recebida && !jaFeito;
  const textoLinha = (
    <div className="min-w-0 flex-1">
      <p className="truncate text-xs font-semibold text-text-primary">
        {p.procedimentoNome?.trim() || TIPO_LABEL[p.tipo]} <span className="font-mono font-normal text-text-secondary">{ondeLabel(p)}</span>
      </p>
      <p className="text-[11px] font-mono text-text-secondary">
        desde {fmtData(p.registradoEm)} · {p.dentistaNome}
        {/* R-51 — "em andamento" é DERIVADO (grupo com sessão já feita), nunca um 3º
            status no banco. Marcador de texto de propósito: coral/teal no odontograma já
            significam "a fazer"/"feito", e um 3º tom aqui competiria com essa gramática. */}
        {p.emAndamento && ' · em andamento'}
        {recebida && ' · encaminhado pra você'}
      </p>
    </div>
  );

  if (modoEncaminhar) {
    // Igual ao modo seleção do FichasTab (R-04 Fase 3): quem não é elegível pro lote
    // apaga e fica inerte — não dá pra selecionar por engano o que não pode ser encaminhado.
    if (!encaminhavel) {
      return (
        <div className="flex items-center gap-3 py-2 opacity-40 first:pt-0">{textoLinha}</div>
      );
    }
    return (
      <div
        role="checkbox"
        aria-checked={selecionado}
        tabIndex={0}
        onClick={() => onToggleSelecao(p.id)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleSelecao(p.id); } }}
        className="flex cursor-pointer items-center gap-3 py-2 outline-none first:pt-0 focus-visible:ring-1 focus-visible:ring-teal"
      >
        <span
          aria-hidden
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
            selecionado ? 'border-teal bg-teal' : 'border-border bg-surface-alt'
          }`}
        >
          {selecionado && <Check className="h-3.5 w-3.5 text-white" />}
        </span>
        {textoLinha}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 py-2 first:pt-0">
      {textoLinha}
      {/* R-52 — DOIS botões diferentes de propósito, porque são duas escritas diferentes:
          · minha        → entra no rascunho e grava junto com o "Salvar" da visita
          · recebida     → fecha AGORA pela RPC 109 (escrita estreita do destino), sem
                           passar pelo rascunho: o evento é de outro autor e o upsert do
                           rascunho seria barrado pela RLS — em silêncio.
          O rótulo muda junto pra não prometer o mesmo gesto duas vezes. */}
      <button
        type="button"
        onClick={() => (recebida ? onConcluirRecebida(p) : onFazerHoje(p))}
        disabled={jaFeito || ocupada}
        className="shrink-0 whitespace-nowrap rounded border border-teal/35 bg-teal/12 px-2 py-2 text-[11px] font-bold text-teal-ink transition-opacity hover:opacity-80 disabled:opacity-40"
      >
        {jaFeito ? '✓ feito hoje' : recebida ? 'concluir →' : 'fazer hoje →'}
      </button>
    </div>
  );
}

export function AFazerBloco({
  pendencias, eventosDraft, onFazerHoje, onConcluirRecebida, concluindoId,
  meuDentistaId, modoEncaminhar, selecionados, onToggleModoEncaminhar, onToggleSelecao,
}: AFazerBlocoProps) {
  const [expandido, setExpandido] = useState(false);

  // Mais antiga primeiro — `registradoEm` é 'YYYY-MM-DD', ordena como string sem parse.
  const ordenadas = [...pendencias].sort((a, b) => (a.registradoEm < b.registradoEm ? -1 : 1));
  const temMais = ordenadas.length > PREVIA;
  const visiveis = expandido ? ordenadas : ordenadas.slice(0, PREVIA);

  // R-52 — só "minha, não encaminhada" tem autoria pra entrar no lote (mesmo critério de
  // `encaminhavel` em PendenciaLinha, calculado aqui só pra decidir se o gatilho aparece).
  const temEncaminhavel = pendencias.some(
    (p) => p.dentistaId === meuDentistaId && !eventosDraft.some((e) => e.id === p.id),
  );

  return pendencias.length === 0 ? (
    <p className="text-sm text-text-secondary">Nada pendente pra este paciente.</p>
  ) : (
    <>
      {(modoEncaminhar || temEncaminhavel) && (
        <div className="mb-1.5 flex justify-end">
          <button
            type="button"
            onClick={onToggleModoEncaminhar}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-text-secondary hover:text-teal-ink"
          >
            {modoEncaminhar ? (
              'cancelar'
            ) : (
              <>
                <Forward className="h-3 w-3" /> encaminhar
              </>
            )}
          </button>
        </div>
      )}
      <div
        className={
          expandido
            ? 'flex max-h-[420px] flex-col divide-y divide-border overflow-y-auto pr-2'
            : 'flex flex-col divide-y divide-border'
        }
      >
        {visiveis.map((p) => (
          <PendenciaLinha
            key={p.id}
            p={p}
            jaFeito={eventosDraft.some((e) => e.id === p.id)}
            recebida={p.encaminhadoParaId === meuDentistaId}
            ocupada={concluindoId === p.id}
            onFazerHoje={onFazerHoje}
            onConcluirRecebida={onConcluirRecebida}
            modoEncaminhar={modoEncaminhar}
            selecionado={selecionados.has(p.id)}
            onToggleSelecao={onToggleSelecao}
          />
        ))}
      </div>
      {temMais && (
        <button
          type="button"
          onClick={() => setExpandido((e) => !e)}
          className="mt-1 w-full text-center text-[11px] font-semibold text-text-secondary hover:text-teal-ink"
        >
          {expandido ? 'mostrar menos ↑' : `ver todas as ${ordenadas.length} →`}
        </button>
      )}
    </>
  );
}
