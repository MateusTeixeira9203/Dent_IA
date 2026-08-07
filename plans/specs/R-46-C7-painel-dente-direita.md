# R-46 C7 — painel do dente volta pra coluna direita (3º bloco independente, sem resumo/Sheet)

> **SPEC (fatia)** · sub-item do **R-46** · fase **`aprovada`** — aprovada por ele 04/08, com uma
> ressalva resolvida (tabela de especialidade continua abrindo abaixo do odontograma, no
> centro — G8; não muda de lugar)
> **Aberto:** 2026-08-04 · **Fechado:** —
> **Modelo:** Sonnet 5 — mecanismo já decidido em conversa (3º bloco independente, reuso
> literal do `BlocoMoldavel`), é prop-lifting mecânico em 3 arquivos. O único risco real é a
> medição do gate WCAG (G6), não ambiguidade de desenho.
> **Depende de:** [R-46-C6-layout-cockpit.md](R-46-C6-layout-cockpit.md) (aprovada, codada e
> testada ao vivo 04/08) — esta fatia **substitui só o mecanismo de posicionamento** do painel
> do dente que o C6 deixou (`colapsarDireita` + flutuando ao lado do odontograma). Nada mais do
> C6 muda.

## 1. Problema

O painel do dente hoje flutua ao lado do odontograma dentro de `registrar-painel.tsx` (centro).
Enquanto está aberto, `colapsarDireita` apaga a coluna direita inteira (`A Fazer` + `Novos
procedimentos` somem) pra devolver largura ao centro — sem isso o dente cai abaixo de 24px
(WCAG). Ele pediu pra mover o painel pra um card fixo na direita (print com um retângulo
marcando a área), pra parar de esconder `A Fazer`/`Novos procedimentos` toda vez que seleciona
um dente.

## 2. Decisão e alternativas descartadas

**Isto já foi tentado hoje, com outro mecanismo, e revogado.** [C6 §2 Q2](R-46-C6-layout-cockpit.md)
testou "resumo pequeno na direita + `Sheet` separado pro detalhe completo" ao vivo — ele pediu
de volta o painel único ("é o que eu te falei... quero só o popup"). Perguntei antes de
escrever este contrato se o problema daquela tentativa era a **posição** (direita) ou a
**fricção** (resumo pequeno + 2º clique pra abrir o `Sheet`). Decisão dele: manter na direita,
mas **sem** resumo e **sem** `Sheet` — o `ToothDetailPanel` de sempre, inteiro, como um 3º
bloco de acordeão igual aos outros dois. Se isso for rejeitado de novo ao testar ao vivo, o
sinal muda de "era a fricção" pra "é mesmo a posição" — registrar essa leitura se acontecer.

**Duas alternativas descartadas nesta conversa:**

| Opção | Por que não |
|---|---|
| Abas de verdade (só 1 bloco visível por vez) — padrão sugerido em [MAPA-MEU-DIA.md §7.2](../MAPA-MEU-DIA.md) | Inerentemente exclusiva. Ele revogou a exclusão mútua dos acordeões **nesta mesma sessão** (C6 §2 Q3: "quero que seja tudo aberto ou não") — abas desfariam essa decisão sem ele ter pedido |
| 1 card externo agrupando as 3 seções (resolve G-densidade do mapa) | Componente novo que hoje não existe, pra resolver um problema (G-densidade) que **não é o que foi pedido**. Fica de fora — ver §8 |

## 3. Objetivo e como funciona

O odontograma central **nunca muda de tamanho**, em nenhum estado — restaura o objetivo
original do C6 (§3), que a reintrodução de `colapsarDireita` tinha comprometido de novo. Clicar
num dente (odontograma, ou linha de "Concluídos hoje"/"Novos procedimentos") mostra o
`ToothDetailPanel` completo como **1º item** da coluna direita, dentro de um `BlocoMoldavel`
igual aos outros — pode ficar aberto ao mesmo tempo que `A Fazer` e `Novos procedimentos`
(nenhum fecha o outro, C6 §2 Q3 continua valendo). Fechar o painel (X, dentro do próprio
`ToothDetailPanel`) desmonta o bloco inteiro. Recolher o acordeão do bloco (clicar no título)
só esconde — o dente continua selecionado, e selecionar outro dente sempre reabre.

## 4. Contrato técnico

### Arquivos tocados

