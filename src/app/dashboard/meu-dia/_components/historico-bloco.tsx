'use client';

// C1 — coluna esquerda. Consome `visitas[]` (C0). Nasce aberto (§5.1). Mostra só a ÚLTIMA
// visita por padrão (decisão dele 03/08: "a última evolução é a mais importante") — sem
// corte de nota (get-meu-dia.ts não trunca mais em 160 chars, sobra espaço). "ver mais"
// expande pra lista inteira sem sair da aba (P1/P3), com rolagem interna como rede de
// segurança pra históricos longos.

import { useState } from 'react';
import { TIPO_LABEL } from '@/types/odontograma';
import type { MeuDiaVisita } from '@/server/dashboard/get-meu-dia';
import { BlocoMoldavel } from './bloco-moldavel';
import { fmtData, ondeLabel } from './meu-dia-format';

export interface HistoricoBlocoProps {
  visitas: MeuDiaVisita[];
  aberto: boolean;
  onToggle: () => void;
}

const PREVIA = 1;

export function HistoricoBloco({ visitas, aberto, onToggle }: HistoricoBlocoProps) {
  const [expandido, setExpandido] = useState(false);
  const ultima = visitas[0] ?? null;
  const temMais = visitas.length > PREVIA;
  const visiveis = expandido ? visitas : visitas.slice(0, PREVIA);

  return (
    <BlocoMoldavel
      id="historico"
      titulo="Histórico"
      contador={visitas.length}
      resumo={
        ultima ? (
          <span className="text-xs text-text-secondary">
            {fmtData(ultima.data)} · {ultima.dentistaNome}
          </span>
        ) : undefined
      }
      aberto={aberto}
      onToggle={onToggle}
    >
      {visitas.length === 0 ? (
        <p className="text-sm text-text-secondary">
          Sem histórico no sistema ainda — o contexto nasce nesta consulta.
        </p>
      ) : (
        <>
          <div
            className={
              expandido
                ? 'flex max-h-[420px] flex-col divide-y divide-border overflow-y-auto pr-2'
                : 'flex flex-col divide-y divide-border'
            }
          >
            {visiveis.map((v) => (
              <div key={v.fichaId} className="flex flex-col gap-0.5 py-2 first:pt-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] font-semibold text-text-primary">{fmtData(v.data)}</span>
                  <span className="text-[11px] text-text-secondary">{v.dentistaNome}</span>
                </div>
                {v.eventos.length > 0 ? (
                  <div className="flex flex-col">
                    {v.eventos.map((e) => (
                      <p key={e.id} className="text-xs text-text-primary">
                        {TIPO_LABEL[e.tipo]} <span className="font-mono text-text-secondary">{ondeLabel(e)}</span>
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-text-secondary">{v.resumo}</p>
                )}
                {v.nota && <p className="text-xs italic text-text-secondary">&ldquo;{v.nota}&rdquo;</p>}
              </div>
            ))}
          </div>
          {temMais && (
            <button
              type="button"
              onClick={() => setExpandido((e) => !e)}
              className="mt-1 w-full text-center text-[11px] font-semibold text-text-secondary hover:text-teal-ink"
            >
              {expandido ? 'mostrar menos ↑' : `ver as ${visitas.length} visitas aqui mesmo ↓`}
            </button>
          )}
        </>
      )}
    </BlocoMoldavel>
  );
}
