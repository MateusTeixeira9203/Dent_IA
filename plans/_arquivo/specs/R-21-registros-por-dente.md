# R-21 — Redesign: Registros da ficha agrupados por dente

> **SPEC (redesign)** · **R-21** · ✅ aprovada (Mateus, 25/07) · **Modelo:** Sonnet (decisões de
> produto já validadas com dentista em 25/07 — sem ambiguidade de direção; execução segue os
> defaults declarados aqui)
> **Aberto:** 2026-07-25 · **Fechado:** — · **Fase:** aprovada · §1 e §2 conferidos pelo Mateus
> **Próximo (execução):** mockup dos 3 estados novos → aprovação visual → Fase 1 (`agruparPorDente`)

## 0. Identificação

| | |
|---|---|
| **Tela / módulo** | Ficha do paciente — lista de registros (Site A: rascunho/criação · Site B: ficha salva expandida) |
| **Tipo** | redesign de tela existente |
| **Rota** | `/dashboard/pacientes/[id]` (aba Prontuário) |
| **Arquivos envolvidos** | `src/components/pacientes/FichasTab.tsx`, `src/lib/odontograma/agrupar-por-dente.ts` (novo), `src/components/fichas/dente-grupo-header.tsx` (novo), `src/components/odontograma/ToothDetailPanel.tsx` (só o alvo do portal muda, Fase 2) |

## 1. Estado atual

A lista de registros (Site A ~linha 1350, Site B ~linha 1661) renderiza `cardsDraft`/`cardsVis` —
um `RegistroCard` por procedimento (já agrupado por `agruparRegistros`: mesmo `grupo_id`, ou
dente+tipo+status), ordenados abertos-primeiro e dente como critério secundário. Um dente com 3
procedimentos (ex. Canal + Coroa + Pino no 34) hoje aparece como 3 cards soltos e distantes na
lista — nada os agrupa visualmente por dente.

O R-20 (committado, aguardando deploy) trouxe: `OdontogramaComPainel` (odontograma + painel do
dente lado a lado), a tabela de especialidade (endo/implante) do `ToothDetailPanel` abrindo
full-width numa faixa solta logo abaixo do bloco (`tabelaElA`/`tabelaElB`, portal via
`tabelaContainer`), e um clique no dente do odontograma destacando (ring + scroll) o card do
procedimento correspondente na lista (`destacarCard`/`registroCardRefs`/`grupoDestacado`,
generalizado pros dois sites na Fase 3 do R-20).

O que o R-21 muda: só a apresentação da lista. Ela deixa de ser uma sequência plana de
cards de procedimento e vira uma lista de dentes — cada dente com 2+ procedimentos colapsa
num grupo; a tabela de especialidade passa a abrir dentro do dente aberto na lista (não mais na
faixa solta); e o clique no odontograma passa a abrir o grupo do dente em vez de só destacar um
card.

**Resultado:** `agruparRegistros` continua produzindo os cards de procedimento exatamente como
hoje — o R-21 adiciona uma segunda camada de agrupamento (por dente) por cima desse array já
pronto, sem tocar a função nem o card-fonte.

**Sua conferência:**

## 2. O que NÃO pode mudar — trava de segurança

- [x] `agruparRegistros` e `grupoEstaAberto` (`src/lib/odontograma/agrupar-registros.ts`) — o
      agrupamento por procedimento e sua ordenação interna continuam intocados; a nova camada
      consome o array que essa função já devolve.
- [x] `RegistroCard` (`src/components/fichas/registro-card.tsx`) — mesmo componente-fonte,
      mesmas props, mesma pílula de status; é reusado dentro de cada dente, não substituído.
- [x] Regra do R-01: o procedimento continua sendo a unidade de salvamento (data + assinatura
      próprias). Agrupar por dente é só display — nunca funde procedimentos num registro só
      no banco, nunca muda `salvarEventosOdontograma`.
