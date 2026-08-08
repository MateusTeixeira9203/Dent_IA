'use client';

// R-77 — extraído de TextoVisita (historico-bloco.tsx, G7 do R-58): mesma lógica de
// clamp+"ver mais", generalizada por `clampLines` pra também servir a observação do
// RegistroCard (2 linhas) sem duplicar a medição de overflow.

import { useEffect, useRef, useState } from 'react';

// Tailwind precisa ver a classe completa como string literal (JIT scanner) — um template
// `line-clamp-${n}` não gera CSS. Só os 2 valores que a casa usa hoje.
const CLAMP_CLASS: Record<number, string> = {
  2: 'line-clamp-2',
  4: 'line-clamp-4',
};

export interface TextoExpansivelProps {
  texto: string;
  /** Default 4 — mesmo comportamento que TextoVisita sempre teve. */
  clampLines?: number;
  /** Tipografia do <p> — cada chamador mantém a própria (a casa não impõe 1 estilo aqui). */
  className?: string;
}

/** G7 — corta em `clampLines` linhas com "ver mais", só quando o texto REALMENTE transborda
 *  (mede scrollHeight vs clientHeight do próprio parágrafo clampado, não um chute por tamanho
 *  de string). */
export function TextoExpansivel({ texto, clampLines = 4, className = '' }: TextoExpansivelProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [transbordou, setTransbordou] = useState(false);
  const [expandido, setExpandido] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (el) setTransbordou(el.scrollHeight > el.clientHeight + 1);
  }, [texto]);

  return (
    <div className="flex flex-col gap-1">
      <p
        ref={ref}
        className={`${className} ${expandido ? '' : CLAMP_CLASS[clampLines]}`}
      >
        {texto}
      </p>
      {(transbordou || expandido) && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpandido((v) => !v);
          }}
          className="w-fit text-[11px] font-semibold text-text-secondary hover:text-teal-ink"
        >
          {expandido ? 'mostrar menos ↑' : 'ver mais ↓'}
        </button>
      )}
    </div>
  );
}
