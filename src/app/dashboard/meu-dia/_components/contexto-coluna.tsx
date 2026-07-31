'use client';

// R-46a — coluna do contexto: o antes, só leitura. "Registrar" continua levando pro
// fluxo atual do perfil (zero escrita nova aqui — R-46b é quem constrói o registro
// dentro do Meu dia). Estado vazio (nem ficha, nem pendência, nem orto) é neutro de
// propósito: cobre tanto "histórico mora no Word" quanto "paciente novo de verdade" —
// distinguir os dois com uma ação real (colar do Word) é o R-46c, que entra logo depois
// desta fatia.

import Link from 'next/link';
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

export interface ContextoColunaProps {
  pacienteId: string;
  pacienteNome: string;
  contexto: MeuDiaContexto;
}

export function ContextoColuna({ pacienteId, pacienteNome, contexto }: ContextoColunaProps) {
  const { ultimaVisita, pendencias, orto } = contexto;
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

      {semNadaAinda ? (
        <p className="text-sm text-text-secondary">
          Sem histórico no sistema ainda — o contexto nasce nesta consulta.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {ultimaVisita && (
            <section>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                Última visita
              </p>
              <div className="text-sm">
                <p className="text-text-primary">
                  <span className="font-mono text-xs text-text-secondary">{fmtData(ultimaVisita.data)}</span>
                  {' · '}
                  {ultimaVisita.dentistaNome}
                </p>
                <p className="mt-0.5 text-text-secondary">{ultimaVisita.resumo}</p>
              </div>
            </section>
          )}

          {pendencias.length > 0 && (
            <section>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                Pendências abertas
              </p>
              <div className="flex flex-col gap-1.5">
                {pendencias.map((p) => (
                  <div key={p.id} className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-text-primary">
                      {TIPO_LABEL[p.tipo]}{' '}
                      <span className="font-mono text-xs text-text-secondary">{ondeLabel(p)}</span>
                    </span>
                    <span className="shrink-0 whitespace-nowrap text-[11px] text-text-secondary">
                      desde {fmtData(p.registradoEm)} · {p.dentistaNome}
                    </span>
                  </div>
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
