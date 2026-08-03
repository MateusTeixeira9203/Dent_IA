'use client';

// C1 — coluna direita, meio. Consome `jaFeito[]` (C0, novo): acumulado clínico inteiro, não
// só a última visita. Nasce fechado (§5.1 — só "a fazer" nasce aberto na direita).

import { TIPO_LABEL } from '@/types/odontograma';
import type { MeuDiaEventoFeito } from '@/server/dashboard/get-meu-dia';
import { BlocoMoldavel } from './bloco-moldavel';
import { fmtData, ondeLabel } from './meu-dia-format';

export interface JaFeitoBlocoProps {
  jaFeito: MeuDiaEventoFeito[];
  aberto: boolean;
  onToggle: () => void;
}

const RESUMO_MAX = 3;

export function JaFeitoBloco({ jaFeito, aberto, onToggle }: JaFeitoBlocoProps) {
  const excedente = jaFeito.length - RESUMO_MAX;

  return (
    <BlocoMoldavel
      id="ja-feito"
      titulo="Já feito"
      contador={jaFeito.length}
      resumo={
        jaFeito.length > 0 ? (
          <>
            {jaFeito.slice(0, RESUMO_MAX).map((e) => (
              <span key={e.id} className="rounded-full border border-border bg-surface-alt px-2 py-1 text-[11px] text-text-secondary">
                {TIPO_LABEL[e.tipo]} {ondeLabel(e)}
              </span>
            ))}
            {excedente > 0 && (
              <span className="rounded-full border border-border bg-surface-alt px-2 py-1 text-[11px] text-text-secondary">
                +{excedente}
              </span>
            )}
          </>
        ) : undefined
      }
      aberto={aberto}
      onToggle={onToggle}
    >
      {jaFeito.length === 0 ? (
        <p className="text-sm text-text-secondary">Nenhum procedimento realizado registrado ainda.</p>
      ) : (
        <div className="flex max-h-[420px] flex-col divide-y divide-border overflow-y-auto pr-2">
          {jaFeito.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-3 py-2 first:pt-0">
              <span className="truncate text-xs font-semibold text-text-primary">{TIPO_LABEL[e.tipo]}</span>
              <span className="shrink-0 font-mono text-[11px] text-text-secondary">
                {ondeLabel(e)} · {fmtData(e.registradoEm)}
              </span>
              <span className="shrink-0 rounded border border-teal/35 bg-teal/12 px-2 py-0.5 text-[11px] font-semibold text-teal-ink">
                feito
              </span>
            </div>
          ))}
        </div>
      )}
    </BlocoMoldavel>
  );
}
