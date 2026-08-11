# Estado — Odonto.IA

> **ESTADO** · atualizado 2026-08-11 · sessão #37 (continuação)
> **Item ativo:** R-102 · **Modo da última sessão:** execução

## Agora

**R-102 — Compromisso pessoal na agenda.** Codado inteiro e commitado: migration 138 aplicada
(tabela `agenda_bloqueios`, RLS espelha `agendamentos_access`), actions novas, conflito nos 2
sentidos (consulta↔bloqueio), bot de WhatsApp e grade de retorno respeitam via
`getDisponibilidadeSemana`, render nas 3 visões. Typecheck/lint/build limpos.

Bug de processo achado e corrigido nesta sessão: a 1ª versão do dialog copiou o padrão visual
**errado** (Sheet lateral com gradiente do "Encaixe", cores hardcoded `amber-500`/`red-500`) em
vez do padrão real do "Novo agendamento" (Dialog centralizado, tokens semânticos
`warning`/`coral-ink`). Ele apontou ao vivo, corrigido e aprovado. Também somei os atalhos de
período (Manhã/Tarde/Dia inteiro) que ele pediu — preenchem hora+duração, campo continua livre.

**Falta:** ele pediu push, mas **G1-G6 nunca foram testados ao vivo** — nem por ele, nem por
mim (sem credencial de clínica de teste). G6 (dono não vê bloqueio do outro dentista, nem por
URL) e G3/G4 (conflito nos 2 sentidos) são os gates que a própria spec (§9) marca como o que
define o item — e o CLAUDE.md trata teste de 2 contas pra RLS nova como inegociável. Avisei
antes de dar push; esperando ele decidir como quer proceder (ver "Esperando você").

## Travado

| O quê | Trava o quê | Hipótese / próximo passo |
|---|---|---|
| G1-G6 do R-102 sem teste ao vivo | Push do R-102 | Ele decide: testa ele mesmo, me dá credencial de teste, ou aceita subir mesmo assim (a RLS é cópia 1:1 de `agendamentos_access`, já comprovada em produção) |
| Preço novo não fechado (herdado do R-92) | Retomar o R-92 | `lib/planos.ts` é fonte única — trocar o número é barato quando ele decidir |
| R-36 reescrita sem aprovação dele | Começar a codar a R-36 | §7 do doc tem 3 decisões abertas; a mais pesada é se cadastro solo continua criando clínica |

## Esperando você

- **R-102 — decidir sobre o push** (ver "Agora"/"Travado"). R-101 já testado e aprovado, fechado
  e commitado — não depende de nada, pode subir independente do R-102.
- **R-98b — por que desativar o botão "Salvar como meu modelo"?** Codado, migration no ar,
  ele pediu pra desativar antes de eu conseguir perguntar o motivo. Preciso saber a razão
  antes de saber quando/se reativar. Não commitado.
- **Layout antigo em "vários lugares da secretária"** — ele mencionou de passagem ao revisar o
  R-102 (11/08), sem apontar exatamente quais telas. Não é escopo do R-102 (aditivo, não
  redesign) — vira item próprio quando ele apontar os lugares específicos.
- **Painel do Dex — o que entra no conteúdo?** Escopo decidido (painel novo do zero,
  substitui sino de notificação + FAB "Dex copiloto"; **não** reaproveita o
  `DexPresencePanel` que já existe órfão no código, sem motivo dado pra essa escolha).
  Pergunta sobre as seções de dentro ficou sem resposta
- Veredito de produção do R-98a — segue sem confirmação desde a sessão #35
- Aprovar a [R-36](specs/R-36-um-login-uma-clinica.md) reescrita (§7: 3 decisões)
- Definir o preço — trava o R-92 quando ele voltar
- G6 do R-94 — teste deliberado de 2 contas (dentista cria pedido → protético marca entregue)
- Gate de 2 contas represado (R-29/R-30/R-31a/R-32/R-34/R-39/R-03c) — parado há semanas
- Testar pessoalmente R-85/R-86/R-65/R-66 (herdados de sessões antigas, ainda 🟡)

## Próximo da fila

Resolver o push do R-102 antes de somar mais em cima. Depois, à escolha: R-98b (motivo da
desativação) ou retomar o conteúdo do painel do Dex. `ROADMAP.md` segue precisando de poda
dedicada (estourou o teto de ~200 linhas há várias sessões seguidas).
