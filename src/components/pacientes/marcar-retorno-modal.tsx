'use client';

// R-64 — modal reescrito: a grade de horário real substitui os campos soltos de data/hora
// de antes (v1 do artefato, lista de pills, foi rejeitada ao vivo — "só trazer o que já
// temos no sistema, só que menor"). Movido de pacientes/[id]/_components/modals/ pra cá —
// mesmo padrão de colar-do-word-dialog.tsx (componente de paciente compartilhado entre
// pacientes/[id] e meu-dia).
//
// Layout em 2 colunas — mesmo padrão do "Novo agendamento" real (agendamentos-client.tsx):
// faixa ao vivo (resumo) no topo, corpo com a área principal à esquerda (aqui, a grade —
// lá, a busca de paciente) e uma coluna fixa de inputs à direita que NUNCA rola (pedido
// dele ao vivo, "mesmo estilo que estamos usando pra criar um agendamento").

import React from 'react';
import { Loader2, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatHora } from '@/lib/agenda/disponibilidade';
import type { DentistaRole } from '@/types/database';
import { RetornoSemanaGrid } from './retorno-semana-grid';

export interface MarcarRetornoForm {
  data: string | null;         // yyyy-MM-dd — null até escolher na grade
  minutoDoDia: number | null;
  duracao: string;             // minutos, mesmo campo de hoje
  observacoes: string;
}

interface MarcarRetornoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pacienteNome: string;
  role: DentistaRole;
  dentistasClinica: { id: string; nome: string }[];
  dentistaAlvoId: string | null;
  onDentistaAlvoChange: (id: string) => void;
  form: MarcarRetornoForm;
  setForm: React.Dispatch<React.SetStateAction<MarcarRetornoForm>>;
  error: string | null;
  saving: boolean;
  onMarcarRetorno: () => void;
}

/** "HH:mm" (valor de `<input type="time">`) → minuto do dia. `null` se incompleto —
 *  o próprio input não deixa sair do ar incompleto, mas o handler de onChange dispara
 *  a cada tecla. */
