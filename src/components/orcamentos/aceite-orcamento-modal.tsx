'use client';

import { useRef, useState } from 'react';
import type SignaturePadLib from 'signature_pad';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'motion/react';
import { PenLine, RotateCcw, CheckCircle2, Loader2, AlertCircle, X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { aceitarOrcamento } from '@/app/dashboard/orcamentos/actions';

const SignaturePad = dynamic(
  () => import('@/components/fichas/SignaturePad').then((m) => m.SignaturePad),
  { ssr: false },
);

/** Recorte mínimo — o modal não depende do tipo completo de OrcamentoItem da página. */
type ItemResumo = {
  id: string;
  descricao: string | null;
  quantidade: number;
  preco_total: number | null;
};

interface AceiteOrcamentoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orcamentoId: string;
  itens: ItemResumo[];
  total: number | null;
  /** Chamado após o servidor confirmar o aceite — o pai decide como refletir (router.refresh). */
  onAccepted: () => void;
}

type Step = 'assinar' | 'salvando' | 'sucesso' | 'erro';

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function AceiteOrcamentoModal({
  open, onOpenChange, orcamentoId, itens, total, onAccepted,
}: AceiteOrcamentoModalProps) {
  const padRef = useRef<SignaturePadLib | null>(null);
  const [step, setStep] = useState<Step>('assinar');
  const [assinadoPor, setAssinadoPor] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  function resetAndClose() {
    setStep('assinar');
    setAssinadoPor('');
    setErro(null);
    onOpenChange(false);
  }

  async function handleConfirmar() {
    if (!padRef.current || padRef.current.isEmpty()) {
      setErro('Assine no campo abaixo antes de confirmar.');
      return;
    }
    if (assinadoPor.trim().length < 2) {
      setErro('Informe o nome de quem está assinando.');
      return;
    }
    setErro(null);
    setStep('salvando');

    const dataUrl = padRef.current.toDataURL('image/png');
    const result = await aceitarOrcamento({ orcamentoId, assinadoPor: assinadoPor.trim(), assinaturaDataUrl: dataUrl });

    if (!result.ok) {
      setErro(result.error ?? 'Não foi possível registrar o aceite.');
      setStep('erro');
      return;
    }

    setStep('sucesso');
    onAccepted();
    setTimeout(resetAndClose, 1600);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && step !== 'salvando') resetAndClose(); }}>
      {/* Cabe em qualquer altura de tela (achado 30/07: sem isto, num notebook real de
          15-16", o conteúdo — 6 procedimentos + nome + assinatura + botões — passava da
          tela e não tinha rolagem; o botão "Confirmar aceite" ficava inalcançável). */}
      <DialogContent
        className="flex flex-col max-w-lg rounded-3xl p-0 overflow-hidden border-border"
        style={{ maxHeight: '90vh' }}
        showCloseButton={false}
      >
        <AnimatePresence mode="wait">

          {step === 'assinar' && (
            <motion.div key="assinar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col flex-1 min-h-0">
              <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-teal/10 flex items-center justify-center">
                    <PenLine className="w-4 h-4 text-teal-ink" />
                  </div>
                  <div>
                    <DialogTitle className="font-heading font-semibold text-xl text-text-primary leading-tight">
                      Aceite do orçamento
                    </DialogTitle>
                    <DialogDescription className="text-text-muted text-xs">
                      O paciente confirma que aceita pagar nestes termos.
                    </DialogDescription>
                  </div>
                </div>
                <button onClick={resetAndClose} aria-label="Fechar" className="p-1.5 rounded-lg hover:bg-surface-alt text-text-secondary transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto px-6 pt-4 space-y-4">
                {/* Resumo read-only — o paciente precisa ver o que está aceitando. O snapshot
                    real é montado no servidor a partir do banco; isto é só a prévia. */}
                <div className="rounded-2xl border border-border overflow-hidden">
                  {itens.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border/60 last:border-b-0 text-sm">
                      <span className="text-text-primary truncate">
                        {item.quantidade > 1 ? `${item.quantidade}× ` : ''}{item.descricao ?? '—'}
                      </span>
                      <span className="font-mono text-text-secondary shrink-0">R$ {fmt(item.preco_total ?? 0)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-4 py-2.5 bg-surface-alt">
                    <span className="text-sm font-bold text-text-primary">Total</span>
                    <span className="font-mono text-sm font-bold text-teal-ink">R$ {fmt(total ?? 0)}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="aceite-assinado-por" className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">
                    Nome de quem assina
                  </Label>
                  <Input
                    id="aceite-assinado-por"
                    value={assinadoPor}
                    onChange={(e) => { setAssinadoPor(e.target.value); setErro(null); }}
                    placeholder="Nome completo do paciente ou responsável"
                    className="rounded-xl bg-surface-alt border-border text-text-primary"
                  />
                </div>

                <SignaturePad padRef={padRef} />

                {erro && (
                  <p className="text-xs text-coral-ink bg-coral-pale rounded-lg px-3 py-2">{erro}</p>
                )}
              </div>

              <div className="shrink-0 px-6 py-5 flex gap-3 border-t border-border">
                <Button
                  variant="outline"
                  onClick={resetAndClose}
                  className="flex-1 h-auto py-3 rounded-xl border-border text-text-primary hover:bg-surface-alt"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => void handleConfirmar()}
                  className="flex-1 h-auto py-3 rounded-xl bg-teal text-white hover:bg-teal-lt font-semibold gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Confirmar aceite
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'salvando' && (
            <motion.div key="salvando" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center gap-4 py-20 px-8">
              <Loader2 className="w-8 h-8 text-teal-ink animate-spin" />
              <p className="text-sm text-text-secondary">Registrando aceite...</p>
            </motion.div>
          )}

          {step === 'sucesso' && (
            <motion.div key="sucesso" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center gap-4 py-20 px-8 text-center">
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="w-16 h-16 rounded-2xl bg-teal/10 flex items-center justify-center"
              >
                <CheckCircle2 className="w-8 h-8 text-teal-ink" />
              </motion.div>
              <p className="font-semibold text-text-primary">Aceite registrado.</p>
            </motion.div>
          )}

          {step === 'erro' && (
            <motion.div key="erro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-4 py-16 px-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-coral-pale flex items-center justify-center">
                <AlertCircle className="w-7 h-7 text-coral-ink" />
              </div>
              <div>
                <p className="font-semibold text-text-primary mb-1">Não foi possível registrar</p>
                <p className="text-sm text-text-secondary">{erro}</p>
              </div>
              <Button
                onClick={() => setStep('assinar')}
                className="h-auto px-6 py-2.5 rounded-xl bg-teal text-white hover:bg-teal-lt font-semibold gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Tentar novamente
              </Button>
            </motion.div>
          )}

        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