| Arquivo | Muda |
|---|---|
| `_components/cockpit-grid.tsx` | `colapsarDireita` **sai da prop** de vez. Grid sempre `grid-cols-[320px_minmax(0,1fr)_312px]`, único branch |
| `_components/meu-dia-client.tsx` | Novo `useState<boolean>` `painelDenteAberto` (nasce `true`). `tabelaContainer`/`setTabelaContainer` **sobem** de `registrar-painel.tsx` pra cá. `direita` do `CockpitGrid` ganha o `BlocoMoldavel`+`ToothDetailPanel` como 1º item (condicional a `denteAberto != null`), antes de `AFazerBloco`. Reset de paciente (bloco já existente, comparação de id) ganha `setPainelDenteAberto(true)`. `colapsarDireita` **para de ser passado** ao `CockpitGrid` |
| `_components/registrar-painel.tsx` | Remove o JSX do `ToothDetailPanel` e o wrapper `w-[320px] shrink-0`; `flex items-start gap-4` ao redor do odontograma simplifica pra só `<Odontograma>` (mesma simplificação que o C6 original já previa). Remove `useState` local de `tabelaContainer` — vira prop `onTabelaContainerRef`, o `<div ref={...}>` continua renderizando **aqui** (mesma posição visual, abaixo do odontograma, dentro do card "Registrar"). Prop `gruposAbertos` **sai da interface** — deixou de ser consumida aqui |

**Nenhuma mudança em:** `a-fazer-bloco.tsx`, `nesta-sessao-bloco.tsx`, `bloco-moldavel.tsx`,
`Odontograma.tsx`, `ToothDetailPanel.tsx` (fonte). Reuso literal dos 3 primeiros; o
`ToothDetailPanel` só recebe um `className` diferente no call site (ver §4 Comportamento) —
zero linha nova dentro do componente.

### Types

```typescript
// meu-dia-client.tsx — novo estado, mesmo padrão dos outros 5 blocos independentes (C6 §2 Q3)
const [painelDenteAberto, setPainelDenteAberto] = useState(true);
// sobe de registrar-painel.tsx (era local lá)
const [tabelaContainer, setTabelaContainer] = useState<HTMLDivElement | null>(null);

function handleDenteAbertoChange(dente: number | null) {
  setDenteAberto(dente);
  if (dente != null) setPainelDenteAberto(true); // toda seleção nova sempre revela o bloco
}

// registrar-painel.tsx — RegistrarPainelProps
export interface RegistrarPainelProps {
  // ...campos existentes, MENOS `gruposAbertos` (sai)
  onTabelaContainerRef: (el: HTMLDivElement | null) => void; // substitui o useState local
}

// cockpit-grid.tsx — CockpitGridProps
export interface CockpitGridProps {
  esquerda: ReactNode;
  centro: ReactNode;
  direita: ReactNode;
  // `colapsarDireita?: boolean` REMOVIDO — grid tem 1 único layout
}
```

### Comportamento

`meu-dia-client.tsx` passa `onDenteAbertoChange={handleDenteAbertoChange}` (não mais o setter
cru) pra `RegistrarPainel`. O bloco de reset de paciente (comparação `selecionadoId !==
idAoResetar`, já existente) ganha `setPainelDenteAberto(true)` junto dos resets que já tem.

`direita` do `CockpitGrid`:

```tsx
direita={
  <>
    {denteAberto != null && (
      <BlocoMoldavel
        id="painel-dente"
        titulo="Dente selecionado"
        aberto={painelDenteAberto}
        onToggle={() => setPainelDenteAberto((a) => !a)}
      >
        <ToothDetailPanel
          dente={denteAberto}
          eventos={eventosDraft}
          onChange={setEventosDraft}
          onClose={() => setDenteAberto(null)}
          dataPadrao={hojeBRT()}
          gruposAbertos={gruposAbertos}
          tabelaContainer={tabelaContainer}
          className="border-0 p-0 rounded-none" // mata o card duplo — BlocoMoldavel já é o card
        />
      </BlocoMoldavel>
    )}
    <AFazerBloco ... /* inalterado */ />
    <NestaSessaoBloco id="novos-procedimentos" ... /* inalterado */ />
  </>
}
// CockpitGrid some sem a prop colapsarDireita — nenhum valor passado
```

`className="border-0 p-0 rounded-none"` funciona porque `ToothDetailPanel` já monta suas
classes via `cn('rounded-xl border p-4 flex flex-col gap-3', className)` e `cn` usa
`twMerge` ([`src/lib/utils.ts`](../../src/lib/utils.ts)) — os 3 utilitários conflitantes são
sobrescritos, `flex flex-col gap-3` sobrevive intacto. Sem isso, o painel ganharia um 2º card
aninhado dentro do `BlocoMoldavel` (borda dupla, padding dobrado) — o tipo de descuido que a
régua do CLAUDE.md pega ("parece feita pela mesma equipe do Dashboard?").

## 5. Referência visual

