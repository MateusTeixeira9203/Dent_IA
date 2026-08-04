# Mapa do Meu dia — o que entra, o que não entra, e por quê

> **MAPA** · escrito **2026-08-03** · governa o item **R-46** e tudo que se propuser pro Meu dia
> **Fontes:** as 18 specs do Bloco 1 · o código real · **medições no banco de produção** (dev=prod)
> **Precedência:** este mapa não substitui spec. Ele decide **se** uma spec deve existir.
> Quando ele discordar de uma spec já aprovada, o conflito está marcado no §5 — nenhum
> resolvido sozinho.

## 0. A função — a régua de tudo

Palavras dele, 03/08:

> *"Meu dia é um cockpit / ficha rápida pro dentista. Rápido de usar, sem ficar navegando.
> Acelerar o processo de montar a ficha, trazendo tudo na mão. Nossa ficha é ótima, só que
> muito complexa de preencher no dia a dia. É um diferencial gigante de mercado, e precisa
> atender a todas as necessidades."*

Dentista de **clínica grande, muitos atendimentos**. Métrica declarada: **gestos por registro**.
O concorrente é a tabelinha do Word — ele perde em tudo, menos nessa métrica.

**Momento de uso, confirmado por ele:** *"pode ser pós-atendimento ou durante — depende do
dentista"*. Isso mata o tratamento de mobile como polimento (§6.6).

## 1. O fato que governa: a tela já está sem espaço

Aritmética a 1440×900, calculada do CSS:

```
900  viewport
−112  dock (dashboard-shell.tsx:115, pb-28)
− 64  PageContainer p-8
− 80  header da rota
−141  rail
− 62  linha do paciente + gaps
=441px  para as 3 colunas inteiras
```

`RegistrarPainel` sem odontograma: **~300px**. Odontograma compacto (2 arcadas × 93px +
tabs + rótulos, já com `zoom .85`): **~260px**.

**Conclusão: o G1 do contrato ("cabe na viewport sem scroll") provavelmente já falha hoje.**
Antes de orçamento, retorno, orto e painel de histórico existirem.

> ✅ **Medido ao vivo 04/08** (1440×900, paciente com dado real, pós-R-58): confirma a
> conclusão acima, **não é mais "provavelmente".** Grid do cockpit começa em `y=302` (bate
> com a aritmética — 900−598≈302). Coluna **centro sozinha mede 635px** e termina em `y=937`
> — **37px além do viewport ANTES de contar o dock** (mais ~112px de overlay por cima).
> Colunas laterais, hoje (histórico colapsado em 1 visita, "Já feito" com 2 itens, resto
> vazio): esquerda 237px · direita 269px — **nenhuma das duas é o gargalo**; é o centro
> (odontograma + `RegistrarPainel`). **C6 não resolve isso sozinho** (ele mexe em
> esquerda/direita) — o centro só fica mais raso com o R-46d D1 (D12: ONDE/STATUS somem).
> Os dois juntos são o que ataca o número real.

> **Consequência prática, e é a decisão de design da próxima fatia:** cada coisa nova só
> entra **pagando** — com remoção, com abas no lugar de acordeão (§7.4), ou com densidade.
> "Adicionar porque é útil" é exatamente como a ficha completa chegou a 38 colunas.

## 2. A régua de admissão

Não é "o que a ficha tem". É **o que a ficha usa** — medido em 101 fichas de produção:

| Campo | Preenchido | Veredito |
|---|---|---|
| `queixa_principal` | **97/101 (96%)** | **Entra.** Único caminho que não preenche é o Meu dia |
| `anotacoes` | 49/101 · **~100% no fluxo rápido**, 36% no manual | **Entra** — e sai de trás do link |
| `conduta` | **8/101 (8%)** | **Não entra.** 92% vazio em *todas* as origens |
| `retorno_sugerido` | 2/101 · **0 usos em `src/`** | Coluna morta. Ele pediu — é **feature nova**, não restauração |
| `orto_manutencao` | 1/101 | Contextual (§2.2) |
| `alerta_novo` | **0/101** | Não construir tela pra isso; só não perder o que a IA achar |
| anamnese médica (histórico/alergias/medicamentos) | **0/101** | **Não entra.** Ninguém preenche nem na ficha completa |
| `transcricao` | **0/101** | Caminho de áudio nunca usado |
| `assinado_em` | 5/101 | Fica na ficha completa |

### 2.1 Os três lugares

