# R-46 — Meu dia: a ficha no dia real (o novo modo consulta)

> **Spec** · fase: **aprovada** (31/07 — "vamos executar" dele; defaults v1 D11–D14 lockados
> na mesma conversa, veto aberto). Contrato fino continua entrando por fatia, quando ativa.
> **Modelo:** Sonnet 5 + **ultracode** (workflows multi-agente nas varreduras, diagnósticos e
> verificações) · fatias marcadas `[opus]` sobem pra Opus/Fable
> **Artefatos:** [artefatos/R-46-ficha-dia.html](../artefatos/R-46-ficha-dia.html) (v6 — tela completa,
> interações, zero-registro) · [artefatos/R-46-ficha-estado-evento.html](../artefatos/R-46-ficha-estado-evento.html)
> (modelo estado × evento). Tokens visuais: extração via `artefato-visual` quando a fatia de UI ativar.
> **Pesquisa** (thinking-partner 31/07, fontes citadas no handoff): treatment card é o padrão do setor
> (Open Dental/Dolphin/Ortho2/OrthoTrac) · ninguém herda evento automático · AHIMA "citing" · ECRI
> Rec A–D · NORCAL (nunca pré-selecionar) · CFO Res. 118/2012 art. 17 §único.

## 1. O problema (medido em produção, 31/07)

- **Cobertura:** 134 atendimentos `completed` desde 07/06 → só 42 (31%) com ficha no mesmo dia.
  Causa confirmada por ele: **a maioria dos dentistas registra no Word** — o registro existe, fora.
- **Custo:** registrar = 12–14 gestos (viagem ~5 + ficha 7–9, mapa de atrito 30/07).
- **Forma:** 7 campos pedidos em toda visita com **0/88** de uso (anamnese, alergias, medicamentos,
  históricos, exame físico, PA); a ficha real é dentes_obs 94% + procedimentos 65% + texto 47%.
  `queixa_principal` guarda o tipo, não queixa.
- **Segurança:** alergia não tem campo estruturado em lugar nenhum (ficha 0%, `pacientes` sem coluna).

## 2. Decisões travadas (31/07, com o Mateus)

| # | Decisão |
|---|---|
| D1 | **Meu dia É o novo modo consulta.** `/consulta` aposenta em fases (§5); R-15 absorvido (✂️) |
| D2 | **Porta = dashboard**, onde o "Atender agora" está. Requisito dele: *"algo ativo, fácil de ver"*. Item na sidebar também |
| D3 | **Página nova, modelo velho.** Reuso obrigatório: `Odontograma`, `ToothDetailPanel`, chips região/rotina, `salvarFicha` (R-11), RPC 107, agrupamento R-21, pipeline Dex, assinatura R-03 |
| D4 | **Estado × evento.** Evento de hoje NUNCA nasce preenchido (trava de schema). Estado se exibe com "desde". Plano é puxável: "fazer hoje →" vira registro com proveniência |
| D5 | Catálogo: **ordem aprendida do uso, seleção nunca** (NORCAL) |
| D6 | **Proveniência por registro** — `manual · do_plano · via_dex · importado` — coluna, não log; visível na timeline **e no PDF** |
| D7 | Estado orto é **fio por arcada** (S e I separados — "ambas" tem dois fios) |
| D8 | Histórico legado mora no Word → **"colar do Word" em 2 níveis**; nível 1 sem IA |
| D9 | Colapsável aberto **fica aberto na sessão** (odontograma etc.), não reseta por paciente |
| D10 | ~~"Salvar e chamar próximo" = assina (data+CRO) + conclui + abre o seguinte~~ **CORRIGIDO 31/07 pela pesquisa de código:** não existe mecanismo de "dentista certifica com CRO+data" — a única assinatura que existe exige o **paciente desenhando num canvas**, e o CRO não é digitado (a RPC lê `dentistas.cro` e congela em `assinaturas.cro_no_ato`). Decisão dele: **assinatura fica FORA do botão**; ele salva + conclui + avança. Ver [R-46b2 §2](R-46b2-salvar-chamar-proximo.md) |
| D11 | **Substituição TOTAL é o destino** (dele, 31/07): o modo consulta sai por completo. As fases do §5 são o caminho seguro até lá, não dúvida sobre o destino. A saída SEMPRE cai na ficha (gate G2 da fatia b) |
| D12 | Pendência de colega: **executa direto, sem modal** — proveniência guarda quem planejou e quem executou (default v1; A2 fechada) |
| D13 | Anotações + conduta viram **um campo** ("texto da visita"); PDF imprime como evolução (default v1; A4 fechada — conduta tinha 9% de uso) |
| D14 | Colar do Word: **secretária pode colar o nível 1** (transcrição documental); **nível 2 só o dentista confirma** (default v1; A5 fechada). **ADIADO 01/08** — a investigação do R-46c achou que isso está bloqueado em **2 camadas** (`salvarFicha:136` barra secretária no servidor; a rota do Meu dia a redireciona), ou seja, não é ajuste de permissão, é superfície nova. Decisão dele: R-46c entra **só com dentista**; D14 vira item próprio ([R-46c §14 A1](R-46c-colar-do-word.md)) |

