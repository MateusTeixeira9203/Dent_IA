# R-46 C6 — layout novo do cockpit (jaFeito sai, painel do dente vira resumo + Sheet)

> **SPEC (fatia)** · sub-item do **R-46** · fase **`aprovada`** — as 4 perguntas do §2 (Q1-Q4)
> e a de escopo (§2.5) foram todas respondidas por ele em 03/08
> **Aberto:** 2026-08-03 · **Fechado:** —
> **Modelo:** Opus 5 (reformula o mecanismo do C3 — mover componente entre colunas — sem
> artefato aprovado, com risco real de regressão no gate WCAG; não é execução mecânica)
> **Depende de:** [R-46-cockpit.md](R-46-cockpit.md) (aprovada) ·
> [R-46-cockpit-contrato.md](R-46-cockpit-contrato.md) (C0-C5 codados) ·
> [R-55](R-55-historico-sem-perda-de-dado.md) (aprovada, codada — Histórico já tem fidelidade
> total, condição para a Q1 abaixo não perder dado) ·
> [R-46d D1](R-46d-campo-magico.md) (contrato — **acoplado, não mais opcional**: é ele quem
> entrega o `AnexarDocumentosBloco` que esta spec encaixa na esquerda (D8) e quem esvazia o
> centro (D12), fechando a redistribuição do §2.6. Sem D1, esta spec sozinha entrega
> jaFeito-sai + Sheet, mas não fecha as colunas nem o estouro de 37px do `MAPA §1`)
> **Escopo:** desktop **e responsivo** — ver §2.5. O P8 ("tablet/celular fora") foi
> **revogado por ele em 03/08**: responsivo passa a ser requisito de toda fatia de UI, não
> polimento posterior.

## 1. Problema

O cockpit (C0-C5) está no ar em localhost e foi usado ao vivo pela primeira vez nesta sessão.
Dois atritos reais apareceram: (1) a coluna direita tem 4 blocos, e "Já feito" — o acumulado
clínico agrupado — nunca foi validado como útil por quem usa, e hoje só duplica, de forma
mais pobre, o que o "Histórico" (esquerda) já mostra com fidelidade total desde o R-55; (2)
quando o painel do dente abre, a coluna direita inteira desaparece e o painel flutua dentro do
centro — inclusive quando o clique que abriu o painel partiu de **dentro** da própria coluna
direita, que some debaixo do dedo do dentista. Ele pediu um layout mais direto: tirar "Já
feito", abrir o painel onde a direita já está, e fechar os blocos dessa coluna sozinhos.

## 2. Decisão e alternativas descartadas

**Fechado por ele:** os blocos da coluna direita fecham automaticamente quando o painel do
dente abre. Não é renegociável nesta spec.

**As 4 perguntas abaixo (Q1-Q4) e a de escopo (§2.5) foram todas respondidas por ele em
03/08 — nada foi assumido sem aprovação.**

### Q1 — ✅ RESPONDIDA POR ELE (03/08): o bloco sai da coluna, o detalhe vira painel

Palavra dele: *"Um histórico, mas é um painel, popup que abre, detalhado, caso o dentista
queira ver, caso precise — eles precisam disso."*

**Fechamento definitivo — 03/08 (noite).** Esta seção passou por duas voltas. A resposta final
dele, textual:

> *"O 'já feito' será tudo registrado no histórico, referente àquela consulta, aquela data.
> Assim a gente elimina um campo que era redundante com o histórico. O 'já feito' cai no
> histórico, muito mais organizado — e com o histórico expandível a gente tem acesso a todos
> os procedimentos daquela sessão."*

| | |
|---|---|
| **O que sai** | O bloco **e o dado**. `jaFeito`, `MeuDiaEventoFeito` e `MeuDiaOcorrenciaFeita` saem do `get-meu-dia.ts`; `ja-feito-bloco.tsx` é deletado |
| **Por quê** | Era **redundante por construção**: o acumulado agrupado por âncora respondia "o que este paciente já teve", e o Histórico responde a mesma coisa melhor — **por consulta e por data**, que é a unidade que o dentista pensa (e a que o CFO exige: evolução por visita) |
| **Onde o dado vai** | Para `visitas[].eventos` — que já é fiel desde o R-55 e **já mostra toda ocorrência**, sem dedup |
| **Alternativa descartada** | "Vira popup/painel sob demanda mantendo `jaFeito`" — foi a leitura intermediária desta spec, **revogada**. Manter os dois seria manter a redundância, só que escondida atrás de um clique |

