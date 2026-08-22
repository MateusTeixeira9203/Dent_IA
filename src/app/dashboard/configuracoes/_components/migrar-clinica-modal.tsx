'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Building2, Check, Users, Mail, Loader2,
  ChevronRight, ArrowLeft, CreditCard, AlertTriangle,
} from 'lucide-react';
import { enviarConvite } from '../usuarios/actions';
import { iniciarFormacaoClinicaAction } from '../plano-actions';
import { createCheckoutAgregado } from '@/app/bem-vindo-agregado/actions';
import { toast } from 'sonner';

interface MigrarClinicaModalProps {
  open: boolean;
  onClose: () => void;
  dentistasAtivos: number;
}

type Step = 'explicacao' | 'convites';

export function MigrarClinicaModal({
  open,
  onClose,
  dentistasAtivos: dentistasInicial,
}: MigrarClinicaModalProps) {
  const [step, setStep]                     = useState<Step>('explicacao');
  const [email, setEmail]                   = useState('');
  const [enviando, setEnviando]             = useState(false);
  const [ativando, setAtivando]             = useState(false);
  const [ciclo, setCiclo]                   = useState<'mensal' | 'anual'>('mensal');
  const [dentistasAtivos]                   = useState(dentistasInicial);
  const [convidosEnviados, setConvidados]   = useState<string[]>([]);
  const emailInputRef                       = useRef<HTMLInputElement>(null);

  const participantesPrevistos = Math.min(2, dentistasAtivos + convidosEnviados.length);
  const faltam = Math.max(0, 2 - participantesPrevistos);

  function handleClose() {
    setStep('explicacao');
    setEmail('');
    onClose();
  }

  async function handleEnviarConvite() {
    const emailTrimado = email.trim().toLowerCase();
    if (!emailTrimado || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimado)) {
      toast.error('Informe um e-mail válido.');
      return;
    }
    if (convidosEnviados.includes(emailTrimado)) {
      toast.error('Convite já enviado para este e-mail.');
      return;
    }

    setEnviando(true);
    try {
      const result = await enviarConvite(emailTrimado);
      if (!result.ok) {
        toast.error(result.error ?? 'Erro ao enviar convite.');
      } else {
        setConvidados((prev) => [...prev, emailTrimado]);
        setEmail('');
        toast.success(`Convite enviado para ${emailTrimado}`);
        emailInputRef.current?.focus();
      }
    } catch {
      toast.error('Erro inesperado ao enviar convite.');
    } finally {
      setEnviando(false);
    }
  }

  async function handleIniciarFormacao() {
    setAtivando(true);
    try {
      const result = await iniciarFormacaoClinicaAction(ciclo);
      if (!result.ok) {
        toast.error(result.error ?? 'Erro ao iniciar formação.');
      } else {
        toast.success('Formação iniciada. Você tem 48 horas para concluir a equipe.');
        setStep('convites');
      }
    } catch {
      toast.error('Erro inesperado.');
    } finally {
      setAtivando(false);
    }
  }

  async function handleAdicionarCartao() {
    setAtivando(true);
    try {
      const result = await createCheckoutAgregado(ciclo);
      if (result.error) toast.error(result.error);
      else if (result.url) window.location.href = result.url;
    } finally {
      setAtivando(false);
    }
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="relative w-full max-w-md bg-surface rounded-3xl border border-border shadow-2xl overflow-hidden pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Fechar */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-alt/60 transition-colors z-10"
              >
                <X className="w-4 h-4" />
              </button>

              <AnimatePresence mode="wait">

                {/* ── STEP 1: Explicação ── */}
                {step === 'explicacao' && (
                  <motion.div
                    key="explicacao"
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.2 }}
                    className="p-7"
                  >
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-6">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                        style={{ background: 'color-mix(in srgb, var(--color-teal) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--color-teal) 25%, transparent)' }}
                      >
                        <Building2 className="w-6 h-6 text-teal" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal font-mono">Upgrade</p>
                        <h2 className="font-heading text-xl text-text-primary">Criar Clínica</h2>
                      </div>
                    </div>

                    {/* Descrição */}
                    <p className="text-sm text-text-secondary mb-6 leading-relaxed">
                      Seu consultório vira uma clínica completa.{' '}
                      <span className="text-text-primary font-medium">Todos os seus dados são mantidos.</span>
                    </p>

                    {/* Passos */}
                    <div className="space-y-3 mb-6">
                      {[
                        { n: 1, titulo: 'Convide seus colegas', desc: 'Envie convites por e-mail direto do sistema.' },
                        { n: 2, titulo: 'Cada um adiciona o próprio cartão', desc: 'Nada é cobrado enquanto a equipe ainda está sendo formada.' },
                        { n: 3, titulo: 'Clínica ativada', desc: 'Com 2 cartões confirmados, o teste de 7 dias começa para os dois.' },
                      ].map(({ n, titulo, desc }) => (
                        <div key={n} className="flex items-start gap-3">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                            style={{ background: 'color-mix(in srgb, var(--color-teal) 12%, transparent)', color: 'var(--color-teal)' }}
                          >
                            {n}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-text-primary">{titulo}</p>
                            <p className="text-xs text-text-secondary mt-0.5">{desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Aviso de cobrança mínima */}
                    <div className="flex items-start gap-2.5 p-3.5 rounded-2xl border border-amber-400/30 bg-amber-400/8 mb-6">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
                        <span className="font-bold">Prazo de formação: 48 horas.</span>{' '}
                        Se a segunda pessoa não concluir, nenhuma assinatura é criada e nada é cobrado.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-4" role="radiogroup" aria-label="Ciclo de cobrança">
                      {(['mensal', 'anual'] as const).map((opcao) => (
                        <button key={opcao} type="button" role="radio" aria-checked={ciclo === opcao}
                          onClick={() => setCiclo(opcao)}
                          className={`min-h-11 rounded-xl border px-3 text-sm font-semibold transition-colors ${ciclo === opcao ? 'border-teal bg-teal/10 text-teal' : 'border-border text-text-secondary'}`}>
                          {opcao === 'mensal' ? 'R$200/mês' : 'R$2.000/ano'}
                        </button>
                      ))}
                    </div>

                    {/* CTA */}
                    <button
                      onClick={() => void handleIniciarFormacao()}
                      disabled={ativando}
                      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm text-white transition-all hover:-translate-y-0.5"
                      style={{
                        background: 'linear-gradient(135deg, #2f9c85 0%, #1e7a67 100%)',
                        boxShadow: '0 6px 20px rgba(47,156,133,0.35)',
                      }}
                    >
                      {ativando ? 'Preparando…' : 'Começar formação da clínica'}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}

                {/* ── STEP 2: Convites ── */}
                {step === 'convites' && (
                  <motion.div
                    key="convites"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16 }}
                    transition={{ duration: 0.2 }}
                    className="p-7"
                  >
                    {/* Back + header */}
                    <div className="flex items-center gap-3 mb-6">
                      <button
                        onClick={() => setStep('explicacao')}
                        className="p-1.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-alt/60 transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal font-mono">Passo 2 de 2</p>
                        <h2 className="font-heading text-xl text-text-primary">Convide sua equipe</h2>
                      </div>
                    </div>

                    {/* Progresso N/2 */}
                    <div className="flex items-center gap-3 mb-6 p-4 rounded-2xl bg-surface-alt border border-border/60">
                      <div className="flex items-center gap-2 flex-1">
                        {[1, 2].map((n) => {
                          const ativo = n <= participantesPrevistos;
                          return (
                            <div
                              key={n}
                              className={[
                                'w-9 h-9 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all duration-300',
                                ativo
                                  ? 'border-teal bg-teal/10 text-teal'
                                  : 'border-border bg-surface text-text-secondary',
                              ].join(' ')}
                            >
                              {ativo ? <Check className="w-4 h-4 stroke-[3]" /> : n}
                            </div>
                          );
                        })}
                        <div className="flex-1" />
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-text-primary">{participantesPrevistos}/2</p>
                        <p className="text-xs text-text-secondary">
                          {faltam === 0 ? 'Equipe prevista' : `Falta ${faltam} convite`}
                        </p>
                      </div>
                    </div>

                    {/* Input de convite */}
                    <div className="space-y-2 mb-4">
                      <label className="text-xs font-bold text-text-secondary uppercase tracking-widest flex items-center gap-1.5">
                        <Mail className="w-3 h-3" /> E-mail do colega
                      </label>
                      <div className="flex gap-2">
                        <input
                          ref={emailInputRef}
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void handleEnviarConvite(); } }}
                          placeholder="dr.colega@email.com"
                          disabled={enviando}
                          className="flex-1 text-sm px-4 py-3 rounded-xl border border-border bg-surface-alt text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-teal/20 focus:border-teal transition-all"
                        />
                        <button
                          onClick={handleEnviarConvite}
                          disabled={enviando || !email.trim()}
                          className="flex items-center gap-1.5 px-4 py-3 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-50"
                          style={{ background: 'linear-gradient(135deg, #2f9c85, #1e7a67)' }}
                        >
                          {enviando
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <><ChevronRight className="w-4 h-4" /></>
                          }
                        </button>
                      </div>
                    </div>

                    {/* Lista de convites desta sessão */}
                    {convidosEnviados.length > 0 && (
                      <div className="space-y-2 mb-5">
                        <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Convites enviados</p>
                        {convidosEnviados.map((e) => (
                          <div key={e} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-surface-alt border border-border/60">
                            <div className="w-5 h-5 rounded-full bg-teal/10 flex items-center justify-center shrink-0">
                              <Check className="w-3 h-3 text-teal stroke-[3]" />
                            </div>
                            <span className="text-xs font-mono text-text-primary truncate">{e}</span>
                            <span className="text-[10px] text-amber-500 font-bold ml-auto shrink-0">Pendente</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Nota */}
                    <div className="flex items-start gap-2 mb-5">
                      <Users className="w-3.5 h-3.5 text-text-secondary shrink-0 mt-0.5" />
                      <p className="text-[11px] text-text-secondary leading-relaxed">
                        A formação vence em 48 horas. Cada colega escolhe mensal/anual e adiciona o próprio cartão.
                      </p>
                    </div>

                    <button
                      onClick={() => void handleAdicionarCartao()}
                      disabled={ativando}
                      className="mb-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-teal px-4 text-sm font-bold text-white disabled:opacity-50"
                    >
                      {ativando ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                      Adicionar meu cartão sem cobrar agora
                    </button>

                    {/* Fechar / ir para equipe */}
                    <button
                      onClick={handleClose}
                      className="w-full py-3 rounded-2xl border border-border text-sm font-bold text-text-secondary hover:text-text-primary hover:bg-surface-alt transition-all"
                    >
                      Voltar para Clínica
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
