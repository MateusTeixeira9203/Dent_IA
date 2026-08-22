'use client';

import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, AudioLines, ClipboardCheck, Sparkles } from 'lucide-react';
import { DexMark } from '@/components/dex/dex-mark';

const GESTOS = [
  { icon: AudioLines, etapa: 'Você atende', descricao: 'Fale ou escreva como a consulta aconteceu.' },
  { icon: Sparkles, etapa: 'O Dex organiza', descricao: 'Dentes, procedimentos e condutas viram uma ficha estruturada.' },
  { icon: ClipboardCheck, etapa: 'Você confirma', descricao: 'Revise tudo antes de salvar no prontuário.' },
] as const;

interface DexApresentacaoProps {
  onContinuar: () => void;
  onPular: () => void;
  pendente?: boolean;
}

export function DexApresentacao({ onContinuar, onPular, pendente = false }: DexApresentacaoProps) {
  const reduzirMovimento = useReducedMotion();

  return (
    <motion.section
      aria-labelledby="dex-apresentacao-titulo"
      initial={reduzirMovimento ? { opacity: 0 } : { opacity: 0, y: 8, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={reduzirMovimento ? { opacity: 0 } : { opacity: 0, y: -6, filter: 'blur(3px)' }}
      transition={{ duration: reduzirMovimento ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden rounded-3xl border border-border bg-surface shadow-sm"
    >
      <div className="grid lg:grid-cols-[0.82fr_1.18fr]">
        <div className="flex flex-col justify-between border-b border-border bg-surface-alt p-6 sm:p-8 lg:border-b-0 lg:border-r">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-teal">Seu assistente clínico</p>
            <div className="mt-6 flex items-center gap-4">
              <DexMark size={72} shape="squircle" expression="feliz" animated={!reduzirMovimento} />
              <div>
                <p className="text-sm font-semibold text-text-secondary">Prazer, eu sou o</p>
                <p className="font-heading text-4xl text-text-primary">Dex.</p>
              </div>
            </div>
            <p className="mt-6 max-w-sm text-sm leading-6 text-text-secondary">
              Você mantém o foco no paciente. Eu transformo o relato da consulta em uma ficha organizada, pronta para você revisar.
            </p>
          </div>
          <div className="mt-8 flex items-center gap-2 border-t border-border pt-4 text-xs font-semibold text-text-primary">
            <ClipboardCheck className="h-4 w-4 shrink-0 text-teal" /> Nada é salvo sem a sua confirmação.
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-text-secondary">Um fluxo em três gestos</p>
          <h1 id="dex-apresentacao-titulo" className="mt-2 max-w-xl font-heading text-3xl text-text-primary sm:text-4xl">
            Da conversa ao prontuário, sem redigitar.
          </h1>
          <motion.ol
            initial="oculto"
            animate="visivel"
            variants={{ oculto: {}, visivel: { transition: { staggerChildren: reduzirMovimento ? 0 : 0.07, delayChildren: reduzirMovimento ? 0 : 0.08 } } }}
            className="mt-7 grid gap-3 sm:grid-cols-3"
          >
            {GESTOS.map((gesto, indice) => {
              const Icon = gesto.icon;
              return (
                <motion.li
                  key={gesto.etapa}
                  variants={{ oculto: { opacity: 0, y: reduzirMovimento ? 0 : 8 }, visivel: { opacity: 1, y: 0 } }}
                  transition={{ duration: reduzirMovimento ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="rounded-2xl border border-border bg-surface-alt p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal/10 text-teal"><Icon className="h-4 w-4" /></span>
                    <span className="font-mono text-[10px] text-text-muted">0{indice + 1}</span>
                  </div>
                  <p className="mt-4 text-sm font-bold text-text-primary">{gesto.etapa}</p>
                  <p className="mt-1 text-xs leading-5 text-text-secondary">{gesto.descricao}</p>
                </motion.li>
              );
            })}
          </motion.ol>
          <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:items-center">
            <motion.button
              type="button"
              onClick={onContinuar}
              disabled={pendente}
              whileTap={reduzirMovimento ? undefined : { scale: 0.98 }}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-teal px-5 text-sm font-bold text-white transition-colors hover:bg-teal-lt disabled:opacity-60"
            >
              Conhecer o Meu Dia <ArrowRight className="h-4 w-4" />
            </motion.button>
            <button type="button" onClick={onPular} disabled={pendente} className="min-h-12 px-4 text-sm font-semibold text-text-secondary transition-colors hover:text-text-primary disabled:opacity-60">
              Pular apresentação
            </button>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
