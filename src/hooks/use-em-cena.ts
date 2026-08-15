'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

interface OpcoesEmCena {
  /** Fração do elemento visível para disparar. */
  threshold?: number;
  rootMargin?: string;
  /**
   * Rede de segurança: conteúdo escondido por animação que não dispara é conversão
   * zero. Se o observer não tiver disparado até aqui, entra em cena na marra.
   */
  redeMs?: number;
}

/**
 * Dispara uma vez, quando o elemento entra em cena, e nunca mais.
 * Sem IntersectionObserver (ou sem JS de layout), entra em cena imediatamente.
 *
 * `refExterna` permite observar o MESMO nó com dois limiares diferentes — é o caso
 * dos passos da landing: um para revelar o bloco, outro (mais tarde) para encenar.
 */
export function useEmCena<T extends HTMLElement>(
  opcoes: OpcoesEmCena = {},
  refExterna?: RefObject<T | null>,
): [RefObject<T | null>, boolean] {
  const { threshold = 0.05, rootMargin = '0px', redeMs = 2500 } = opcoes;
  const refInterna = useRef<T>(null);
  const ref = refExterna ?? refInterna;
  const [emCena, setEmCena] = useState(false);

  useEffect(() => {
    const alvo = ref.current;
    const suportado = typeof IntersectionObserver !== 'undefined';
    // Sem observer (ou sem nó), a rede é imediata: melhor entrar em cena cedo demais
    // do que ficar invisível.
    const rede = window.setTimeout(() => setEmCena(true), alvo && suportado ? redeMs : 0);

    if (!alvo || !suportado) return () => window.clearTimeout(rede);

    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (entrada.isIntersecting) {
            setEmCena(true);
            observador.disconnect();
          }
        }
      },
      { threshold, rootMargin },
    );
    observador.observe(alvo);

    return () => {
      observador.disconnect();
      window.clearTimeout(rede);
    };
  }, [ref, threshold, rootMargin, redeMs]);

  return [ref, emCena];
}