### ⚠️ O que isso faz com o R-55 (importante: não é trabalho jogado fora)

O R-55 consertou **duas** saídas. Só uma morre:

| Entrega do R-55 | Destino |
|---|---|
| 2ª passagem sobre `eventosRaw` **sem dedup** | ✅ **Sobrevive** — é exatamente o que faz o Histórico não perder procedimento repetido |
| `faces` e `observacao` em `MeuDiaEventoVisita` | ✅ **Sobrevive** — sem faces, 4 restaurações no mesmo dente viram 4 linhas idênticas |
| `realizado_em` no select | ✅ **Sobrevive** — é a data clínica de cada ocorrência |
| `chaveAncora` intocada, servindo só à pendência | ✅ **Sobrevive** — a trava do R-46 continua válida |
| `MeuDiaEventoFeito` agrupado com `ocorrencias[]` + badge `n×` | ❌ **Morre com o bloco** |

Ou seja: a parte **de servidor** do R-55 é o que torna esta decisão possível. Sem ela, tirar o
"Já feito" **perderia** dado, porque o Histórico ainda deduplicava. Ordem importava, e foi
respeitada por acidente feliz.

### ✅ A invariante crítica já está satisfeita — o C6 não espera o "histórico detalhado"

Poderia parecer que tirar "Já feito" exige antes o histórico detalhado (tabelas, por dente).
**Não exige.** Desde o R-55, `visitas[].eventos` já lista **toda** ocorrência realizada,
uma linha por evento. Nada fica inacessível no momento em que o bloco sai.

O "histórico detalhado" (card por procedimento, tabela de endo, observação, autor) continua
sendo **item próprio e posterior** — ele melhora a leitura, não destrava o C6.

> ⚠️⚠️ **04/08 (2ª correção ao vivo, no mesmo dia) — Q2 inteira foi REVOGADA.** Depois de usar
> o resumo+`Sheet` (abaixo) ao vivo, ele pediu de volta o mecanismo pré-C6: **1 painel só**,
> completo (`ToothDetailPanel` sem alteração — faces, chips, tabela de especialidade),
> flutuando **ao lado do odontograma** dentro de `registrar-painel.tsx`, card próprio com
> `gap-4` de respiro — não mais resumo pequeno na direita + `Sheet` separado. Só que a razão
> do WCAG que motivou Q2 continua real: painel void a espaço da MESMA linha do odontograma.
> Solução: `colapsarDireita` — morto por esta spec, **voltou** — some quando `denteAberto !=
> null`, devolvendo os 312px+gap pro centro. Medido ao vivo: dente continua 43×76px com o
> painel aberto (idêntico ao estado fechado) — a regressão que motivou Q2 não voltou.
> `tabelaContainer` (mecanismo R-20, nunca estava aceso no C6/Sheet) foi ligado: selecionar
> "Canal" abre a ficha endodôntica completa abaixo do odontograma+painel, full-width — era
> parte do pedido dele ("abaixo do odontograma aparecer o procedimento com a tabela").
> `dente-resumo-bloco.tsx` e o `Sheet` de `meu-dia-client.tsx` foram **deletados** — zero uso
> restante. A tabela abaixo (Q2 original) e o texto seguinte descrevem a versão JÁ SUPERADA —
> mantidos como histórico do raciocínio, não como contrato vigente.

### Q2 — ~~RESPONDIDA POR ELE (03/08)~~ REVOGADA 04/08 (ver acima): dois painéis, não um

**A recomendação original desta seção (painel vira o conteúdo do slot `direita`) foi
SUPERADA.** Ele decidiu partir em dois, e o motivo é o gate WCAG: se o painel completo ocupa
a coluna de 312px, o `ToothDetailPanel` fica espremido; se ocupa o centro, o odontograma
encolhe. Nenhum dos dois resolve — a saída é o painel completo **sair do fluxo do grid**.

| | Onde | O quê | Edita? |
|---|---|---|---|
| **Painel pequeno** | Inline na coluna direita, **1º item** (topo, mesma linha do odontograma) | Resumo do dente selecionado + botão "abrir completo" | **Não** — só leitura |
| **Painel completo** | **`Sheet` deslizando da direita**, sobrepondo | O `ToothDetailPanel` de hoje **inteiro, sem alteração** | Sim |

