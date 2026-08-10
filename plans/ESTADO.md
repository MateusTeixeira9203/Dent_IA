# Estado — Odonto.IA

> **ESTADO** · atualizado 2026-08-10 13:02 · sessão #35
> **Item ativo:** nenhum · **Modo da última sessão:** execução (com discussão/planejamento no meio)

## Agora

*(Sem item ativo. R-98a acabou de subir e está com ele pra teste em produção — ver "Esperando
você". Depois do veredito, o candidato natural é R-98b ou R-99, os dois com spec pronta.)*

## Travado

| O quê | Trava o quê | Hipótese / próximo passo |
|---|---|---|
| Preço novo não fechado (herdado do R-92) | Retomar o R-92 | `lib/planos.ts` é fonte única desde `86fc722` — trocar o número é barato quando ele decidir |
| R-36 reescrita sem aprovação dele | Começar a codar a R-36 | §7 do doc tem 3 decisões abertas; a mais pesada é se cadastro por conta própria continua criando clínica |

## Esperando você

- **Veredito de produção do R-98a** — testou local e aprovou 100%, mas disse que ia testar em
  produção e retornar hoje à noite. Só vira ✅ depois disso
- **Se o teste dele cobriu o editor do Apresentar em light mode** — não ficou confirmado; o
  artefato só tinha dark desenhado
- **Aprovar a [R-36](specs/R-36-um-login-uma-clinica.md) reescrita** (§7: 3 decisões)
- **Definir o preço** — trava o R-92 quando ele voltar
- **G6 do R-94** — teste deliberado de 2 contas (dentista cria pedido → protético marca
  entregue). O que rolou até aqui foi acidente de sessão instável, não teste controlado
- Gate de 2 contas represado (R-29/R-30/R-31a/R-32/R-34/R-39/R-03c) — 11 dias parado
- Testar pessoalmente R-85/R-86/R-65/R-66 (herdados da sessão #33, ainda 🟡)

## Próximo da fila

Depois do veredito de produção do R-98a: **R-98b** (modelo reutilizável) ou **R-99** (anotar
radiografia), os dois com spec escrita. Ver `plans/ROADMAP.md` — que está em 231 linhas contra
teto de ~200 há 3 sessões seguidas, precisando de poda dedicada, não de mais uma anotação.
