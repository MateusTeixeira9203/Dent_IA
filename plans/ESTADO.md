# Estado — Odonto.IA

> **ESTADO** · atualizado 2026-08-10 20:29 · sessão #36
> **Item ativo:** R-99 · **Modo da última sessão:** execução (com discussão/planejamento no meio)

## Agora

**R-99 — Anotar a radiografia.** Codado e testado ao vivo por ele em várias rodadas nesta
sessão; boa parte confirmada funcionando (imagem carrega, apagar bloco funciona, mover/girar
o ícone funcionam). Não fecha ainda.

**Falta:**
- Corrigir a mini-toolbar de redimensionar (`+`/`−`/`✕`) — bug diagnosticado por hipótese
  (falta `e.stopPropagation()`, o clique vaza pro clique do palco por trás), **não corrigido**
  a pedido dele — ver handoff desta sessão pro raciocínio completo antes de mexer
- Antes de só aplicar o fix acima: confirmar se o modelo de interação (arrastar o corpo
  move, arrastar a alcinha gira) é o que ele imaginou, ou se ele quer os controles de
  posição TAMBÉM dentro da caixinha que aparece ao selecionar
- Decidir o ícone da coroa — ele sugeriu 2x trocar a hachura (convenção pro dentista) por
  algo que pareça um dente de verdade (leitura pro paciente). Tensiona com D8 (símbolos
  sempre portados do odontograma) — provavelmente precisa de artefato comparando as duas
  versões antes de codar
- Percorrer os G1-G26 da [spec](specs/R-99-anotar-radiografia.md) formalmente
- Sem push

## Travado

| O quê | Trava o quê | Hipótese / próximo passo |
|---|---|---|
| Preço novo não fechado (herdado do R-92) | Retomar o R-92 | `lib/planos.ts` é fonte única desde `86fc722` — trocar o número é barato quando ele decidir |
| R-36 reescrita sem aprovação dele | Começar a codar a R-36 | §7 do doc tem 3 decisões abertas; a mais pesada é se cadastro por conta própria continua criando clínica |

## Esperando você

- **Veredito de produção do R-98a** — segue sem confirmação desde a sessão #35. Só vira ✅
  depois disso; destrava o R-98b também
- **Se o teste do R-98a cobriu o editor do Apresentar em light mode** — não ficou confirmado
- **R-99 — confirmar o modelo de interação de mover/girar/redimensionar** antes da próxima
  sessão só consertar o bug da toolbar e dar como certo (ver "Agora")
- **R-99 — decidir o ícone da coroa** (hachura atual vs. desenho mais literal)
- **Aprovar a [R-36](specs/R-36-um-login-uma-clinica.md) reescrita** (§7: 3 decisões)
- **Definir o preço** — trava o R-92 quando ele voltar
- **G6 do R-94** — teste deliberado de 2 contas (dentista cria pedido → protético marca
  entregue). O que rolou até aqui foi acidente de sessão instável, não teste controlado
- Gate de 2 contas represado (R-29/R-30/R-31a/R-32/R-34/R-39/R-03c) — 11 dias parado
- Testar pessoalmente R-85/R-86/R-65/R-66 (herdados da sessão #33, ainda 🟡)

## Próximo da fila

Fechar o R-99 (bug da toolbar + coroa + gates). Depois: R-98b ou R-96 (ambos com spec
pronta), R-49b quando voltar o assunto de voz. `ROADMAP.md` segue precisando de poda
dedicada (estourou o teto de ~200 linhas há 4 sessões seguidas).
