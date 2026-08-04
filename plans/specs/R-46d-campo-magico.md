# R-46d — Campo mágico no Meu dia (arquivo, voz e organizar)

> **SPEC** · sub-item do **R-46**
> **Aberto:** 2026-08-03 · **Fechado:** — · **Fase:** **`aprovada` pra D0 e D1** — D4 (moldura)
> resolvido; D2 (fusão com `ColarDoWordDialog`) segue como recomendação a confirmar, não
> bloqueia D0/D1
> **Modelo:** Sonnet 5 na fatia D0 (extração mecânica, behavior-preserving) · Opus na
> fatia D1 (decisão de forma visual em aberto + componente compartilhado passa a ter 2 telas
> consumidoras)
> **Depende de:** nada bloqueante tecnicamente. Toca o mesmo caminho de código que o
> **R-47** corrigiu (2 rodadas, 31/07) e que **nunca foi testado ao vivo** (🟡) — ver riscos.
> **Não bloqueia nem é bloqueado por:** R-46c (fica como está, ver D2 abaixo).

> ⚠️ **D2 é recomendação, não fato consumado — ele confirma antes do código.** D4 **já foi
> respondido** (ver §4 D4) — a moldura do campo mágico é expansão in-place, não overlay,
> decisão independente da moldura do painel do dente (C6, que usa `Sheet`): são dois
> problemas diferentes (revisar texto extraído × caber odontograma+painel). D0 e D1 são
> contrato pronto pra codar.

## 1. Problema

O Meu dia hoje só tem "+ texto da visita" — um link cinza que abre uma `<textarea>` simples.
Sem voz, sem anexo, sem estruturação por IA. Enquanto isso, o perfil do paciente já tem
`CapturaLivreCard`: fala, cola ou anexa (áudio/pdf/docx/txt), e "Organizar com Dex" estrutura
tudo em procedimentos e eventos de odontograma. O cockpit **já reserva o espaço** pro campo
mágico (contrato §4, fatia C4: "campo mágico em tela cheia — só o container"), mas nenhuma
fatia o entregou. É a lacuna mais visível do redesign: a tela pensada pra ser mais rápida que
o Word ainda obriga digitação crua onde a IA já resolve isso em outro lugar do produto.

## 2. Decisão e alternativas descartadas