## 3. Fatias — cada uma ganha contrato fino + gates quando ativar

### Fase 0 — diagnóstico do pipeline Dex da ficha rápida ✅ concluída 31/07
Relatório: [auditorias/2026-07-31-fase0-dex-ficha-rapida.md](../auditorias/2026-07-31-fase0-dex-ficha-rapida.md)
(workflow: 15 agentes, 6 achados confirmados por verificação adversarial, todos gravidade alta).
**Os 2 primeiros são apagamento real de dado clínico em produção HOJE, independente do R-46:**
1. Reabrir ficha salva + Organizar de novo **deleta** eventos do odontograma que a IA não
   recriar (`FichasTab.tsx:1210`, RPC 107 apaga por omissão de id).
2. Lançamento manual no odontograma é sobrescrito pelo Organizar **sem nenhuma confirmação**
   (`formDirty` não inclui `eventosDraft`, `FichasTab.tsx:1174`).
3–5. Voz: mic quebrado em Safari/iOS (sem fallback `audio/mp4`) · sem retry após erro · falha
   no meio do ditado é 100% silenciosa (`useAudioRecorder.ts`).
6. `alerta_novo` (alergia nova) nunca persiste pela ficha rápida e **é apagado** se uma ficha
   nascida no modo consulta for reeditada por ela (`FichasTab.tsx:1193`, `salvar-ficha.ts:169,234`).

**Decisão de sequenciamento — RESOLVIDA 02/08, e já satisfeita:** os 6 achados **já têm
correção de código** — 1, 2 e 6 pelo **R-47** (commitado 31/07, `docs/../auditorias/2026-07-31-
fase0-dex-ficha-rapida.md`, 2 rodadas de verificação adversarial; falta só o teste ao vivo pra
virar ✅ no `ROADMAP.md`, mesmo gate genérico de vários outros itens). 3, 4 e 5 pelo **R-48**
(01/08, confirmado no iPhone real dele, ainda não commitado). Isso libera o campo mágico
completo ("Organizar com Dex") no R-46c (ver [R-46-cockpit.md §5 F1](R-46-cockpit.md)) sem
precisar de trabalho novo — só R-48 commitado e R-47 com o teste ao vivo feito, que já
estavam na fila por outro motivo.

### R-46a — esqueleto + contexto (só leitura) ✅ codado 31/07, sem teste ao vivo
Rota `/dashboard/meu-dia`: **rail** do dia (agenda + estado de registro por slot, ⚠ sem-registro)
+ **coluna do antes** (última visita; pendências = eventos `indicado` abertos; estado orto lido do
jsonb atual) + porta v1 no hero do dashboard (CTA grande — "ativo e fácil de ver"; redesign
completo é A3) + item na sidebar. Registrar ainda leva pro fluxo atual do perfil. **Zero escrita
nova** (confirmado por grep: nenhum `.insert/.update/.delete/.upsert/.rpc` nos arquivos da fatia).

