'use client';

import { useEffect, useMemo, useState } from 'react';
import { addDays, addWeeks, endOfWeek, format, startOfWeek, subWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { buscarDisponibilidadeSemana } from '@/server/agenda/buscar-disponibilidade';
import { formatHora, slotEstaLivre, type DisponibilidadeDia } from '@/lib/agenda/disponibilidade';

interface RetornoMobileAgendaProps {
  dentistaId: string | null;
  duracaoMin: number;
  selecionado: { data: string; minutoDoDia: number } | null;
  onSelecionar: (data: string, minutoDoDia: number) => void;
  onInvalidarSelecao?: () => void;
}

function hojeISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

function diaTemHorarioLivre(dia: DisponibilidadeDia, duracaoMin: number): boolean {
  const agora = new Date();
  return dia.livres.some((bloco) => {
    for (let minuto = bloco.inicioMin; minuto + duracaoMin <= bloco.fimMin; minuto += dia.intervaloMinutos) {
      if (slotEstaLivre(minuto, duracaoMin, dia, agora)) return true;
    }
    return false;
  });
}

const DIA_LABEL_MOBILE: Record<number, string> = {
  1: 'Seg',
  2: 'Ter',
  3: 'Qua',
  4: 'Qui',
  5: 'Sex',
  6: 'Sáb',
};

export function RetornoMobileAgenda({
  dentistaId,
  duracaoMin,
  selecionado,
  onSelecionar,
  onInvalidarSelecao,
}: RetornoMobileAgendaProps) {
  const [semanaInicio, setSemanaInicio] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [dias, setDias] = useState<DisponibilidadeDia[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [diaAberto, setDiaAberto] = useState<string | null>(null);
  const semanaInicioISO = format(semanaInicio, 'yyyy-MM-dd');
  const chave = `${dentistaId ?? 'sem-dentista'}:${semanaInicioISO}`;
  const [chaveCarregada, setChaveCarregada] = useState(chave);

  if (chaveCarregada !== chave) {
    setChaveCarregada(chave);
    setDias(null);
    setErro(null);
    setDiaAberto(null);
  }

  useEffect(() => {
    if (!dentistaId) return;
    let cancelado = false;
    buscarDisponibilidadeSemana(dentistaId, semanaInicioISO)
      .then((resultado) => { if (!cancelado) setDias(resultado); })
      .catch(() => { if (!cancelado) setErro('Não foi possível carregar a agenda.'); });
    return () => { cancelado = true; };
  }, [dentistaId, semanaInicioISO]);

  // A API continua retornando domingo–sábado para manter o contrato compartilhado com
  // a grade desktop. No mobile, domingo não entra na faixa: seis cartões de 44px cabem
  // inteiros na viewport e a semana de trabalho fica legível sem rolagem horizontal.
  const diasSemana = useMemo(
    () => (dias ?? []).filter((dia) => dia.diaSemana !== 0),
    [dias],
  );
  const diaAtivo = diasSemana.find((dia) => dia.data === diaAberto)
    ?? diasSemana.find((dia) => dia.data === selecionado?.data)
    ?? diasSemana.find((dia) => dia.data === hojeISO() && diaTemHorarioLivre(dia, duracaoMin))
    ?? diasSemana.find((dia) => diaTemHorarioLivre(dia, duracaoMin))
    ?? diasSemana.find((dia) => dia.data === hojeISO())
    ?? diasSemana[0]
    ?? null;
  const slots = useMemo(() => {
    if (!diaAtivo) return [];
    const agora = new Date();
    return diaAtivo.livres.flatMap((bloco) => {
      const opcoes: number[] = [];
      for (let minuto = bloco.inicioMin; minuto + duracaoMin <= bloco.fimMin; minuto += diaAtivo.intervaloMinutos) {
        if (slotEstaLivre(minuto, duracaoMin, diaAtivo, agora)) opcoes.push(minuto);
      }
      return opcoes;
    });
  }, [diaAtivo, duracaoMin]);

  useEffect(() => {
    if (!selecionado || selecionado.data !== diaAtivo?.data) return;
    if (!slots.includes(selecionado.minutoDoDia)) onInvalidarSelecao?.();
  }, [diaAtivo?.data, onInvalidarSelecao, selecionado, slots]);

  if (!dentistaId) {
    return <p className="rounded-xl border border-border bg-surface-alt/50 px-3 py-4 text-center text-sm text-text-secondary">Selecione o dentista para ver a agenda.</p>;
  }

  return (
    <div className="space-y-3 md:hidden">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label="Semana anterior"
          onClick={() => setSemanaInicio(startOfWeek(subWeeks(semanaInicio, 1), { weekStartsOn: 0 }))}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border text-text-secondary hover:bg-surface-alt"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="min-w-0 truncate text-center text-xs font-semibold text-text-primary">
          {format(addDays(semanaInicio, 1), 'd MMM', { locale: ptBR })} – {format(endOfWeek(semanaInicio, { weekStartsOn: 0 }), 'd MMM', { locale: ptBR })}
        </p>
        <button
          type="button"
          aria-label="Próxima semana"
          onClick={() => setSemanaInicio(startOfWeek(addWeeks(semanaInicio, 1), { weekStartsOn: 0 }))}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border text-text-secondary hover:bg-surface-alt"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {erro ? (
        <p className="rounded-xl bg-coral-pale px-3 py-2 text-sm text-coral-ink">{erro}</p>
      ) : !dias ? (
        <div className="flex h-20 items-center justify-center rounded-xl border border-border bg-surface-alt/40"><Loader2 className="h-5 w-5 animate-spin text-text-secondary" /></div>
      ) : diasSemana.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface-alt/50 px-3 py-4 text-center text-sm text-text-secondary">Sem expediente de segunda a sábado.</p>
      ) : (
        <>
          <div className="grid grid-cols-6 gap-2">
            {diasSemana.map((dia) => {
              const ativo = dia.data === diaAtivo?.data;
              const semExpediente = dia.livres.length === 0;
              return (
                <button
                  key={dia.data}
                  type="button"
                  onClick={() => setDiaAberto(dia.data)}
                  aria-pressed={ativo}
                  className={`min-h-[52px] min-w-0 rounded-xl border px-1 py-1.5 text-center transition-colors ${
                    ativo ? 'border-teal bg-teal/10 text-teal-ink' : semExpediente ? 'border-border bg-surface-alt/30 text-text-secondary/60' : 'border-border bg-surface-alt/50 text-text-secondary hover:border-teal/40'
                  }`}
                >
                  <span className="block text-[10px] font-bold uppercase tracking-normal">{DIA_LABEL_MOBILE[dia.diaSemana]}</span>
                  <span className="mt-0.5 block text-base font-bold leading-none">{format(new Date(`${dia.data}T12:00:00`), 'd')}</span>
                </button>
              );
            })}
          </div>
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-teal-ink">Horários livres</p>
            {slots.length === 0 ? (
              <p className="rounded-xl border border-border bg-surface-alt/50 px-3 py-4 text-center text-sm text-text-secondary">{diaAtivo?.livres.length ? 'Nenhum horário livre neste dia.' : 'Sem expediente neste dia.'}</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {slots.map((minuto) => {
                  const ativo = selecionado?.data === diaAtivo?.data && selecionado.minutoDoDia === minuto;
                  return (
                    <button
                      key={minuto}
                      type="button"
                      onClick={() => onSelecionar(diaAtivo!.data, minuto)}
                      className={`min-h-11 rounded-xl border font-mono text-sm font-semibold transition-colors ${
                        ativo ? 'border-teal bg-teal-dark text-white' : 'border-border bg-surface-alt/50 text-text-primary hover:border-teal/40 hover:text-teal-ink'
                      }`}
                    >
                      {formatHora(minuto)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