> ⚠️ **04/08 (correção ao vivo) — "fecha os outros, igual aos blocos de hoje" foi testado e
> revogado por ele na mesma sessão.** Ver Q3 abaixo: não existe mais exclusão mútua em
> nenhuma coluna. O resumo do dente é o **primeiro** filho da direita (não o último, como a
> primeira implementação fez) — é isso que garante "mesma linha do odontograma" sem precisar
> de posição especial: a direita já é coluna fixa, o 1º item dela nasce alinhado ao topo do
> centro.

**Consequências que isso resolve de graça:**

- O mecanismo `colapsarDireita` (`cockpit-grid.tsx`) **morre**. A grade fica sempre
  `320px | 1fr | 312px`, em qualquer estado.
- O odontograma **nunca mais muda de tamanho** conforme o painel — o gate G13 do contrato
  original (dente ≥24px dependendo do colapso) deixa de existir como risco: dentro do `Sheet`
  o dente pode nascer grande de propósito, sem depender da largura da grade.
- O card que o dentista tocou não some debaixo do dedo (atrito do §1): o resumo aparece
  **na coluna onde ele clicou**, e o completo abre por cima.

**Padrão já existe — não é UI nova.** [`sheet.tsx`](../../src/components/ui/sheet.tsx) já é
usado em `agendamentos-client.tsx`, `financeiro-client.tsx` e `whatsapp-connect-sheet.tsx`.
Como o mecanismo é reuso e não desenho novo, **a regra 4 (brief antes de componente) não
dispara** para a moldura — só o conteúdo do painel pequeno é forma nova, e ela é uma lista
de leitura, não layout novo.

| | |
|---|---|
| **Descartado (recomendação anterior)** | O painel vira o **conteúdo literal do terceiro slot do grid** (`direita`), substituindo os blocos enquanto aberto |
| **Por quê funciona sem regredir o WCAG** | Hoje o gate G13 existe porque o painel (290px) rouba espaço da MESMA linha do odontograma dentro do centro — daí precisar colapsar a direita pra compensar. Se o painel sai do centro e vai pro slot `direita`, o centro **nunca mais compartilha linha com o painel**: fica sempre no `1fr` "painel fechado" de hoje, que já passa nos gates. O mecanismo de colapsar/expandir a grade (`colapsarDireita`, contrato §5.3) deixa de ser necessário — a grade fica sempre `320px \| 1fr \| 312px` |
| **Ganho extra** | Resolve também o atrito descrito no problema: clicar num dente dentro de "Concluídos hoje" faz o card se transformar no lugar, em vez de sumir e reaparecer em outro canto |
| **O que isso desfaz do C3** | O mecanismo `colapsarDireita` inteiro (`cockpit-grid.tsx`) e a renderização do `ToothDetailPanel` dentro de `registrar-painel.tsx` (§5.3 do contrato original) são **substituídos**, não mantidos em paralelo |
| **Alternativa descartada** | Manter o mecanismo atual (painel flutua no centro, direita colapsa) e só dar ao painel uma "casca" visual parecida com um card de coluna direita. Descarto: não resolve o atrito real (o card que o dentista tocou continua sumindo), e mantém 2 mecanismos de layout fazendo o mesmo trabalho |

### Q3 — ✅ REVOGADA por ele, 04/08 (ao vivo): nenhum bloco fecha o outro, em nenhuma coluna

A recomendação original desta seção (só a direita fecha, mecanismo de exclusão mútua herdado
do `abertoDireita`) foi testada ao vivo nesta sessão e rejeitada. Palavra dele: *"quando eu
abro o histórico, ele fecha anexar... eu não quero, quero que seja tudo aberto ou não"* — ele
queria **liberdade total**: cada bloco (esquerda e direita, painel do dente incluso) abre e
fecha **independente**, sem nenhum apagar o outro.

| | |
|---|---|
| **Implementado** | `abertoEsquerda`/`abertoDireita` (valor único, radio-style) **saíram**. Cada bloco tem seu próprio `useState<boolean>` (`historicoAberto`, `anexosAberto`, `concluidosHojeAberto`, `aFazerAberto`, `novosProcedimentosAberto`, `denteResumoAberto`) — 6 estados independentes, `BlocoMoldavel` continua controlado do mesmo jeito, só quem manda nele que mudou |
| **Ao selecionar um dente** | `denteResumoAberto` vira `true` (mesmo se um dente anterior tivesse sido recolhido manualmente) — clicar um dente é sempre "quero ver isso agora". Não mexe em nenhum outro bloco |
| **Ao fechar o painel/trocar de paciente** | Nenhum bloco muda de estado por causa disso — só `denteAberto`/`sheetAberto` resetam (o resumo para de renderizar, não porque foi "fechado", porque não há mais dente selecionado) |
| **Descartado (recomendação original)** | Exclusão mútua por coluna (`abertoDireita`/`abertoEsquerda` de valor único) — rejeitada ao vivo, não é mais válida em lugar nenhum do cockpit |