| Frequência | Onde mora | Exemplos |
|---|---|---|
| **Todo atendimento** | Fixo na tela | odontograma · registrar · salvar · **orçamento** · **retorno** · **queixa** |
| **Sempre, mas só pra certos pacientes** | **Contextual** — aparece se o paciente é daquele tipo | **orto** (`contexto.orto != null`) · perio · endo |
| **Raro** | Sob demanda ou na ficha completa | assinatura · anamnese · edição de ficha antiga |

### 2.2 Orto é o caso que valida a régua

`contexto.orto` (`MeuDiaOrto`: última manutenção, janela de 120 dias) **já é calculado pelo
servidor e nunca renderizado**. Dado morto.

O atrito do orto não é o número de campos (5: 1 select + 4 texto livre) — é que os **mesmos**
5 campos são redigitados todo mês, e 4 quase nunca mudam. Form menor não resolve; form que
**nasce preenchido** resolve. O mecanismo existe: R-05b já herda a manutenção anterior no
`FichasTab` (`ortoHerdadaDe`), com o aviso de proveniência.

→ Botão contextual, pré-preenchido: abrir → ajustar a ativação → Salvar.
→ Bloqueio hoje: `salvarVisitaMeuDia` não aceita `ortoManutencao` (seria descartado no save).

## 3. O que o Meu dia é hoje

| Faz | Mostra |
|---|---|
| Rail do dia (arrastável) | Histórico de visitas (fiel desde R-55) |
| Combobox 17 tipos + catálogo; `"restauração 35"` resolve o dente pelo texto | A fazer (pendências) |
| Chips de onde + odontograma clicável, multi-seleção | Já feito (acumulado) |
| Status feito/a fazer (nasce em **feito** — correto) | Concluídos hoje · Novos procedimentos |
| Painel do dente com detalhe de especialidade | Alertas do cadastro |
| Texto da visita (escondido atrás de link) | Colar do Word · link pro perfil |
| Salvar: ficha + fecha agendamento + notifica | |

**Registrar 1 procedimento = 3 gestos** (digitar → Enter → Salvar). Esse número é o ativo do
produto. Nada que entrar pode piorá-lo.

## 4. Defeitos — não são trade-offs

| # | Defeito | Prova | Custo |
|---|---|---|---|
| **D1** | `queixa_principal: ''` fixo (`actions.ts:39`) deixa a ficha **sem título** em 4 superfícies: badge do PDF (`prontuario-html.ts:245`), timeline (`get-visible-timeline-events.ts:206`), `paciente-detail-client.tsx:1578`, `novo-orcamento-modal.tsx:168`. Todos usam `??`, que não pega string vazia | 3 de 7 fichas de agosto | **Vai pro CRO com título em branco.** Fix: 1 linha (`null`) |
| **D2** | **Zero dedup no caminho do Meu dia.** `dedupEventosDraft` está trancado no `FichasTab` (R-30 Parte 2). Dois lançamentos equivalentes = **2 linhas cobráveis** | Defeito já provado na ficha do Renato (R-30) | Cobrança duplicada. Fix = **R-46d D0**, ~40 linhas, zero closure |
| **D3** | `origem='modo_consulta'` sem ter havido modo consulta → timeline anuncia **"Consulta realizada"**, onboarding conta como consulta real | `get-visible-timeline-events.ts:203` | Mesma desonestidade que o R-46c corrigiu pra `'importado'` |
| **D4** | `temFichaHoje` é por **paciente+dia**, não por agendamento; o cockpit seleciona por `agendamentoId` (D5 do R-46g) | Contradição entre 2 specs aprovadas | 2º atendimento do mesmo paciente no dia nasce com CTA desabilitado. **Cortar o R-54 levou junto o fix (`fichas.agendamento_id`)** |
| **D5** | **2 de 10 controles passam o piso de 36px.** Chips a ~23px, "ver mais" a ~15px, X de cancelar a 14px. ✅ **Remedido ao vivo 04/08** (1440×900): ainda falha — chips ONDE/STATUS 28px, "Legenda"/tabs Perm./Decíduos ~28px, "ver as N visitas" 18px, "+ texto da visita" 18px. Cabeçalhos de acordeão (`BlocoMoldavel`) passam exato em 36px. **Boa notícia parcial:** chips ONDE/STATUS e "+ texto da visita" **morrem com o R-46d D12/D7** — não precisam de fix próprio, o redesign já resolve. Sobra pra fixar direto: tabs do odontograma, "Legenda", "ver mais" do histórico | Medido do CSS + ao vivo | Chairside. Errar o dente vizinho é risco real |
| **D6** | **6 reprovações de AA**, incluindo o CTA (`text-white` sobre `bg-teal` = **3.38:1**) — o contrato §1 avisou por escrito e mandou `bg-teal-dark` | Medido | O contorno do dente é **1.27:1 dark / 1.78:1 light** — o maior elemento do centro |
| **D7** | `salvarFicha` no ramo de **update** não tem `.select()` — dentista não-autor editando ficha de colega recebe `ok:true` com 0 linhas | `salvar-ficha.ts:162-186` | Só a UI segura. Não morde o Meu dia hoje (create-only), morde no dia que ganhar edição |

