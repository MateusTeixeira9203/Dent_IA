# Estado — Odonto.IA

> **ESTADO** · atualizado em 03/09/2026 · retrato da branch, não histórico de sessão.

## Agora

🔵 **R-153 — Orçamento da Ficha em fluxo contínuo.** A implementação local isola o orçamento
clínico por Ficha e impede que o dentista precise fechar/abandonar o paciente para montar uma
proposta. Está commitada localmente, mas ainda não foi enviada ou publicada. O recorte está em
`use-orcamento-modal`, `novo-orcamento-modal` e `meu-dia-client`.

**Trava:** antes de qualquer push, validar o fluxo com eventos de uma única Ficha e confirmar que
nenhum item solto financeiro é criado. Mudança de banco/RLS não entra neste recorte sem novo gate.

**Integração com `main` (03/09):** a baseline `release/2026-09-03-r140c` mesclou sem conflito em
worktree isolado e 196 testes passaram. A promoção está bloqueada: lint tem 14 erros já espalhados
fora do recorte, typecheck excedeu a memória do ambiente e build não concluiu por DNS de fontes.
Nenhuma alteração chegou à `main`.

## Em produção, ainda em validação dirigida

- **R-152 / R-152a — Ficha unificada:** a publicação já levou edição e exclusão por procedimento,
  encaminhamento, navegação do dente até o procedimento e o cabeçalho organizado. O legado é
  somente leitura para histórico incompatível. Falta consolidar os testes de paridade clínica;
  não é item ativo nem autorização para remover `FichasTab`.
- **R-149 — Revisão legível no Meu Dia:** está publicada; aguarda confirmação visual completa.
- **R-145 — Orçamento financeiro flexível:** concluído e verificado pelo usuário; spec e artefato
  já foram para `_arquivo/`.

## Bloqueios e fila técnica

- **R-146 (P0/P1):** `Agenda → Iniciar consulta` não pode resolver outro paciente; retorno criado
  na Agenda precisa reaparecer na Ficha. Não repetir escrita naquele caminho até corrigir.
- **R-147 (P0):** a transcrição Dex precisa ser provada no Preview após corrigir o vínculo do
  dentista; o 401 anterior acontecia antes do provider.
- **R-137:** confirmar no celular o protético de `Novo agendamento` e o retorno clicável na Ficha.
- **R-151:** há alteração local já commitada de baixa latência do Dex, pausada para não misturar
  sua publicação com R-153.
- **R-154:** debate registrado para fila clínica completa, autoria explícita e mudanças de status
  sem recarregar; não altera autoria de colega sem decisão clínica explícita.

## Próxima decisão

Você vai separar os novos pontos de trabalho. Cada um entra na fila com evidência, escopo e
dependência; nenhum item já publicado volta a `ativo` apenas por ainda faltar uma rodada de
validação.

**Fora da classificação atual:** alterações clínicas sem spec ativa ficam intocadas até você
apontar a qual item pertencem. O pacote jurídico e seus scripts auxiliares já foram versionados
em commits documentais próprios e não devem ser misturados com R-153.
