'use client';

// R-105a §4.2.2 — pedido dele em 15/08, ao ver a v5 rodando: "antes de criar o primeiro
// atendimento, um card com o Dex explicando o que é pra fazer ou como funciona".
//
// Ocupa o lugar da dica pequena que a v5 tinha posto no rail vazio. A troca faz sentido pelo
// espaço: antes do primeiro paciente a tela é uma página inteira com uma frase e um botão —
// sobra lugar, não tem ninguém na cadeira, e é o único momento do fluxo em que dá pra explicar
// sem atrapalhar. Assim que existe um atendimento, ele some e quem explica são as dicas de
// zona, que são pequenas de propósito.
//
// Quem fala é o DEX, com a identidade canônica (`DexMark`) — não um ícone genérico nem um
// personagem novo. E fala por FRASE ESCRITA, zero IA de runtime: regra do CLAUDE.md (IA
// operacional > conversacional) e o mesmo mecanismo que a Camada 3 do R-105b vai usar.
//
// Sem nome do dentista de propósito: `nome` no banco vem com título ("Dra. QA R105a"), então
// o `split(' ')[0]` que o resto do projeto usa produziria "Oi, Dra.". Saudação sem nome é
// melhor que saudação errada.

import { DexMark } from '@/components/dex/dex-mark';

const PASSOS = [
  'Cada paciente do seu dia vira um card na faixa acima.',
  'Você fala ou cola o relato da consulta — eu monto a ficha.',
  'Da ficha saem o orçamento e o retorno, sem redigitar nada.',
] as const;

export function DexBoasVindas() {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <div className="flex items-start gap-4">
        <DexMark size={44} shape="squircle" expression="feliz" />

        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold text-text-primary">
            Eu sou o Dex. Esta é a tela onde você atende.
          </p>
          <p className="mt-1 text-xs leading-relaxed text-text-secondary">
            Você não precisa configurar nada antes. Funciona assim:
          </p>

          <ol className="mt-4 flex flex-col gap-2.5">
            {PASSOS.map((passo, i) => (
              <li key={passo} className="flex items-start gap-2.5">
                <span className="mt-px flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-teal/15 font-mono text-[10px] font-bold text-teal-ink">
                  {i + 1}
                </span>
                <span className="text-[12.5px] leading-relaxed text-text-secondary">{passo}</span>
              </li>
            ))}
          </ol>

          <p className="mt-4 border-t border-border pt-3 text-[12.5px] font-semibold text-text-primary">
            Comece por quem está na cadeira agora — é o botão aqui embaixo.
          </p>
        </div>
      </div>
    </div>
  );
}