## 5. Contradições vivas — precisam ser fechadas

| # | Conflito | Quem decide |
|---|---|---|
| ~~**C1**~~ | ✅ **RESOLVIDO 03/08 (noite).** *"Usará a mesma lógica que usamos na ficha e o mesmo modelo"* → [`filtro-responsavel.ts`](../src/lib/fichas/filtro-responsavel.ts) (R-16), `responsável = encaminhado_para ?? autor`. **Uma lib, duas configurações:** "A fazer" chama com `FILTRO_MEUS` fixo (lista de trabalho, sem chips); orçamento chama com `null` + chips (visão do dinheiro). **Nota:** `buscarIndicadosAbertos` **não existe no código** — é função planejada na spec do R-53, então isto nunca foi contradição entre código no ar. Consequência registrada na spec: o `.is('encaminhado_para', null)` cai | ~~Ele~~ ✅ |
| ~~C2~~ | ✅ **JÁ RESOLVIDO** (verificado 04/08, antes do C6/R-46d D1). `R-51-53-modelo-multissessao.md:54-58` já diz "encaminhada pra mim aparece, com concluir →" e a nota própria do arquivo confirma "corrigido em 03/08 (noite)" — mapa desatualizado, não spec | ~~Eu~~ ✅ |
| ~~C3~~ | ✅ **JÁ RESOLVIDO.** `R-46-C6-layout-cockpit.md` §4.0 e §4 concordam: `jaFeito` sai de vez, dado equivalente já em `visitas[].eventos` (R-55). Sem contradição no texto atual | ~~Eu~~ ✅ |
| ~~C4~~ | ✅ **RECONCILIADO, não é contradição.** D2 = não duplicar a captura (`CapturaLivreCard` reusado, já é assim no D1). §8 = não fundir os 2 componentes de DIÁLOGO (`ColarDoWordDialog` × `campo-magico-meu-dia.tsx`) — isso segue fora de escopo mesmo, sem travar D1 | ~~Eu~~ ✅ |
| ~~C5~~ | ✅ **PREMISSA FALSA.** `campo-magico-meu-dia.tsx` nunca serve o caminho importado — esse é o `ColarDoWordDialog` (D8). `hojeBRT()` é o comportamento certo pro escopo do campo mágico (só "hoje"), não bug | ~~Eu~~ ✅ |
| ~~**C6**~~ | ✅ **RESOLVIDO 03/08 (noite): "Salvar"**, e evolui pra *"Salvar e gerar orçamento"* quando o R-46h entrar. O rótulo não pode prometer orçamento que ainda não existe. As outras 2 specs recebem emenda | ~~Ele~~ ✅ |
| ~~**C7**~~ | ✅ **RESOLVIDO 03/08 (noite): mantém sem auto-avanço.** O gesto extra compra verificação — e o R-55 acabou de tornar o histórico confiável, que é justamente o que se confere depois de salvar. Segue **não medido**; se a instrumentação do §6.7 existir um dia, é a 1ª hipótese a testar | ~~Ele~~ ✅ |
| ~~**C8**~~ | ✅ **RESOLVIDO 03/08 (noite): responsivo entra em TODA fatia, agora — o P8 morre.** Ele escolheu a opção mais cara das três, a favor da spec-mãe (`R-46-meu-dia.md:181`). **Encarece C6 e R-46d D1**, que já eram os mais caros. Registrado em [R-46-C6 §2.5](specs/R-46-C6-layout-cockpit.md) | ~~Ele~~ ✅ |
| ~~C9~~ | ✅ **JÁ RESOLVIDO.** `R-55-historico-sem-perda-de-dado.md:3` já diz `aprovada`, com nota própria "cabeçalho corrigido em 03/08 (noite)". `C6` idem (linha 3 deste mapa já lista `aprovada`) | ~~Eu~~ ✅ |
| ~~C10~~ | ✅ **JÁ RESOLVIDO.** A "fechamento definitivo" §4.0 do C6 (jaFeito sai de vez, não vira sub-lista) supera a leitura que o R-55 tinha em mente quando cortou — não sobrou trabalho órfão, o corte do R-55 ficou correto por outro motivo (R-55 nunca reintroduziu dedup) | ~~Eu~~ ✅ |

