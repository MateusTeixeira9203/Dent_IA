'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { OdontoIALogo } from '@/components/ui/dent-ia-logo';

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

function estaEmPwaInstalado(): boolean {
  const emModoAplicativo = ['standalone', 'fullscreen', 'minimal-ui']
    .some((modo) => window.matchMedia(`(display-mode: ${modo})`).matches);

  return emModoAplicativo
    || (window.navigator as NavigatorWithStandalone).standalone === true
    || document.referrer.startsWith('android-app://');
}

/**
 * A abertura nativa do PWA pertence ao sistema operacional e é estática. Esta camada assume
 * assim que o React hidrata: só em standalone, sem depender de dados e sem reaparecer ao trocar
 * de rota (o RootLayout permanece montado).
 */
export function PwaLaunchIntro(): React.JSX.Element | null {
  const [visivel, setVisivel] = useState(true);
  const [pwaAtivo, setPwaAtivo] = useState(false);
  const [wordmarkVisivel, setWordmarkVisivel] = useState(false);
  const reduzirMotion = useReducedMotion();

  useEffect(() => {
    if (!estaEmPwaInstalado() || reduzirMotion) return;

    // A ativação só acontece no cliente. Assim a proteção do CSS não pode esconder a
    // abertura no WebAPK Android depois da splash nativa.
    const ativar = window.setTimeout(() => setPwaAtivo(true), 0);
    // O símbolo precisa repousar antes de revelar a marca; sem isso a transição parece um flash.
    const revelarWordmark = window.setTimeout(() => setWordmarkVisivel(true), 180);
    // 820 ms de composição + saída de 180 ms = cerca de 1 s sobre o conteúdo, sem esperar dados.
    const fechar = window.setTimeout(() => setVisivel(false), 820);
    return () => {
      window.clearTimeout(ativar);
      window.clearTimeout(revelarWordmark);
      window.clearTimeout(fechar);
    };
  }, [reduzirMotion]);

  const duracao = reduzirMotion ? 0 : 0.38;

  return (
    <AnimatePresence>
      {visivel && pwaAtivo && (
        <motion.div
          aria-hidden="true"
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-brand-charcoal"
          initial={false}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduzirMotion ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] }}
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
              transition={{ duration: reduzirMotion ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              Odonto.IA
            </motion.p>
            <motion.p
              className="absolute inset-x-0 top-[calc(50%+3rem)] m-0 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted"
              initial={{ opacity: 0 }}
              animate={{ opacity: wordmarkVisivel ? 1 : 0 }}
              transition={{ duration: reduzirMotion ? 0 : 0.18, delay: reduzirMotion ? 0 : 0.14, ease: [0.22, 1, 0.36, 1] }}
            >
              Abrindo seu consultório
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
