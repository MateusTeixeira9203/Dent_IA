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
| D10 | **"Salvar e chamar próximo"** = assina (data+CRO) + conclui agendamento + abre o seguinte |
| D11 | **Substituição TOTAL é o destino** (dele, 31/07): o modo consulta sai por completo. As fases do §5 são o caminho seguro até lá, não dúvida sobre o destino. A saída SEMPRE cai na ficha (gate G2 da fatia b) |
| D12 | Pendência de colega: **executa direto, sem modal** — proveniência guarda quem planejou e quem executou (default v1; A2 fechada) |
| D13 | Anotações + conduta viram **um campo** ("texto da visita"); PDF imprime como evolução (default v1; A4 fechada — conduta tinha 9% de uso) |
| D14 | Colar do Word: **secretária pode colar o nível 1** (transcrição documental); **nível 2 só o dentista confirma** (default v1; A5 fechada) |

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

**Decisão de sequenciamento — dele, antes de R-46d:** consertar 1/2/6 como fila própria (fora do
R-46, achado de auditoria) antes ou dentro do R-46d? Ver handoff 31/07.

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

### R-46b — registrar no Meu dia
Typeahead de procedimento (catálogo **semeado do vocabulário real**: `procedimentos` das 88
fichas + itens de orçamento; ordem por frequência da clínica) + onde (chips região + popover FDI
multi-toque, decíduos) + status + **lote multi-dente** (1 registro/dente) + **"fazer hoje →"**
das pendências + **"Salvar e chamar próximo"** (salvarFicha + agendamento `completed` + próximo).
Gates: G1 lote grava N registros ancorados certos · G2 a ficha aparece **idêntica** no perfil
(timeline, odontograma, orçamento, PDF) · G3 "fazer hoje" carrega proveniência e âncora do plano ·
G4 fluxo típico ≤6 gestos **medido em clique real** · G5 concluir não colide com o papel da
secretária (A2/v1: quem salvar conclui; conflito real → reporta) · G6 retroativo continua só no perfil.

### R-46c — colar do Word (nível 1, sem IA)
Empty-state da coluna do antes → textarea → **ficha retroativa com o texto tal qual**, marcada
`importado` (proveniência D6), `data_atendimento` retroativa (mecanismo já existe no form atual).
Sob demanda, paciente a paciente — nunca mutirão.
Gates: G1 retroativa ordena certo na timeline · G2 marca `importado` visível na timeline e no
PDF · G3 quem pode colar conforme A5 · G4 texto colado é imutável após assinar (R-03).

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

**Ordem:** 0 → a → c → b → d → e → f. (c antes de b: o colar-do-Word dá valor ao contexto no
dia 1 e não depende de escrita nova complexa; ele pediu prioridade nisso.)

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