## 6. O que falta e não tem item nenhum

| # | Buraco | Nota |
|---|---|---|
| **6.1** | **Orçamento no cockpit.** R-46h é 💡 desde 02/08, sem spec. R-53 troca a fonte **só no perfil** — o cockpit continua sem orçamento. **É o exemplo nº 1 dele e o maior buraco** | Precisa de spec |
| **6.2** | **Marcar retorno.** Zero item, zero menção em qualquer spec. `retorno_sugerido` existe morta. R-57 F1 cria encaixe **pra hoje**; data futura é outro caminho | Precisa de spec |
| **6.3** | **Mapa cross-paciente do pendente.** *"ao entrar, um mapa do que está pendente"* — o rail é a agenda, "A fazer" é por paciente. Não existe visão do conjunto. E o R-52 reduz o que se vê por paciente | Precisa de spec |
| **6.4** | **Anexar imagem / raio-x.** `CapturaLivreCard` e `ColarDoWordDialog` aceitam pdf/docx/txt/áudio. **Zero formato de imagem.** Em clínica grande, foto e RX são rotina | Precisa de item |
| **6.5** | **Secretária.** Rota redireciona; D14 adiada. Numa clínica grande é ela quem tem tempo de transcrever histórico e criar encaixe. O gargalo fica na pessoa mais cara | Precisa de decisão |
| **6.6** | **Mobile.** Fora de escopo em **todas** as specs, com ele confirmando que o uso é "pós-atendimento ou durante". Foi a barreira física que matou o modo consulta | Precisa de item |
| **6.7** | **Ninguém mede gestos por registro.** A métrica declarada do projeto não tem instrumentação em spec nenhuma. Sem contagem antes/depois, "reduziu atrito" é opinião — e o R-57 é justificado inteiro por ela | Precisa de decisão |
| **6.8** | **Lógica boa presa na casa errada — já são 4 casos, não 4 acidentes.** (a) `dedupEventosDraft` presa no `FichasTab` → R-46d D0; (b) `AtenderAgoraModal`/`criarEncaixe` presos na Agenda → R-57 F1; (c) `atualizarStatusEncaminhado` mora em `/consulta`, **rota que o R-46 está aposentando**, e o Meu dia agora depende dela (R-52 em voo); (d) o R-52 em voo reimplementa `FILTRO_MEUS` à mão, com a lib pronta em `src/lib/fichas/`. Cada um foi tratado como caso isolado; é **um padrão** — e o custo é divergência silenciosa entre duas telas que deviam concordar | Achado 03/08 (noite). Vale 1 item de extração, não 4 |

## 7. Design — o que muda

### 7.1 A gramática de cor está esgotada — elemento novo não ganha cor

`corDoRegistro` (`types/odontograma.ts:64`): **coral** = a fazer · **teal** = feito aqui ·
**slate** = pré-existente. Precedência: *coral vence teal, que vence slate*.

Reservado e **intocável**: coral/teal/slate como fill · contorno teal 2px sem preenchimento
(= selecionado) · tracejado + muted (= ausente/histórico) · `warning` (= alerta de alergia, e
**só isso** — o G6 já está violado em `registrar-painel.tsx:430`).

**Livre:** `bg-surface-alt` neutro · peso 400/600/700 · **mono vs sans** · posição · **motion
(o cockpit não tem uma única animação)**.

> **O orçamento tem que ler como comercial, não clínico.** Valor em mono sobre neutro, nunca
> preenchido de teal. Se o total ficar teal, teal passa a significar "dinheiro" também — e a
> única coisa que segurava a gramática era teal significar uma coisa só.

### 7.2 A direita vira abas, não mais acordeões

Hoje 4 blocos em 312px. Com orçamento + retorno + orto viram 7 → **7 cabeçalhos × 36px =
252px de cromo numa coluna de 312**, antes de qualquer conteúdo.

Uma faixa de abas de 36px substitui N cabeçalhos e devolve **~200px**. O padrão já existe e
foi validado 2× (tab bar do `Odontograma`, padrão do R-27). O contador vai na aba — continua
derivado da lista renderizada, então o G7 segue valendo por construção.

### 7.3 Orçamento e retorno não são blocos — são o rodapé de saída

São ações terminais, mesma família do Salvar. Como cards, competem com a ficha. **Uma linha
de ação no pé da coluna central, com exatamente um primário** ("Salvar e gerar orçamento") e
o resto ghost.

