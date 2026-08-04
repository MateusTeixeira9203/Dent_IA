'use client';

// Form manual da manutenção ortodôntica (Roadmap A — Fatia A0, peça 3 do plugin).
// DESIGN: plans/specs/DESIGN-ficha-a0.md §4. Caminho SEM IA — o dentista digita
// direto. Campo vazio = null (não string vazia), coerente com o schema Zod (§2.7).
//
// 04/08 (pedido dele, ao vivo) — 2 correções: (1) seletor de arcada trocou de <select> nativo
// (cinza, "fora do sistema") por chips, mesmo padrão visual do toggle Status já usado no
// painel Registrar; (2) arcada "Ambas" mostra 2 conjuntos de campos (superior + inferior) —
// são procedimentos diferentes por arcada, 1 campo só não descrevia os dois.

import type { PluginFormProps } from '@/lib/especialidades/plugin';
import type { OrtoManutencaoDetalhe } from '@/lib/especialidades/orto';

const ARCADAS: ReadonlyArray<{ v: OrtoManutencaoDetalhe['arcada']; label: string }> = [
  { v: 'superior', label: 'Superior' },
  { v: 'inferior', label: 'Inferior' },
  { v: 'ambas', label: 'Ambas' },
];

/** Estado inicial de uma manutenção — fonte única (voz e entrada manual R-05 reusam). */
export const ORTO_VAZIO: OrtoManutencaoDetalhe = {
  arcada: 'superior',
  fio: null,
  ativacao: null,
  elastico_corrente: null,
  elastico_intermaxilar: null,
};

/** Texto do input → null quando vazio (o schema aceita null, não ''). */
const limpar = (s: string): string | null => (s.trim() === '' ? null : s);

const inputCls =
  'w-full bg-surface-alt border border-border rounded-lg px-3 py-2 text-sm text-text-primary ' +
  'outline-none focus:border-teal disabled:opacity-60';
const labelCls = 'block text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1.5';

/** 1 conjunto de 4 campos (fio/ativação/elásticos) — reusado 1× (arcada única) ou 2× (ambas). */
function GrupoCampos({
  prefixo, valores, onChange, readOnly,
}: {
  prefixo: string;
  valores: { fio: string | null; ativacao: string | null; elasticoCorrente: string | null; elasticoIntermaxilar: string | null };
  onChange: (patch: { fio?: string | null; ativacao?: string | null; elasticoCorrente?: string | null; elasticoIntermaxilar?: string | null }) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className={labelCls} htmlFor={`${prefixo}-fio`}>Arco / fio</label>
        <input id={`${prefixo}-fio`} className={inputCls} placeholder="ex: 0.018 aço" disabled={readOnly}
          value={valores.fio ?? ''} onChange={(e) => onChange({ fio: limpar(e.target.value) })} />
      </div>
      <div>
        <label className={labelCls} htmlFor={`${prefixo}-ativacao`}>Ativação</label>
        <input id={`${prefixo}-ativacao`} className={inputCls} placeholder="ex: ativado + troca de ligaduras" disabled={readOnly}
          value={valores.ativacao ?? ''} onChange={(e) => onChange({ ativacao: limpar(e.target.value) })} />
      </div>
      <div>
        <label className={labelCls} htmlFor={`${prefixo}-corrente`}>Elástico corrente</label>
        <input id={`${prefixo}-corrente`} className={inputCls} placeholder="ex: 13 → 23" disabled={readOnly}
          value={valores.elasticoCorrente ?? ''} onChange={(e) => onChange({ elasticoCorrente: limpar(e.target.value) })} />
      </div>
      <div>
        <label className={labelCls} htmlFor={`${prefixo}-intermaxilar`}>Elástico intermaxilar</label>
        <input id={`${prefixo}-intermaxilar`} className={inputCls} placeholder="ex: 3/16 Classe II, 13 → 46" disabled={readOnly}
          value={valores.elasticoIntermaxilar ?? ''} onChange={(e) => onChange({ elasticoIntermaxilar: limpar(e.target.value) })} />
      </div>
    </div>
  );
}

export function OrtoForm({ valor, onChange, readOnly }: PluginFormProps<OrtoManutencaoDetalhe>) {
  const v = valor ?? ORTO_VAZIO;
  const set = (patch: Partial<OrtoManutencaoDetalhe>) => onChange({ ...v, ...patch });

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className={labelCls}>Arcada</label>
        <div className="flex flex-wrap gap-1.5">
          {ARCADAS.map((a) => (
            <button
              key={a.v}
              type="button"
              disabled={readOnly}
              onClick={() => set({ arcada: a.v })}
              className={`rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors disabled:opacity-60 ${
                v.arcada === a.v
                  ? 'border-teal bg-teal/10 text-teal'
                  : 'border-border bg-surface-alt text-text-secondary hover:border-teal/40'
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {v.arcada === 'ambas' ? (
        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-teal-ink">Superior</p>
            <GrupoCampos
              prefixo="orto-sup"
              readOnly={readOnly}
              valores={{ fio: v.fio, ativacao: v.ativacao, elasticoCorrente: v.elastico_corrente, elasticoIntermaxilar: v.elastico_intermaxilar }}
              onChange={(patch) => set({
                fio: patch.fio !== undefined ? patch.fio : v.fio,
                ativacao: patch.ativacao !== undefined ? patch.ativacao : v.ativacao,
                elastico_corrente: patch.elasticoCorrente !== undefined ? patch.elasticoCorrente : v.elastico_corrente,
                elastico_intermaxilar: patch.elasticoIntermaxilar !== undefined ? patch.elasticoIntermaxilar : v.elastico_intermaxilar,
              })}
            />
          </div>
          <div className="border-t border-border pt-4">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-teal-ink">Inferior</p>
            <GrupoCampos
              prefixo="orto-inf"
              readOnly={readOnly}
              valores={{
                fio: v.fio_inferior ?? null,
                ativacao: v.ativacao_inferior ?? null,
                elasticoCorrente: v.elastico_corrente_inferior ?? null,
                elasticoIntermaxilar: v.elastico_intermaxilar_inferior ?? null,
              }}
              onChange={(patch) => set({
                fio_inferior: patch.fio !== undefined ? patch.fio : v.fio_inferior,
                ativacao_inferior: patch.ativacao !== undefined ? patch.ativacao : v.ativacao_inferior,
                elastico_corrente_inferior: patch.elasticoCorrente !== undefined ? patch.elasticoCorrente : v.elastico_corrente_inferior,
                elastico_intermaxilar_inferior: patch.elasticoIntermaxilar !== undefined ? patch.elasticoIntermaxilar : v.elastico_intermaxilar_inferior,
              })}
            />
          </div>
        </div>
      ) : (
        <GrupoCampos
          prefixo="orto"
          readOnly={readOnly}
          valores={{ fio: v.fio, ativacao: v.ativacao, elasticoCorrente: v.elastico_corrente, elasticoIntermaxilar: v.elastico_intermaxilar }}
          onChange={(patch) => set({
            fio: patch.fio !== undefined ? patch.fio : v.fio,
            ativacao: patch.ativacao !== undefined ? patch.ativacao : v.ativacao,
            elastico_corrente: patch.elasticoCorrente !== undefined ? patch.elasticoCorrente : v.elastico_corrente,
            elastico_intermaxilar: patch.elasticoIntermaxilar !== undefined ? patch.elasticoIntermaxilar : v.elastico_intermaxilar,
          })}
        />
      )}
    </div>
  );
}
