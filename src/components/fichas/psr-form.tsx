'use client';

// Form manual do rastreio PSR/CPITN (R-08b).
// Spec: plans/specs/R-08b-rastreio-psr.md · Contrato: plans/specs/R-08-contrato-clinico-perio.md
//
// 6 células no layout da boca (S1 S2 S3 / S6 S5 S4 — direito do paciente à esquerda de quem
// olha, convenção do odontograma). Toque CICLA o código, mesmo idioma dos chips de rotina que
// o dentista já usa; na prática a maioria dos sextantes é 0-2, então são 1-3 toques.
// O asterisco é toggle próprio — é ortogonal ao código, não entra no ciclo (I10).

import type { PluginFormProps } from '@/lib/especialidades/plugin';
import {
  SEXTANTES, PSR_VAZIO, concluirPSR, textoConclusao, corDoCodigo,
  type PsrDetalhe, type SextanteId, type SextantePSR, type CodigoPSR,
} from '@/lib/especialidades/perio';

/** Ordem de TELA (não a de leitura da boca): superior esq→dir, depois inferior. */
const LINHA_SUPERIOR: SextanteId[] = ['s1', 's2', 's3'];
const LINHA_INFERIOR: SextanteId[] = ['s6', 's5', 's4'];

/** vazio → 0 → 1 → 2 → 3 → 4 → X → vazio */
function proximoEstado(s: SextantePSR): SextantePSR {
  const resto = s.asterisco ? { asterisco: true } : {};
  if (s.ausente) return { codigo: null, ...resto };            // X → vazio
  if (s.codigo === null) return { codigo: 0, ...resto };
  if (s.codigo === 4) return { codigo: null, ausente: true, ...resto }; // 4 → X
  return { codigo: (s.codigo + 1) as CodigoPSR, ...resto };
}

function rotulo(s: SextantePSR): string {
  if (s.ausente) return 'X';
  return s.codigo === null ? '—' : String(s.codigo);
}

/** aria-label descritivo — o número sozinho não diz nada pra leitor de tela. */
function descricaoAcessivel(label: string, descricao: string, s: SextantePSR): string {
  const estado = s.ausente
    ? 'sextante edêntulo'
    : s.codigo === null
      ? 'não avaliado'
      : `código ${s.codigo}`;
  return `${label} — ${descricao}: ${estado}${s.asterisco ? ', com achado adicional' : ''}`;
}

export function PsrForm({ valor, onChange, readOnly }: PluginFormProps<PsrDetalhe>) {
  const v = valor ?? PSR_VAZIO;
  const conclusao = concluirPSR(v);

  const set = (id: SextanteId, next: SextantePSR) =>
    onChange({ psr: { ...v.psr, [id]: next } });

  const Celula = ({ id }: { id: SextanteId }) => {
    const meta = SEXTANTES.find((s) => s.id === id)!;
    const s = v.psr[id];
    const cor = s.codigo !== null && !s.ausente ? corDoCodigo(s.codigo) : null;

    return (
      <div className="relative">
        <button
          type="button"
          disabled={readOnly}
          onClick={() => set(id, proximoEstado(s))}
          aria-label={descricaoAcessivel(meta.label, meta.descricao, s)}
          title={`${meta.descricao} (${meta.dentes})`}
          className="w-full flex flex-col items-center justify-center gap-0.5 rounded-xl border py-2.5 transition-all active:scale-95 outline-none focus-visible:ring-1 focus-visible:ring-teal disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            background: cor
              ? `color-mix(in srgb, var(--color-${cor}) 16%, var(--color-surface-alt))`
              : 'var(--color-surface-alt)',
            color: cor ? `var(--color-${cor}-ink)` : 'var(--color-text-secondary)',
            borderColor: cor
              ? `color-mix(in srgb, var(--color-${cor}) 45%, var(--color-border))`
              : 'var(--color-border)',
          }}
        >
          <span className="text-[9px] font-bold uppercase tracking-wider opacity-70">{meta.label}</span>
          <span className="font-mono tabular-nums text-lg font-bold leading-none">{rotulo(s)}</span>
        </button>
        <button
          type="button"
          disabled={readOnly}
          onClick={() => set(id, { ...s, asterisco: s.asterisco ? undefined : true })}
          aria-label={`${meta.label}: achado adicional (furca, mobilidade, mucogengival ou recessão ≥3,5mm)`}
          title="Achado adicional: furca, mobilidade, mucogengival ou recessão ≥3,5mm"
          className={`absolute top-1 right-1 w-5 h-5 rounded-md text-xs font-bold leading-none transition-colors outline-none focus-visible:ring-1 focus-visible:ring-teal disabled:opacity-60 ${
            s.asterisco
              ? 'bg-coral/20 text-coral-ink'
              : 'text-text-muted hover:text-text-secondary hover:bg-surface'
          }`}
        >
          *
        </button>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1.5">
          Rastreio periodontal (PSR)
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {LINHA_SUPERIOR.map((id) => <Celula key={id} id={id} />)}
        </div>
        <div className="h-px bg-border my-1.5" />
        <div className="grid grid-cols-3 gap-1.5">
          {LINHA_INFERIOR.map((id) => <Celula key={id} id={id} />)}
        </div>
      </div>

      <p className="text-[10px] text-text-muted leading-relaxed">
        Toque cicla <span className="font-mono">0→4</span>, depois <span className="font-mono">X</span> (sem dentes)
        e volta a vazio. <span className="font-bold">*</span> = furca, mobilidade, mucogengival ou recessão ≥3,5mm.
        Registre o <span className="font-semibold">maior código</span> de cada sextante.
      </p>

      {conclusao.tipo !== 'sem_avaliacao' && (
        <div
          className="rounded-xl border px-3 py-2"
          style={{
            background: 'color-mix(in srgb, var(--color-teal) 6%, var(--color-surface-alt))',
            borderColor: 'color-mix(in srgb, var(--color-teal) 25%, var(--color-border))',
          }}
        >
          <p className="text-[9px] font-bold uppercase tracking-wider text-text-secondary mb-0.5">
            Conduta indicada
          </p>
          <p className="text-xs text-text-primary leading-snug">{textoConclusao(conclusao)}</p>
        </div>
      )}
    </div>
  );
}