### 7.4 Ordem de execução do design

| | O quê | Por quê |
|---|---|---|
| 1 | Varredura de token: `text-teal`→`-ink`, CTA→gradiente canônico, tirar `/60` e `/70` | 6 reprovações AA, mecânicas, **zero risco de layout**. O CTA canônico do audit corrige o 3.38:1 de graça |
| 2 | Contorno do dente nos 2 temas | 1.27:1 / 1.78:1 no maior elemento do centro |
| 3 | Piso de 36px nos controles | Funcional. **E define o custo do passo 4** (+26px por linha no orçamento de 441) |
| 4 | Direita: 4 acordeões → 1 card com abas | Libera ~200px **antes** de orçamento/retorno/orto entrarem. **É o C6 — precisa de spec** |
| 5 | Rodapé de ação único + motion de 200ms | Só faz sentido depois que o espaço existe |
| 6 | Assinatura tipográfica (mono no cabeçalho e contador) + `<EmptyState>` canônico | Responde "parece feita pela mesma equipe do Dashboard?" — hoje a resposta honesta é **não**, e a diferença não é layout, é tipografia |

Passos 1–3 não precisam de spec. O 4 muda estrutura.

### 7.5 Três gates de densidade que o contrato não tem

Sem teto declarado, cada item se justifica sozinho e a soma vira cabine de avião.

- **G-densidade:** a coluna direita nunca tem mais de **1** container de primeiro nível.
- **G-primário:** o cockpit inteiro nunca tem mais de **1** CTA primário visível.
- **G-badge:** `alertas` renderiza no máximo **2** + "+N". Hoje é ilimitado, sobre texto livre
  não-tipado (`meu-dia-client.tsx:140`) — "prefere manhã" vira badge dourado de alerta clínico.

## 8. Ordem recomendada

| # | O quê | Por quê agora |
|---|---|---|
| ~~0~~ | ✅ Corrigir C2/C3/C4/C5/C9/C10 nas specs — **já estavam corrigidos, só o mapa mentia** (verificado 04/08) | Documento que mente é pior que documento ausente |
| 1 | Fechar e commitar **R-51 + R-52** | Já meio escrito; C6/R-57 tocam os mesmos 4 arquivos |
| 2 | **R-46d D0** | Fecha o **D2** (cobrança duplicada) e é a 1ª prova ao vivo do R-47 |
| 3 | ✅ **D1** (queixa `null`) feito 04/08 · **D6 passos 1-2 (token/contraste) segue aberto** | 1 linha e uma varredura. Ficha sem título vai pro CRO. **Medido 03/08: 4 fichas já estão com título vazio no banco, 0 com `null`** |
| 4 | ✅ **R-53** feito e testado ao vivo 04/08 | Isolado no perfil, e é o pré-requisito real do R-46h. **Destravado** — o C1 caiu |
| **4.5** | ✅ **Medido ao vivo 04/08 — ver §1 e D5 acima.** Resultado: **C6 fica urgente, não opcional** — o centro já estoura o viewport por 37px sozinho (antes do dock), e D5 segue falhando nos mesmos controles de antes, menos os que o R-46d D12 já vai matar | O §7.4 declara que o piso de 36px *"define o custo do passo 4"*. **Os dois eram gate de entrada do C6, agora resolvidos** |
| 5 | ✅ **C6 + R-46d D1** feito e testado ao vivo 04/08 | A moldura decidida em 03/08 (resumo+`Sheet`) foi codada, testada ao vivo, e **revogada por ele na mesma sessão** — painel do dente virou 1 flutuando ao lado do odontograma, `colapsarDireita` de volta. Responsivo (C8) **não verificado** — telas estreitas ficaram pra próxima fatia |
| 6 | **R-57 F1 + F2** | Depois que o cockpit parar de se mexer |
| 7 | **D9/D11** (motion no odontograma) + **R-46h** (spec) + **retorno** (spec) | Os maiores buracos vs. a régua, agora que o cockpit fechou |

## 9. O que este mapa recusa

- **Botão fixo pra cada necessidade.** A régua do §2.1 decide; o orçamento do §1 limita.
- **Campo porque a ficha completa tem.** `conduta` (8%), anamnese (0%) e `transcricao` (0%)
  não entram — nem a ficha completa usa.
- **Cor nova pra elemento novo.** §7.1.
- **Mais um sistema de painel.** O painel do histórico reusa o mecanismo do painel do dente.
  Dois sistemas independentes é onde começa a cabine de avião.