Novo: `src/server/dashboard/get-meu-dia.ts` — **1ª implementação do projeto** do reduce "evento
mais recente por âncora" (G2). 2 rodadas de verificação adversarial (workflow, 4 agentes por
rodada) acharam e fecharam: (1) filtro `assinatura_id IS NULL` tirava do páreo o evento
`realizado` assinado, reabrindo pendência já feita — removido; (2) `registrado_em` é `date` sem
hora, empates no mesmo dia (indicar+realizar na mesma consulta) sem desempate — `created_at`
como 2ª chave de ordenação. Achado documentado, não corrigido (schema fora do escopo): `temFichaHoje`
é por paciente+dia, não por agendamento — 2 atendimentos do mesmo paciente no mesmo dia
compartilham o sinal (`fichas` não tem FK pra `agendamentos`).

Gates: G1 ✓ fuso BRT confirmado contra `hora-brt.ts` e a RLS real (migration 089/099) · G2 ✓
após as 2 correções acima · G3 ✓ na régua definida (paciente+dia), limitação de granularidade
documentada no código · G4 ✓ zero escrita · G5 ✓ estados renderizam sem crash (mensagem
"sem histórico" ajustada pra não contradizer pendências existentes sem ficha).

**Falta:** teste ao vivo — pane do browser não compositou nesta sessão inteira (screenshot e
clique falharam desde a tentativa no R-47). Typecheck/lint/build limpos nas 2 rodadas.