Não existe artefato pra esta fatia — mesmo caso do C6 §5: reposicionamento de peças já
aprovadas (`BlocoMoldavel`, `ToothDetailPanel`), zero token novo, zero componente novo.
Conferir direto em localhost.

**Medida verificada por geometria antes de codar** (não presumida): a linha
dente-anatômico+mapa-oclusal dentro do `ToothDetailPanel` mede, no pior caso (`molar1`, o mais
largo — [`tooth-geometry.ts:40`](../../src/components/odontograma/tooth-geometry.ts)),
`51 × 1.7 ≈ 87px` (dente) + `24px` (gap-6) + `132px` (mapa oclusal, `ToothDetailPanel.tsx:425`)
`≈ 243px`. Coluna direita é 312px; com `className` limpo (sem `p-4` duplicado) e o padding do
`BlocoMoldavel` (`px-3` = 24px total), sobram **288px** de conteúdo — 45px de folga. Cabe. Os
chips de ação (`flex-wrap`) já quebram linha sozinhos, sem mudança necessária.

## 6. Invariantes

- [ ] O odontograma central nunca muda de largura — nem sem dente selecionado, nem com o
      painel aberto, nem com ele recolhido (acordeão fechado, `denteAberto` ainda setado)
- [ ] `A Fazer` e `Novos procedimentos` nunca fecham por causa do painel do dente abrir, e
      vice-versa (C6 §2 Q3 continua valendo)
- [ ] `eventosDraft`/`denteAberto` continuam com dono único (`meu-dia-client`, C1 §5.4) — mover
      o painel de coluna não muda quem é dono de quê
- [ ] O painel do dente edita o **mesmo** `eventosDraft` que o odontograma central lê — nunca
      2 cópias
- [ ] Fechar o painel (X) desmonta o bloco; recolher o acordeão (clique no título) não mexe em
      `denteAberto` nem em `eventosDraft` — são 2 controles independentes
- [ ] Nenhuma regra de `salvarVisitaMeuDia`, RLS ou schema muda — esta fatia é só layout/estado

## 7. Gates de aceite

- [x] **G1** — `grep -r "colapsarDireita" src` devolve só comentário (explicando que morreu), zero código. Typecheck + lint limpos (verificado 04/08)
- [x] **G2** — `cockpit-grid.tsx` só tem 1 `className` de grid, sempre `320px_minmax(0,1fr)_312px` — nenhum estado condicional (verificado por leitura + `git diff`, 04/08)
- [x] **G3** — testado ao vivo (dente 27, paciente "Teste R-31a"): clicar o dente mostra `ToothDetailPanel` completo como 1º item da direita, com `A Fazer 0` e `Novos procedimentos` **visíveis ao mesmo tempo** — nenhum fechou
- [x] **G4** — testado ao vivo: recolher "Dente selecionado" some o conteúdo mas mantém o título; reabrir mostra o dente 27 de novo, sem precisar reclicar no odontograma
- [x] **G5** — testado ao vivo: X dentro do `ToothDetailPanel` some com o bloco inteiro (não só recolhe) — confirmado por `get_page_text` (bloco sumiu, A Fazer/Novos Procedimentos ficaram)
- [x] **G6 (WCAG, crítico)** — medido via `getBoundingClientRect()`: dente 27 = **40.8×72.2px sem seleção** e **40.8×72.2px com o painel aberto** — idêntico, bem acima de 24px
- [x] **G7** — medido via `getComputedStyle()`: `[role="region"]` (o `ToothDetailPanel`) tem `border:0px / padding:0px / radius:0px`; só o `BlocoMoldavel` externo tem borda (`1px`) e raio (`18px`) — 1 card só, confirmado
- [x] **G8** — testado ao vivo: clicar "Canal" no dente 26 abre "FICHA ENDODÔNTICA" **antes** de "Dente selecionado" na leitura da página — confirma que está no centro (abaixo do odontograma), não dentro do card de 312px. Era a ressalva dele — resolvida
- [x] **G9** — testado ao vivo (05/08, inseri 2º agendamento de teste pra ter 2 pacientes na régua, autorizado por ele): dente 22 aberto em "marcos" → trocar pra "Teste R-31a (apagar)" fecha o bloco (nenhum vazamento de contexto — "A Fazer" trocou pra pendência do novo paciente). Testado também o retorno: recolhi o acordeão manualmente (aria-expanded=false) em "Teste R-31a", troquei de volta pra "marcos", selecionei um dente novo — painel voltou **aberto** (aria-expanded=true), confirmando `painelDenteAberto` resetando a `true` pro próximo
- [x] **G10** — regressão C5 testada ao vivo: selecionei dentes 14+15 (sem tipo pendente, acumulando em `onde.dentes`), escolhi "Restauração" no combobox → os 2 dentes ganharam o evento juntos (confirmado por `Concluídos hoje: 2 registros` + marcador visual nos 2 dentes). Testado o toggle-off: selecionei 34+35, cliquei 34 de novo (saiu do lote, painel ficou em 35 sem chip ativo), escolhi "Coroa total" → só os dentes ainda no lote ganharam o evento, 34 ficou de fora. `onToothToggle`/`onde` não regrediram
- [x] **G11** — testado ao vivo (05/08, inseri 2 eventos sintéticos `indicado`+`grupo_id` em "marcos" pra simular trabalho aberto, autorizado por ele): dente 36 → clicar "Canal" abriu o modal "Continuar o trabalho aberto?" — "Continuar" anexou o novo rascunho ao MESMO `grupo_id` (entrou em Novos procedimentos como continuação). Dente 46 → mesmo modal, desta vez "Começar novo" — criou rascunho independente (`grupo_id: null`), sem anexar ao grupo existente. Os dois caminhos funcionam. **Achado à parte (fora de escopo, não C7):** o modal mostra "iniciado em 01/08" pra um evento com `registrado_em = 2026-08-02` — a mesma data aparece correta (02/08) na lista "A Fazer" ao lado. Cheira a off-by-one de fuso no `formatarData(confirmGrupo.grupo.iniciadoEm)` do `ToothDetailPanel.tsx` (parse de `date` puro como UTC, formatado em local). Não mexi — registro pra próxima sessão avaliar
- [x] **G12** — `git diff --stat`: só `cockpit-grid.tsx`, `meu-dia-client.tsx`, `registrar-painel.tsx` (+ docs) — zero `salvarVisitaMeuDia`, RLS, migration, `supabase/`