| Decisão | Alternativa descartada | Motivo |
|---|---|---|
| **D1** — `CapturaLivreCard`/`useCapturaLivre` são **reusados tal qual** (fix cosmético à parte, ver D5) dentro de um wrapper novo no Meu dia | Recriar um componente do zero | Único call site hoje é `FichasTab.tsx` (confirmado por grep). A API do componente (`onOrganizado(data)`) já é presentation-agnostic — não tem acoplamento ao form do perfil |
| **D2** — ✅ **DECIDIDO POR ELE (03/08, após a spec):** o campo mágico é **um só componente**. `ColarDoWordDialog` e o campo mágico do Meu dia **são a mesma coisa em telas diferentes** — o que muda é o **destino** da gravação, não a ferramenta | ~~Manter os 2 separados~~ (era a recomendação do planner, **revogada**) | Palavra dele: *"É único sim o campo mágico, os dois são a mesma coisa. Só que em telas diferentes."* Precedência: conversa vence documento. O componente ganha um **modo/destino**, não um irmão. ⚠️ **As travas de honestidade do R-46c não podem se perder na fusão** — ver I7 |
| **D3** — extrair `dedupEventosDraft`/`chaveDedupEvento` + o bloco "nunca perde pra reextração" pra `src/lib/odontograma/dedup-eventos-draft.ts`, generalizado numa 3ª função nova (`mesclarEventosSemPerda`) | Duplicar a lógica no Meu dia (copiar/colar o bloco) | Duplicar reabre exatamente o bug que o R-47 levou 2 rodadas pra fechar — a próxima correção teria que lembrar de mexer nos 2 lugares. ~40 linhas, zero closure sobre o form do FichasTab — extração mecânica, risco baixo |
| **D4** — ✅ **RESPONDIDO POR ELE (03/08):** tela cheia é **expansão**, e existe por um motivo funcional: **o dentista precisa conferir o que a extração tirou do arquivo**. Não é estética — é a superfície de revisão do texto extraído de uma ficha antiga | ~~Overlay modal~~ · ~~decidir só no artefato~~ | Palavra dele: *"muitas vezes o dentista vai subir e a gente vai extrair o arquivo, e aí ele quer dar uma conferida no que subiu desse arquivo, dessa ficha antiga — por isso eu falei de expandir."* Medidas do contrato do cockpit §3 continuam valendo (`min 520`, textarea `16px/400`, `max-width 90ch`) |
| **D6** — ✅ **DECIDIDO POR ELE (03/08):** no Meu dia o fluxo é **escrever → salvar → o odontograma mostra → o dentista confirma**, igual à ficha | Aplicar direto no rascunho sem passo de conferência | Palavra dele: *"o dentista vai poder escrever o que ele fez na sessão, salvar, e vai mostrando no odontograma — o dentista confirma, da mesma forma que funciona na ficha."* O odontograma segue com o comportamento padrão de hoje (só o rascunho) — ver Q5, cortada |
| **D5** — corrigir o hardcode `bg-red-100 text-red-600` do estado "gravando" em `captura-livre-card.tsx:179` para tokens do projeto | Deixar como está (é código do perfil, não desta fatia) | O componente está entrando numa 2ª tela com light/dark auditado a fundo (cockpit). 1 linha, e evita um badge rosa quebrando o dark mode logo na estreia |
| **D7** — ✅ **DECIDIDO POR ELE (04/08): o campo mágico SUBSTITUI a barra de procedimento.** Não convivem | ~~Barra fica pro caso rápido + campo mágico embaixo pro relato completo~~ (era minha recomendação, **recusada**) | Palavra dele: *"substituir a barra que hoje tem, que fica embaixo do onde/dente, e colocar o campo mágico. Porque aí ele vai de todo jeito ter que digitar, falar ou anexar."* Entrada única, sem escolher ferramenta antes de começar. ⚠️ **Consequência de maior peso desta spec — ver §2.1** |
| **D8** — ✅ **DECIDIDO POR ELE (04/08):** anexo de documento vira **caixa própria embaixo do Histórico** (coluna esquerda), separada do campo mágico. Com botão **"usar este documento de base"** que carrega a transcrição no campo mágico | Anexo só dentro do campo mágico (como o `CapturaLivreCard` faz hoje) | Palavra dele: *"a gente separa essa parte de anexar o documento do Dex, cria uma caixinha aqui embaixo do histórico pra anexar documentos, e no campo mágico um botão 'usar este documento de base' — aí ele já vai criar uma ficha usando esse documento, da transcrição."* Separa **ter o documento** de **usar o documento**: o anexo fica no paciente, o uso é por sessão |
| **D9** — ✅ **DECIDIDO POR ELE (04/08):** o campo mágico mostra a **detecção em tempo real** — procedimento e dente aparecendo enquanto o texto entra —, e o dentista continua acrescentando embaixo | "Organizar com Dex" como botão único no fim (comportamento de hoje) | Palavra dele: *"o campo mágico mostra aquela detecção em tempo real, que fica bem legal, e embaixo ele pode acrescentar mais coisas, e aí a gente organiza pra ele se trazer num contexto muito completo."* ⚠️ **Custo real a decidir na implementação — ver §2.2** |
| **D10** — extração de **valor** pelo texto **NÃO entra nesta fatia** — vira item próprio, depois do [R-53](R-53-orcamento-indicados-abertos.md) | Extrair valor junto, com trava de confirmação | Decisão dele, 04/08. O R-53 ainda vai mudar de onde vem o item do orçamento; empilhar "IA propõe preço" sobre um caminho que vai mudar multiplica risco em cima de **dinheiro**. Ele também quer rever o estilo do orçamento antes |

### 2.1 ⚠️ O que o D7 custa — precisa estar escrito

Substituir a barra **não é trocar um input por outro**. A barra é o typeahead do R-46b: 17 tipos
estruturais + catálogo comercial da clínica, com `"restauração 35"` resolvendo o dente pelo
texto, ordem livre (procedimento antes ou depois do "onde") e o chip de catálogo pendente.

**O que morre com ela:** o caminho de **3 gestos** (digitar → Enter → Salvar), determinístico,
instantâneo e sem custo de token. O `MAPA-MEU-DIA.md §3` chama esse número de *"o ativo do
produto"* e o §0 define **gestos por registro** como a métrica que governa o roadmap inteiro —
é a única em que o Word ainda ganha.

**Depois do D7, todo registro passa por IA.** Consequências que a implementação tem que
enfrentar, não descobrir:

