'use client';

import { useLayoutEffect, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { OdontoIALogo } from '@/components/ui/dent-ia-logo';

type LaunchPhase = 'still' | 'brand' | 'exit' | 'done';

interface PwaLaunchIntroProps {
  children: ReactNode;
}

function finalizarAbertura(): void {
  document.documentElement.removeAttribute('data-pwa-launch');
}

/**
 * A splash do sistema termina antes de o JavaScript da PWA existir. O script crítico no
 * RootLayout revela esta primeira tela já no HTML; aqui apenas conduzimos a segunda etapa e
 * só liberamos a rota depois dela, para não haver um flash do dashboard entre as duas telas.
 */
export function PwaLaunchIntro({ children }: PwaLaunchIntroProps): React.JSX.Element {
  const [fase, setFase] = useState<LaunchPhase>('still');
  const reduzirMotion = useReducedMotion();

  useLayoutEffect(() => {
    const deveAbrir = document.documentElement.dataset.pwaLaunch === 'pending';

    if (!deveAbrir || reduzirMotion) {
      finalizarAbertura();
      const concluirSemAnimacao = window.setTimeout(() => setFase('done'), 0);
      return () => window.clearTimeout(concluirSemAnimacao);
    }

    const revelarMarca = window.setTimeout(() => setFase('brand'), 260);
    const sair = window.setTimeout(() => setFase('exit'), 980);
    const concluir = window.setTimeout(() => {
      finalizarAbertura();
      setFase('done');
    }, 1180);

    return () => {
      window.clearTimeout(revelarMarca);
      window.clearTimeout(sair);
      window.clearTimeout(concluir);
    };
  }, [reduzirMotion]);

  const marcaVisivel = fase === 'brand' || fase === 'exit';
  const saindo = fase === 'exit';

  return (
    <>
      <div className="pwa-launch-content">{children}</div>

      {fase !== 'done' && (
        <motion.div
          aria-hidden="true"
          className="pwa-launch-intro fixed inset-0 z-[100] items-center justify-center overflow-hidden bg-brand-charcoal"
          initial={false}
          animate={{ opacity: saindo ? 0 : 1 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="relative h-16 w-72">
            <motion.div
              className="absolute top-1/2 left-1/2 -mt-7 -ml-7 text-teal will-change-transform"
              initial={false}
              animate={{ x: marcaVisivel ? -64 : 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <OdontoIALogo className="h-14 w-14" />
            </motion.div>

            <motion.p
              className="absolute top-1/2 left-1/2 m-0 -mt-4 ml-1 whitespace-nowrap font-heading text-3xl tracking-tight text-text-primary will-change-transform"
              initial={{ opacity: 0, x: 14, filter: 'blur(2px)' }}
              animate={marcaVisivel
                ? { opacity: 1, x: 0, filter: 'blur(0px)' }
                : { opacity: 0, x: 14, filter: 'blur(2px)' }}
              transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            >
              Odonto.IA
            </motion.p>

            <motion.p
              className="absolute inset-x-0 top-[calc(50%+3rem)] m-0 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted"
              initial={{ opacity: 0 }}
              animate={{ opacity: marcaVisivel ? 1 : 0 }}
              transition={{ duration: 0.2, delay: marcaVisivel ? 0.14 : 0, ease: [0.22, 1, 0.36, 1] }}
            >
              Abrindo seu consultório
            </motion.p>
          </div>
        </motion.div>
      )}
    </>
  );
}