- [x] `salvarEventosOdontograma`, R-02 Fase 3 (amarração `grupo_id` + modal Continuar/Novo), R-04
      (encaminhar, inclusive o modo seleção em lote), R-16 (filtro por responsável) — nenhum
      desses fluxos muda de comportamento; só a posição visual dos cards na lista muda.
- [x] `ToothDetailPanel` — lógica de criação/edição (faces, chips, `criarDenteTipo`,
      `cycleDenteTipo`) intocada. Só o alvo do portal `tabelaContainer` muda de lugar (Fase 2).
- [x] RLS / multi-clínica, schema, nomes de campo — nenhuma query nova, nenhuma migration.
- [x] Fluxo de navegação (abas, rota).

> Nada marcado aqui é assumido como intocável por padrão: apresentação muda, o resto não.

## 3. O que eu quero

> Decisões já tomadas em discussão (25/07, registradas em `plans/ESTADO.md`), validadas com um
> dentista — tratadas como dadas nesta spec, não reabertas.

**Sensação pretendida:** o dentista pensa por dente, não por procedimento solto — abrir a ficha
deve parecer "aqui está a boca, dente por dente", não uma lista de itens desconexos.

**Problemas concretos de hoje:**
1. Um dente com vários procedimentos (Canal + Coroa + Pino) aparece como 3 cards separados,
   distantes entre si na lista — não há nada que diga "isso tudo é o dente 34".
2. Ordenar abertos-primeiro (hoje) faz o mesmo dente pular de posição conforme o status muda —
   difícil de escanear a boca inteira.
3. A tabela de especialidade abre numa faixa solta, desconectada do dente que ela descreve.

**Mudanças, item por item:**

| Elemento | Como está | Como quero |
|---|---|---|
| Ordenação da lista | Abertos primeiro, dente como critério secundário | Por número do dente, 11 a 48, sempre — a urgência não ordena mais, ela vira um sinal dentro do card fechado |
| Dente com 1 procedimento | Card solto | Mostra direto, sem chrome de acordeão |
| Dente com 2+ procedimentos | N cards soltos, um do lado do outro | Um grupo colapsável "Dente N" — clica abre, clica de novo fecha |
| Dente fechado (colapsado) | — | Resumo: número do dente + "N procedimentos" + pill coral "M a fazer" só se houver algum indicado no grupo |
| Tabela de especialidade | Abre numa faixa full-width solta abaixo do bloco odontograma+painel | Abre dentro do dente aberto, na própria seção da lista |
| Clique no dente (odontograma) | Destaca (ring+scroll) o card do procedimento | Abre (expande se colapsado) e rola até o grupo do dente |
| Procedimento multi-dente (mesmo grupo_id, dentes diferentes — ex. exodontia 31, 41, 42) | Card solto na posição do "dente" do primeiro item | Seção própria "Vários dentes", ao final da lista de dentes, card direto |
| Evento sem dente (arcada/quadrante — ex. orto manutenção) | Card solto | Seção própria "Geral", ao final, depois de "Vários dentes" |

**Referências:** nenhum artefato ainda — recomendado antes do código (ver secao 6).

## 4. Tokens — fonte única da verdade

Reusa integralmente os tokens já em uso em `src/app/globals.css` (mesmos do R-01/R-20) — nenhum
token novo:

| | |
|---|---|
| **Cores de status** | `--color-coral`/`-pale`/`-ink` (planejado/pendência), `--color-teal`/`-pale`/`-ink` (realizado), `--color-slate`/`-pale`/`-ink` (pré-existente). Pill "N a fazer" reusa exatamente o par `bg-coral-pale text-coral-ink` já usado no `PILL.coral` de `registro-card.tsx` |
| **Número do dente** | `font-mono font-bold`, mesmo padrão do header do `ToothDetailPanel` (`text-[15px]`) |
| **Cabeçalho de seção** ("Vários dentes"/"Geral") | `text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary`, mesmo padrão dos rótulos de campo já usados no arquivo |
| **Chevron de abrir/fechar** | `ChevronRight` com `rotate-90` quando aberto — mesmo padrão do `RegistroCard` e do `ToothDetailPanel` ("Detalhes") |
| **Superfícies** | `bg-surface` / `border-border` para o cabeçalho colapsável, igual ao `article` do `RegistroCard` |
| **Arquivo onde vivem** | `src/app/globals.css` |

