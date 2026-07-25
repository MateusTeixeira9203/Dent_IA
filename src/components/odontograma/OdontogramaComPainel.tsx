'use client';

// R-20 Fase 1 — layout responsivo do bloco "odontograma + perfil do dente".
//
// Slots puros: o pai passa <Odontograma> e <ToothDetailPanel> JÁ montados com as
// props de cada tela (Site A = criação editável; Site B = ficha salva readOnly);
// aqui só se decide a POSIÇÃO. Nenhuma prop de dado passa por este componente.
//
// Comportamento (o que o Mateus pediu no debate 25/07):
//   • sem dente aberto            → odontograma ocupa a largura toda;
//   • dente aberto + coluna larga → odontograma ENCOLHE pra esquerda, painel à direita;
//   • coluna estreita (mobile)    → empilha (odontograma em cima, painel embaixo).
//
// Container query (não breakpoint de viewport): o reflow reage à largura da COLUNA,
// não da janela — a ficha vive numa coluna estreitada pela sidebar, e o mesmo
// componente vai ser reusado no modo consulta (coluna ainda mais estreita). Mesma
// convenção do projeto: `@container/card-header` em src/components/ui/card.tsx.

import { cn } from '@/lib/utils';

export interface OdontogramaComPainelProps {
  /** <Odontograma …/> já montado — a coluna esquerda, sempre visível. */
  odontograma: React.ReactNode;
  /** <ToothDetailPanel …/> já montado, ou null quando nenhum dente está aberto. */
  painel?: React.ReactNode | null;
  /** Conteúdo sob o odontograma (chips de região — só o Site A tem). */
  chips?: React.ReactNode;
  className?: string;
}

export function OdontogramaComPainel({ odontograma, painel, chips, className }: OdontogramaComPainelProps) {
  const aberto = painel != null;
  return (
    <div className={cn('@container/odpx', className)}>
      <div
        className={cn(
          'grid grid-cols-1 gap-4 items-start',
          // Duas colunas só quando há dente aberto E a coluna é larga o bastante.
          // Painel numa coluna flexível ~43% (perto do "mesmo tamanho" que o Mateus pediu),
          // não mais um sidebar fixo de 360px. Proporção afinável no localhost (risco na spec).
          aberto && '@2xl/odpx:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]',
        )}
      >
        <div className="flex flex-col gap-3 min-w-0">
          {odontograma}
          {chips}
        </div>
        {aberto && <div className="min-w-0">{painel}</div>}
      </div>
    </div>
  );
}
