# Estado — Odonto.IA

> **ESTADO** · atualizado 2026-08-04 11:32 · sessão #17
> **Item ativo:** R-46 (Meu dia) · **Modo:** nenhum (sessão encerrada)

## Agora

**R-58 e R-53 fechados nesta sessão** — codados, verificados ao vivo (cada um com prova real
no banco, achou e corrigiu 1 bug real em cada), commitados em 4 commits (refactor + 2 feat +
docs). G6/G7 do R-58 e G2/G3/G9 do R-53 ficaram parciais — documentado por quê em cada spec,
não é falha silenciosa.

### Gate de entrada do C6 + R-46d D1, medido ao vivo (era a próxima etapa do `MAPA-MEU-DIA.md`)

- **C6 confirmado urgente, não mais hipótese.** A 1440×900, a coluna centro do cockpit
  (odontograma + `RegistrarPainel`) sozinha mede 635px e estoura o viewport em 37px — antes de
  contar o dock (~112px de overlay). Quem ataca isso é o **R-46d D1** (tira ONDE/STATUS da
  faixa fixa), não o C6 (que só mexe nas laterais).
- **D5 (piso de 36px) remedido:** ainda falha nos mesmos controles — mas os chips ONDE/STATUS
  e o "+ texto da visita" morrem sozinhos com o R-46d D7/D12, não precisam de fix próprio.
- **6 contradições do `MAPA-MEU-DIA.md` §5 (C2/C3/C4/C5/C9/C10) já estavam resolvidas** nos
  specs reais — só o mapa nunca foi atualizado depois das emendas de 04/08. Corrigido.

**Nenhum código de C6/R-46d D1 foi escrito.** Só a investigação/medição que os specs pediam
como gate de entrada.

## Travado

Nada tecnicamente. C6 e R-46d D1 têm o gate de entrada limpo agora — falta só a decisão de
ordem abaixo pra começar a codar.

## Esperando você

- [ ] **Ordem de entrada em C6/R-46d D1:** C6 sozinho primeiro (isola risco, verifica o layout
      antes de tocar no centro), ou os dois juntos numa tacada (como o ROADMAP já apontava)?
      Pergunta feita no fim da sessão #17, sem resposta ainda.
- [ ] **Push** — 24 commits acumulados desde 01/08, produção continua em 31/07.
- [ ] **R-51** — testar em cenário multi-sessão real quando houver paciente de teste com
      tratamento em grupo.
- [ ] **G3 do R-53** — responsável exibido = destino do encaminhamento; só prova completa
      quando existir paciente real com 2+ responsáveis incluindo 1 encaminhado.
- [ ] **G9 (2 contas)** do R-58 e do R-53 — precisa de você logado em 2 sessões.
- [ ] **R-46h e "marcar retorno"** — sem spec ainda.
- [ ] Itens antigos: R-56 · R-28 Parte 3 · gate de 2 contas · R-40 · R-44.

## Próximo da fila

C6 (+ R-46d D1, ordem a definir) — gate de entrada limpo, specs aprovadas, precisa do browser
pra qualquer verificação visual. Fila completa no [ROADMAP](ROADMAP.md).
