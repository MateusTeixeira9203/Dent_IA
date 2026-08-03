'use client';

// C1 — coluna direita, meio. Consome `jaFeito[]` (C0, novo): acumulado clínico inteiro, não
// só a última visita. Nasce fechado (§5.1 — só "a fazer" nasce aberto na direita).
//
// R-55 (03/08) — `jaFeito` virou GRUPO por âncora (`chave`), não evento solto: o servidor
// agrega ocorrências repetidas em vez de descartar (achado real: profilaxia/flúor/clareamento
// coincidiam sempre na mesma âncora e a 2ª ocorrência sumia). Corte deliberado aqui — "Já
// feito" está pra sair no C6 (layout novo), então esta tela recebe só o mínimo pra não quebrar
// e não perder dado: 1 linha por grupo, badge `n×` quando repete, badge de estado por
// `origem` real. Sub-lista de ocorrências, "+N" e observação ficam pro componente que vier
// substituir este (spec R-55 §4).

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
            {jaFeito.slice(0, RESUMO_MAX).map((g) => (
              <span key={g.chave} className="rounded-full border border-border bg-surface-alt px-2 py-1 text-[11px] text-text-secondary">
                {TIPO_LABEL[g.tipo]} {ondeLabel(g)}
                {g.ocorrencias.length > 1 && ` ${g.ocorrencias.length}×`}
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
          {jaFeito.map((g) => (
            <div key={g.chave} className="flex items-center justify-between gap-3 py-2 first:pt-0">
              <span className="truncate text-xs font-semibold text-text-primary">
                {TIPO_LABEL[g.tipo]}
                {g.ocorrencias.length > 1 && ` ${g.ocorrencias.length}×`}
              </span>
              <span className="shrink-0 font-mono text-[11px] text-text-secondary">
                {ondeLabel(g)} · {fmtData(g.ocorrencias[0].data)}
              </span>
              <span className="shrink-0 rounded border border-teal/35 bg-teal/12 px-2 py-0.5 text-[11px] font-semibold text-teal-ink">
                {g.origem === 'preexistente' ? 'pré-exist.' : 'feito'}
              </span>
            </div>
          ))}
        </div>
      )}
    </BlocoMoldavel>
  );
}