## Parte 1 — Plano de implementação

### Mudanças de arquitetura

| Arquivo | O que muda |
|---|---|
| `src/lib/odontograma/agrupar-por-dente.ts` (novo) | Segunda camada de agrupamento, por cima do array que `draftsParaCards`/`eventosParaCards` já produzem (que por sua vez já rodaram `agruparRegistros`). Genérica sobre `T extends { data: { ancoras: AncoraClinica[] } }` — serve os dois sites sem duplicar lógica |
| `src/lib/odontograma/agrupar-por-dente.test.ts` (novo) | `node --test`, mesmo padrão de `agrupar-registros.test.ts` |
| `src/components/fichas/dente-grupo-header.tsx` (novo) | Cabeçalho colapsável "Dente N · N procedimentos + pill pendência" com chevron — único, reusado nos dois sites |
| `src/components/pacientes/FichasTab.tsx` | Site A e Site B trocam `cardsDraft.map(...)`/`cards.map(...)` por `agruparPorDente(cardsDraft/cardsVis)` + render por seção; novo estado de abertura por dente; `registroCardRefs` ganha um mapa irmão por número de dente; `tabelaElA`/`tabelaElB` mudam de onde são montados (Fase 2); `destacarCard` generaliza pra `destacarDente` (Fase 3) |
| `src/components/odontograma/ToothDetailPanel.tsx` | Nenhuma mudança de lógica — só o `tabelaContainer` que o `FichasTab` passa aponta pra outro lugar (Fase 2) |

Contrato mínimo da nova função (Fase 1):

```typescript
export interface CardComAncoras { data: { ancoras: AncoraClinica[] } }

export type SecaoRegistros<T extends CardComAncoras> =
  | { tipo: 'dente'; dente: number; cards: T[] }
  | { tipo: 'multi' | 'geral'; cards: T[] };

// Dente do card = conjunto de ancoras[].dente: 1 distinto vira 'dente'; 2+ vira 'multi'; 0 vira 'geral'.
// Secoes 'dente' ordenadas 11 a 48; 'multi' (se houver) depois; 'geral' (se houver) por ultimo.
export function agruparPorDente<T extends CardComAncoras>(cards: T[]): SecaoRegistros<T>[];
```

### Fases

#### Fase 1: camada de agrupamento por dente + render nos dois sites (Risco: MÉDIO)
**Ações:**
1. Criar `agrupar-por-dente.ts` com a função acima.
2. Testes (`node:test`): dente único vira seção dente; mesmo grupo_id em dentes diferentes
   vira multi; âncora nivel arcada/quadrante (sem dente) vira geral; ordenação 11
   a 48; ordem interna de cada seção preserva a ordem de entrada (não reordena por status).
3. Site A (`FichasTab.tsx`, bloco `cardsDraft.map`, ~1350): trocar por
   `agruparPorDente(cardsDraft)`. Seção dente com 1 card vira `RegistroCard` direto, exatamente
   como hoje. Com 2+ vira `DenteGrupoHeader` (novo componente) controlando um novo estado
   `dentesAbertosA: Set<number>`; aberto renderiza os `RegistroCard` do grupo, igual ao que já
   existe hoje (mesmo editavel, onObservacaoChange, onRemover, onToggleStatus). Seções
   multi/geral sempre expandidas, com rótulo de seção fixo, cards diretos.
4. Site B (`FichasTab.tsx`, bloco `cards.map`, ~1661): mesma troca, com `dentesAbertosB` — como
   só uma ficha (viewingEvo) fica expandida por vez, reseta ao trocar de ficha (mesmo padrão de
   denteSalvoAberto em alternarExpansaoFicha). Preserva o modo seleção (R-04 Fase 3): cards
   inelegíveis continuam esmaecidos e inertes dentro do grupo aberto.
