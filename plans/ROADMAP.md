# Roadmap — Odonto.IA

> **ROADMAP** · atualizado **2026-08-06** · reorganizado por **importância pro dentista**
> **07/08 — R-57 fechado** (F1+F2 confirmadas ao vivo no navegador real dele — Brave + Claude
> in Chrome, pane própria travou de novo —, F3 cortada: ele descartou a fatia em vez de
> escolher entre alfabético×frequência). Sem gate pendente, falta só o push. **R-31b
> cortado** (limpeza dos 16 duplicados não vira item; ferramenta de exclusão manual segue
> disponível).
> **07/08 — [auditoria pré-produção](auditorias/2026-08-07-pre-producao.md)** (ficha núcleo +
> Meu dia + Dex, antes do push de ~35 commits): **sem achado crítico ou alto.** Orçamento
> por-ficha e Organizar com Dex (R-47, "falta teste ao vivo") reconfirmados com dado real
> denso e chamada de IA de verdade — zero perda, zero vazamento. Cockpit inteiro do Meu dia
> (nunca em produção) rodou ponta a ponta, light e dark. 2 achados baixos → R-71. Gaps que
> restam (gate de 2 contas, `prefers-reduced-motion`) já eram conhecidos, não são descoberta
> de hoje.
> **R-46 (Meu dia) pausado 🟡** — R-46a ✅ · R-46g/R-46b/R-46b2/R-46c/cockpit(C0-C5)/C5/R-55
> **🟡 codados, testados ao vivo** — nada em produção ainda (27 commits acumulados desde 01/08,
> prod em 31/07)
> **04/08 — C6 + R-46d D1 codados juntos, testados ao vivo (3 rodadas de correção na hora):**
> **[C6](specs/R-46-C6-layout-cockpit.md) 🟡 codado e testado ao vivo** — jaFeito saiu; colunas
> redistribuídas (esquerda ganha Concluídos hoje + Anexar documentos); painel do dente
> **revisado 2×**: 1ª leitura (resumo+`Sheet`) foi codada, testada, e revogada por ele na
> mesma sessão — virou **1 painel só flutuando ao lado do odontograma**, `colapsarDireita`
> evita a regressão de WCAG que motivou o desenho original (medido: dente 43×76px igual com
> painel aberto ou fechado). Acordeões perderam a exclusão mútua (pedido dele — liberdade de
> abrir tudo). Não em produção
> **[R-46d](specs/R-46d-campo-magico.md) 🟡 D0+D1 codados e testados ao vivo** — campo mágico
> substitui a barra de procedimento inteira (absorve R-46b). Fallback "Registrar sem IA":
> `OndeSeletor` saiu de vez (clicar o dente ou digitar já resolve onde), chip de **manutenção
> ortodôntica** entrou (fecha o R-50-b). D12 (chips somem da faixa fixa) feito; **D9/D11
> (detecção em tempo real + motion no odontograma) não entraram nesta rodada** — o campo
> mágico usa a detecção por texto que o `CapturaLivreCard` já tinha, sem o odontograma acender.
> Não em produção
> **[R-51/R-52](specs/R-51-53-modelo-multissessao.md) 🟡 codados e commitados** — R-52 testado
> ao vivo (escrita confirmada no banco); R-51 só por typecheck/lint/build + dado sintético
> **[R-53](specs/R-53-orcamento-indicados-abertos.md) 🟡 codado e testado ao vivo** — evento
> encaminhado **entra** no orçamento (X1), query ficha-cêntrica. Não em produção
> **[R-58](specs/R-58-historico-detalhado.md)** 🟡 codado e testado ao vivo, não em produção —
> texto da visita em evidência, evento fechado depois aparece nas 2 entradas (onde indicado,
> onde feito). **Entra antes do R-53**, habilita o C6
> **[R-49](specs/R-49-voz-e-campos-de-especialidade.md)** — emenda: IA **pode** preencher
> odontometria agora (I2 revogada), com a tabela do procedimento abrindo sozinha como
> guarda-corpo
> **R-54 ✂️ cortado** — reaberto como pergunta 04/08, **não confirmado como bug**: medido que
> o agrupamento por sessão já funciona (fichas com até 24 eventos numa entrada só)
> **05/08 — [R-61](specs/R-61-odontograma-mostra-a-boca.md) e
> [R-62](specs/R-62-campo-magico-entrada-unica.md) fechadas na mesma sessão** — todo gate
> testável por automação confirmado ao vivo, inclusive Salvar real (autorizado por ele) e
> os dois invariantes críticos (dedup do R-61, offline do R-62). Só sobram 2 lacunas que
> exigem humano: G2/slate do R-61 (dado de teste) e G10/I4 do R-62 (microfone real). R-62
> achou e corrigiu 2 bugs reais de integração (`onde` sujo vencendo o dente do texto;
> catálogo perdendo o dente) só visíveis em sequência de 2+ registros.
> `src/components/ui/combobox.tsx` deletado (órfão)
> **06/08 — [R-63](specs/R-63-layout-cockpit-slot-central.md) F1+F2+F3 codadas e
> verificadas ao vivo**, spec `aprovada`. **Só falta G10** (F1, `prefers-reduced-motion`,
> gate humano) — item praticamente fechado
> **06/08 (tarde→noite) — [R-64](specs/R-64-marcar-retorno.md) F0-F4 codadas.** F0
> (migration do almoço) aplicada em produção. F2 revisada ao vivo depois do artefato — grade
> maior, janela de horas dinâmica, layout em 2 colunas (padrão do "Novo agendamento"), campo
> de hora editável, **hachura removida e clique liberado em qualquer dia/hora** (D6-D10).
> F3 verificado nos 2 pontos de entrada (perfil + cockpit, um por ele). **Não é o R-46h** —
> esse continua item separado, sem spec
> **06/08 (noite) — R-64 fechado 🟡 pelo `/auditar`** (spec arquivada, §10 tem o veredito);
> **R-59 aprovada**, Partes 1-4 codadas, backfill de 13 grupos órfãos rodado.
> **07/08 — sessão de teste dedicada:** R-59 (G3/G4/Parte 5) e R-64 (G2/G7/G8) fecharam todo
> gate pendente ao vivo, banco reconferido em cada um. Nenhum dos dois tem gate em aberto —
> falta só o push. Ele assume o que sobrar de teste manual a partir daqui. Achado ao vivo:
> "Gerar orçamento" de dentro de uma ficha agregava o paciente inteiro (R-53 §2.1, "dinheiro é
> da clínica") — revogado por ele, agora é só a ficha clicada + só o dentista logado, nunca
> mistura com colega. Fix de alinhamento no rótulo "Meu dia" do dock (`dock-nav-item.tsx`).
> **Triagem do Bloco 1 (mesma sessão):** ✂️ cortados R-68/R-69/R-42/R-24/R-07b · 🧊 congelado
> R-70 (ficha com muitos procedimentos difícil de editar, falta saber a causa real do feedback)
> **R-31b trocou de mecanismo** (não é mais merge automático — botão "excluir paciente"
> permanente, secretária inclusa, `excluirPaciente`, testado via rota debug: cascade certo,
> log sobrevive ao delete). Spec original arquivada com a ressalva de que não repontua nada.
> **Puxados pra frente da fila:** R-49, R-56, R-67
> **Fila:** 21 · **🟡 no ar/codado sem deploy:** 17 · **💡 ideia sem spec:** 3 ·
> **Concluídos:** 24 · **Congelado:** 3 · **Cortado:** 10
> **Próximo:** ele decide qual de {R-49, R-56, R-67} entra primeiro (só 1 ativo por vez)
> **Discussão aberta:** [como diminuir o atrito](discussoes/como-diminuir-o-atrito.md) (estado × evento)

**Status:** ⏳ fila · 🔵 ativo (máx 1) · 🟡 no ar **não** verificado · ✅ no ar **e** verificado ·
🧊 congelado · ✂️ cortado · 💡 ideia sem spec.
**Código escrito ≠ código verificado** — 🟡 se trata como não-feito.

**Roadmap é mapa, spec é conteúdo.** Cada linha aqui cabe em duas. Se precisar de mais, o
detalhe está errado de lugar — vai pra spec.

---

## O critério (decidido 30/07)

A ordem deixou de ser por dependência técnica e passou a ser **por importância pro dentista**.
A razão: *"o dentista antes usava uma tabelinha no Word que funcionava bem, e agora no sistema
é muita coisa, muitos cliques — é um preço que muitos dentistas podem não querer pagar."*

O concorrente é o Word. Ele perde em tudo, menos na única métrica que o dentista sente todo
dia: **gestos por registro**. Item que aumenta gesto sem devolver benefício **na hora** perde
prioridade, por melhor que seja.

| | Bloco | Por quê |
|---|---|---|
| 1º | **Ficha e paciente** | É onde o Word ainda ganha, e onde estão os defeitos que ele relatou |
| 2º | **Orçamento e financeiro** | Design aprovado, é o benefício que volta pro dentista |
| 3º | **Assinatura e prova** | Protege o dentista; não é urgência operacional |
| — | **Fundação e risco** | Atravessa tudo. Entra quando o bloco de cima encostar nele |

---

## Bloco 1 — Ficha e paciente

| ID | Item | Estado | Peso |
|---|---|---|---|
| [R-46](specs/R-46-meu-dia.md) | **Meu dia — a ficha no dia real; o novo modo consulta** (rail do dia, contexto à vista, registrar em lote, colar do Word, Dex em lista) | 🟡 **pausado 06/08** (sessão foi pro R-59, achado ao vivo — regra do projeto é só 1 item ativo por vez) · R-46a ✅ · **[R-46g](specs/R-46g-porta-modo-consulta.md) 🟡** (porta; A1 do gate de assinatura **ignorada** — sem sistema de pagamento) · **[R-46b](specs/R-46b-registrar-meu-dia.md) 🟡→absorvido** (a barra morreu de vez, ver R-46d) · **[R-46b2](specs/R-46b2-salvar-chamar-proximo.md) 🟡 codado e provado no banco** — o Meu dia salva de verdade · **[R-46c](specs/R-46c-colar-do-word.md) 🟡 codado e provado 03/08** (migration aplicada, importação testada ao vivo com prova no banco/PDF/timeline) · **[cockpit](specs/R-46-cockpit.md) spec `aprovada` + [contrato](specs/R-46-cockpit-contrato.md) — C0 a C5 🟡** · **[C6](specs/R-46-C6-layout-cockpit.md) 🟡 codado e testado ao vivo 04/08** (painel do dente flutua ao lado do odontograma, ver cabeçalho) · **[C7](specs/R-46-C7-painel-dente-direita.md) 🟡 codado e testado ao vivo 04-05/08 — TODOS os gates (G1-G12) confirmados**, inclusive G9 (troca de paciente) e G10 (seleção múltipla), testados 05/08. Não em produção · **[R-46d](specs/R-46d-campo-magico.md) 🟡 D0+D1 codados e testados**, **D1.2 (disclosure) fechado pelo [R-62](specs/R-62-campo-magico-entrada-unica.md) 05/08** — virou chips locais dentro do campo mágico, "Registrar sem IA" saiu do DOM de vez. **Falta:** tudo em produção ainda | G |
| [R-46d](specs/R-46d-campo-magico.md) | **Campo mágico com IA no Meu dia** — substitui a barra de procedimento inteira (D7, 04/08), não só "+ texto da visita" | **D0 ✅ commitado** (dedup/merge extraídos pra `src/lib/odontograma/dedup-eventos-draft.ts`, 8 testes). **D1 🟡 codado e testado ao vivo 04/08** — absorve o R-46b, anexo vira caixa sob o Histórico (D8). **D1.2 (fallback "Registrar sem IA") fechado pelo R-62 05/08** — não é mais disclosure, virou chips locais sempre visíveis, ver [R-62](specs/R-62-campo-magico-entrada-unica.md). **D9/D11 (motion no odontograma) continuam de fora** — R-62 confirmou que seguem pendentes | G |
| **R-46h** | 💡 **Um botão: salva a visita e já abre o orçamento** — extrai `NovoOrcamentoModal`/`FichaParaOrc` de `paciente-detail-client.tsx` pra componente compartilhado, sem duplicar | 💡 02/08 — **decidido por ele: um gesto faz tudo** (resolve o `fichaId` que só existe pós-save). [R-46-cockpit.md §5a](specs/R-46-cockpit.md). Sem spec ainda — entra quando o cockpit codar | M |
| [R-49](specs/R-49-voz-e-campos-de-especialidade.md) | **Voz e campos de especialidade** — preencher sem digitar 17 vezes | ⏳ **spec escrita 02/08**, **emenda 04/08**: I2 (zero LLM no número clínico) **revogada** — a IA pode preencher odontometria, com a tabela abrindo sozinha (guarda-corpo) e I5 (recusa por faixa) virando o guarda-corpo principal. Dado que motivou: **66% dos endos têm odontometria vazia** | G |
| [R-50](specs/R-50-orto-pelo-dex.md) | **Orto ponta a ponta pelo Dex** — ditar a manutenção e ela cair estruturada | 🟡 **codado e testado ao vivo 05/08** — schema da IA ganha `_inferior` (F1), IA recusa arcada não dita em vez de chutar (F2, achou e corrigiu bias real: "ambas" era o default), Meu dia para de descartar orto em texto (F3). Eval 16/16→sem regressão + 2 casos novos. Gravação real confirmada no banco. Não em produção. (b) do R-50 antigo (chip no fallback) ✅ fechado 04/08 | G |
| [R-51](specs/R-51-53-modelo-multissessao.md) | Procedimento multi-sessão (canal, implante): "em andamento" vira **derivado** do `grupo_id` — sem 3º status novo | 🟡 **codado e commitado 04/08** (`feat(dashboard)`, junto do R-52). Typecheck/lint/build limpos + dado sintético. **Não exercitado em cenário multi-sessão real** — falta o teste ao vivo | G |
| [R-52](specs/R-51-53-modelo-multissessao.md) | Encaminhar pendência pro outro dentista **dentro do bloco "A fazer"** — e "A fazer" vira **estritamente a minha lista** | 🟡 **codado, commitado e testado ao vivo 04/08.** Modo seleção + `EncaminharBar` + sucesso parcial em `encaminharProcedimento` — escrita confirmada no banco (`encaminhado_para` setado, item some da lista de quem encaminhou). Mata o **silent-fail real** (fazer hoje em item de colega devolvia `ok:true` sem gravar) | M |
| [R-53](specs/R-53-orcamento-indicados-abertos.md) | Orçamento nasce de **todos os indicados em aberto do paciente**, não só os registrados hoje | 🟡 **codado e testado ao vivo 04/08, não em produção.** G1 provado 2× com match exato (14, depois 11/3 pelo filtro); G5 provado com orçamento real criado+PDF 200+apagado; G4/G6/G7/G8 provados. G3 só metade (não achei paciente real com 2+ responsáveis incluindo 1 encaminhado); G9 (2 contas) não verificado | M |
| [R-55](specs/R-55-historico-sem-perda-de-dado.md) | 🐛 Dedup por âncora em `get-meu-dia.ts` esconde procedimento repetido — histórico e "Já feito" mostram só 1 ocorrência por âncora, sempre, mesmo com datas diferentes | 🟡 **aprovada, codada e testada ao vivo 03/08** — registrei uma 2ª profilaxia real, banco confirma as 2 linhas, tela agrupa certo ("2×") em vez de esconder uma. Emenda em `R-46-cockpit.md`/contrato aplicada. **Ainda bloqueia** histórico detalhado e o C6 do cockpit | G |
| **R-56** | 🐛 `fichasRecentes` (resumo do paciente) e a lista de fichas do `FichasTab` também mostram "Evolução"/dentista sem checar `origem` — mesma classe de defeito do R-46c (achado 3), só que em 2 surfaces que a spec original não mapeou | ⏳ achado 03/08, testando o R-46c ao vivo. Não é urgente (não é PDF/timeline oficial), mas é a mesma mentira de honestidade do prontuário em superfícies menores | P |
| [R-58](specs/R-58-historico-detalhado.md) | **Histórico detalhado** — texto da visita em evidência (é o conteúdo inteiro quando a sessão só gerou achado), expansão por profundidade, badge de "nada pendente", e o procedimento fechado depois aparecendo nas **duas** entradas (onde foi indicado e onde foi feito) | 🟡 **codado e testado ao vivo 04/08, não em produção.** Pré-requisito cumprido (`eventosParaCards`/`corpoEspecialidade` extraídos). G1 provado com fixture temporária (paciente real da spec estava errado). Achou e corrigiu 1 bug ao vivo (fichas do mesmo dia trocavam evento uma da outra). G6/G7 só parcial — sem dado real de endo/texto longo pro dentista logado hoje. **Habilita o C6** | G |
| [R-57](_arquivo/specs/R-57-atrito-faixa-rapida.md) | **Atrito da faixa rápida** — encaixe no rail · observação por procedimento no Registrar | 🟡 **F1+F2 confirmadas ao vivo 07/08** (navegador real dele, pane própria travou de novo) — "+ Encaixe" criou e selecionou o slot sem sair da rota; observação digitada nasceu certa no card ("Extração — teste F2 observacao"), campo limpou sozinho, sem vazar entre registros. **F3 cortada 07/08** — descartou em vez de escolher entre alfabético×frequência. Sem gate pendente, falta só o push | P |
| [R-30](specs/R-30-ficha-fonte-unica-procedimento.md) | Ficha: fonte única de procedimento — mata a divergência entre `dentes_observacoes` e `odontograma_eventos` | 🟡 **commitado e em produção** (30/07 noite), bug relatado por ele **confirmado corrigido em produção**. **Parte 1 destrava 24 de 87 fichas (27,6%)** que rejeitavam o save ao editar. Falta o gate de 2 contas pra virar ✅ | G |
| **R-67** | 🐛 **4 embeds ambíguos pra `dentistas`** (mesma classe que derrubou `/dashboard/orcamentos` por ~2 meses em 17/07, nunca corrigida nestes 4 pontos) — timeline do paciente nunca mostra "Consulta agendada/cancelada" nem "Orçamento criado", widget "próximo agendamento" sempre vazio, **export de prontuário completo sai sem nenhuma consulta** | ⏳ achado 06/08 (auditoria financeiro, mesmo relatório do R-65/R-66). `get-visible-timeline-events.ts:69,78` · `get-patient-workspace-data.ts:112` · `api/pacientes/[id]/prontuario/route.ts:48`. Fix mecânico (`!fkey`), varrido nos 14 pontos do código que embutem `dentistas` — só estes 4 quebrados | M |
| [R-59](_arquivo/specs/R-59-ficha-orcamento-integridade.md) | 🐛 **4 furos que sobraram do R-30/R-53** — orçamento por-ficha ignora `fichaId` quando o agregado do paciente vem não-vazio; cards do rascunho se fundem por `dente+tipo+status` sem `faces`; `salvarFicha` faz `.update()` sem `.select()`; falha ao gravar evento fecha o painel calado | 🟡 **5 partes codadas, G1-G5 confirmados ao vivo 06-07/08** — backfill de 13 grupos órfãos rodado; G3 (outro dentista) provado por sessão real + rota debug, não 2 abas literais. Sem gate pendente, falta só o push | G |
| [R-31a](specs/R-31a-paciente-unico-prevencao.md) | Paciente único: **prevenção** — parar de criar duplicata | 🟡 **codado, testado ao vivo, commitado e no ar** (push 31/07) — §3.2, §3.3, §3.1, §3.4 completos. G1/G2/G4 confirmados com bug real achado e corrigido em cada um (ver handoff). G3 (toque no celular) e G5 (toast do agendamento) só confirmados por lógica — dev tooling não deixou ver o toast renderizar. Falta gate de 2 contas | M |
| [R-29](specs/R-29-silo-resto-modelo-antigo.md) | Paciente é da clínica: identidade multi-clínica + lista sem filtro por dentista | 🟡 aplicado (migration 120), falta o gate de 2 dentistas comuns | M |
| [R-41](specs/R-41-editar-paciente-completa-cadastro.md) | **Editar paciente fecha o cadastro que o fluxo rápido deixa aberto** — CPF, data de nascimento e responsável de menor | 🟡 **codado, testado ao vivo, commitado e no ar** (push 31/07) — G3-G6 confirmados (CPF duplicado bloqueia com mensagem clara, não colide consigo mesmo, menor revela responsável sem bloquear salvar). G1/G2/G7/G8 só por leitura de código | M |
| [R-61](specs/R-61-odontograma-mostra-a-boca.md) | **O odontograma do Meu dia mostra a boca, não só o rascunho** — hoje ele abre vazio (`eventos={eventosDraft}`, que nasce `[]`); pendência antiga só pinta depois do "fazer hoje →" | 🟡 **fechada 05/08** — 8/9 gates ao vivo, todo invariante provado, inclusive Salvar real (30→31 eventos, +1 exato, autorizado por ele). G5 (risco central) provado na versão mais dura: dente novo vs. antigo da MESMA cor. **Só falta G2/slate** (sem dado de teste com `origem='preexistente'`). Não em produção | G |
| [R-62](specs/R-62-campo-magico-entrada-unica.md) | **Campo mágico vira entrada única** — match local inline (tipo + dente, sem rede, sem IA, sem custo) mata a disclosure "Registrar sem IA" sem quebrar o I8 | 🟡 **fechada 05/08** no que é testável por automação — G1-G9/G11/G12 confirmados. **G10/I4 (voz) exige teste manual** (microfone real). 2 bugs de integração achados e corrigidos (só em sequência de registros, spec §7). Não em produção | M |
| [R-63](specs/R-63-layout-cockpit-slot-central.md) | **Cockpit pensado como dentista** — o centro ganha um **slot** com 1 ocupante por vez (mapa · tabela de especialidade · orto), troca **condicional**; direita vira perfil fixo + abas | 🟡 **F1 codada e testada ao vivo 05/08 — G1-G9/G11 confirmados.** Troca condicional, os 2 gatilhos, os 3 casos do ditado-devolve-mapa, e G9 com Salvar real autorizado (Histórico 9→10, +1 exato). Achou e corrigiu 1 bug real (`onDetalheAbertoChange` disparando setState durante o render de outro componente). **Só falta G10** (`prefers-reduced-motion`, sem como emular no ambiente). **Estouro vertical decidido (§4.8): scroll interno foi codado, testado ao vivo, e revogado por ele mesmo olhando a tela** ("tava sensacional" do jeito antigo) — decisão final é página inteira rolando, sem mecanismo novo, zero resíduo no código. **F2 (colunas em abas) fechada 06/08 — G12-G15 confirmados ao vivo** (esquerda e direita, decisão dele de estender pras duas). `bloco-moldavel.tsx` deletado (órfão). Achou e corrigiu 1 bug real: `data-[selected]` não existe no Base UI instalado (^1.2.0) — atributo real é `data-active`; aba ativa não tinha estilo nenhum sem o fix. Mesmo bug provável em `ui/tabs.tsx` (default) e no prontuário do paciente (`data-[state=active]`) — sinalizado à parte, já em correção separada. **F3 (token + piso 36px) fechada 06/08 — G16/G17 confirmados ao vivo, nos 2 temas.** `text-teal`→`-ink` em 6 chips (3.38:1→5.93:1 calculado); badge do odontograma → `teal-dark`. Piso de 36px achado **ao vivo, não no papel**: `zoom:0.85` do modo compact faz `h-9` medir 30.6px de verdade — precisou `h-11`. **R-63 inteiro só falta G10** (`prefers-reduced-motion`, gate humano). **Revoga** a liberdade de multi-acordeão de 04/08 (consentida) | G |
| [R-64](_arquivo/specs/R-64-marcar-retorno.md) | **Marcar retorno com grade de semana** — chips de salto (30/60/90/180d, 6m, 1a) + grade de hora real da Agenda (menor, 1 dentista), clique marca. Pedido direto dos dentistas | 🟡 **F0-F4 codadas + `/auditar` 06/08, G2/G7/G8 fechados 07/08** (spec §10) — todo gate confirmado ao vivo, inclusive o conflito de dentista (bloqueou, erro inline, zero linha no banco). Conflito de PACIENTE (sem override) não testado — precisa de 2º paciente com agenda cruzada. Sem coluna de tipo (D4) — não é o R-46h | G |
| **R-71** | 🔧 Polimento pós-auditoria 07/08 — Base UI `nativeButton` warning em `not-found.tsx`/`error.tsx` (`Button render={<Link/>}` sem `nativeButton={false}`) + Agenda (Dia/Semana) não rola acima das 07h, agendamento criado de madrugada fica inalcançável na grade | ⏳ achado 07/08, [auditoria pré-produção](../auditorias/2026-08-07-pre-producao.md). Baixo risco nos dois, nenhum bloqueia o push | P |

## Bloco 2 — Orçamento e financeiro

| ID | Item | Estado | Peso |
|---|---|---|---|
| [R-39](specs/R-39-orcamento-dinheiro-esqueleto-unico.md) | **Orçamento e dinheiro: um esqueleto só** — criar e criado com o mesmo layout, coluna do dinheiro, funil no financeiro | 🟡 **R-39a e R-39b codados, testados ao vivo, commitados e no ar** (push 31/07) — PDF/WhatsApp adiantados do R-33. R-39b: consistência visual do aceite + coluna "Pago" em `/dashboard/orcamentos`. Faltam: gate de 2 contas, mobile completo, R-39c | G |
| [R-34](specs/R-34-plano-de-pagamento.md) | Plano de pagamento: registrar o acordo (à vista / parcelado / `valor_acordado`) | 🟡 3 commits codados e testados, commitado e em produção. **Achado 30/07 noite: a rota do PDF tinha bug próprio (404 sempre), corrigido — mas ainda sem commit**, só verificado em localhost. Falta: subir esse fix, gate de 2 contas, e conferir `condicoes_pagamento` num PDF de orçamento parcelado especificamente | M |
| [R-33](specs/R-33-orcamento-tela-unica.md) | Orçamento: uma tela só — mata o painel de `/dashboard/orcamentos`, porta 15 itens | ⏳ espera R-34 e **R-39a** (que define a forma onde os 15 pousam) | G |
| [R-32](specs/R-32-orcamento-visivel-autor-admin-secretaria.md) | Orçamento visível para autor, admin e secretária | 🟡 aplicado (migration 121), falta o gate — G4/G5 são a prova anti-vazamento | P |
| [R-28](specs/R-28-pagamento-fecha-sem-duplicar.md) | Pagamento: grava quem registrou + fecha parcela sem duplicar recebimento | 🟡 partes 1+2 verificadas na Teste01, falta confirmar em prod. **Achado 06/08 (auditoria financeiro):** Parte 3 (saldo fantasma) segue não implementada — **9 orçamentos reais em produção** com `total_pago ≥ valor_devido` e parcela `pendente` ainda aberta (cresceu de 2 pra 9 desde 31/07) | M |
| **R-65** | 🐛 **Receita/Receita Prevista somam dinheiro de orçamento recusado e rascunho** — nenhuma trava de estado impede gerar parcela pendente ou aprovar/recusar orçamento que já tem pagamento anexado | ⏳ achado 06/08 (auditoria completa do financeiro, `plans/auditorias/2026-08-06-financeiro.md`). **Provado com dado real:** R$ 105.501,04 pago + R$ 1.050 pendente presos a 1 orçamento recusado; R$ 32.353,34 pagos presos a orçamentos ainda rascunho. Sem spec ainda | G |
| **R-66** | 🐛 **Excluir orçamento na ficha do paciente mente sucesso pra secretária** (RLS bloqueia de verdade, tela remove e fecha como se tivesse apagado) + **padrão sistemático de erro do Supabase descartado em silêncio** em quase toda leitura de `financeiro/actions.ts` | ⏳ achado 06/08, mesma auditoria. Mesmo botão já está corretamente escondido pra secretária em `/dashboard/orcamentos` — só a ficha do paciente ficou destravada. Sem spec ainda | M |
| [R-38](specs/R-38-orcamento-apresentacao-ao-paciente.md) | Orçamento: como o paciente vê — PDF sem preço por item, só total e condição | 🟡 **codado, testado ao vivo, commitado e no ar** (push 31/07) — migration aplicada, toggle no rodapé, PDF respeita o flag, snapshot do aceite confirmado gravando o flag (G1-G6 verificados) | P |
| [R-10](ROADMAP.md) | P2: tirar a observação clínica do documento que o paciente lê | ⏳ P1 ✅ em prod. P2 precisa de decisão — `dentes_observacoes` alimenta orçamento **e** prontuário | P |

## Bloco 3 — Assinatura e prova

| ID | Item | Estado | Peso |
|---|---|---|---|
| **R-40** | **Template de contrato/termo pra assinatura** — hoje se assina procedimento e orçamento, mas **não existe texto de termo** (`lib/documentos/modelos.ts` só tem atestado e receita) | ⏳ **decisão pendente:** termo de consentimento (clínico) **ou** contrato de prestação (comercial)? Muda o item inteiro | ? |
| [R-03c](specs/R-03c-1-aceite-assinado-orcamento.md) | Aceite assinado do orçamento — prova de recebimento | 🟡 R-03c-1 no ar, falta gate de 2 contas. Restam c-2 (congelamento), c-3 (revisar sem apagar prova), c-4 (aceite no PDF) | G |

## Bloco 4 — Fundação e risco

| ID | Item | Estado | Peso |
|---|---|---|---|
| [R-37](ROADMAP.md) | `fichas.dentista_id` é `ON DELETE CASCADE` — apagar 1 dentista levaria 18 fichas da Jenaina, 18 do Armando, 14 do Renato | ⏳ **mina enterrada** (zero `DELETE` em `dentistas` hoje). Vira alcançável com R-31b e R-36 — entra **antes** deles | M |
| [R-36](specs/R-36-um-login-uma-clinica.md) | Um login, uma clínica — fim do multi-clínica e do seletor | ⏳ planejada. **Ajuste 30/07:** admin fica como está, vira conta burocrática depois | G |
| [R-35](specs/R-35-riscos-nao-reportados.md) | 14 riscos da auditoria de 29/07 | 🟡 10 codados/aplicados, **4 verificados ao vivo**. Faltam itens 4, 7, 10 | M |
| **R-43** | Varredura de todas as `SECURITY DEFINER` de RLS com fallback sem casar clínica | ⏳ **3ª ocorrência achada** (`get_my_role`, `get_my_dentista_id`, `has_active_membership`). Achar de uma vez em vez de uma por acidente | P |
| **R-44** | Varredura de embeds Postgrest com FK ambígua (`tabela:outra(...)` sem `!` desambiguando) — mesmo padrão do bug corrigido no PDF (R-34) | ⏳ **achado 30/07 à noite**, confirmado ao vivo (300 real nos logs do Supabase) em `agendamentos`: `get-patient-workspace-data.ts:110`, `get-visible-timeline-events.ts:66` e `:75`. **`orcamentos/page.tsx:64` — confirmado e corrigido 31/07** (lista de `/dashboard/orcamentos` voltava 0 orçamentos, silencioso). **2 achadas a mais 31/07** (busca sensível a acento, mesma família): `command-palette.tsx:105`, `atender-agora-modal.tsx:57` — não confirmadas nem corrigidas. Seguem abertas 5 no total | P |
| [R-25](ROADMAP.md) | 24 `setState` síncronos dentro de `useEffect` (cascading renders) | ⏳ dívida de performance, não quebra runtime | M |
| **R-47** | Ficha rápida: Organizar com Dex apagava dado sem aviso (2x) + `alerta_novo` nunca persistia e era apagável | 🟡 **corrigido 31/07** — [achado, fix e 2 rodadas de verificação adversarial](auditorias/2026-07-31-fase0-dex-ficha-rapida.md#correção-r-47--2-rodadas-3107). Typecheck/lint/build limpos; **falta teste ao vivo** (pane do browser não compositou nesta sessão). Trade-off aceito e documentado: duplicata visível se o Dex reextrai o mesmo procedimento com status diferente — fica pro R-46d | G |

## Bloco 5 — Depois

| ID | Item | Estado | Peso |
|---|---|---|---|
| [R-08](specs/R-08-contrato-clinico-perio.md) | Periodontia: periograma — R-08c (tabela + grade 6×32) → d (PDF) → e (comparação) → f (ditado) | ⏳ R-08a e R-08b ✅. [Contrato clínico](specs/R-08-contrato-clinico-perio.md) travado | G |
| [R-26](ROADMAP.md) | Dex vira hub de notificações operacionais — faltosos sem retorno | ⏳ sem spec. Precisa definir o que é "faltou e não voltou" | M |
| **R-45** | 💡 Retorno automático por tipo de procedimento (recall) — profilaxia a cada 6 meses, orto mensal etc. — dispara aviso de WhatsApp antes do prazo vencer | 💡 ideia levantada 31/07. Proativo (antes de vencer), diferente do R-26 (reativo, depois que já faltou). Ele mexe no WhatsApp amanhã de manhã — ainda não mapeado, não é spec | ? |
| [R-09](ROADMAP.md) | Voz nas especialidades — `/api/dex/extrair-especialidade` não tem um único chamador | ⏳ sem spec | M |

---

## 🔬 Em investigação (30/07, rodando)

Dois mapeamentos em curso. **Nada aqui vira item até o resultado chegar.**

| O quê | Cobre |
|---|---|
| **4 demandas novas** | dentista ver todos os pacientes · orto com 2 medidas por arcada · repaginada do financeiro · painel de notificações do Dex |
| **Mapa de atrito** | conta os gestos reais de 6 caminhos e separa atrito **estrutural** (compra estrutura) de **acidental** (de graça remover) |

**Conflito já identificado, esperando o resultado:** o modelo 3.1 declara **agenda como
privada**, e a demanda pede que dentista veja "horários marcados". Pode ser conflito aparente
— ver *a agenda do Dr. Y* é diferente de ver *os agendamentos do paciente X*.

## 🧊 Congelado

| ID | Item | Descongelar quando |
|---|---|---|
| **R-70** | 🐛 **Ficha com muitos procedimentos é difícil de editar** — feedback real de dentistas (dificuldade "adicionar ficha e principalmente adicionar procedimentos"). Repro concreto 07/08: 13 dentes numa ficha só, lista de "Registros da consulta" empurra os chips de rotina e o Salvar pra fora da vista (painel é 1 coluna só, desenho de 21/07). 2 direções cogitadas, tamanhos bem diferentes: (1) limitar a lista a `max-height` com scroll interno, mesmo padrão que o R-64 já usa na grade do retorno — pequeno, baixo risco; (2) empurrar caso de MUITOS procedimentos pro Organizar com Dex (dictado) em vez do clique manual dente-a-dente, que é o caminho pensado pro caso comum (1-3 dentes) | **Congelado 07/08** — falta saber do feedback original dos dentistas se o caso real é "muitos procedimentos numa consulta" (aponta pra opção 2) ou "a tela é ruim mesmo com poucos" (aí a opção 1 já resolve) |
| [R-22](auditorias/2026-07-26-relatorio-audit-visual.md) | Audit visual do Fable (115 achados) + [símbolos vs norma](auditorias/2026-07-27-simbolos-odontograma.md) | Quando ele quiser voltar ao design. Lote de emergência já identificado |
| **R-60** | Orto (e especialidades que não pintam o odontograma) merece interface própria na ficha em vez de chip escondido em "Registrar sem IA" — mais controle de recorrência ("o paciente veio esse mês?") | **Congelado 04/08** — ele traz um exemplo de ficha real de orto pra basear o desenho. Relacionado: [R-45](ROADMAP.md) (recall por WhatsApp, mesma ideia de fundo) · [R-50](specs/R-50-orto-pelo-dex.md) (✅ resolvido 05/08 — não é mais bloqueio) · a distinção já existe na arquitetura (`EspecialidadePlugin.render.pinta`, [`plugin.ts`](../src/lib/especialidades/plugin.ts)) — hoje só orto é `pinta:false`; perio é candidato futuro mas é escopo do R-08, travado à parte |

## ✅ Concluído

| ID | Item | Fechado |
|---|---|---|
| [R-48](_arquivo/specs/R-48-voz-confiavel.md) | Voz confiável — mic iOS, retry sem perder texto, falha no meio do ditado não descarta áudio | 2026-08-01 |
| R-27 | Redesign do padrão de modal/painel (orçamento + agendamento) | 2026-07-29 |
| R-11 | Contrato único `salvarFicha`/`deletarFicha` | 2026-07-28 |
| R-08b | Rastreio periodontal (PSR/CPITN) | 2026-07-29 |
| R-08a | Exame periodontal vira registro | 2026-07-28 |
| R-05b | Orto: atalho "+ Manutenção" com pré-preenchimento | 2026-07-28 |
| R-03b | Assinatura por procedimento — captura/UI | 2026-07-28 |
| R-03a | Assinatura por procedimento — modelo + congelamento | 2026-07-28 |
| R-07 | Procedimentos de rotina (profilaxia · flúor · clareamento · raspagem) | 2026-07-27 |
| R-06 | Prótese fixa e odontopediatria (ponte, esfoliação) | 2026-07-27 |
| R-05 | Ortodontia: lançamento e edição manual | 2026-07-27 |
| R-04b | Encaminhamento: observação do autor + detalhe clínico | 2026-07-26 |
| R-21 | Registros agrupados por dente | 2026-07-26 |
| R-20 | Redesenho da ficha odontograma (lado a lado) | 2026-07-26 |
| R-19 | Barras contextuais acima do dock | 2026-07-26 |
| R-18 | Filtro por responsável não trava em tela vazia | 2026-07-26 |
| R-17 | EncaminharBar não colide com o dock | 2026-07-26 |
| R-16 | Filtro por responsável na ficha | 2026-07-26 |
| R-12 | Contraste AA — sweep teal-ink | 2026-07-26 |
| R-04 | Encaminhamento de procedimento (base) | 2026-07-26 |
| R-02 | Ficha viva + fidelidade (símbolos, card, grupo) | 2026-07-26 |
| R-01 | Ficha: o registro como unidade de salvamento | 2026-07-23 |
| R-14 | Dashboard da secretária monta "hoje" no fuso do servidor | 2026-07-23 |
| R-13 | Agenda: janela de busca, multi-dentista, clique na grade | 2026-07-22 |

Specs dos concluídos: `plans/_arquivo/specs/`.

## ✂️ Cortado

| ID | Item | Por quê |
|---|---|---|
| **R-54** | 🐛 2ª gravação no mesmo dia cria ficha solta "sem juntar" | **Cortado 03/08 — não era defeito.** O modelo é ficha = atendimento, **sempre nova**: cada sessão de trabalho vira sua própria ficha, e "não juntar" é o comportamento correto (CFO pede evolução por visita). O item nasceu de leitura errada do modelo. Sem migration, sem coluna `agendamento_id`, sem trava. Investigação registrada em [R-51-53 §4.4](specs/R-51-53-modelo-multissessao.md) |
| R-15 | Modo consulta: o cockpit do atendimento | Absorvido pelo R-46 (31/07) — o Meu dia É o novo modo consulta; a rota `/consulta` aposenta nas fases do R-46 §5. Spec em `_arquivo/specs/` |
| R-35 itens 8 e 13 | Apagar dado antigo | Decisão de 29/07: não apagar nada |
| R-33 descarte 3 | QR Code PIX | O QR gerado é string descritiva, não payload PIX válido |
| **R-68** | Grade do "Marcar retorno" não diferencia expediente configurado de fora dele (H2 da auditoria do R-64) | **Cortado 07/08** — R-64 no ar e funcionando, não sente falta |
| **R-69** | "Marcar mesmo assim" no Marcar retorno (H3 da auditoria do R-64) | **Cortado 07/08** — respondeu a pergunta em aberto ("esquecimento ou escolha?"): escolha, não precisa |
| **R-42** | Odontograma geral do paciente (só leitura, agregando fichas) | **Cortado 07/08**, sem motivo detalhado registrado |
| **R-24** | Indicador de "ficha em aberto" | **Cortado 07/08**, sem motivo detalhado registrado |
| **R-07b** | Chips de rotina no modo consulta | **Cortado 07/08**, sem motivo detalhado registrado |
| **R-31b** | Paciente único: **unificação** dos 16 grupos duplicados existentes | **Cortado 07/08** — a ferramenta manual (`excluirPaciente`) existe e está testada (cascade + log confirmados), mas a limpeza dos 16 grupos em si não vira item de roadmap. Levantamento de qual cópia é a certa em cada par segue em `_arquivo/specs/R-31b-paciente-unico-unificacao.md` §1.1, se algum dia for retomado |
