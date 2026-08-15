// Odontograma da landing — a geometria vem da PRODUÇÃO (tooth-geometry.ts), não de
// uma cópia: aproximar no olho já produziu artefato pior que a tela real (22/07).
// Arcada superior = a mesma geometria espelhada em scale(1,-1), que é exatamente o
// que crownPathOcclusalBottom/rootPathUp produzem.

import {
  DIMS,
  TOOTH_CLASS,
  TOOTH_FAMILY,
  crownPathOcclusalTop,
  rootPathDown,
} from '@/components/odontograma/tooth-geometry';

type Estado = 'teal' | 'coral' | 'slate';

/** Conta a história que o hero narra: 16 restaurado por você, 46 pendente. */
const ESTADOS: Record<number, Estado> = { 16: 'teal', 24: 'teal', 26: 'slate', 36: 'slate', 37: 'coral', 46: 'coral' };
const COR: Record<Estado, string> = { teal: 'var(--teal)', coral: 'var(--coral)', slate: 'var(--slate)' };

const SUP = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const INF = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
const GAP = 4;
const PAD_NUM = 15;

/** Ordem em que os dentes com estado acendem — a mesma da leitura, de cima pra baixo. */
const ORDEM_ACENDER = [...SUP, ...INF].filter((n) => ESTADOS[n]);
const MS_ANTES = 260;
const MS_ENTRE = 130;

const q = (n: number): string => n.toFixed(1);

function Arcada({ nums, espelhar, aceso, rotulo }: { nums: number[]; espelhar: boolean; aceso: boolean; rotulo: string }) {
  const dados = nums.map((n) => {
    const cls = TOOTH_CLASS[n];
    return { n, fam: TOOTH_FAMILY[cls], ...DIMS[cls] };
  });
  const largura = dados.reduce((s, d) => s + d.w, 0) + GAP * (dados.length - 1);
  const maxAlt = Math.max(...dados.map((d) => d.crownH + d.rootH));
  const total = maxAlt + PAD_NUM;

  // O PLANO OCLUSAL TEM QUE FICAR ALINHADO — é a linha da mordida, não pode serrilhar
  // entre canino e molar. Cada dente é deslocado pela própria altura; os ápices é que
  // ficam irregulares, como na anatomia real.
  //   superior (espelhado): oclusal encosta EMBAIXO, em y = total; ápices sobem
  //   inferior:             oclusal encosta EM CIMA, em y = PAD_NUM; ápices descem
  const posX: number[] = [];
  for (let i = 0, acc = 0; i < dados.length; i++) {
    posX.push(acc);
    acc += dados[i].w + GAP;
  }

  const dentes = dados.map((d, i) => {
    const h = d.crownH + d.rootH;
    const ty = espelhar ? total - h : 0;
    const estado = ESTADOS[d.n];
    const atraso = estado ? MS_ANTES + ORDEM_ACENDER.indexOf(d.n) * MS_ENTRE : 0;
    const meuX = posX[i];

    return (
      <g key={d.n} className="dente" style={{ animationDelay: `${(0.35 + i * 0.012).toFixed(3)}s` }}>
        <g transform={`translate(${q(meuX)} ${q(ty)})`}>
          <g transform={espelhar ? `translate(0 ${q(h)}) scale(1 -1)` : undefined}>
            <path
              d={rootPathDown(d.w, d.crownH, d.rootH, d.fam)}
              fill="var(--dente)"
              stroke="var(--dente-borda)"
              strokeWidth="1"
            />
            {/* Nasce NEUTRO e recebe o estado quando o passo entra em cena — a ficha
                "se montando" é a promessa do passo, então acontece na frente do leitor. */}
            <path
              className="coroa"
              d={crownPathOcclusalTop(d.w, d.crownH, d.fam)}
              fill={aceso && estado ? COR[estado] : 'var(--dente)'}
              stroke="var(--dente-borda)"
              strokeWidth="1"
              style={{ transition: 'fill .6s ease', transitionDelay: aceso ? `${atraso}ms` : '0ms' }}
            />
          </g>
        </g>
        <text
          x={q(meuX + d.w / 2)}
          y={q(espelhar ? PAD_NUM - 5 : maxAlt + 11)}
          textAnchor="middle"
          fontSize="10"
          fill="var(--dente-num)"
        >
          {d.n}
        </text>
      </g>
    );
  });

  return (
    <svg className="odonto" viewBox={`0 0 ${q(largura)} ${q(total)}`} role="img" aria-label={rotulo}>
      {dentes}
    </svg>
  );
}

export function OdontogramaDemo({ aceso }: { aceso: boolean }) {
  return (
    <>
      <div className="arcada-rot">
        <span>Superior D</span>
        <span>Superior E</span>
      </div>
      <Arcada nums={SUP} espelhar aceso={aceso} rotulo="Arcada superior" />
      <Arcada nums={INF} espelhar={false} aceso={aceso} rotulo="Arcada inferior" />
      <div className="arcada-rot inferior">
        <span>Inferior D</span>
        <span>Inferior E</span>
      </div>
    </>
  );
}