### Q4 — Coluna direita hoje: correção do inventário

**Não são 3 blocos, são 4**: `A fazer` · `Já feito` · `Concluídos hoje` · `Novos
procedimentos` (os 2 últimos são instâncias de `NestaSessaoBloco`). Com Q1 aprovado, sobram
**3**: `A fazer` · `Concluídos hoje` · `Novos procedimentos` — sem reordenar.

### 2.6 — ✅ REDISTRIBUIÇÃO DAS COLUNAS (04/08) — supera a Q3/Q4

**Decisão dele, 04/08.** As colunas ganham um princípio, e ele reorganiza tudo:

> **esquerda = o que já aconteceu · direita = o que está pendente · centro = a entrada**

| Coluna | Conteúdo | Mudou? |
|---|---|---|
| **Esquerda** | Histórico · **Anexar documentos** (D8 do R-46d) · **Concluídos hoje** | "Concluídos hoje" **vem da direita**; anexo é novo |
| **Centro** | Campo mágico → detecção → odontograma | ONDE/STATUS/barra **morrem** (D12 do R-46d) |
| **Direita** | A fazer · Novos procedimentos · **painel do dente** | perde "Concluídos hoje" e o "Já feito" |

**Por que faz sentido:** "Concluídos hoje" é registro do que aconteceu — mesma natureza do
Histórico, que está na esquerda. "Novos procedimentos" é o que ficou indicado, mesma natureza
de "A fazer", que está na direita. Hoje os quatro estão amontoados na direita porque nasceram
juntos, não porque pertencem juntos.

⚠️ **Isto supera a Q4 acima** (que dizia "sobram 3 blocos na direita, sem reordenar") e parte
da Q3. A contagem final da direita é **3 itens de acordeão**: `A fazer` · `Novos procedimentos`
· `painel do dente` (só quando há dente selecionado). A esquerda passa de 1 para **3**.

⚠️ **Consequência pro orçamento de altura (`MAPA §1`, 441px):** a esquerda ganha 2 blocos e a
direita perde 1. **Não é neutro** — a esquerda tinha folga porque só tinha o Histórico, e é
justamente ela que o [R-58](R-58-historico-detalhado.md) vai encher de texto e tabela. Medir
antes de dar por pronto; é o mesmo gate G1 que ainda nunca foi medido de verdade.

### 2.5 — ✅ DECIDIDO POR ELE (03/08): responsivo entra nesta fatia, o P8 morre

O contrato original (§0) e a spec-mãe se contradiziam: o P8 punha tablet/celular fora de
escopo, enquanto [R-46-meu-dia.md:181](R-46-meu-dia.md) dizia que *"responsivo é **requisito**
das fatias de UI, não polish"*, justamente porque **foi a barreira física que matou o modo
consulta** (o dentista longe do PC). Ele fechou a favor da spec-mãe.

**Consequência prática:** esta fatia não fecha só em 1440×900. O `Sheet` ajuda — em tela
estreita ele naturalmente vira painel de largura total, que é o comportamento certo e não
custa código extra. O que precisa de decisão de layout é a **grade de 3 colunas**, que não
sobrevive a um iPad retrato (medido: 1703px = 1,7 tela de rolagem).

Isso **encarece esta fatia** e o R-46d D1. É consciente: o custo de descobrir depois é maior
— foi exatamente o que aconteceu com o modo consulta.

## 3. Objetivo e como funciona

**Objetivo:** a coluna direita nunca perde altura pro "Já feito" (que sai de vez — §2 Q1), e o
odontograma nunca muda de tamanho quando um dente é selecionado (§2 Q2).