5. `registroCardRefs` (ref por key do card) continua intocado — ainda usado pro realce de card
   individual (necessário na Fase 3, caso multi). Adiciona um mapa irmão,
   `denteGrupoRefs: Map<number, HTMLDivElement>`, um ref por seção dente (solo ou colapsável)
   — não usado ainda nesta fase, prepara a Fase 3.

**Verificável:** dente com 1 procedimento aparece direto (sem cabeçalho de acordeão); dente com
2+ (ex. Canal + Coroa no mesmo dente) aparece como "Dente N · 2 procedimentos" com pill "1 a
fazer" se algum estiver indicado; clicar expande os 2 RegistroCard, clicar de novo fecha;
ordem visual 11, 12, ..., 48; grupo multi-dente (exodontia 31-41-42) cai em "Vários dentes";
evento de arcada (orto manutenção) cai em "Geral". Testar Site A e B. Dark e light.
**Dependências:** nenhuma.

---

#### Fase 2: tabela de especialidade dentro do dente aberto (Risco: MÉDIO)
**Ações:**
1. Mover o ponto de montagem do portal — hoje o div ref setTabelaElA/setTabelaElB logo
   abaixo do OdontogramaComPainel — pra dentro da seção dente cujo número bate com
   denteAberto (Site A) / denteSalvoAberto.dente (Site B). Se a seção tiver 2+ procedimentos
   e estiver fechada, o alvo só existe quando ela abrir (a Fase 3 garante que abrir o dente no
   odontograma também expande a seção correspondente na lista).
2. `ToothDetailPanel.tsx`: nenhuma mudança — tabelaContainer já era um alvo de portal genérico
   (R-20 Fase 2); só troca ONDE o FichasTab monta o container.
3. Motion leve (fade/altura) na entrada da tabela dentro do card — reusa motion/react como já
   está em uso no arquivo, sem token novo.

**Verificável:** abrir um dente com endodontia indicada, expandir (ou já ver solo) a seção
"Dente N" na lista, tocar "Detalhes" — a tabela de canais aparece dentro do card do dente na
lista, não mais numa faixa solta abaixo do odontograma. Fechar volta ao estado anterior. Repetir
com implante, nos dois sites.
**Dependências:** Fase 1.

---

#### Fase 3: clique no odontograma abre o grupo do dente (Risco: BAIXO)
**Ações:**
1. Generalizar o destaque: nova destacarDente(dente) usa denteGrupoRefs (Fase 1) —
   abre a seção (setDentesAbertos inclui o dente) antes de rolar, senão o scrollIntoView
   mede a altura errada com o acordeão ainda fechado.
2. abrirDenteEDestacarRegistro (Site A) e o onToothToggle do Odontograma salvo (Site B) trocam
   a chamada a destacarCard(card.key) por destacarDente(dente).
3. Caso o dente clicado só exista dentro de um card multi (sem seção dente própria):
   fallback — rola/realça até a seção "Vários dentes", destacando o card específico com o
   mecanismo de grupoDestacado/registroCardRefs já existente (preservado, não removido).
4. Nenhuma seção muda de posição ao abrir/fechar/destacar — a ordem 11 a 48 é fixa.

**Verificável:** clicar o dente 34 no odontograma faz a seção "Dente 34" expandir (se estava
fechada) e a tela rolar até ela com o destaque visual; clicar um dente que só existe num grupo
multi-dente (ex. 31, parte da exodontia 31-41-42) faz rolar/realçar até "Vários dentes". Repetir
Site A e B.
**Dependências:** Fase 1 e 2.

### Riscos e mitigações

