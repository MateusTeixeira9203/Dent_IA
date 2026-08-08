'use client';

// R-78 F2 — o que abre ao tocar um dente no espelho (§3.2 da spec: "leitura rápida
// primeiro, registrar é ação explícita depois"). NÃO é o editor de faces/chips
// (`ToothDetailPanel`) — é uma linha do tempo: o que já existe nesse dente (hoje + antes),
// com aviso de grupo aberto quando há tratamento em andamento. "+ registrar neste dente"
// é quem abre o editor de verdade — reusa o `ToothDetailPanel` que já existe, não recria
// nada (achado do Mateus 08/08: o F0 estava abrindo o editor direto, artefato manda
// histórico primeiro).

import { AlertCircle } from 'lucide-react';
import { corDoRegistro, TIPO_LABEL, type OdontogramaEventoDraft } from '@/types/odontograma';
import { TOOTH_NAMES, getQuadrantLabel } from '@/components/odontograma/Odontograma';
import type { GrupoAberto } from '@/lib/odontograma/grupos-abertos';
import type { MeuDiaVisita, MeuDiaEventoVisita } from '@/server/dashboard/get-meu-dia';
import { fmtData } from './meu-dia-format';

const COR_TOKEN = { coral: 'var(--color-coral)', teal: 'var(--color-teal)', slate: 'var(--color-slate)' } as const;

interface Linha {
  data: string;
  tipo: string;
  antes: boolean;
  cor: 'coral' | 'teal' | 'slate';
}

/** "Restauração (O)" — mesmo formato de `ondeLabel`, só a parte da face. */
function comFace(label: string, faces: readonly string[] | undefined): string {
  return faces && faces.length > 0 ? `${label} (${faces.join(',')})` : label;
}

/** Linhas de hoje — o rascunho não-salvo desta sessão, sempre no topo. */
function linhasHoje(dente: number, eventosDraft: OdontogramaEventoDraft[]): Linha[] {
  return eventosDraft
    .filter((e) => e.ancora.dente === dente)
    .map((e) => ({
      data: 'hoje',
      tipo: comFace(TIPO_LABEL[e.tipo], e.ancora.faces),
      antes: false,
      cor: corDoRegistro(e.status, e.origem),
    }));
}

/** Linhas de antes — todo o histórico do paciente (`visitas`, já vem mais-recente-primeiro),
 *  filtrado pra este dente. União de `eventos` + `feitosAqui` deduplicada por id: não sei ao
 *  certo se os dois podem repetir o mesmo evento (visitas migradas por "fazer hoje →"), e
 *  perder um registro clínico é pior que mostrar 1 a mais por engano — dedup por id garante
 *  que nunca duplica, venha de onde vier. */
function linhasAntes(dente: number, visitas: MeuDiaVisita[]): Linha[] {
  const porId = new Map<string, Linha>();
  for (const v of visitas) {
    const candidatos: MeuDiaEventoVisita[] = [...v.eventos, ...v.feitosAqui];
    for (const e of candidatos) {
      if (e.dente !== dente) continue;
      const data = e.status === 'realizado' && e.realizadoEm ? e.realizadoEm : v.data;
      porId.set(e.id, {
        data: fmtData(data),
        tipo: comFace(TIPO_LABEL[e.tipo], e.faces),
        antes: true,
        cor: corDoRegistro(e.status, e.origem),
      });
    }
  }
  // `visitas` já chega mais-recente-primeiro (mesma premissa do HistoricoBloco) — Map
  // preserva ordem de inserção, então a lista final já sai ordenada.
  return [...porId.values()];
}

export interface DenteHistoricoCardProps {
  dente: number;
  eventosDraft: OdontogramaEventoDraft[];
  visitas: MeuDiaVisita[];
  gruposAbertos: GrupoAberto[];
  onFechar: () => void;
  onRegistrar: () => void;
}

export function DenteHistoricoCard({ dente, eventosDraft, visitas, gruposAbertos, onFechar, onRegistrar }: DenteHistoricoCardProps) {
  const linhas = [...linhasHoje(dente, eventosDraft), ...linhasAntes(dente, visitas)];
  const grupoAberto = gruposAbertos.find((g) => g.dentes.includes(dente));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[15px] font-bold text-text-primary">{dente}</span>
        <span className="text-[12px] font-semibold text-text-secondary">{TOOTH_NAMES[dente] ?? ''}</span>
        <span className="text-[10px] text-text-muted">{getQuadrantLabel(dente)}</span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onFechar}
          className="rounded-lg px-2 py-1 text-[11px] font-semibold text-text-secondary transition-colors hover:bg-surface-alt hover:text-text-primary"
        >
          ✕ voltar à boca
        </button>
      </div>

      {grupoAberto && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning-pale px-3 py-2">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning-ink" aria-hidden />
          <p className="text-[11px] text-warning-ink">
            {TIPO_LABEL[grupoAberto.tipo]} iniciado em {fmtData(grupoAberto.iniciadoEm)} — este dente tem tratamento em andamento.{' '}
            <button type="button" onClick={onRegistrar} className="font-bold underline underline-offset-2">
              continuar aqui
            </button>
          </p>
        </div>
      )}

      {linhas.length === 0 ? (
        <p className="text-sm text-text-secondary">Nenhum registro neste dente ainda.</p>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {linhas.map((l, i) => (
            <div key={i} className="flex items-center gap-2 py-2 first:pt-0">
              <span className="w-2 h-2 shrink-0 rounded-full" style={{ background: COR_TOKEN[l.cor] }} aria-hidden />
              <span className="w-20 shrink-0 whitespace-nowrap font-mono text-[11px] text-text-secondary">{l.data}</span>
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-text-primary">{l.tipo}</span>
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                  l.antes
                    ? 'border-border text-text-secondary'
                    : 'border-teal/40 bg-teal/10 text-teal-ink'
                }`}
              >
                {l.antes ? 'antes' : 'nesta ficha'}
              </span>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onRegistrar}
        className="w-full rounded-lg border border-border py-2 text-[12px] font-semibold text-text-secondary transition-colors hover:border-teal/40 hover:text-teal-ink"
      >
        + registrar neste dente
      </button>
    </div>
  );
}
