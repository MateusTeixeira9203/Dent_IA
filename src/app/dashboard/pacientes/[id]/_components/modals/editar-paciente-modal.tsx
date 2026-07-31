'use client';

import { useMemo } from 'react';
import { Baby } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DateInputDMY } from '@/components/ui/date-input-dmy';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { calcularIdade, PARENTESCO_OPTIONS, formatCpf } from '@/lib/paciente-form-helpers';

interface EditarPacienteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editNome: string;
  setEditNome: (v: string) => void;
  editTelefone: string;
  setEditTelefone: (v: string) => void;
  editEmail: string;
  setEditEmail: (v: string) => void;
  editEndereco: string;
  setEditEndereco: (v: string) => void;
  /** R-41 — fecha a lacuna que o cadastro rápido deixa aberta (§1 da spec). */
  editCpf: string;
  setEditCpf: (v: string) => void;
  editDataNascimento: string;
  setEditDataNascimento: (v: string) => void;
  editResponsavelNome: string;
  setEditResponsavelNome: (v: string) => void;
  editResponsavelTelefone: string;
  setEditResponsavelTelefone: (v: string) => void;
  editResponsavelParentesco: string;
  setEditResponsavelParentesco: (v: string) => void;
  editError: string | null;
  isPending: boolean;
  onSave: () => void;
  editDentistaId: string;
  setEditDentistaId: (v: string) => void;
  /** null quando o papel atual não pode reatribuir (só a secretária pode). */
  dentistasClinica: { id: string; nome: string }[] | null;
}

export function EditarPacienteModal({
  open,
  onOpenChange,
  editNome,
  setEditNome,
  editTelefone,
  setEditTelefone,
  editEmail,
  setEditEmail,
  editEndereco,
  setEditEndereco,
  editCpf,
  setEditCpf,
  editDataNascimento,
  setEditDataNascimento,
  editResponsavelNome,
  setEditResponsavelNome,
  editResponsavelTelefone,
  setEditResponsavelTelefone,
  editResponsavelParentesco,
  setEditResponsavelParentesco,
  editError,
  isPending,
  onSave,
  editDentistaId,
  setEditDentistaId,
  dentistasClinica,
}: EditarPacienteModalProps) {
  // R-41 §3.3 — mesma definição de "é menor" do cadastro (novo-paciente-form.tsx),
  // agora compartilhada. Não bloqueia salvar (diferente do cadastro) — só revela o campo.
  const idade = useMemo(() => calcularIdade(editDataNascimento), [editDataNascimento]);
  const eMenor = idade !== null && idade < 18;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* R-41 §3.4 — mesmo padrão do R-39a: cabeçalho fixo, conteúdo com rolagem,
          rodapé fixo. A tela cresceu de 5 pra 8 campos; sem isto, corta em notebook baixo. */}
      <DialogContent
        className="flex flex-col max-w-md rounded-2xl bg-surface border-border p-0 overflow-hidden gap-0"
        style={{ maxHeight: '90vh' }}
      >
        <div className="shrink-0 px-6 py-4 border-b border-border">
          <DialogTitle className="font-heading font-semibold text-xl text-text-primary">
            Editar Perfil
          </DialogTitle>
          <DialogDescription className="text-text-secondary text-sm">
            Atualize as informações cadastrais do paciente.
          </DialogDescription>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-nome">Nome Completo</Label>
            <Input
              id="edit-nome"
              value={editNome}
              onChange={(e) => setEditNome(e.target.value)}
              className="rounded-xl bg-surface-alt border-border"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-telefone">Telefone</Label>
              <Input
                id="edit-telefone"
                value={editTelefone}
                onChange={(e) => setEditTelefone(e.target.value)}
                className="rounded-xl bg-surface-alt border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="rounded-xl bg-surface-alt border-border"
              />
            </div>
          </div>

          {/* R-41 — CPF e data de nascimento: a lacuna que o cadastro rápido deixa. */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-cpf">
                CPF <span className="text-text-secondary font-normal">(opcional)</span>
              </Label>
              <Input
                id="edit-cpf"
                value={editCpf}
                onChange={(e) => setEditCpf(formatCpf(e.target.value))}
                placeholder="000.000.000-00"
                inputMode="numeric"
                className="rounded-xl bg-surface-alt border-border font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-data-nascimento">
                Nascimento <span className="text-text-secondary font-normal">(opcional)</span>
              </Label>
              <DateInputDMY
                id="edit-data-nascimento"
                value={editDataNascimento}
                onChange={setEditDataNascimento}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-endereco">Endereço</Label>
            <Input
              id="edit-endereco"
              value={editEndereco}
              onChange={(e) => setEditEndereco(e.target.value)}
              className="rounded-xl bg-surface-alt border-border"
            />
          </div>

          {/* R-41 §3.3 — revela quando a data de nascimento indicar menor de idade.
              Diferente do cadastro: aqui NÃO bloqueia salvar (spec §3.3, invariante 3). */}
          {eMenor && (
            <div className="space-y-3 rounded-xl border border-amber-400/25 bg-amber-400/5 p-4">
              <div className="flex items-center gap-2">
                <Baby className="w-4 h-4 text-amber-500 shrink-0" />
                <p className="text-sm font-semibold text-text-primary">Responsável Legal</p>
                <span className="ml-auto text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-600 dark:text-amber-400 border border-amber-400/20">
                  Paciente menor ({idade} anos)
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {PARENTESCO_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setEditResponsavelParentesco(opt.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      editResponsavelParentesco === opt.value
                        ? 'bg-teal/10 border-teal/40 text-teal'
                        : 'border-border text-text-secondary hover:border-teal/30 hover:text-teal bg-surface-alt'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-responsavel-nome">Nome do responsável</Label>
                <Input
                  id="edit-responsavel-nome"
                  value={editResponsavelNome}
                  onChange={(e) => setEditResponsavelNome(e.target.value)}
                  className="rounded-xl bg-surface border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-responsavel-telefone">
                  Telefone do responsável <span className="text-text-secondary font-normal">(opcional)</span>
                </Label>
                <Input
                  id="edit-responsavel-telefone"
                  value={editResponsavelTelefone}
                  onChange={(e) => setEditResponsavelTelefone(e.target.value)}
                  className="rounded-xl bg-surface border-border"
                />
              </div>
            </div>
          )}

          {dentistasClinica && (
            <div className="space-y-2">
              <Label htmlFor="edit-dentista">Dentista responsável</Label>
              <Select value={editDentistaId} onValueChange={(v) => setEditDentistaId(v ?? '')}>
                <SelectTrigger id="edit-dentista" className="rounded-xl bg-surface-alt border-border">
                  <SelectValue placeholder="Selecione o dentista" />
                </SelectTrigger>
                <SelectContent>
                  {dentistasClinica.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-text-secondary">
                A ficha não acompanha — fica com quem a criou. O novo dentista passa a ver o paciente e cria as próprias fichas.
              </p>
            </div>
          )}
          {editError && <p className="text-xs text-coral-ink bg-coral-pale rounded-lg px-3 py-2">{editError}</p>}
        </div>

        <div className="shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl border-border text-text-primary hover:bg-surface-alt"
          >
            Cancelar
          </Button>
          <Button
            onClick={onSave}
            disabled={isPending || !editNome.trim()}
            className="bg-teal text-white hover:bg-teal-lt rounded-xl disabled:opacity-50"
          >
            {isPending ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