| Risco | Mitigação mínima |
|---|---|
| Latência entra no caminho crítico de todo registro | Medir antes/depois. Se o registro simples ficar mais lento que hoje, o D7 piorou a métrica que justifica o produto |
| Falha de rede/API deixa o dentista sem caminho pra registrar | **Fallback obrigatório:** o painel do dente (odontograma → `ToothDetailPanel`) continua registrando sem IA nenhuma. Não pode existir estado em que registrar é impossível |
| Custo por token em toda entrada, não só nas ricas | `feature` no logger de provider (regra do `CLAUDE.md`) pra medir custo real por registro |

⚠️ **A métrica não é medida hoje** (`MAPA §6.7`: nenhuma spec instrumenta gestos). Então o D7
**não pode ser declarado bom ou ruim** — só observado. Recomendação: instrumentar a contagem
de gestos **antes** de trocar, senão a comparação vira opinião.

**Absorve o R-46b.** A fatia "Registrar" do R-46b deixa de existir como está. O R-46b não é
cortado — ele é **substituído** aqui, e o roadmap precisa dizer isso, senão fica uma spec
`aprovada` descrevendo uma tela que não existe mais.

### 2.3 ✅ D11 (04/08) — a detecção acende o odontograma, com MOTION e não com tinta

**Decisão dele:** *"conforme ele vai detectando os procedimentos, os dentes, o odontograma vai
acendendo, inserindo já. Aí o dentista clica no procedimento."*

O valor é **confirmação espacial**: falar "26" e ver o 26 acender prova que ele entendeu o dente
certo, sem ler lista nenhuma. Nenhum chip de texto entrega isso.

⚠️ **O risco, e por que motion resolve.** Enquanto se digita, **toda frase é um fragmento**:
`"extração do 38"` existe como texto antes de `"...está descartada"` ser digitado. Mesma coisa
com *"não fiz o canal do 26 hoje"* e *"se não melhorar, extração"*. Pintar o dente durante a
digitação quebra a invariante que **ele mesmo protegeu ao cortar a Q5**: *"o que está no
odontograma é exatamente o que o Salvar grava"*.

**Dois estados visuais distintos, e a diferença é movimento:**

| Estado | Significa | Como |
|---|---|---|
| **Detectado** | "estou vendo isso no texto" | pulso / contorno animado, **sem preenchimento** |
| **Confirmado** | "isso vai ser gravado" | pinta com a cor de sempre (`corDoRegistro`) |

Isso respeita a restrição do `MAPA §7.1` — *"a gramática de cor está esgotada, elemento novo não
ganha cor"* — que lista **motion** explicitamente como livre (*"o cockpit não tem uma única
animação"*). Zero cor nova, invariante preservada, e a sensação de "ele já entendeu" mantida.

### 2.4 ✅ D12 (04/08) — a faixa ONDE/STATUS morre junto com a barra

Consequência do D7 que precisa estar escrita: com o campo mágico como entrada, os chips de
**ONDE** (`+ dente · Arc. sup. · Arc. inf. · Boca toda · Q1-Q4`) e de **STATUS** (`a fazer ·
feito`) **saem do painel Registrar**. O texto resolve os dois — *"extração do 38"* já traz onde,
*"vou fazer semana que vem"* já traz status.

O centro passa a ser: **campo mágico → detecção → odontograma**. Nada mais.

⚠️ **O `OndeSeletor` não é deletado** — ele continua sendo o caminho sem-IA (fallback do §2.1)
quando acessado pelo painel do dente. Sai da faixa fixa do centro, não do código.

### 2.2 ⚠️ "Tempo real" (D9) — o que precisa ser decidido antes de codar

Hoje é um botão: o dentista escreve, clica "Organizar com Dex", revê o resultado. "Tempo real"
pode significar três coisas com custos muito diferentes:

| Leitura | Custo | Quando faz sentido |
|---|---|---|
| **Debounce** (extrai ~800ms depois de parar de digitar) | 1 chamada por pausa | **Recomendado** — entrega a sensação de "ele já entendeu" sem streaming |
| **Streaming por token** | chamada contínua, texto mudando sob o dedo | Só se a sensação for o produto em si |
| **Ao colar/anexar + botão** (hoje) | 1 chamada por ação | Mais barato, menos "mágico" |

**Não decidido.** Fica pro brief de implementação, mas o default recomendado é o debounce — é o
que dá a sensação descrita sem transformar cada tecla em custo.

