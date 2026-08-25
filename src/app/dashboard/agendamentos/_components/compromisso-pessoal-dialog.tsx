'use client';

import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { X, AlertTriangle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { toast } from 'sonner';
import { buildClinicDatetime } from './date-helpers';
import type { DentistaAgenda } from './cor-dentista';
import { nomeDentistaExibicao } from '@/lib/agenda/nome-dentista';
import type { BloqueioRow } from '../page';
import {
  criarCompromissoPessoal,
  atualizarCompromissoPessoal,
  excluirCompromissoPessoal,
} from '../actions';

const DURACAO_OPCOES = [
  { value: '30', label: '30min' },
  { value: '45', label: '45min' },
  { value: '60', label: '1h' },
  { value: '90', label: '1h30' },
  { value: '120', label: '2h' },
  { value: '180', label: '3h' },
];

// Atalho de período — preenche hora+duração de uma vez; o campo continua editável depois
// (pedido dele: não trava em hora fixa, é ponto de partida rápido pra manhã/tarde/dia todo).
const PERIODO_OPCOES = [
  { label: 'Manhã', hora: '08:00', duracaoMin: 240 },
  { label: 'Tarde', hora: '13:00', duracaoMin: 300 },
  { label: 'Dia inteiro', hora: '08:00', duracaoMin: 600 },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dentistas: DentistaAgenda[];
  isSecretaria: boolean;
  dentistaAtualId: string;
  editando?: BloqueioRow | null;
  onSalvo: () => void;
}

/** Dialog auto-contido pro compromisso pessoal (R-102) — mesma anatomia do modal "Novo
 *  agendamento" (Dialog centralizado, header neutro, tokens semânticos de erro/conflito). */
export function CompromissoPessoalDialog({
  open, onOpenChange, dentistas, isSecretaria, dentistaAtualId, editando, onSalvo,
}: Props) {
  const dentistasOrdenados = useMemo(
    () => [...dentistas].sort((a, b) =>
      nomeDentistaExibicao(a.nome).localeCompare(nomeDentistaExibicao(b.nome), 'pt-BR'),
    ),
    [dentistas],
  );

  const [form, setForm] = useState({
    dentistaId: dentistaAtualId,
    data: format(new Date(), 'yyyy-MM-dd'),
    hora: '09:00',
    duracao: '30',
    titulo: '',
  });
  const [conflito, setConflito] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const semDentistaSelecionavel = isSecretaria && !editando && dentistasOrdenados.length === 0;

  // Reseta/preenche o form a cada abertura — nunca herda estado da vez anterior. Ajuste
  // durante o render (padrão React: "adjusting state when a prop changes"), não em efeito —
  // evita o cascading render de um setState síncrono dentro de useEffect.
  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setConflito(false);
      setError(null);
      if (editando) {
        const dt = parseISO(editando.data_hora);
        setForm({
          dentistaId: editando.dentista_id,
          data: format(dt, 'yyyy-MM-dd'),
          hora: format(dt, 'HH:mm'),
          duracao: String(editando.duracao_minutos),
          titulo: editando.titulo ?? '',
        });
      } else {
        const agora = new Date();
        setForm({
          dentistaId: dentistaAtualId,
          data: format(agora, 'yyyy-MM-dd'),
          hora: format(agora, 'HH:mm'),
          duracao: '30',
          titulo: '',
        });
      }
    }
  }

  const handleSalvar = async (forcar = false) => {
    if (semDentistaSelecionavel || (isSecretaria && !editando && !form.dentistaId)) {
      setError('Nenhum dentista ativo está disponível para este compromisso.');
      return;
    }
    if (!form.data || !form.hora) { setError('Preencha dia e hora.'); return; }
    const duracaoMinutos = parseInt(form.duracao, 10);
    if (!duracaoMinutos || duracaoMinutos < 5 || duracaoMinutos > 600) {
      setError('Duração precisa estar entre 5 e 600 minutos.');
      return;
    }
    setSaving(true);
    setError(null);
    const dataHora = buildClinicDatetime(form.data, form.hora);
    const titulo = form.titulo.trim() || null;

    const result = editando
      ? await atualizarCompromissoPessoal(editando.id, { dataHora, duracaoMinutos, titulo, forcarConflito: forcar })
      : await criarCompromissoPessoal({
          dataHora, duracaoMinutos, titulo, forcarConflito: forcar,
          ...(isSecretaria ? { dentistaId: form.dentistaId } : {}),
        });

    setSaving(false);
    if (result.conflito) { setConflito(true); return; }
    if (result.error) { setError(result.error); return; }
    toast.success(editando ? 'Compromisso atualizado.' : 'Compromisso pessoal criado.');
    onSalvo();
    onOpenChange(false);
  };

  const handleExcluir = async () => {
    if (!editando) return;
    setSaving(true);
    const result = await excluirCompromissoPessoal(editando.id);
    setSaving(false);
    setConfirmandoExclusao(false);
    if (result.error) { setError(result.error); return; }
    toast.success('Compromisso excluído.');
    onSalvo();
    onOpenChange(false);
  };

  const nomeDentistaEditando = editando
    ? nomeDentistaExibicao(dentistas.find((d) => d.id === editando.dentista_id)?.nome)
    : null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="max-w-lg rounded-2xl bg-surface border-border p-0 gap-0 overflow-hidden"
        >
          <DialogDescription className="sr-only">
            {editando ? 'Editar compromisso pessoal na agenda.' : 'Criar compromisso pessoal que bloqueia a agenda.'}
          </DialogDescription>

          <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-border">
            <DialogTitle className="font-heading font-semibold text-xl text-text-primary leading-tight">
              {editando ? 'Editar compromisso' : 'Compromisso pessoal'}
            </DialogTitle>
            <button
              onClick={() => onOpenChange(false)}
              aria-label="Fechar"
              className="p-1.5 rounded-lg text-text-secondary hover:bg-surface-alt hover:text-text-primary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 space-y-5 overflow-y-auto" style={{ maxHeight: '70vh' }}>
            {error && (
              <p className="text-xs text-coral-ink bg-coral-pale rounded-lg p-2">{error}</p>
            )}

            {conflito && (
              <div className="rounded-xl border border-warning/30 bg-warning-pale p-3">
                <div className="flex items-start gap-2 mb-2.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-warning-ink" />
                  <p className="text-xs text-warning-ink">
                    Já existe uma consulta marcada neste horário. Marcar mesmo assim vai <b>sobrepor</b> os dois na agenda.
                  </p>
                </div>
                <Button
                  onClick={() => void handleSalvar(true)}
                  disabled={saving}
                  size="sm"
                  className="w-full rounded-lg text-xs bg-warning-pale border border-warning text-warning-ink hover:bg-warning/20 disabled:opacity-50"
                >
                  {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> Salvando...</> : 'Marcar mesmo assim'}
                </Button>
              </div>
            )}

            {/* Dentista — secretária escolhe ao criar; ao editar, é só informativo (a
                action não muda o dono do bloqueio, mesma decisão de não reabrir esse caminho). */}
            {semDentistaSelecionavel && (
              <p className="rounded-xl border border-warning/30 bg-warning-pale p-3 text-xs text-warning-ink">
                Não há dentista ativo nesta clínica para receber o compromisso.
              </p>
            )}

            {isSecretaria && dentistas.length > 0 && (
              editando ? (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-surface-alt rounded-xl border border-border">
                  <span className="text-xs text-text-secondary">
                    Dentista: <span className="font-semibold text-text-primary">{nomeDentistaEditando}</span>
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-teal-ink">Dentista</Label>
                  <Select value={form.dentistaId} onValueChange={(v) => v && setForm((f) => ({ ...f, dentistaId: v }))}>
                    <SelectTrigger className="rounded-xl bg-surface-alt border-border text-text-primary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-surface border-border">
                      {dentistasOrdenados.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{nomeDentistaExibicao(d.nome)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )
            )}

            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-teal-ink">Título (opcional)</Label>
              <Input
                placeholder="Ex.: Consulta médica, evento..."
                value={form.titulo}
                onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                maxLength={120}
                className="rounded-xl bg-surface-alt border-border text-text-primary"
              />
            </div>

            {/* Atalho de período — preenche hora+duração; a hora abaixo continua livre pra ajustar. */}
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-teal-ink">Período</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {PERIODO_OPCOES.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, hora: p.hora, duracao: String(p.duracaoMin) }))}
                    className="py-2 rounded-lg border border-border text-text-secondary text-xs font-bold hover:border-teal/40 hover:text-teal-ink bg-surface-alt transition-all"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1.5">
                <Label htmlFor="compromisso-data" className="text-[10px] text-text-secondary uppercase tracking-widest font-bold">Data</Label>
                <Input
                  id="compromisso-data"
                  type="date"
                  value={form.data}
                  onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))}
                  className="rounded-xl bg-surface-alt border-border text-text-primary"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="compromisso-hora" className="text-[10px] text-text-secondary uppercase tracking-widest font-bold">Hora</Label>
                <Input
                  id="compromisso-hora"
                  type="time"
                  value={form.hora}
                  onChange={(e) => setForm((f) => ({ ...f, hora: e.target.value }))}
                  className="rounded-xl bg-surface-alt border-border text-text-primary"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-teal-ink">Duração</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {DURACAO_OPCOES.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, duracao: opt.value }))}
                    className={`py-2 rounded-lg border text-xs font-bold transition-all ${
                      form.duracao === opt.value
                        ? 'bg-teal/10 border-teal text-teal-ink'
                        : 'border-border text-text-secondary hover:border-teal/40 hover:text-teal-ink bg-surface-alt'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="compromisso-duracao-livre" className="text-xs text-text-secondary shrink-0">Ou:</Label>
                <Input
                  id="compromisso-duracao-livre"
                  type="number"
                  min={5}
                  max={600}
                  step={5}
                  inputMode="numeric"
                  value={form.duracao}
                  onChange={(e) => setForm((f) => ({ ...f, duracao: e.target.value }))}
                  className="rounded-lg bg-surface-alt border-border text-text-primary text-sm h-8"
                  aria-label="Duração personalizada em minutos"
                />
                <span className="text-xs text-text-secondary shrink-0">min</span>
              </div>
            </div>
          </div>

          <div className="p-5 border-t border-border space-y-2.5">
            <Button
              onClick={() => void handleSalvar(false)}
              disabled={saving || semDentistaSelecionavel}
              className="w-full bg-teal text-white hover:bg-teal-lt rounded-xl font-bold disabled:opacity-50"
            >
              {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Salvando...</> : (editando ? 'Salvar alterações' : 'Criar compromisso')}
            </Button>
            {editando && (
              <button
                onClick={() => setConfirmandoExclusao(true)}
                disabled={saving}
                className="w-full py-1.5 text-sm font-medium text-coral-ink hover:opacity-80 transition-colors disabled:opacity-50"
              >
                Excluir compromisso
              </button>
            )}
            <button
              onClick={() => onOpenChange(false)}
              className="w-full py-1.5 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancelar
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmandoExclusao} onOpenChange={setConfirmandoExclusao}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading font-semibold text-xl">Excluir este compromisso?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              O horário deixa de estar bloqueado na agenda. Não dá pra desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleExcluir()}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
