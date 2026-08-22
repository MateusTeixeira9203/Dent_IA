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

/** Estado inicial de uma manutenção — fonte única (voz e entrada manual R-05 reusam). */
export const ORTO_VAZIO: OrtoManutencaoDetalhe = {
  arcada: 'superior',
  registro_superior: null,
  registro_inferior: null,
  observacao_geral: null,
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

const temDadosExtraidos = (v: OrtoManutencaoDetalhe): boolean => [
  v.fio, v.ativacao, v.elastico_corrente, v.elastico_intermaxilar,
  v.fio_inferior, v.ativacao_inferior, v.elastico_corrente_inferior, v.elastico_intermaxilar_inferior,
].some((campo) => campo != null);

function DadosExtraidos({ valor }: { valor: OrtoManutencaoDetalhe }) {
  const linhas = [
    ['Arco / fio', valor.fio],
    ['Ativação', valor.ativacao],
    ['Elástico corrente', valor.elastico_corrente],
    ['Intermaxilar', valor.elastico_intermaxilar],
  ].filter(([, dado]) => dado != null);

  if (!temDadosExtraidos(valor)) return null;

  return (
    <div className="rounded-lg border border-border bg-surface-alt/60 px-3 py-2.5">
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-text-secondary">Dados extraídos</p>
      <div className="flex flex-col gap-1 text-xs text-text-secondary">
        {linhas.map(([rotulo, dado]) => <p key={rotulo}><span className="font-semibold">{rotulo}:</span> {dado}</p>)}
      </div>
    </div>
  );
}

export function OrtoForm({ valor, onChange, readOnly }: PluginFormProps<OrtoManutencaoDetalhe>) {
  const v = valor ?? ORTO_VAZIO;
  const set = (patch: Partial<OrtoManutencaoDetalhe>) => onChange({ ...v, ...patch });

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor="orto-superior">Arcada superior</label>
          <textarea id="orto-superior" rows={4} className={inputCls} placeholder="Ex.: troca de fio 0.018 aço, ativação leve" disabled={readOnly}
            value={v.registro_superior ?? ''} onChange={(e) => set({ registro_superior: limpar(e.target.value) })} />
        </div>
        <div>
          <label className={labelCls} htmlFor="orto-inferior">Arcada inferior</label>
          <textarea id="orto-inferior" rows={4} className={inputCls} placeholder="Ex.: troca de ligaduras; elástico Classe II" disabled={readOnly}
            value={v.registro_inferior ?? ''} onChange={(e) => set({ registro_inferior: limpar(e.target.value) })} />
        </div>
      </div>
      <div>
        <label className={labelCls} htmlFor="orto-observacao">Observações gerais <span className="normal-case font-medium tracking-normal">(opcional)</span></label>
        <textarea id="orto-observacao" rows={2} className={inputCls} placeholder="Ex.: paciente orientado sobre higiene e uso do elástico" disabled={readOnly}
          value={v.observacao_geral ?? ''} onChange={(e) => set({ observacao_geral: limpar(e.target.value) })} />
      </div>
      <DadosExtraidos valor={v} />
    </div>
  );
}