| Risco | Probabilidade | Mitigação |
|---|---|---|
| "Vários dentes"/"Geral" crescerem demais e virarem gaveta de itens soltos | média | Fora do escopo inicial (essas seções não colapsam); se acontecer no dogfood, aplicar o mesmo padrão de colapso do DenteGrupoHeader a essas seções depois |
| scrollIntoView medir altura errada por abrir a seção e rolar no mesmo frame (Fase 3) | média | Abrir o Set de estado antes do scroll; se o layout não assentar a tempo, aguardar 1 frame (requestAnimationFrame) — validar no localhost |
| Manter dois mecanismos de destaque (destacarDente + destacarCard/grupoDestacado pro fallback multi) confundir o código | baixa | Nomes explícitos e escopo documentado em comentário — destacarDente é o caminho principal, destacarCard só sobrevive pro fallback multi |
| Mover o alvo do tabelaContainer (Fase 2) quebrar algo que dependia da posição fixa (R-20) | baixa | Grep por tabelaElA/tabelaElB antes de mover; conferir que nada mais lê essa posição |
| DenteGrupoHeader (componente novo) divergir visualmente do padrão do RegistroCard/ToothDetailPanel | baixa | Reusar os mesmos tokens (chevron, pill, font-mono) listados no §4, comparar lado a lado no localhost |

## 5. Gates de aceite

- [ ] Dente com 1 procedimento aparece direto, sem cabeçalho de acordeão
- [ ] Dente com 2+ procedimentos (ex. Canal + Coroa + Pino no 34) aparece como um grupo
      colapsável "Dente 34 · 3 procedimentos"; abrir mostra os 3 RegistroCard com status
      próprio; fechar recolhe
- [ ] Dente fechado com alguma pendência (indicado) mostra a pill "N a fazer"; dente 100%
      realizado/pré-existente não mostra a pill
- [ ] Ordem da lista é 11, 12, ..., 48, nos dois sites
- [ ] Procedimento multi-dente (mesmo grupo_id, dentes diferentes — ex. exodontia 31-41-42)
      aparece na seção "Vários dentes", card direto (sem colapsar)
- [ ] Evento sem dente (arcada/quadrante — ex. orto manutenção) aparece na seção "Geral"
- [ ] Clicar o dente 34 no odontograma abre a seção "Dente 34" (se estava fechada) e rola até ela
      com destaque visual; clicar um dente só presente num grupo multi-dente rola/realça até
      "Vários dentes"
- [ ] Tabela de especialidade ("Detalhes" de endo/implante) abre dentro da seção do dente na
      lista, não mais numa faixa solta abaixo do odontograma
- [ ] Ficha salva (Site B) e rascunho/criação (Site A) têm o mesmo comportamento de agrupamento
- [ ] agruparRegistros, RegistroCard, salvarEventosOdontograma, R-02 Fase 3, R-04, R-16, RLS
      e schema continuam funcionando sem mudança de comportamento
- [ ] Dark e light conferidos nos dois sites
- [ ] Diff revisado por arquivo, arquivo por arquivo

## 6. Fluxo de execução

```
Inventário (feito, secao 1) -> briefing (secao 3, decisoes ja tomadas) -> PROTOTIPO recomendado (ver abaixo)
-> codigo: Fase 1 -> 2 -> 3 em FichasTab (sites A e B) -> localhost (validacao visual real) -> producao
```

Artefato recomendado: os 3 estados novos (dente fechado com pendência · dente aberto com
múltiplos RegistroCard · tabela de especialidade dentro do dente aberto) mudam o padrão visual
da lista o bastante pra valer um mockup antes do código — a thread principal cria em
`plans/artefatos/R-21-registros-por-dente.html` (não esta spec), pra aprovação visual antes da
Fase 1.

Uma tela primeiro, sempre. Fase 1 fecha e valida no localhost antes da Fase 2, e assim por
diante — sem re-escopar fora do que está aqui.

## 7. Pós-entrega

- [ ] Diff revisado
- [ ] Testado em localhost (desktop + mobile, dark + light)
- [ ] Subido pra produção
- [ ] Tokens atualizados, se algum mudou (não esperado — nenhum token novo neste item)
- [ ] Item fechado no ROADMAP.md e spec + artefato movidos pro _arquivo/ (ato atômico)
