'use client';

import { motion } from 'motion/react';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Envolve o conteúdo de qualquer página com uma animação de entrada suave.
 * Usar como wrapper raiz em Server Components que entregam páginas ao usuário.
 */
export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      // R-129a — a rota já chegou com conteúdo server-rendered. Escondê-lo até o
      // JavaScript montar cria a impressão de tela vazia e piora a navegação lenta.
      // Mantemos Motion como wrapper para transições locais, mas sem animação de
      // entrada global que bloqueie o primeiro paint.
      initial={false}
      className={className}
    >
      {children}
    </motion.div>
  );
}