function minutoDoInputHora(valor: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(valor);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

// Mesmas opções de atalho do "Novo agendamento" real — chip é atalho, não limite; o
// campo livre abaixo cobre qualquer valor, os dois leem o mesmo estado.
const DURACAO_CHIPS = [
  { value: '30', label: '30min' },
  { value: '45', label: '45min' },
  { value: '60', label: '1h' },
  { value: '90', label: '1h30' },
  { value: '120', label: '2h' },
  { value: '180', label: '3h' },
];

export function MarcarRetornoModal({
  open,
  onOpenChange,
  pacienteNome,
  role,
  dentistasClinica,
  dentistaAlvoId,
  onDentistaAlvoChange,
  form,
  setForm,
  error,
  saving,
  onMarcarRetorno,
}: MarcarRetornoModalProps) {
  const duracaoMin = parseInt(form.duracao, 10) || 30;
  const precisaEscolherDentista = role === 'secretaria';
  const podeConfirmar = dentistaAlvoId != null && form.data != null && form.minutoDoDia != null;

  function fechar() {
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-lg sm:max-w-[1120px] rounded-2xl bg-surface border-border p-0 gap-0 overflow-hidden"
      >
        <DialogDescription className="sr-only">Agende o retorno de {pacienteNome}.</DialogDescription>

        {/* Cabeçalho */}
        <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
          <DialogTitle className="font-heading text-xl font-semibold leading-tight text-text-primary">
            Marcar retorno
          </DialogTitle>
          <button
            onClick={fechar}
            aria-label="Fechar"
            className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-surface-alt hover:text-text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Faixa ao vivo */}
        <div className="grid grid-cols-3 gap-px border-b border-border bg-border">
          <div className="min-w-0 bg-surface px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Paciente</p>
            <p className="mt-0.5 truncate text-sm font-medium text-text-primary">{pacienteNome}</p>
          </div>
          <div className="bg-surface px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Data</p>
            <p className="mt-0.5 font-mono text-sm font-semibold text-text-primary">
              {form.data ? format(parseISO(form.data), "EEE, dd/MM", { locale: ptBR }) : '—'}
            </p>
          </div>
          <div className="bg-surface px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Hora</p>
            <p className="mt-0.5 font-mono text-sm font-semibold text-text-primary">
              {form.minutoDoDia != null ? formatHora(form.minutoDoDia) : '—'}
            </p>
          </div>
        </div>

        {/* Corpo: 2 colunas — grade à esquerda, inputs fixos à direita */}
        <div className="flex flex-col sm:flex-row">
          <div className="min-w-0 flex-1 overflow-y-auto p-6" style={{ maxHeight: '58vh' }}>
            {precisaEscolherDentista && (
              <div className="mb-4 space-y-1">
                <Label className="text-xs text-text-secondary">Dentista responsável *</Label>
                <Select
                  value={dentistaAlvoId ?? undefined}
                  onValueChange={(id) => { if (id) onDentistaAlvoChange(id); }}
                >
                  <SelectTrigger className="rounded-xl bg-surface border-border text-text-primary">
                    <SelectValue placeholder="Selecione o dentista..." />
                  </SelectTrigger>
                  <SelectContent className="bg-surface border-border">
                    {dentistasClinica.map((dentista) => (
                      <SelectItem key={dentista.id} value={dentista.id}>{dentista.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <RetornoSemanaGrid
              dentistaId={dentistaAlvoId}
              duracaoMin={duracaoMin}
              selecionado={podeConfirmar ? { data: form.data!, minutoDoDia: form.minutoDoDia! } : null}
              onSelecionar={(data, minutoDoDia) => setForm((f) => ({ ...f, data, minutoDoDia }))}
            />
            {dentistaAlvoId != null && form.data == null && (
              <p className="mt-3 text-[11px] text-text-secondary">
                Clique um horário livre na semana acima — a data e a hora vêm do clique
                (dá pra ajustar a hora exata ao lado).
              </p>
            )}
          </div>

          {/* Coluna fixa: Hora + Duração + Observações + ações — nunca rola */}
          <div className="flex w-full flex-col border-t border-border sm:w-80 sm:shrink-0 sm:border-t-0 sm:border-l">
            <div className="flex-1 space-y-4 p-5">
              <div className="space-y-2">
                <Label htmlFor="retorno-hora" className="text-[10px] font-bold uppercase tracking-widest text-teal-ink">
                  Hora
                </Label>
                <Input
                  id="retorno-hora"
                  type="time"
                  disabled={form.data == null}
                  value={form.minutoDoDia != null ? formatHora(form.minutoDoDia) : ''}
                  onChange={(e) => {
                    const minuto = minutoDoInputHora(e.target.value);
                    if (minuto != null) setForm((f) => ({ ...f, minutoDoDia: minuto }));
                  }}
                  className="rounded-xl bg-surface-alt border-border text-text-primary disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-teal-ink">Duração</Label>
                <div className="grid grid-cols-3 gap-1.5">
                  {DURACAO_CHIPS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, duracao: opt.value }))}
                      className={`rounded-lg border py-2 text-xs font-bold transition-all ${
                        form.duracao === opt.value
                          ? 'border-teal bg-teal/10 text-teal-ink'
                          : 'border-border bg-surface-alt text-text-secondary hover:border-teal/40 hover:text-teal-ink'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="retorno-duracao-livre" className="shrink-0 text-xs text-text-secondary">Ou:</Label>
                  <Input
                    id="retorno-duracao-livre"
                    type="number"
                    min={5}
                    max={600}
                    step={5}
                    inputMode="numeric"
                    value={form.duracao}
                    onChange={(e) => setForm((f) => ({ ...f, duracao: e.target.value }))}
                    className="h-8 rounded-lg bg-surface-alt border-border text-sm text-text-primary"
                    aria-label="Duração personalizada em minutos"
                  />
                  <span className="shrink-0 text-xs text-text-secondary">min</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="retorno-obs" className="text-[10px] font-bold uppercase tracking-widest text-teal-ink">
                  Observações
                </Label>
                <textarea
                  id="retorno-obs"
                  value={form.observacoes}
                  onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                  placeholder="Ex: Consulta de rotina, limpeza..."
                  className="min-h-[88px] w-full resize-none rounded-xl border border-border bg-surface-alt p-3.5 text-sm text-text-primary placeholder:text-text-secondary/40 outline-none transition-all focus:border-teal/30 focus:ring-2 focus:ring-teal/15"
                />
              </div>
            </div>

            <div className="space-y-2.5 border-t border-border p-5">
              {error && (
                <p className="rounded-lg bg-coral-pale p-2 text-xs text-coral-ink">{error}</p>
              )}
              {!error && !podeConfirmar && (
                <p className="text-xs text-text-secondary">
                  {dentistaAlvoId == null ? 'Escolha o dentista para ver a agenda.' : 'Escolha um dia e hora na grade pra habilitar.'}
                </p>
              )}
              <Button
                onClick={onMarcarRetorno}
                disabled={saving || !podeConfirmar}
                className="w-full rounded-xl bg-teal-dark font-bold text-white hover:opacity-90 disabled:opacity-40"
              >
                {saving ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
                ) : (
                  'Marcar retorno'
                )}
              </Button>
              <button
                onClick={fechar}
                className="w-full py-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
