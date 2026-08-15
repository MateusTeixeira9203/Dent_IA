// R-105a §4.2.1 (v5 do artefato) — decisão dele em 15/08, depois de rodar a v4 ao vivo:
// "senti falta de uns cards mostrando ou explicando o que a página faz". Escolheu, entre 4
// opções com preview, a mais completa — uma dica por zona do cockpit.
//
// A regra que impede isto de virar mobília está em QUEM CHAMA, não aqui: cada dica só é
// montada enquanto a SUA zona não foi usada (`primeiraSessao && !zonaUsada`). O cockpit se
// limpa conforme o dentista trabalha — 4 no primeiro render, 3 depois de abrir o campo mágico,
// 1 depois do primeiro procedimento, 0 depois de salvar. Tudo derivado, nada persistido (I2).
//
// Não é um card de conteúdo, e não pode parecer um: sem sombra, fundo `surface-alt` a 55%,
// texto pequeno, borda esquerda teal. Tem que ler como bilhete ao lado da coisa, não como
// alerta em cima dela — é o que o mantém tolerável com um paciente sentado na cadeira.

interface DicaZonaProps {
  /** Rótulo da zona, em caixa alta — "O campo mágico", "Nesta ficha". */
  titulo: string;
  /** Uma frase. Se precisar de duas, a zona está fazendo coisa demais. */
  children: React.ReactNode;
  className?: string;
}

export function DicaZona({ titulo, children, className }: DicaZonaProps) {
  return (
    <div
      className={`mb-2 flex items-start gap-2.5 rounded-r-xl border border-l-[2.5px] border-border border-l-teal bg-surface-alt/55 px-3 py-2.5 ${className ?? ''}`}
    >
      <span
        aria-hidden
        className="mt-px flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full bg-teal text-[9.5px] font-extrabold text-white"
      >
        i
      </span>
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[1.1px] text-teal-ink">{titulo}</p>
        <p className="mt-0.5 text-[11.5px] leading-relaxed text-text-secondary">{children}</p>
      </div>
    </div>
  );
}