## 3. Objetivo e como funciona

**Objetivo:** no Meu dia, o dentista registra a visita de hoje falando, anexando um arquivo ou
digitando — no mesmo lugar, sem escolher a ferramenta antes de começar.

**Atualizado 04/08 (D7-D9).** O campo mágico **é** a entrada do painel "Registrar": ocupa o
lugar da barra de procedimento, logo abaixo dos chips de "onde"/dente. O dentista fala, anexa
ou digita ali — e **enquanto o texto entra, a detecção aparece**: procedimento e dente
reconhecidos vão surgindo como chips abaixo do campo, e ele continua acrescentando embaixo.
Quando manda organizar, o resultado **se soma** ao rascunho — nunca substitui evento já lançado
(mesmo princípio do R-47) — e o odontograma + "Concluídos hoje"/"Novos procedimentos" refletem
na hora.

**O anexo saiu daqui (D8).** Documento vive numa caixa própria embaixo do Histórico (coluna
esquerda), presa ao **paciente**, não à sessão. De lá, "usar este documento de base" carrega a
transcrição no campo mágico — separando *ter o documento* de *usar o documento nesta consulta*.

**O que continua sem IA (trava do §2.1):** o painel do dente. Clicar um dente e lançar pelo
`ToothDetailPanel` registra sem nenhuma chamada de rede — é o caminho de fallback obrigatório
quando a IA falha, e não pode ser removido junto com a barra.

## 4. Contrato técnico

### D0 — extração (Sonnet 5, mecânica, sem UI)

```typescript
// src/lib/odontograma/dedup-eventos-draft.ts — NOVO
import type { OdontogramaEventoDraft, OdontogramaEventoInput } from '@/types/odontograma';

/** Chave semântica — mesmo tipo/status/origem/âncora/papel, mesmo com id diferente.
 *  Extraído de FichasTab.tsx (R-30 Parte 2), comportamento idêntico. */
export function chaveDedupEvento(ev: OdontogramaEventoDraft): string;

/** Colapsa eventos equivalentes numa lista, mantém o de menor id (determinístico).
 *  Evento com `assinaturaId` nunca é candidato a descarte (R-30 invariante #2). */
export function dedupEventosDraft(eventos: OdontogramaEventoDraft[]): OdontogramaEventoDraft[];

/** R-47 — funde uma extração nova da IA num draft existente sem NUNCA perder o que já
 *  está lá: se a chave semântica de um evento novo já existe no draft atual, o novo é
 *  descartado (reextrair é no-op, não upgrade automático). Generaliza o bloco que hoje
 *  vive só dentro de `aplicarEvolucaoDoOrganizar` (FichasTab.tsx:1203-1213). */
export function mesclarEventosSemPerda(
  draftAtual: OdontogramaEventoDraft[],
  novosDaIA: OdontogramaEventoInput[],
  realizadoEmPadrao: string,
): OdontogramaEventoDraft[];
```

`FichasTab.tsx` — `aplicarEvolucaoDoOrganizar` (1165-1219) passa a **importar e chamar** as 3
funções em vez de defini-las; `handleSave` (linha 1386, `dedupEventosDraft(eventosDraft)`)
importa também. Nada muda de comportamento — behavior-preserving, mesmo padrão de
`derivar-campos-legado.ts` (extraído antes pro mesmo motivo). O mapeamento específico do form
(`queixa_principal→type`, `teethNotes`, `procedimentos`, `conduta`, `ortoManutencao`) **fica**
em `FichasTab.tsx` — não serve ao Meu dia.

### D1 — o componente no Meu dia (Opus, decisão visual em aberto)

```typescript
// src/app/dashboard/meu-dia/_components/campo-magico-meu-dia.tsx — NOVO
export interface CampoMagicoMeuDiaProps {
  pacienteNome: string;
  eventosDraft: OdontogramaEventoDraft[];
  onEventosDraftChange: (eventos: OdontogramaEventoDraft[]) => void;
  textoVisita: string;
  onTextoVisitaChange: (texto: string) => void;
  alertaNovo: string | null;
  onAlertaNovoChange: (alerta: string | null) => void;
}
```

Renderiza o gatilho (substitui "+ texto da visita") e, aberto, o container tela cheia
hospedando `<CapturaLivreCard pacienteNome={...} formDirty={eventosDraft.length > 0 ||
textoVisita.trim() !== ''} onOrganizado={aplicar} />`. `aplicar(data: EvolucaoFormatada)`:

