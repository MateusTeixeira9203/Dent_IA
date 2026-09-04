'use client';

import { useState } from 'react';
import { Loader2, Save, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { EndoForm } from '@/components/fichas/endo-form';
import { ImplanteForm } from '@/components/fichas/implante-form';
import { endoDetalheSchema, type EndoDetalhe } from '@/lib/especialidades/endo';
import { implanteDetalheSchema, type ImplanteDetalhe } from '@/lib/especialidades/implante';
import { editarDetalhesEvento, excluirProcedimento } from '@/server/patients/registro-actions';
import type { ProntuarioEvento } from '@/server/patients/get-prontuario-longitudinal';

type DetalheEmEdicao =
  | { tipo: 'endodontia'; valor: EndoDetalhe | null }
  | { tipo: 'implante'; valor: ImplanteDetalhe | null }
  | { tipo: 'sem_detalhe'; valor: null };

function detalheInicial(evento: ProntuarioEvento): DetalheEmEdicao {
  if (evento.tipo === 'endodontia') {
    const parsed = endoDetalheSchema.safeParse(evento.detalhe);
    return { tipo: 'endodontia', valor: parsed.success ? parsed.data : null };
  }
  if (evento.tipo === 'implante') {
    const parsed = implanteDetalheSchema.safeParse(evento.detalhe);
    return { tipo: 'implante', valor: parsed.success ? parsed.data : null };
  }
  return { tipo: 'sem_detalhe', valor: null };
}

interface ProcedimentoDetalheFichaProps {
  evento: ProntuarioEvento;
  permitirObservacao: boolean;
  permitirDetalhe: boolean;
  permitirExclusao: boolean;
  onFechar: () => void;
  onSalvo: () => void;
  onExcluido: () => void;
}

/** Editor contextual de um evento: não troca a Ficha unificada pelo editor legado. */
export function ProcedimentoDetalheFicha({
  evento,
  permitirObservacao,
  permitirDetalhe,
  permitirExclusao,
  onFechar,
  onSalvo,
  onExcluido,
}: ProcedimentoDetalheFichaProps) {
  const [observacao, setObservacao] = useState(evento.observacao ?? '');
  const [detalhe, setDetalhe] = useState<DetalheEmEdicao>(() => detalheInicial(evento));
  const [salvando, setSalvando] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [apagando, setApagando] = useState(false);

  const temDetalheTecnico = detalhe.tipo !== 'sem_detalhe';

  async function salvar(): Promise<void> {
    setSalvando(true);
    const resultado = await editarDetalhesEvento({
      eventoId: evento.id,
      detalhe: detalhe.valor,
      alterarDetalhe: permitirDetalhe && temDetalheTecnico,
      observacao: permitirObservacao ? observacao : null,
      alterarObservacao: permitirObservacao,
    });
    setSalvando(false);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success('Detalhes do procedimento atualizados.');
    onSalvo();
  }

  async function apagar(): Promise<void> {
    setApagando(true);
    const resultado = await excluirProcedimento({ eventoId: evento.id });
    setApagando(false);
    if (!resultado.ok) {
      toast.error(resultado.error);
      setConfirmandoExclusao(false);
      return;
    }
    setConfirmandoExclusao(false);
    toast.success('Procedimento apagado.');
    onExcluido();
  }

  return (
    <section className="mt-3 rounded-xl border border-teal/35 bg-teal/5 p-3" aria-label="Editar procedimento">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-ink">Detalhes do procedimento</p>
          <p className="mt-1 text-xs text-text-secondary">A edição fica nesta Ficha e registra a alteração no histórico clínico.</p>
        </div>
        <button type="button" onClick={onFechar} className="rounded-md p-1 text-text-secondary hover:bg-surface hover:text-text-primary" aria-label="Fechar detalhes">
          <X className="h-4 w-4" />
        </button>
      </div>

      {permitirObservacao && (
        <label className="mt-3 grid gap-1.5 text-xs font-bold text-text-primary">
          Observação clínica
          <textarea
            value={observacao}
            onChange={(event) => setObservacao(event.target.value)}
            maxLength={4_000}
            rows={3}
            className="resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm font-normal text-text-primary outline-none focus:border-teal"
            placeholder="Material, técnica, intercorrência ou contexto clínico"
          />
        </label>
      )}

      {permitirDetalhe && detalhe.tipo === 'endodontia' && (
        <div className="mt-4 rounded-lg border border-border bg-surface p-3">
          <EndoForm
            valor={detalhe.valor}
            onChange={(valor) => setDetalhe({ tipo: 'endodontia', valor })}
          />
        </div>
      )}

      {permitirDetalhe && detalhe.tipo === 'implante' && (
        <div className="mt-4 rounded-lg border border-border bg-surface p-3">
          <ImplanteForm
            valor={detalhe.valor}
            onChange={(valor) => setDetalhe({ tipo: 'implante', valor })}
          />
        </div>
      )}

      <div className="mt-4 flex flex-wrap justify-between gap-2">
        {permitirExclusao ? (
          <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setConfirmandoExclusao(true)} disabled={salvando || apagando}>
            <Trash2 className="h-4 w-4" /> Apagar procedimento
          </Button>
        ) : <span />}
        <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onFechar} disabled={salvando}>Cancelar</Button>
        <Button size="sm" onClick={() => void salvar()} disabled={salvando}>
          {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar detalhes
        </Button>
        </div>
      </div>

      <AlertDialog open={confirmandoExclusao} onOpenChange={setConfirmandoExclusao}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar este procedimento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove apenas este procedimento não assinado. Procedimentos vinculados a orçamento são preservados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={apagando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={apagando} onClick={() => void apagar()}>
              {apagando && <Loader2 className="h-4 w-4 animate-spin" />}
              Apagar procedimento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
