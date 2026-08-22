'use client';

import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, AudioLines, ClipboardCheck, FlaskConical, UserRound } from 'lucide-react';
import { DexMark } from '@/components/dex/dex-mark';

const PASSOS = [
  { icon: UserRound, titulo: 'Escolha o paciente', texto: 'Use alguém cadastrado ou crie um cadastro rápido.' },
  { icon: AudioLines, titulo: 'Conte a consulta', texto: 'Fale ou cole o relato no Campo Mágico.' },
  { icon: ClipboardCheck, titulo: 'Revise e salve', texto: 'Você confirma a ficha antes de entrar no prontuário.' },
] as const;

interface DexBoasVindasProps {
  onComecar: () => void;
  onDemonstracao: () => void;
  onPular: () => void;
  pendente?: boolean;
}

export function DexBoasVindas({ onComecar, onDemonstracao, onPular, pendente = false }: DexBoasVindasProps) {
  const reduzirMovimento = useReducedMotion();

  return (
    <motion.section
      aria-labelledby="dex-primeiro-atendimento-titulo"
      initial={reduzirMovimento ? { opacity: 0 } : { opacity: 0, y: 8, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: reduzirMovimento ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden rounded-2xl border border-teal/25 bg-surface"
    >
      <div className="grid lg:grid-cols-[0.72fr_1.28fr]">
        <div className="flex gap-4 border-b border-border bg-teal/5 p-5 sm:p-6 lg:border-b-0 lg:border-r">
          <DexMark size={52} shape="squircle" expression="atento" animated={false} />
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-teal">Seu primeiro atendimento</p>
            <h2 id="dex-primeiro-atendimento-titulo" className="mt-2 font-heading text-2xl text-text-primary">Vamos montar sua primeira ficha juntos.</h2>
            <p className="mt-2 text-sm leading-6 text-text-secondary">Eu acompanho somente o próximo passo. Você continua no controle o tempo todo.</p>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <motion.ol
            initial="oculto"
            animate="visivel"
            variants={{ oculto: {}, visivel: { transition: { staggerChildren: reduzirMovimento ? 0 : 0.06 } } }}
            className="grid gap-3 md:grid-cols-3"
          >
            {PASSOS.map((passo, indice) => {
              const Icon = passo.icon;
              return (
                <motion.li
                  key={passo.titulo}
                  variants={{ oculto: { opacity: 0, y: reduzirMovimento ? 0 : 6 }, visivel: { opacity: 1, y: 0 } }}
                  transition={{ duration: reduzirMovimento ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="rounded-xl border border-border bg-surface-alt p-3.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal/10 text-teal"><Icon className="h-4 w-4" /></span>
                    <span className="font-mono text-[10px] text-text-muted">0{indice + 1}</span>
                  </div>
                  <p className="mt-3 text-sm font-bold text-text-primary">{passo.titulo}</p>
                  <p className="mt-1 text-xs leading-5 text-text-secondary">{passo.texto}</p>
                </motion.li>
              );
            })}
          </motion.ol>

          <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 xl:flex-row xl:items-center xl:justify-between">
            <p className="flex items-center gap-2 text-xs font-semibold text-text-primary">
              <ClipboardCheck className="h-4 w-4 shrink-0 text-teal" /> Nada entra no prontuário sem a sua revisão.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <motion.button
                type="button"
                onClick={onComecar}
                disabled={pendente}
                whileTap={reduzirMovimento ? undefined : { scale: 0.98 }}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-teal px-4 text-sm font-bold text-white transition-colors hover:bg-teal-lt disabled:opacity-60"
              >
                Atender paciente real <ArrowRight className="h-4 w-4" />
              </motion.button>
              <button type="button" onClick={onDemonstracao} disabled={pendente} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-surface-alt px-4 text-sm font-semibold text-text-primary transition-colors hover:border-teal/40 disabled:opacity-60">
                <FlaskConical className="h-4 w-4 text-teal" /> Testar com exemplo
              </button>
              <button type="button" onClick={onPular} disabled={pendente} className="min-h-11 px-3 text-sm font-semibold text-text-secondary transition-colors hover:text-text-primary disabled:opacity-60">Agora não</button>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