```typescript
function aplicar(data: EvolucaoFormatada) {
  onEventosDraftChange(mesclarEventosSemPerda(eventosDraft, data.odontograma_eventos, hojeBRT()));

  const partes = [textoVisita, data.anotacoes, data.conduta && `Conduta: ${data.conduta}`]
    .filter((s): s is string => Boolean(s));
  onTextoVisitaChange(partes.join('\n\n'));

  if (data.alerta_novo) onAlertaNovoChange(data.alerta_novo); // I3

  if (data.orto_manutencao) { // I2 — sem tabela própria (R-50); nunca descarta em silêncio
    toast('Detectamos manutenção ortodôntica — sem tabela própria no Meu dia ainda; foi para o texto da visita.');
    onTextoVisitaChange((t) => `${t}\n\nOrto (a estruturar — ver R-50): ${formatarOrto(data.orto_manutencao)}`);
  }
}
```

`registrar-painel.tsx` ganha `alertaNovo`/`onAlertaNovoChange` como **estado local** (não sobe
pro `meu-dia-client` — só `handleSalvar` o lê, ao contrário de `eventosDraft`/`textoVisita`
que a coluna direita também precisa ler). `handleSalvar` passa `alertaNovo` pro payload.

```typescript
// src/app/dashboard/meu-dia/actions.ts — salvarVisitaMeuDia ganha 1 campo
const salvarVisitaMeuDiaSchema = z.object({
  pacienteId: z.string().uuid(),
  agendamentoId: z.string().uuid(),
  textoVisita: z.string().trim().max(5000),
  eventosDraft: z.array(z.unknown()),
  alertaNovo: z.string().trim().nullable().optional(), // NOVO — I3
});
// dentro da função: salvarFicha({ ..., alertaNovo: dados.alertaNovo ?? null })
```

`captura-livre-card.tsx:179` — `'bg-red-100 text-red-600 hover:bg-red-200 animate-pulse'` vira
`'bg-coral/10 text-coral-ink hover:bg-coral/20 animate-pulse'` (D5).

## 5. Referência visual

- **Artefato:** não é necessário — a moldura (§ D4) já está decidida: expansão in-place,
  container tela cheia na coluna central. Não é UI nova (a régua da regra 4), é o mesmo
  container que o R-46c já usa pro colar do Word, com o mesmo `CapturaLivreCard`.
- **Rota alvo:** `/dashboard/meu-dia` · **Componente alvo:**
  `_components/campo-magico-meu-dia.tsx`
- **Tokens já conhecidos** (aprovados no contrato do cockpit §3 — não precisam de novo brief):

| Token | Valor |
|---|---|
| Altura mínima do container aberto | `520px` |
| Textarea | `16px`/400, `max-width: 90ch` |
| Header do campo mágico (herdado do `CapturaLivreCard`) | `border-teal/30` · `bg-surface-alt/40` · `text-teal-ink` uppercase |
| Estado "gravando" (após D5) | `bg-coral/10 text-coral-ink` |

- **Ainda em aberto (não bloqueia D1, decide durante a implementação):** posição/rótulo do
  gatilho · se fecha sozinho após "Organizar" ou fica aberto pro dentista revisar.

## 6. Invariantes

- [ ] **I1** — Evento já no rascunho **nunca** é perdido ao reextrair (`mesclarEventosSemPerda`) — mesma regra do R-47, agora também no Meu dia.
- [ ] **I2** — `orto_manutencao` detectado **nunca** é descartado em silêncio — vira texto visível + toast, até o R-50 dar um lugar de verdade.
- [ ] **I3** — `alerta_novo` detectado é sempre gravado em `fichas.alerta_novo` — mesma classe do achado 6 do R-47, superfície nova.
- [ ] **I4** — Reabrir o campo mágico com rascunho existente pede confirmação antes de sobrescrever o **texto** (mesmo texto do perfil, adaptado — nunca some com o odontograma já clicado).
- [ ] **I5** — `chaveDedupEvento`/`dedupEventosDraft`/`mesclarEventosSemPerda` têm **1 única definição** (`src/lib/odontograma/`) — FichasTab e Meu dia importam, nenhum reimplementa.
- [ ] **I6** — Trocar de paciente (`agendamentoId` muda) zera o campo mágico junto com `eventosDraft`/`textoVisita` — herda o reset explícito do contrato §5.4.
- [ ] **I7** — **(D2, fusão)** O componente único **nunca** deixa o destino vazar: o caminho `origem='importado'` continua gravando data retroativa e **jamais** se apresenta como atendimento real (as 3 superfícies + badge do PDF que o R-46c construiu seguem valendo); o caminho "hoje" **jamais** grava `origem='importado'`. Testar os dois destinos no banco, não na tela.

