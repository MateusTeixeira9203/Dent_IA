'use client';

import { useState, useTransition } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Check, RotateCcw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { DexBoasVindas } from './dex-boas-vindas';
import {
  escolherPrimeiroAtendimento,
  iniciarOnboardingClinico,
  pularOnboardingClinico,
} from '../onboarding-actions';
import type { ProgressoOnboarding } from '@/types/onboarding';

interface DexOnboardingControllerProps {
  progresso: ProgressoOnboarding;
  primeiraSessao: boolean;
  podeUsarDemo: boolean;
  emFormacaoClinica: boolean;
  onAtenderReal: () => void;
}

const EXEMPLO = 'Paciente relatou sensibilidade no dente 16. Fiz restauração oclusal com resina composta. O dente 46 fica para a próxima sessão.';

function DemonstracaoPrimeiroValor({ onAtenderReal, onFechar }: {
  onAtenderReal: () => void;
  onFechar: () => void;
}) {
  const reduzirMovimento = useReducedMotion();
  const [organizado, setOrganizado] = useState(false);

  return (
    <motion.section
      initial={{ opacity: 0, y: reduzirMovimento ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: reduzirMovimento ? 0 : -6 }}
      transition={{ duration: reduzirMovimento ? 0 : 0.2, ease: 'easeOut' }}
      className="rounded-2xl border border-teal/30 bg-surface p-4 sm:p-5"
      aria-label="Demonstração descartável do Campo Mágico"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-teal">Demonstração</p>
          <h2 className="mt-1 font-heading text-xl text-text-primary">Veja a ficha nascer sem cadastrar ninguém</h2>
          <p className="mt-1 text-sm text-text-secondary">Este exemplo fica somente neste navegador e será descartado ao sair.</p>
        </div>
        <button type="button" onClick={onFechar} className="min-h-10 text-sm font-semibold text-text-secondary hover:text-text-primary">
          Fechar
        </button>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-surface-alt p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-text-secondary">Campo Mágico</p>
        <p className="mt-3 text-sm leading-relaxed text-text-primary">{EXEMPLO}</p>
        {!organizado && (
          <button
            type="button"
            onClick={() => setOrganizado(true)}
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-teal px-4 text-sm font-bold text-white hover:bg-teal-lt"
          >
            <Sparkles className="h-4 w-4" /> Organizar com Dex
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {organizado && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: reduzirMovimento ? 0 : 0.22, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-surface p-3">
                <p className="text-sm font-bold text-text-primary">Restauração · dente 16</p>
                <p className="mt-1 text-xs text-text-secondary">Oclusal · resina composta</p>
                <span className="mt-3 inline-flex rounded-full bg-teal/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-teal">Realizado</span>
              </div>
              <div className="rounded-xl border border-border bg-surface p-3">
                <p className="text-sm font-bold text-text-primary">Dente 46</p>
                <p className="mt-1 text-xs text-text-secondary">Conduta reservada para a próxima sessão</p>
                <span className="mt-3 inline-flex rounded-full bg-warning-pale px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-warning-ink">A fazer</span>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row">
              <button type="button" onClick={onAtenderReal} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-teal px-4 text-sm font-bold text-white hover:bg-teal-lt">
                Atender paciente real <ArrowRight className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => setOrganizado(false)} className="inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm font-semibold text-text-secondary hover:text-text-primary">
                <RotateCcw className="h-4 w-4" /> Ver novamente
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

export function DexOnboardingController({
  progresso,
  primeiraSessao,
  podeUsarDemo,
  emFormacaoClinica,
  onAtenderReal,
}: DexOnboardingControllerProps) {
  const [progressoLocal, setProgressoLocal] = useState(progresso);
  const [demoAberta, setDemoAberta] = useState(false);
  const [pendente, startTransition] = useTransition();

  if (!primeiraSessao || progressoLocal.etapa === 'concluido' || progressoLocal.etapa === 'pulado') return null;

  const comResultado = (acao: () => Promise<Awaited<ReturnType<typeof iniciarOnboardingClinico>>>, depois?: () => void) => {
    startTransition(async () => {
      const resultado = await acao();
      if (!resultado.ok) {
        // O progresso é telemetria de ajuda, não pré-requisito clínico. Se a migration
        // ainda não estiver disponível ou a rede falhar, o dentista continua trabalhando.
        toast.warning('Seu progresso não pôde ser salvo agora, mas você pode continuar.');
        depois?.();
        return;
      }
      setProgressoLocal(resultado.progresso);
      depois?.();
    });
  };

  const abrirAtendimentoReal = () => comResultado(
    () => iniciarOnboardingClinico(),
    onAtenderReal,
  );

  if (demoAberta) {
    return (
      <DemonstracaoPrimeiroValor
        onFechar={() => setDemoAberta(false)}
        onAtenderReal={() => {
          setDemoAberta(false);
          abrirAtendimentoReal();
        }}
      />
    );
  }

  return (
    <div className="space-y-2">
      {emFormacaoClinica && (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-alt px-3 py-2 text-xs text-text-secondary">
          <Check className="h-4 w-4 shrink-0 text-teal" />
          Clínica em formação: você já pode atender enquanto o convite é aceito.
        </div>
      )}
      <DexBoasVindas
        pendente={pendente}
        onComecar={abrirAtendimentoReal}
        onDemonstracao={() => {
          if (!podeUsarDemo) return;
          comResultado(
            () => escolherPrimeiroAtendimento('demonstracao'),
            () => setDemoAberta(true),
          );
        }}
        onPular={() => comResultado(
          () => pularOnboardingClinico(),
          () => setProgressoLocal({ ...progressoLocal, etapa: 'pulado', podeRetomar: false }),
        )}
      />
    </div>
  );
}