## 8. Fora de escopo

- **G-densidade do `MAPA-MEU-DIA.md` §7.5** ("direita nunca tem mais de 1 container de 1º
  nível") — esta fatia não resolve; a direita continua com até 3 containers quando um dente
  está selecionado. Se ele quiser consolidar depois (1 card com abas ou seções internas), é
  item novo — as duas opções descartadas no §2 ficam registradas como ponto de partida
- Abas de verdade / card agrupador — descartados nesta rodada (§2), não construir "por via das
  dúvidas"
- Responsivo (C8, já pendente desde a versão anterior do painel — `ESTADO.md` já lista como
  falta) — esta fatia não piora nem resolve, continua em aberto
- Orçamento, retorno, orto (R-46h, R-57, R-50a) — sem relação
- Resumo do dente / `Sheet` separado — mecanismo já descartado (C6 §2 Q2), não reintroduzir

## 9. Adendo (04/08, pedido dele ao vivo, depois da aprovação original)

Duas mudanças a mais, testadas ao vivo na mesma sessão:

1. **A seção "eventos do dente" (linha do evento + observação + tabela de especialidade)
   desce pro centro, abaixo do odontograma** — não só a tabela de endo/implante como o
   contrato original previa. Reusa o mesmo `tabelaContainer`/portal do R-20 (nenhum mecanismo
   novo), só que agora carrega a seção inteira, não só o form. O card da direita fica só com
   cabeçalho + figuras (dente/mapa oclusal) + chips — testado ao vivo com o dente 27 (evento
   "Canal" real, tabela FICHA ENDODÔNTICA): confirmado renderizando no centro, logo abaixo do
   odontograma, na ordem certa. O mini-cabeçalho redundante ("27 · Endodontia") que a tabela
   tinha sozinha foi removido — a linha do evento, agora vizinha, já diz isso.
2. **Motion no `BlocoMoldavel`** (componente compartilhado — afeta todos os 6 blocos da
   sessão, não só o do dente): corpo abre/fecha com animação de altura
   (`AnimatePresence` + `height: 'auto'`, 200ms) em vez do show/hide instantâneo; `layout="position"`
   no card externo anima o reflow quando um irmão muda de altura/monta/desmonta acima dele. O
   bloco "Dente selecionado" ganhou `AnimatePresence` própria em `meu-dia-client.tsx` pra
   animar a entrada/saída (fade + leve deslocamento vertical), não só o recolher/abrir interno.
   Verificado: sem erro de console, toggle funcional ao vivo. **Suavidade visual não
   verificável pelas ferramentas de automação (texto/DOM, não vídeo)** — ele confirma no olho.

Arquivos adicionais tocados: `ToothDetailPanel.tsx` (restruturação da seção de eventos —
estava marcado "nenhuma mudança" no contrato original, §4; superado por este adendo),
`bloco-moldavel.tsx` (motion).
