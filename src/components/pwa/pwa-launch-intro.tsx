'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { OdontoIALogo } from '@/components/ui/dent-ia-logo';

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

function estaEmStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as NavigatorWithStandalone).standalone === true;
}

/**
 * A abertura nativa do PWA pertence ao sistema operacional e é estática. Esta camada assume
 * assim que o React hidrata: só em standalone, sem depender de dados e sem reaparecer ao trocar
 * de rota (o RootLayout permanece montado).
 */
export function PwaLaunchIntro(): React.JSX.Element | null {
  const [visivel, setVisivel] = useState(true);
  const [wordmarkVisivel, setWordmarkVisivel] = useState(false);
  const reduzirMotion = useReducedMotion();

  useEffect(() => {
    if (!estaEmStandalone()) {
      const esconderNoNavegador = window.setTimeout(() => setVisivel(false), 0);
      return () => window.clearTimeout(esconderNoNavegador);
    }

    if (reduzirMotion) {
      const removerImediato = window.setTimeout(() => setVisivel(false), 0);
      return () => window.clearTimeout(removerImediato);
    }

    const revelarWordmark = window.setTimeout(() => setWordmarkVisivel(true), 90);
    // 300 ms de composição + saída de 120 ms = no máximo 420 ms sobre o conteúdo.
    const fechar = window.setTimeout(() => setVisivel(false), 300);
    return () => {
      window.clearTimeout(revelarWordmark);
      window.clearTimeout(fechar);
    };
  }, [reduzirMotion]);

  const duracao = reduzirMotion ? 0 : 0.2;

  return (
    <AnimatePresence>
      {visivel && (
        <motion.div
          aria-hidden="true"
          className="pwa-launch-intro fixed inset-0 z-[100] items-center justify-center overflow-hidden bg-brand-charcoal"
          initial={false}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduzirMotion ? 0 : 0.12, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="relative h-16 w-64">
            <motion.div
              className="absolute top-1/2 left-1/2 -mt-7 -ml-7 text-teal"
              animate={{ x: wordmarkVisivel ? -52 : 0 }}
              transition={{ duration: duracao, ease: [0.22, 1, 0.36, 1] }}
            >
              <OdontoIALogo className="h-14 w-14" />
            </motion.div>
            <motion.p
              className="absolute top-1/2 left-1/2 m-0 -mt-4 ml-4 whitespace-nowrap font-heading text-3xl tracking-tight text-text-primary"
              initial={{ opacity: 0, x: 12, filter: 'blur(2px)' }}
              animate={wordmarkVisivel
                ? { opacity: 1, x: 0, filter: 'blur(0px)' }
                : { opacity: 0, x: 12, filter: 'blur(2px)' }}
              transition={{ duration: reduzirMotion ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] }}
            >
              Odonto.IA
            </motion.p>
            <motion.p
              className="absolute inset-x-0 top-[calc(50%+3rem)] m-0 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted"
              initial={{ opacity: 0 }}
              animate={{ opacity: wordmarkVisivel ? 1 : 0 }}
              transition={{ duration: reduzirMotion ? 0 : 0.12, delay: reduzirMotion ? 0 : 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
              Abrindo seu consultório
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
