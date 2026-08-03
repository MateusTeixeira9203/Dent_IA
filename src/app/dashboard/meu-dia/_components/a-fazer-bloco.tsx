'use client';

// C1 — coluna direita, topo. Migra a leitura de pendências de contexto-coluna.tsx (SAI) e
// ganha o "fazer hoje →" que antes vivia solto como pílulas dentro do RegistrarPainel — o
// artefato v2 não mostra essa duplicata no centro, só aqui (§0 do contrato: centro vira só
// entrada). Nasce aberto (§5.1 — "direita → aFazer").
//
// Decisão dele (03/08): mostra as 5 mais ANTIGAS por padrão — são as que estão apodrecendo
// na fila, não as últimas. "ver todas" expande com rolagem interna como rede de segurança.

import { useState } from 'react';
import { TIPO_LABEL, type OdontogramaEventoDraft } from '@/types/odontograma';
import type { MeuDiaPendencia } from '@/server/dashboard/get-meu-dia';
import { BlocoMoldavel } from './bloco-moldavel';
import { fmtData, ondeLabel } from './meu-dia-format';

export interface AFazerBlocoProps {
  pendencias: MeuDiaPendencia[];
  /** Pra desabilitar "fazer hoje" na pendência que já virou rascunho nesta sessão. */
  eventosDraft: OdontogramaEventoDraft[];
  onFazerHoje: (p: MeuDiaPendencia) => void;
  aberto: boolean;
  onToggle: () => void;
}

const PREVIA = 5;

function PendenciaLinha({
  p, jaFeito, onFazerHoje,
}: {
  p: MeuDiaPendencia;
  jaFeito: boolean;
  onFazerHoje: (p: MeuDiaPendencia) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 first:pt-0">
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-text-primary">
          {TIPO_LABEL[p.tipo]} <span className="font-mono font-normal text-text-secondary">{ondeLabel(p)}</span>
        </p>
        <p className="text-[11px] font-mono text-text-secondary">
          desde {fmtData(p.registradoEm)} · {p.dentistaNome}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onFazerHoje(p)}
        disabled={jaFeito}
        className="shrink-0 whitespace-nowrap rounded border border-teal/35 bg-teal/12 px-2 py-2 text-[11px] font-bold text-teal-ink transition-opacity hover:opacity-80 disabled:opacity-40"
      >
        {jaFeito ? '✓ feito hoje' : 'fazer hoje →'}
      </button>
    </div>
  );
}

export function AFazerBloco({ pendencias, eventosDraft, onFazerHoje, aberto, onToggle }: AFazerBlocoProps) {
  const [expandido, setExpandido] = useState(false);

  // Mais antiga primeiro — `registradoEm` é 'YYYY-MM-DD', ordena como string sem parse.
  const ordenadas = [...pendencias].sort((a, b) => (a.registradoEm < b.registradoEm ? -1 : 1));
  const temMais = ordenadas.length > PREVIA;
  const visiveis = expandido ? ordenadas : ordenadas.slice(0, PREVIA);

  return (
    <BlocoMoldavel
      id="a-fazer"
      titulo="A fazer"
      contador={pendencias.length}
      resumo={
        pendencias.length > 0 ? (
          <span className="text-xs text-text-secondary">{pendencias.length} pendência{pendencias.length > 1 ? 's' : ''}</span>
        ) : undefined
      }
      aberto={aberto}
      onToggle={onToggle}
    >
      {pendencias.length === 0 ? (
        <p className="text-sm text-text-secondary">Nada pendente pra este paciente.</p>
      ) : (
        <>
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
                onFazerHoje={onFazerHoje}
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
      )}
    </BlocoMoldavel>
  );
}
