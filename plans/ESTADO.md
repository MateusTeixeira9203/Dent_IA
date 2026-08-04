# Estado — Odonto.IA

> **ESTADO** · atualizado 2026-08-04 13:47 · sessão #18
> **Item ativo:** R-46 (Meu dia) · **Modo:** nenhum (sessão encerrada)

## Agora

**C6 + R-46d D1 fechados nesta sessão** — 🟡 codados e testados ao vivo no browser, nada em
produção. O desenho mudou de verdade em cima do que ele viu funcionando (não foi só
polimento): acordeões perderam a exclusão mútua (ele quer liberdade de deixar tudo aberto);
vão vazio do campo mágico corrigido; e o painel do dente foi **reconstruído duas vezes na
mesma sessão** — 1ª versão (resumo pequeno na direita + `Sheet` separado) foi codada, testada
ao vivo, e revogada por ele — virou **1 painel completo flutuando ao lado do odontograma**
(como era antes do C6), com `colapsarDireita` de volta pra não regredir o WCAG que o C6
original tinha corrigido (medido: dente 43×76px, igual aberto ou fechado).

A barra "Registrar sem IA" também mudou: `OndeSeletor`/`FdiPopover` deletados de vez (clicar
o dente ou digitar no campo mágico já resolve "onde"), entrou chip de "Manutenção
ortodôntica" — fecha a metade (b) do R-50, que estava na fila desde 02/08.

4 commits organizados e feitos (27 acumulados desde 01/08). Detalhe completo do raciocínio no
[handoff desta sessão](handoffs/handoff-2026-08-04-1347.md).

**Feito:** C6 (jaFeito sai, colunas redistribuídas, painel único flutuando, `tabelaContainer`
ligado) · R-46d D1 (campo mágico, fallback sem IA, `OndeSeletor` fora) · R-50 (b).

**Falta:** D9/D11 do R-46d (detecção em tempo real com motion — não entraram nesta rodada) ·
responsivo do painel novo (nunca testado em tela estreita) · testes que escrevem no banco
(Salvar de verdade, upload de arquivo, "Organizar com Dex" ponta a ponta — nenhum pedido de
aprovação feito ainda) · R-50 (a) (schema de IA, fora de escopo de propósito).

## Travado

Nada tecnicamente.

## Esperando você

- [ ] **Push** — 27 commits acumulados, decidiu deixar acumulando e revisar tudo de uma vez
      depois.
- [ ] **Conferir visualmente o "respiro" entre odontograma e painel do dente** (`gap-4`,
      16px) — não tem como eu confirmar se é o tamanho que você imaginou sem você ver.
- [ ] **Teste de escrita real** (Salvar, upload de documento, Organizar com Dex) — não pedi
      aprovação ainda; avisa quando quiser fechar esses gates de vez.
- [ ] **D9/D11** (detecção em tempo real + motion no odontograma) — decidir se entra como
      próxima fatia ou fica pra depois de R-46h/retorno.
- [ ] **R-51** — testar em cenário multi-sessão real quando houver paciente de teste com
      tratamento em grupo.
- [ ] **G3 do R-53** — responsável exibido = destino do encaminhamento; só prova completa
      quando existir paciente real com 2+ responsáveis incluindo 1 encaminhado.
- [ ] **G9 (2 contas)** do R-58 e do R-53 — precisa de você logado em 2 sessões.
- [ ] **R-46h e "marcar retorno"** — sem spec ainda; espaço abriu com o D12.
- [ ] Itens antigos: R-56 · R-28 Parte 3 · gate de 2 contas · R-40 · R-44.

## Próximo da fila

D9/D11 (motion no odontograma) ou R-46h/"marcar retorno" (specs) — os dois maiores buracos
vs. a régua do `MAPA-MEU-DIA.md`, agora que o cockpit fechou. Fila completa no
[ROADMAP](ROADMAP.md).