Clicar num dente (no odontograma central, ou numa linha de "Concluídos hoje"/"Novos
procedimentos") acrescenta **mais um item ao acordeão da direita** — um resumo pequeno,
só-leitura, do dente selecionado. Ele entra na mesma régua dos outros 3 blocos: abrir fecha os
irmãos (comportamento já existente do `BlocoMoldavel`, não é mecanismo novo). Dentro do resumo,
um botão "abrir completo" dispara o **`Sheet`** deslizando da direita, com o `ToothDetailPanel`
de hoje inteiro, sem alteração nenhuma nele. Fechar o `Sheet` (X, clique fora, ou Esc) volta
pro resumo; fechar o resumo (recolher o item do acordeão, ou selecionar outro dente) não
desfaz nada em `eventosDraft`. O odontograma no centro **nunca** muda de tamanho — nem quando o
resumo abre, nem quando o `Sheet` abre, porque nenhum dos dois compartilha linha com ele.
"Já feito" não existe mais nesta tela — o que ele mostrava está no Histórico (esquerda,
por consulta e data, fiel desde o R-55) e no perfil completo do paciente.

## 4. Contrato técnico

### 4.0 Fechamento definitivo (03/08, noite) — jaFeito sai de vez

Este contrato passou por 2 leituras. A primeira supunha "Já feito" apagado; a segunda (Q1
"popup sob demanda mantendo `jaFeito`") foi a correção seguinte. **As duas voltas anteriores
estão erradas.** A resposta final dele (§2 Q1) é textual: o "já feito" cai dentro do
Histórico, por consulta e data — não vira painel próprio, e o dado não sobrevive num campo
separado. `jaFeito`/`MeuDiaEventoFeito`/`MeuDiaOcorrenciaFeita` **saem de verdade**.

O que preserva a fidelidade sem esse campo: `visitas[].eventos` (R-55) já lista toda ocorrência
realizada, com `faces`/`observacao`/`realizado_em` — é o que o Histórico expandido já consome.
Nada fica inacessível.

### Arquivos tocados

> ⚠️ **04/08 (revisão) — a tabela e o G2/G8 do §7 foram escritos ANTES da redistribuição do
> §2.6 ter sido decidida** (a versão anterior sobrevivia com `AbertoDireita` de 4 itens,
> `Concluídos hoje` incluído — direto contra o que o §2.6 já fechava). A versão abaixo é a
> primeira a refletir o §2.6 de verdade.

| Arquivo | Muda |
|---|---|
| `src/server/dashboard/get-meu-dia.ts` | Remove `jaFeito`, `MeuDiaEventoFeito`, `MeuDiaOcorrenciaFeita`, `realizadosPorPaciente` e o loop que os monta. `pendencias` (via `vencedorPorAncora`) **intocado** |
| `_components/ja-feito-bloco.tsx` | **Deletar.** Não reaproveita — o "já feito" não tem componente próprio nesta tela; o Histórico é quem mostra |
| `_components/cockpit-grid.tsx` | Remove `colapsarDireita`; grid sempre `grid-cols-[320px_minmax(0,1fr)_312px]`, em qualquer estado. Mecânica inalterada por §2.6 — só o CONTEÚDO dos slots muda, não o grid em si |
| `_components/registrar-painel.tsx` | Remove o JSX do `ToothDetailPanel` e o efeito `getGruposAbertos` (migram pra `meu-dia-client.tsx`); o wrapper do `Odontograma` some (não compartilha mais linha com painel nenhum). **Não toca** na barra/combobox/`OndeSeletor` — isso é escopo do R-46d D1 (D7/D12), mesmo arquivo, PR conjunta |
| `_components/meu-dia-client.tsx` | Remove import/render de `JaFeitoBloco`. `abertoDireita`/`abertoEsquerda` (valor único) **saem de vez** (Q3, revogada 04/08) — cada bloco vira `useState<boolean>` próprio (6 no total: `historicoAberto`, `anexosAberto`, `concluidosHojeAberto`, `aFazerAberto`, `novosProcedimentosAberto`, `denteResumoAberto`). Ganha o fetch de `gruposAbertos` (migrado). `direita` do `CockpitGrid` fica com **3** itens — `DenteResumoBloco` **primeiro**, depois `AFazerBloco`, depois `NestaSessaoBloco` de "Novos procedimentos" — + o `Sheet` do painel completo montado fora do grid. `esquerda` fica com **3** itens (`HistoricoBloco`, `AnexarDocumentosBloco` — componente novo do R-46d D8 que esta spec só consome/encaixa — e `NestaSessaoBloco` de "Concluídos hoje", **migrado da direita, zero mudança no componente**, só o slot que o recebe) |
| **novo** `_components/dente-resumo-bloco.tsx` | Resumo só-leitura do dente selecionado — eventos daquele dente em `eventosDraft`, botão "abrir completo" |
| `_components/meu-dia-format.ts` | Comentário de topo perde a referência a `ja-feito-bloco` |

**Não é arquivo desta spec, mas ela consome o resultado:** `_components/anexar-documentos-bloco.tsx`
(novo) é construído pelo [R-46d D1 (D8)](R-46d-campo-magico.md) — C6 só importa e encaixa no
slot `esquerda`, não define o componente.

**Reuso — não recriar:** `ToothDetailPanel` (vai pro `Sheet` sem alteração), `Odontograma`,
`AFazerBloco`, `NestaSessaoBloco`, `BlocoMoldavel`, `HistoricoBloco`, `getGruposAbertos`,
[`sheet.tsx`](../../src/components/ui/sheet.tsx) (padrão já usado em 3 telas).

### Types

> ⚠️ **04/08 (correção ao vivo, Q3) — `AbertoDireita`/`AbertoEsquerda` (valor único, exclusão
> mútua) foram implementados, testados, e REJEITADOS por ele na mesma sessão** ("quero que
> seja tudo aberto ou não"). Os dois tipos abaixo nunca existiram na versão final — cada bloco
> tem seu próprio booleano independente. Deixo o histórico riscado porque é exatamente esse
> tipo de decisão que só aparece testando ao vivo, não lendo a spec.

```typescript
// meu-dia-client.tsx — implementado, testado ao vivo, revogado por ele no mesmo dia:
// ~~type AbertoDireita = 'aFazer' | 'novosProcedimentos' | 'painelDente' | null;~~
// ~~type AbertoEsquerda = 'historico' | 'anexos' | 'concluidosHoje' | null;~~

// versão final — 1 useState<boolean> por bloco, sem tipo de exclusão nenhum
const [historicoAberto, setHistoricoAberto] = useState(true);
const [anexosAberto, setAnexosAberto] = useState(false);
const [concluidosHojeAberto, setConcluidosHojeAberto] = useState(false);
const [aFazerAberto, setAFazerAberto] = useState(true);
const [novosProcedimentosAberto, setNovosProcedimentosAberto] = useState(false);
const [denteResumoAberto, setDenteResumoAberto] = useState(true);

// cockpit-grid.tsx — sem colapso, nunca existiu conteúdo condicional no slot
export interface CockpitGridProps {
  esquerda: React.ReactNode;
  centro: React.ReactNode;
  direita: React.ReactNode; // esquerda: 3 itens de acordeão · direita: 3 — Sheet não entra em nenhum
}

// get-meu-dia.ts — MeuDiaEventoFeito e MeuDiaOcorrenciaFeita SAEM inteiros (inalterado pelo §2.6)
export interface MeuDiaContexto {
  visitas: MeuDiaVisita[];
  // jaFeito REMOVIDO — o dado equivalente já está em visitas[].eventos (R-55)
  pendencias: MeuDiaPendencia[];
  orto: MeuDiaOrto | null;
  alertas: string[];
}
```

### Comportamento

`direita` do `CockpitGrid` passa a ser **3 itens** — o novo `DenteResumoBloco` **primeiro**
(só renderiza quando `denteAberto != null`), depois `AFazerBloco`, depois o `NestaSessaoBloco`
de "Novos procedimentos". Ordem importa (04/08, ao vivo): o resumo vem **antes** dos outros
dois porque ele "fica na mesma linha do odontograma" — a direita é coluna fixa, o 1º filho
dela nasce alinhado ao topo do centro, sem precisar de `position: absolute` nem CSS especial.
Selecionar um dente **mostra** o `DenteResumoBloco` (monta) e força `denteResumoAberto = true`
— não fecha os outros dois, cada um mantém o que já tinha (§2 Q3, revogada). O `Sheet` com o
`ToothDetailPanel` completo é um **overlay**, montado uma vez em `meu-dia-client.tsx`, fora do
grid — abre pelo botão "abrir completo" do resumo, recebe as mesmas props que o
`ToothDetailPanel` já recebe hoje (`dente`, `eventos={eventosDraft}`, `onChange={setEventosDraft}`,
`onClose`, `dataPadrao`, `gruposAbertos`) sem nenhuma delas mudar de forma.

`esquerda` passa a ter **3 itens** também: `HistoricoBloco` (nasce aberto, como hoje), o
`NestaSessaoBloco` de "Concluídos hoje" (**migrado da direita — mesmo componente, mesmas
props, só troca de slot no JSX de `meu-dia-client.tsx`**) e o novo `AnexarDocumentosBloco`
(construído e com seu próprio contrato no [R-46d D1 §D8](R-46d-campo-magico.md) — esta spec só
importa e encaixa, não define comportamento dele). Nenhum dos 3 fecha os outros — cada `aberto`
é seu próprio `useState`.

⚠️ **Acoplamento com R-46d, não mais opcional (§2.6).** O layout final descrito acima só fecha
quando o R-46d D1 também entrar: é ele quem esvazia o centro (D12 — barra/chips saem) e quem
entrega o `AnexarDocumentosBloco` (D8). Codar só esta spec entrega jaFeito-sai + Sheet, mas
**não** entrega a redistribuição de colunas nem resolve o estouro de 37px medido no `MAPA §1`
— os dois specs foram desenhados pra fechar juntos, mesmos arquivos (`meu-dia-client.tsx`,
`registrar-painel.tsx`).

`gruposAbertos` migra: `useState<GrupoAberto[]>([])` + `useEffect` chamando
`getGruposAbertos(pacienteId)` sobem de `registrar-painel.tsx` (linhas 163-167) para
`meu-dia-client.tsx`, key `slotSelecionado.pacienteId` — mesma chamada, zero query nova.

`registrar-painel.tsx` perde o bloco (linhas 394-405 do arquivo atual) e o `flex items-start
gap-3` que envolvia odontograma+painel simplifica pra um `div` único, já que não há mais
irmão pra dividir espaço — o odontograma nunca mais compartilha linha com painel nenhum.

## 5. Referência visual

> Não existe artefato pra esta fatia — é reposicionamento de peças já aprovadas (mesmos
> tokens, mesmos componentes), não desenho novo. Recomendo pular o pipeline completo de
> artefato e, em vez disso, conferir visualmente em localhost antes de considerar pronto
> (mesmo espírito do G3/G6 abaixo). Se ele preferir um mock rápido antes de codar, é 1 tela
> HTML com o painel já dentro do slot de 312px — baixo custo, mas não é bloqueio técnico.

- **Rota:** `/dashboard/meu-dia` · **Componentes alvo:** `cockpit-grid.tsx`, `meu-dia-client.tsx`,
  `registrar-painel.tsx`, `dente-resumo-bloco.tsx` (novo)
- **Tokens** (todos já em uso, nenhum novo): `bg-surface` (card do resumo e dos blocos) ·
  `border-border` · `text-text-primary` (título do dente) · `text-text-secondary` (labels,
  contadores) · `text-teal-ink` (destaque de "tem rascunho", herdado do `BlocoMoldavel`)
- **Medida:** resumo inline ocupa a coluna de **312px**, mesma largura dos outros blocos.
  `Sheet` segue a largura padrão do componente (`sheet.tsx`) — não a de 290px que o painel
  tinha flutuando no centro; conferir se algum campo de especialidade (endo/implante) corta
  nessa largura (G7 abaixo)

## 6. Invariantes

- [ ] Nenhuma ocorrência clínica que "Já feito" mostrava fica inacessível — coberta por
      Histórico (esquerda, fidelidade total desde R-55) + "Ver perfil completo" (FichasTab R-21)
- [ ] `eventosDraft`/`denteAberto`/`textoVisita` continuam com dono único (`meu-dia-client`) e
      reset explícito ao trocar de paciente (C1 §5.4) — mover o painel de coluna não muda o dono
- [ ] O painel do dente, onde quer que renderize, edita o **mesmo** `eventosDraft` que o
      odontograma central lê — nunca 2 cópias
- [ ] `gruposAbertos` continua vindo de `getGruposAbertos(pacienteId)`, zero query nova
- [ ] Nenhuma regra de `salvarVisitaMeuDia`, RLS ou schema muda — esta fatia é só layout

## 7. Gates de aceite

- [ ] **G1** — `grep -r "jaFeito\|MeuDiaEventoFeito\|MeuDiaOcorrenciaFeita\|ja-feito-bloco" src` devolve vazio. Typecheck + build limpos
- [ ] **G2** — coluna direita mostra sempre [resumo do dente, só quando há seleção, PRIMEIRO], A fazer, Novos procedimentos — nunca "Já feito" nem "Concluídos hoje" (foi pra esquerda). Coluna esquerda mostra sempre Histórico, Anexar documentos, Concluídos hoje
- [ ] **G3** — clicar num dente (odontograma OU linha de "Concluídos hoje"/"Novos procedimentos") mostra o **resumo pequeno** já expandido, como 1º item da coluna direita — sem fechar A fazer/Novos procedimentos (04/08: exclusão mútua saiu, G3 original testava o comportamento errado) e sem o odontograma mudar de tamanho
- [ ] **G4** — "abrir completo" no resumo abre o **`Sheet`** com o `ToothDetailPanel` intacto — comparar campo a campo com o painel de hoje (nada perdido na migração)
- [ ] **G5** — fechar o `Sheet` (X, clique fora, Esc) volta pro resumo, sem perder `eventosDraft`; recolher o resumo manualmente não mexe em A fazer/Novos procedimentos (04/08: nenhum bloco depende do estado de outro)
- [ ] **G6** — regressão WCAG: medir o dente do odontograma com o resumo aberto E o `Sheet` aberto — nos dois casos ≥24px e **idêntico** ao estado neutro (o odontograma nunca varia de tamanho, em nenhum estado)
- [ ] **G7** — formulário de especialidade (endo/implante) dentro do `Sheet` renderiza sem scroll horizontal nem campo cortado — testar com um dente de canal, e testar a largura real do `Sheet` (não presumir que 312px do resumo se aplica)
- [ ] **G8** — todos os 6 blocos (Histórico, Anexar documentos, Concluídos hoje, A fazer, Novos procedimentos, resumo do dente) abrem/fecham 100% independentes — testar os 6 abertos ao mesmo tempo, nenhum fecha nenhum outro (04/08, ao vivo — confirmado: Histórico+Anexar+Concluídos+A fazer simultâneos)
- [ ] **G9** — trocar de paciente com o resumo ou o `Sheet` abertos fecha os dois (`denteAberto`/`sheetAberto` zeram) — os OUTROS blocos (Histórico, Anexar, Concluídos, A fazer, Novos procedimentos) mantêm o estado aberto/fechado que tinham, sem regressão da trava §5.4 (C1)
- [ ] **G10** — regressão: "fazer hoje →", contadores e `ToothGroupList` nos 3 blocos remanescentes funcionam exatamente como hoje
- [ ] **G11** — regressão R-55: Histórico (esquerda) continua sem dedup, toda ocorrência aparece — é ele quem agora carrega sozinho o que "Já feito" mostrava
- [ ] **G12** — regressão C5: seleção múltipla no odontograma continua funcionando (anel aparece, 2º toque com 2+ selecionados remove do lote) — a mudança na JSX ao redor do `Odontograma` não deve tocar `onToothToggle`
- [ ] **G13** — `git diff --stat` confirma zero mudança em `salvarVisitaMeuDia`, RLS, migration, `supabase/`
- [ ] **G14** — responsivo (§2.5): grade de 3 colunas em iPad retrato (768px) não estoura 1,7 tela de rolagem — medir antes/depois. `Sheet` em tela estreita vira largura total sem código extra (comportamento nativo do componente) — confirmar, não presumir
- [ ] **G15** — medir a altura de esquerda/direita em 1440×900 com o layout FINAL (esta spec + R-46d D1 juntos, paciente com histórico real pós-R-58) e comparar com o `MAPA §1`: a medição de 04/08 (esquerda 237px / direita 269px) foi feita ANTES da redistribuição — esquerda ganhou 2 blocos, direita perdeu 1, não é mais válida como baseline. Gate só fecha com os dois specs no ar juntos — sozinha, esta spec não muda o centro (a peça que realmente estoura os 37px)

## 8. Fora de escopo

- Onde as tabelas de especialidade abrem em tela cheia (`tabelaContainer`, R-49) — não mexe
- ~~Responsividade/tablet (P8, já fora desde o contrato original)~~ **REVOGADO em 03/08 —
  ver §2.5.** Responsivo é requisito desta fatia.
- R-46d (campo mágico com IA) e R-46h (salvar + abrir orçamento) — itens próprios, sem relação
- Construir uma versão "absorvida" do acumulado de "Já feito" dentro do Histórico (alternativa descartada na Q1) — se ele quiser isso depois, é item novo
- Atualizar `loading.tsx` (skeleton ainda mostra 3 placeholders genéricos na direita) — cosmético, não bloqueia; pode ir num commit de ajuste separado
