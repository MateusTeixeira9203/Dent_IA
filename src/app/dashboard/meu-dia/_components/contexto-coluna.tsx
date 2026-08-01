'use client';

// R-46a — coluna do contexto: o antes, só leitura. Zero escrita nova aqui — R-46b é quem
// constrói o registro dentro do Meu dia (hoje, agir a partir daqui leva pro perfil via "Ver
// perfil completo", único link da coluna). Estado vazio (nem ficha, nem pendência, nem
// orto) é neutro de propósito: cobre tanto "histórico mora no Word" quanto "paciente novo
// de verdade" — distinguir os dois com uma ação real (colar do Word) é o R-46c.
// R-46g (D9) — alertas (alergia etc.) sempre aparecem, mesmo com contexto clínico vazio:
// é dado de cadastro do paciente, não histórico de atendimento.

import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { TIPO_LABEL, type Arcada, type QuadranteFDI } from '@/types/odontograma';
import type { MeuDiaContexto } from '@/server/dashboard/get-meu-dia';

/** 'YYYY-MM-DD' → 'DD/MM/AAAA' sem `new Date()` — mesmo cuidado de fuso do resto da casa
 *  (registro-card.tsx tem o mesmo helper local; não há um util compartilhado pra isto). */
function fmtData(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function ondeLabel(p: { dente: number | null; arcada: Arcada | null; quadrante: QuadranteFDI | null }): string {
  if (p.dente != null) return `dente ${p.dente}`;
  if (p.arcada != null) return p.arcada === 'superior' ? 'arcada sup.' : 'arcada inf.';
  if (p.quadrante != null) return `Q${p.quadrante}`;
  return 'boca';
}

/** Ajuste 31/07 (feedback ao vivo + comparação com o artefato R-46-ficha-dia.html):
 *  título+onde compactos numa linha, meta opcional à direita — mesma forma pra pendência
 *  (meta = "desde ... · dentista") e evento da última visita (sem meta). */
function LinhaEvento({
  tipo, onde, meta,
}: {
  tipo: string;
  onde: string;
  meta?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-0.5">
      <span className="text-[12.5px] font-semibold text-text-primary">
        {tipo} <span className="font-mono font-normal text-text-secondary">{onde}</span>
      </span>
      {meta && (
        <span className="shrink-0 whitespace-nowrap text-[10.5px] text-text-secondary/80">{meta}</span>
      )}
    </div>
  );
}

export interface ContextoColunaProps {
  pacienteId: string;
  pacienteNome: string;
  contexto: MeuDiaContexto;
}

export function ContextoColuna({ pacienteId, pacienteNome, contexto }: ContextoColunaProps) {
  const { ultimaVisita, pendencias, orto, alertas } = contexto;
  // Verificação adversarial 31/07 — "sem histórico" ao lado de pendências reais é
  // contraditório (odontograma_eventos.ficha_id é nullable; um evento 'preexistente' pode
  // existir sem nenhuma ficha do paciente). Só é Estado C (primeira visita de verdade)
  // quando não há NADA — nem ficha, nem pendência, nem orto.
  const semNadaAinda = !ultimaVisita && pendencias.length === 0 && !orto;

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-text-primary">{pacienteNome}</h2>
        <Link
          href={`/dashboard/pacientes/${pacienteId}`}
          className="shrink-0 text-xs font-semibold text-text-secondary transition-colors hover:text-text-primary"
        >
          Ver perfil completo →
        </Link>
      </div>

      {alertas.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {alertas.map((alerta, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400"
            >
              <AlertCircle className="w-3 h-3 shrink-0" />
              {alerta}
            </span>
          ))}
        </div>
      )}

      {semNadaAinda ? (
        <p className="text-sm text-text-secondary">
          Sem histórico no sistema ainda — o contexto nasce nesta consulta.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {ultimaVisita && (
            <section>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                Última visita{' '}
                <span className="font-mono normal-case tracking-normal text-text-secondary/70">
                  · {fmtData(ultimaVisita.data)} · {ultimaVisita.dentistaNome}
                </span>
              </p>
              {ultimaVisita.eventos.length > 0 ? (
                <div className="flex flex-col">
                  {ultimaVisita.eventos.map((e) => (
                    <LinhaEvento key={e.id} tipo={TIPO_LABEL[e.tipo]} onde={ondeLabel(e)} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-secondary">{ultimaVisita.resumo}</p>
              )}
            </section>
          )}

          {pendencias.length > 0 && (
            <section>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                Pendências abertas
              </p>
              <div className="flex flex-col">
                {pendencias.map((p) => (
                  <LinhaEvento
                    key={p.id}
                    tipo={TIPO_LABEL[p.tipo]}
                    onde={ondeLabel(p)}
                    meta={`desde ${fmtData(p.registradoEm)} · ${p.dentistaNome}`}
                  />
                ))}
              </div>
            </section>
          )}

          {orto && (
            <section>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                Orto ativo
              </p>
              <p className="text-sm text-text-primary">
                {orto.valor.arcada === 'ambas'
                  ? 'Ambas as arcadas'
                  : orto.valor.arcada === 'superior'
                    ? 'Arcada superior'
                    : 'Arcada inferior'}
                {orto.valor.fio && <span className="font-mono text-xs text-text-secondary"> · {orto.valor.fio}</span>}
              </p>
              <p className="mt-0.5 text-xs text-text-secondary">
                desde {fmtData(orto.data)} · {orto.dentistaNome}
              </p>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
