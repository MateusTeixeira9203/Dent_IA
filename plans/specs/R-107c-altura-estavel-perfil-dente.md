# R-107c — card da direita não colapsa ao trocar de dente

> **SPEC** · fase **`aprovada`** — pedido dele ao vivo (13/08), medido por geometria antes de
> codar (regra do CLAUDE.md — nunca aproximar altura no olho).
> **Aberto:** 2026-08-13 · **Fechado:** —
> **Modelo:** Sonnet 5 — 1 valor de CSS, medido, sem ambiguidade de desenho.
> **Irmã:** [R-107b](R-107b-perfil-do-dente.md) — mesmo debate, arquivo e mecanismo diferentes
> (aqui é `meu-dia-client.tsx`, layout; lá é `ToothDetailPanel.tsx`, conteúdo).

## 1. Problema

O card da direita (`meu-dia-client.tsx:603`, "ocupante único") alterna entre 3 conteúdos —
espelho do odontograma, `DenteHistoricoCard` (dente sem edição ainda) e `ToothDetailPanel`
(editor) — sem altura mínima. Cada troca colapsa ou estica o card, e como a coluna "Nesta
ficha" usa `items-stretch` pra sempre bater a altura do card da direita, **as duas colunas
pulam juntas a cada clique**.

Medido ao vivo (`getBoundingClientRect`, dente sem nenhum evento):

| Estado | Altura |
|---|---|
| Espelho do odontograma (nenhum dente selecionado) | 285,9px |
| `DenteHistoricoCard` — dente sem registro ("Nenhum registro neste dente ainda") | **139,2px** |
| `ToothDetailPanel` — editor recém-aberto, sem evento ainda | 307,1px |
| `ToothDetailPanel` — com 1 evento de endodontia (tabela "Ficha endodôntica" aberta) | 570,5px |

O salto de 139px → 307px (ida) ou 307px → 139px (volta) é o que ele sente como "a página
ficar pulando" a cada clique num dente vazio.

## 2. Decisão

`min-height` no container do card da direita, travado no valor do **editor vazio (307px)** —
não no da tabela de especialidade aberta (570px). Justificativa: 307px é o tamanho comum do
"perfil do dente" que ele pediu como referência (chips + figura + mapa oclusal, sem conteúdo
extra); 570px só acontece quando uma tabela de endo/implante abre, caso já naturalmente maior
e que o dentista espera crescer. `min-height` (nunca `height` fixo) porque conteúdo real —
histórico longo, tabela de especialidade — precisa continuar podendo crescer além do piso;
travar em `height` cortaria dado clínico, o que é bem pior que o soluço visual que motivou
isto.

## 3. Contrato técnico

### Arquivo tocado

| Arquivo | Muda |
|---|---|
| `src/app/dashboard/meu-dia/_components/meu-dia-client.tsx` | linha ~603 — a `<div className="rounded-2xl border border-border bg-surface p-4">` (container do "ocupante único" da direita) ganha `min-h-[308px]` (307,1 arredondado pra cima — folga de sub-pixel) |

**Nenhuma outra mudança.** `items-stretch` (linha 578) já propaga a altura pro card "Nesta
ficha" — não precisa duplicar o `min-h` lá; o grid resolve sozinho.

### Comportamento

- Nenhum dente selecionado (espelho, 285,9px) → cresce pro piso de 308px. Diferença pequena
  (~22px), aceitável — ele não reclamou do espelho, só do colapso pro histórico vazio
- Dente sem registro (`DenteHistoricoCard`, 139,2px) → cresce pro piso de 308px, sem mais
  colapsar
- Editor com eventos ou tabela aberta → cresce livremente além do piso, como já fazia

## 4. Invariantes

- [ ] Nenhum conteúdo é cortado/escondido — `min-height`, nunca `max-height` com overflow
      oculto
- [ ] `items-stretch` continua sendo o único mecanismo que iguala as 2 colunas — R-107c só
      ajusta o piso de UM lado, não introduz mecanismo novo
- [ ] Zero mudança em `ToothDetailPanel.tsx`, `DenteHistoricoCard.tsx` ou no espelho — é
      1 classe CSS num wrapper que já existe

## 5. Gates de aceite

- [x] **G1** — medido ao vivo (`getBoundingClientRect`, 13/08): dente sem registro
      **139,2px → 308px** — não colapsa mais
- [x] **G2** — medido ao vivo: dente 17 com Canal + tabela "Ficha endodôntica" aberta
      continua em **570,5px**, idêntico a antes — nada cortado
- [x] **G3** — medido ao vivo: espelho sem dente selecionado = **308px**, dente sem registro =
      **308px** — os 2 estados mais comuns agora batem exato, zero soluço
- [x] **G4** — typecheck + lint + `next build` limpos. Zero erro de console (checado em aba
      nova, sem histórico de HMR)

## 6. Fora de escopo

- Aplicar o mesmo piso na ficha do paciente (`FichasTab.tsx`) — lá o layout é outro (painel
  lateral, não a mesma grade 2-colunas do R-78); se ele sentir o mesmo soluço lá, é item novo
- Motion/transição suave entre alturas — já existe `AnimatePresence` com fade+slide
  (`meu-dia-client.tsx:604-611`); este item é só o piso, não a transição