## 6b. Q5 — ✂️ CORTADA por ele (03/08)

Cogitou-se pintar em coral, no odontograma do Meu dia, a pendência de sessões anteriores
(hoje `<Odontograma eventos={eventosDraft} />`, `registrar-painel.tsx:387`, só recebe o
rascunho do dia). **Ele cortou do planejamento** — o odontograma do Meu dia continua com o
padrão de hoje.

Motivo do corte: mostrar "o que é devido" com a mesma aparência de "o que vai ser gravado no
Salvar" quebra a invariante silenciosa que vale hoje (*o que está no odontograma é exatamente
o que o Salvar grava*) — mesma classe de defeito de R-30/R-47/R-55. E o dente em tratamento
multi-sessão ficaria **idêntico** a um nunca tocado, porque a precedência do componente
(`Odontograma.tsx:198`) faz coral vencer teal.

Se voltar algum dia, o pré-requisito é distinção visual entre os dois estados — não é só
alimentar o componente com mais eventos.

## 7. Gates de aceite

**D0:**
- [ ] **G1** — `FichasTab.tsx` typecheck/lint/build limpos após o import. Reorganizar 2× uma ficha salva com evento já lançado **não apaga nada** — testado ao vivo (fecha o 🟡 do R-47 que nunca foi provado em navegador).
- [ ] **G2** — `dedup-eventos-draft.test.ts` novo cobre: reextração idêntica é no-op · evento novo distinto entra · evento com `assinaturaId` nunca sai.

**D1:**
- [ ] **G3** — No Meu dia: ditar, anexar ou digitar + "Organizar com Dex" preenche `eventosDraft`/`textoVisita` sem apagar dente já clicado manualmente antes.
- [ ] **G4** — Reextrair o mesmo relato 2× não duplica evento (mesma chave semântica dos dois cards).
- [ ] **G5** — `alerta_novo` detectado grava em `fichas.alerta_novo` — conferir no banco, não na tela.
- [ ] **G6** — `orto_manutencao` detectado aparece no texto da visita com o toast de aviso — nunca silencioso.
- [ ] **G7** — Estado "gravando" usa `coral`, não hex — conferido dark **e** light.
- [ ] **G8** — Trocar de paciente zera o campo mágico (aberto ou fechado) junto com o resto do rascunho.
- [ ] **G9** — Falha da chamada `/api/dex/formatar-evolucao` (rede, 500) **não** apaga o texto já digitado — toast de erro, texto continua no campo.

## 8. Fora de escopo

- Forma visual final do "tela cheia" — decide no brief/artefato antes de D1 entrar em código.
- Fundir `ColarDoWordDialog` com o campo mágico novo (D2 — recomendação é não fundir; ele confirma).
- Resolver o R-50 de verdade (orto sem ativação manual) — o toast/fallback de texto aqui é rede de segurança, não solução.
- Responsividade/tablet — herdado do P8 do cockpit.
- Trocar `window.confirm` por modal estilizado — debt pré-existente do perfil, não desta fatia.
- Trocar o `Loader2` ad-hoc do `CapturaLivreCard` pelo `DexLoader` canônico — cosmético, registrado, não expandido sozinho.

## 9. Riscos registrados (não bloqueiam D0)

| Risco | Nota |
|---|---|
| Rate limit compartilhado | `/api/dex/formatar-evolucao` usa a chave `dex:formatar-evolucao` (20/60s) **por dentista**, somando o uso do perfil **e** do Meu dia. O Meu dia é a tela de maior frequência — monitorar depois do push |
| R-47 nunca testado ao vivo | D0 refatora exatamente o caminho que corrigiu perda silenciosa de dado em 31/07, verificado só por typecheck/lint/build + workflow adversarial. G1 é a primeira vez que isso vira teste ao vivo |
| `CapturaLivreCard` ganha 2ª tela consumidora | Qualquer mudança futura nele passa a afetar perfil **e** Meu dia — testar os dois sempre que mexer nele depois desta fatia |
