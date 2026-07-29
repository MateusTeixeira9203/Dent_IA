'use client';

// Card de leitura do rastreio PSR/CPITN (R-08b).
// Spec: plans/specs/R-08b-rastreio-psr.md
//
// Mesmo layout de boca do form (S1 S2 S3 / S6 S5 S4), readOnly, mais a conclusão determinística.
// Só é montado quando há dado (I2 do contrato de plugins) — o chamador usa safeParse.

import type { PluginCardProps } from '@/lib/especialidades/plugin';
import {
  SEXTANTES, concluirPSR, textoConclusao, corDoCodigo, sextantesComAsterisco,
  type PsrDetalhe, type SextanteId,
} from '@/lib/especialidades/perio';

const LINHA_SUPERIOR: SextanteId[] = ['s1', 's2', 's3'];
const LINHA_INFERIOR: SextanteId[] = ['s6', 's5', 's4'];

export function PsrCard({ valor }: PluginCardProps<PsrDetalhe>) {
  const conclusao = concluirPSR(valor);
  const comAsterisco = sextantesComAsterisco(valor);

  const Celula = ({ id }: { id: SextanteId }) => {
    const meta = SEXTANTES.find((s) => s.id === id)!;
    const s = valor.psr[id];
    const cor = s.codigo !== null && !s.ausente ? corDoCodigo(s.codigo) : null;
    const texto = s.ausente ? 'X' : s.codigo === null ? '—' : String(s.codigo);

    return (
      <div
        className="relative flex flex-col items-center justify-center gap-0.5 rounded-lg border py-1.5"
        title={`${meta.descricao} (${meta.dentes})`}
        style={{
          background: cor
            ? `color-mix(in srgb, var(--color-${cor}) 14%, var(--color-surface-alt))`
            : 'var(--color-surface-alt)',
          color: cor ? `var(--color-${cor}-ink)` : 'var(--color-text-muted)',
          borderColor: cor
            ? `color-mix(in srgb, var(--color-${cor}) 40%, var(--color-border))`
            : 'var(--color-border)',
        }}
      >
        <span className="text-[8px] font-bold uppercase tracking-wider opacity-70">{meta.label}</span>
        <span className="font-mono tabular-nums text-sm font-bold leading-none">{texto}</span>
        {s.asterisco && (
          <span className="absolute top-0.5 right-1 text-[10px] font-bold text-coral-ink leading-none">*</span>
        )}
      </div>
    );
  };

  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-teal-ink mb-2">
        Rastreio periodontal (PSR)
      </p>

      <div className="max-w-[240px]">
        <div className="grid grid-cols-3 gap-1">
          {LINHA_SUPERIOR.map((id) => <Celula key={id} id={id} />)}
        </div>
        <div className="h-px bg-border my-1" />
        <div className="grid grid-cols-3 gap-1">
          {LINHA_INFERIOR.map((id) => <Celula key={id} id={id} />)}
        </div>
      </div>

      <p className="mt-2 text-xs text-text-primary leading-snug">{textoConclusao(conclusao)}</p>

      {comAsterisco.length > 0 && (
        <p className="mt-1 text-[11px] text-text-secondary">
          <span className="font-bold text-coral-ink">*</span> achado adicional em{' '}
          {comAsterisco.map((id) => SEXTANTES.find((s) => s.id === id)?.label ?? id).join(', ')}
          {' '}— furca, mobilidade, mucogengival ou recessão ≥3,5mm.
        </p>
      )}
    </div>
  );
}