### R-46b — registrar no Meu dia `[spec própria]` · R-46b2 — salvar e chamar próximo `[spec própria]`
**Quebrado em 2 specs em 31/07**, depois da pesquisa de código (3 varreduras completas) mostrar
que é bem mais construção nova que reuso — o artefato superestimava o reuso:
- **[R-46b](R-46b-registrar-meu-dia.md)** — typeahead + chips região + grid FDI + odontograma +
  lote multi-dente + "fazer hoje →". **Correções ao artefato:** os chips "R-07 · os mesmos" são
  na verdade **2 mecanismos que não convertem entre si** (sentinelas legadas de `arcadas.ts` vs.
  `QuadranteFDI` moderno) — usa o moderno; **popover FDI não existe** (nem a peça do shadcn está
  instalada); **catálogo por frequência foi cortado** (decisão dele: "muito relativo, usar o que
  já está no sistema" — vira busca alfabética na `procedimentos` que Orçamentos já usa).
- **[R-46b2](R-46b2-salvar-chamar-proximo.md)** — o botão. Descoberta que simplifica: `salvarFicha`
  com `origem='modo_consulta'` **já fecha o agendamento e notifica a secretária** numa chamada só.
  Assinatura fica fora (D10 corrigido acima).

Gates originais preservados nas 2 specs. O G2 ("ficha idêntica no perfil") virou G2 do R-46b2 —
é a prova de que o modelo velho foi reusado de verdade.

### R-46c — colar do Word (nível 1, sem IA) `[spec própria]`
Spec: **[R-46c-colar-do-word.md](R-46c-colar-do-word.md)** (01/08, fase `contrato`).
**Correções ao plano original, achadas na investigação:** `importado` **não existe no banco**
(`fichas_origem_check` só aceita `modo_consulta|manual` — precisa migration); `fichas.origem`
**nunca é exibido em lugar nenhum** hoje (nem timeline nem PDF selecionam a coluna), então o
"marca importado visível" é código novo em 2 pontos; e a timeline chama **toda** ficha de
"Consulta realizada" — sem consertar isso, o histórico importado mente dizendo que foi um
atendimento (virou invariante, não polish). Decisões dele (01/08): 1 colagem = 1 ficha com o
histórico todo · vive no Meu dia **e** no perfil · **só dentista** (D14/secretária adiada,
está bloqueada em 2 camadas: `salvarFicha:136` e o redirect da rota).

### R-46d — Dex embutido + colar nível 2 `[bloqueado pela Fase 0]` `[opus]`
🎤 no rodapé → propostas **em lista, ✓ uma a uma** (nunca "aceitar tudo"), proveniência `via_dex`;
"estruturar com Dex" do texto importado → registros retroativos `importado` confirmados um a um.
**Pré-requisitos reais, achados 31/07 (não mais estimativa de 4 linhas):** consertar os achados
1, 2 e 5 da Fase 0 antes de embutir — sem isso, o gate "proposta rejeitada não deixa rastro"
já nasce quebrado, porque o pipeline atual apaga dado mesmo sem rejeição nenhuma. Mic iPhone
(achado 3) + retry travado (achado 4) também entram aqui, escopo maior que o previsto.
Gates: entram com o contrato fino; G-chave: proposta rejeitada não deixa rastro; ficha idêntica no perfil.

### R-46e — estado serial orto (fio por arcada) + grade `[modelo novo: tratamento]`
Estado deriva da última troca registrada em visita (fonte única, R-30). Grade de visitas na aba
do tratamento. Depende de modelo de dado novo — contrato fino quando ativar.

### R-46f — estado do paciente (alergia, anamnese) `[modelo novo]`
A casa da alergia (badge permanente + "confirmado em DD/MM", AHIMA citing). Prompt na primeira
visita, revalidação por toque. Resolve o achado de segurança do §1 — e herda o achado 6 da
Fase 0 (`alerta_novo` da extração já é detectado certo, só não persiste hoje). Decide se herda
esse campo ou o contrato novo o substitui. Contrato quando ativar.

### R-46g — a porta: o CTA do hero abre o Meu dia `[spec própria]`
Spec: **[R-46g-porta-modo-consulta.md](R-46g-porta-modo-consulta.md)**. Fecha a A6. O CTA
primário do hero passa a abrir `/dashboard/meu-dia?ag=`, e o Meu dia ganha a saída pro
atendimento por slot (trava: os dois juntos ou nenhum). Não aposenta `/consulta` — isso
continua sendo a fase 3 do §5, gated pela A1.

**Ordem:** 0 → a → **g** → **b → b2** → c → d → e → f. (g entrou cedo porque é navegação, não
escrita. **b/b2 subiram na frente do c em 31/07** — decisão dele, "vamos seguir": sem registrar,
o Meu dia continua sendo só leitura e a hipótese de atrito não é testável de verdade; o
colar-do-Word (c) melhora o contexto de uma tela que ainda não faz o trabalho.)

## 4. Fora do escopo do R-46

- Redesign completo do dashboard (A3 — precisa do §3 dele, `spec-redesign`)
- Fundir/mover os 7 campos mortos da ficha (esconder/migrar — item próprio quando R-46f provar o modelo)
- Perio/implante na grade serial (depois que orto validar — D do artefato)
- Unificação de pacientes duplicados (R-31b), odontograma geral (R-42)

## 5. Aposentadoria do modo consulta (transversal, dentro do R-46)

1. **Fase 1** — Dex no Meu dia (R-46d) convive com `/consulta` intocada.
2. **Fase 2** — cirurgia/implante testam o ditado longo no Meu dia (uso que o reposicionamento
   de 29/07 reservou). **A1 decide aqui.**
3. **Fase 3** — `/consulta` vira redirect pro Meu dia. Se A1 falhar, a rota fica e nada se perdeu.

R-15 já foi ✂️ no roadmap (31/07) com a spec movida pro `_arquivo/` — a absorção é decisão
tomada; as fases acima são só o *quando* da rota.

## 6. Métrica de sucesso — definida antes de construir

- **Baseline (31/07):** 31% dos `completed` com ficha no mesmo dia (42/134, régua: mesma
  `paciente_id` + `data_atendimento` = dia do agendamento no fuso da clínica).
- **Meta:** >60% em 4 semanas de Meu dia em uso.
- **Critério de desistência:** sem movimento em 4 semanas → a hipótese de atrito estava errada;
  parar de investir nas fatias seguintes e reavaliar.
- Guarda-corpo de qualidade (ECRI Rec D): % de "fazer hoje" aceitos sem nenhuma edição por
  dentista — ~100% constante é sinal de teatro, investigar.

## 7. Riscos

| Risco | Mitigação |
|---|---|
| Catálogo ruim → "outro…" toda vez | Semear do vocabulário real do banco (R-46b); nunca lista nossa |
| Teatro de checkbox pra limpar o ⚠ | Registro honesto custa ~o mesmo; monitorar métrica §6 |
| Barreira física (dentista longe do PC) | Responsivo tablet/celular é **requisito** das fatias de UI, não polish; mic iOS antes do R-46d |
| Construir nível 2 sobre pipeline quebrado | Fase 0 antes; nível 1 não depende de IA |
| Semana 1 mais lenta → desistência | Fatia a é só leitura (valor sem custo de hábito); mostrar o artefato a um dentista da clínica antes do primeiro código |

## 8. Abertas

- **A1** · Revisão do Dex em lista escala pra cirurgia de 40 min? **Só a fase 2 do §5 responde
  empiricamente** — decide se a fase 3 (redirect) acontece. Única aberta genuína restante.
- **A3-redesign** (opcional, não bloqueia): redesign completo do hero do dashboard — se ele
  quiser além do CTA v1, vira `spec-redesign` com o §3 dele.

*A2, A4 e A5 foram fechadas como defaults v1 → D12, D13, D14 (31/07). Veto dele reabre.*

- **A6 · FECHADA 31/07** — ele decidiu: *"o botão de entrar no modo consulta pode se tornar
  o trigger pro meu dia"*. Virou spec própria:
  **[R-46g — A porta](R-46g-porta-modo-consulta.md)** (sub-item; inventário verificado das 15
  capacidades de `/consulta` e das 7 portas vivas, por varredura multi-agente com verificação
  adversarial). **Trava que a spec impõe:** a troca só entra junto com a saída pro atendimento
  de dentro do Meu dia — senão a ação primária do dashboard vira beco sem saída, contra o
  próprio D11. 3 abertas lá (gate de assinatura, alergia antes do R-46f, tela que congela).
- **A7 · Coluna do antes ("Pendências abertas") é lista, não ficha — endereçado 31/07.**
  Ele completou o feedback comparando com o artefato: "última visita" (a seção de cima)
  estava alta e sem informação — porque `resumo` é 1 frase só (`queixa_principal` ||
  2 procedimentos || **"Evolução"**, o fallback mais comum), enquanto o artefato mostra
  itens por evento com dente/local. Comparei com `R-46-ficha-dia.html` via
  `artefato-visual` (tokens extraídos, não deduzidos) e apliquei o que dava pra fazer com
  dado real, sem inventar conteúdo:
  - "Última visita" agora usa os eventos `realizado` do dia daquela visita (mesma
    `odontograma_eventos` já buscada pras pendências — zero query nova), renderizados como
    linha `TIPO_LABEL + onde`, igual ao artefato; cai no `resumo` antigo só quando não há
    evento estruturado naquela data.
  - Cabeçalho "Última visita · data · dentista" virou 1 linha só (artefato faz isso).
  - Linhas de pendência ficaram mais compactas (`py-0.5`, tipografia menor) — mas **mantive
    o nome do dentista por linha**, que o artefato omite. Decisão minha, não pedida: D12
    desta mesma spec já tinha decidido que proveniência (quem indicou/executou) importa;
    apagar o campo pra economizar altura ia contra isso. Se ele achar que ainda está
    denso, cortar isso é a próxima coisa a tentar.
  - **Não fiz:** o "peek expandido" de visitas anteriores nem "fazer hoje →" no artefato —
    o 2º é R-46b (escreve dado, fora do escopo read-only do R-46a); o 1º não foi pedido,
    só existe no artefato.
  Verificado: typecheck + lint limpos, estrutura conferida via árvore de acessibilidade
  (fallback pra "Evolução" bateu certo pro caso sem evento). **Não testado clicando** —
  pane do browser sem compositar (mesmo bloqueio do R-47), não vi com evento real
  populado.
