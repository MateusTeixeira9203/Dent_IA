# Estado — Odonto.IA

> **ESTADO** · atualizado em 04/09/2026 · retrato da branch, não histórico de sessão.

## Agora

🔵 **R-154 — Plano de tratamento fluido no Meu Dia.** Implementar a projeção automática de todas
as indicações, agrupada por responsabilidade; a mesma pendência é acionável no plano e no histórico
da ficha de origem. Alterações de momento e conclusão recebida são otimistas por evento.

**Implementado localmente:** helper puro e testes, remoção da redução por âncora no servidor,
gaveta e histórico com a mesma projeção, abertura da ficha de origem pelo prontuário, ações
otimistas por evento e scroll responsivo da revisão. `npm test` (207), typecheck e build passaram.

**Falta agora:** validação manual autenticada com autor, destinatário e terceiro observador —
inclusive rollback, duas ações simultâneas, voltar do prontuário, teclado/leitor de tela e
claro/escuro/movimento reduzido. O localhost redireciona para login, então esse gate exige conta
de teste ou sessão autenticada. Sem migration, RLS, status novo ou transferência de autoria.

**Integração com `main` (04/09):** a baseline `release/2026-09-03-r140c` foi integrada sem
conflito no commit `a3a5c19`; a suíte passou com 200 testes. O lint global ainda registra 14 erros
fora do recorte. Não houve deploy manual nesta integração; confirmar o resultado do pipeline antes
da validação clínica.

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
- **R-151:** a otimização de baixa latência do Dex foi integrada com a baseline; exige validação
  dirigida separada antes de ser tratada como concluída.
- **R-153:** 🟡 integrada em `main`; aguarda confirmação de deploy e validação dirigida do fluxo
  de orçamento por Ficha. Não bloqueia a implementação local do R-154.

## Próxima decisão

Você vai separar os novos pontos de trabalho. Cada um entra na fila com evidência, escopo e
dependência; nenhum item já publicado volta a `ativo` apenas por ainda faltar uma rodada de
validação.

**Fora da classificação atual:** alterações clínicas sem spec ativa ficam intocadas até você
apontar a qual item pertencem. O pacote jurídico e seus scripts auxiliares já foram versionados
em commits documentais próprios e não devem ser misturados com R-153.
