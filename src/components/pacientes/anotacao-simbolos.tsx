import type { CSSProperties } from 'react';
import type { TipoAnotacaoRadiografia } from '@/hooks/usePlanejamentoPaciente';

// R-99 — paleta de anotação + símbolos portados de Odontograma.tsx (canal, coroa,
// implante, pino, extração). Geometria portada e verificada por script
// (gen-symbols.js, plans/artefatos/R-99), não aproximada no olho. Implante usa a
// mesma largura nova do D9 (Odontograma.tsx G.impHwColo). Extração usa o mesmo X
// e o mesmo frame de coroa que o odontograma real desenha (Odontograma.tsx:697).
//
// Extraído de ApresentarPanel.tsx (10/08) — o overlay interativo
// (anotacao-overlay-imagem.tsx) também precisa desenhar os mesmos símbolos, então
// vira módulo próprio em vez de viver só dentro do painel.

export const ANOTACAO_TIPOS: { tipo: TipoAnotacaoRadiografia; label: string }[] = [
  { tipo: 'endodontia', label: 'Canal' },
  { tipo: 'coroa', label: 'Coroa' },
  { tipo: 'implante', label: 'Implante' },
  { tipo: 'pino_nucleo', label: 'Pino' },
  { tipo: 'exodontia', label: 'Extração' },
];

export function AnotacaoIcone({
  tipo, className, style,
}: {
  tipo: TipoAnotacaoRadiografia;
  className?: string;
  /** Presentation slide usa cor hardcoded (#ef9a9a) — mesmo padrão do resto do slide, que
   *  não segue token/tema (fundo sempre #080c0b). Editor usa className (text-coral). */
  style?: CSSProperties;
}) {
  switch (tipo) {
    case 'endodontia':
      return (
        <svg viewBox="10 4.8 21 34.4" className={className} style={style}>
          <path
            d="M 13.0 6.8 L 27.0 6.8 C 27.0 18.7 28.9 29.7 26.1 36.4 L 25.1 37.2 C 21.4 29.7 13.9 18.7 13.0 6.8 Z"
            fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round"
          />
        </svg>
      );
    case 'coroa':
      // D16 (10/08, v2) — silhueta só da coroa do dente (sem raiz) por fora, hachura
      // ORIGINAL (mesmas 3 linhas de sempre) por dentro. 1a tentativa (dente inteiro +
      // linha de capa) foi rejeitada — "ficou muito ruim". Cor ainda pendente (D5 — é
      // a mesma cor dos outros 4, trocar aqui troca em todos).
      return (
        <svg viewBox="0 8 40 34" className={className} style={style}>
          <path
            d="M 4,26 Q 4,12 20,12 Q 36,12 36,26 L 36,32 Q 36,38 30,38 L 10,38 Q 4,38 4,32 Z"
            fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round"
          />
          <path d="M 8,32 L 22.7,10.5" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
          <path d="M 16,32 L 30.7,10.5" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
          <path d="M 24,32 L 32,18.8" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
        </svg>
      );
    case 'implante':
      return (
        <svg viewBox="13.4 35.8 24.3 39.0" className={className} style={style}>
          <path
            d="M 18.859375,45 L 32.140625,45 L 32.140625,45 L 29.379305555555558,47.259302325581395 L 31.37326388888889,49.51860465116279 L 28.903541666666666,51.777906976744184 L 30.60590277777778,54.037209302325586 L 28.427777777777777,56.29651162790698 L 29.838541666666668,58.55581395348837 L 27.95201388888889,60.81511627906977 L 29.071180555555557,63.07441860465117 L 27.47625,65.33372093023256 L 28.303819444444443,67.59302325581396 Q 25.5,72.31395348837209 22.696180555555557,67.59302325581396 L 23.52375,65.33372093023256 L 21.928819444444443,63.07441860465117 L 23.04798611111111,60.81511627906977 L 21.161458333333332,58.55581395348837 L 22.572222222222223,56.29651162790698 L 20.39409722222222,54.037209302325586 L 22.096458333333334,51.777906976744184 L 19.62673611111111,49.51860465116279 L 21.620694444444442,47.259302325581395 L 18.859375,45 Z"
            fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round"
          />
          <rect x="15.9" y="38.3" width="19.3" height="4.3" rx="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'pino_nucleo':
      return (
        <svg viewBox="18.7 31.3 13.7 37.8" className={className} style={style}>
          <path
            d="M 23.2458,33.75 L 27.7542,33.75 L 29.835,42.3 L 27.3207,45 L 26.41035,66.5813953488372 L 24.58965,66.5813953488372 L 23.6793,45 L 21.165,42.3 Z"
            fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round"
          />
        </svg>
      );
    case 'exodontia':
      // X sobre um retângulo próprio — voltou a ser independente do frame da coroa
      // (decisão dele 10/08: manter simples, "é só um X", não seguir a coroa virando
      // silhueta de dente). Mesmas frações de Odontograma.tsx:697.
      return (
        <svg viewBox="0 8 40 34" className={className} style={style}>
          <rect x="4" y="12" width="32" height="26" rx="6" fill="none" stroke="currentColor" strokeWidth={1.6} />
          <path d="M 12,13.9 L 28,34.3" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
          <path d="M 28,13.9 L 12,34.3" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
        </svg>
      );
  }
}
