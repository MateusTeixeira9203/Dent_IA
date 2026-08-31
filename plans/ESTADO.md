# Estado — Odonto.IA

> **ESTADO** · atualizado em 30/08/2026

## Agora

🔵 **R-140b — fechamento rápido do Meu Dia em execução local.** O pacote Dex
R-139c → R-133 → R-143 → R-141 → R-142 permanece pronto para retomar depois deste gate visual.

- Produção (`953f9bc`) está `Ready`; login/Dashboard, R-139a/b/d/e e orçamentos foram aprovados.
  CI remoto passou typecheck/testes/build; lint mantém dívida não bloqueante. Fotos e radiografias
  têm viewer; PDF/Word aguardam decisão.
- Em 30/08, o usuário confirmou que o Dex transforma tudo em realizado e descarta intervenções
  fora do vocabulário. R-139c/R-133 são P0; `outro`/`exame_periodontal` existem no domínio/banco,
  mas faltavam no schema/parser.
- Execução 30/08: `npm test` agora descobre a suíte inteira (144 testes); R-139c bloqueia
  `realizado` sem execução explícita e neutraliza o prompt; R-133 reconcilia procedimento sem
  cobertura como `outro` revisável; R-143 bloqueia salvar pendências e confirma ações em massa;
  R-141 preserva áudio falho em memória e bloqueia save durante captura. Testes focados e
  `tsc --noEmit` com heap ampliado passaram. Ainda faltam aviso de silêncio/limite (R-141),
  contratos/hardening (R-142) e teste autenticado ponta a ponta.
- R-140a só existe no Supabase local descartável: matriz RLS 92/92, dual-write + testes e backfill
  idempotente passaram em rollback. No UI, A criou Atendimento/ficha/evolução/evento e B viu apenas
  sua própria clínica. Nada foi aplicado em produção.
- R-140b: implementação funcional concluída no localhost. Procedimento, localização e detalhe
  especializado são independentes; posição ausente continua selecionável e catálogo não é
  obrigatório. A correção visual de 30/08 mantém o odontograma anatômico atual, leva cabeçalho,
  entrada, bancada e rodapé à largura da régua do dia e fixa revisão/contexto em `760 px`. Boca
  não tem rolagem interna; formulários e gavetas longas podem rolar. Em 30/08, o usuário achou
  o acesso rápido cortado após selecionar dente e a manutenção sem retorno/revisão; o painel foi
  ampliado, regiões viraram duas linhas e manutenção passa a aparecer em Feito hoje com edição.
  Regra visual consolidada: no fluxo clínico comum, há uma única rolagem vertical da página —
  nunca barras internas concorrentes que escondam procedimento ou ação de salvar.
  Em 30/08, o usuário aprovou o restante do fluxo visual; o botão de fechar do modal de orçamento
  foi centralizado no próprio botão. Em 31/08, a prova passou: novo encaixe do paciente
  sintético criou uma única ficha/evento `Restauração O · D15`, a âncora ficou `finalizado` com
  um só vínculo realizado e o prontuário exibiu D15 sem erros de console. O segundo clique ficou
  bloqueado porque a consulta sai da bancada após salvar. O bloqueio agora é determinado pela
  âncora `atendimentos_clinicos.agendamento_id`: um segundo encaixe do mesmo paciente segue
  editável e não herda o selo. `tsc --noEmit`, `git diff --check` e 154/154 testes passaram;
  migration local e matriz RLS 92/92 já haviam passado. Falta só a conferência visual manual
  dos dois slots porque a automação do navegador foi recusada nesta sessão.

## Travado

R-139c/R-133: a [auditoria de 30/08](auditorias/2026-08-30-dex.md) provou que mescla, payload e
leitura preservam o status; a hipótese é `evidencia_status` incorreta, favorecida pelo prompt.
Falta reprodução autenticada, captura bruto/pós-parser e eval antes/depois. R-143 é o gate humano.

Achado intermitente na validação de produção: a rolagem do sistema inteiro ficou bloqueada e
voltou após F5. Hipótese principal: algum modal/visualizador deixou `body.style.overflow =
'hidden'` residual; tentar reproduzir observando qual interação ocorre imediatamente antes.

R-140a: `db reset` direto segue quebrado pela ordem histórica das migrations; o harness usa dump
de schema sem dados. O gate local de duas clínicas passou via `localhost`, mas produção continua vetada.

Achado R-140b resolvido no código: uma ficha do paciente no dia não mais bloqueia nem marca outro
encaixe. O selo e a leitura usam exclusivamente a âncora finalizada do respectivo `agendamento_id`.
Visita finalizada permanece somente leitura; depois de salvar, avança para o próximo paciente e
`Ver ficha` continua opcional. Nova visita no mesmo dia exige novo encaixe/agendamento.

Verificação local: `tsc --noEmit` e `npm test` passam. `next build --webpack` falha no ambiente ao
parsear `tsc --showConfig`; CI remoto anterior passou. Resolver antes do próximo gate de build.

## Esperando você

1. Conferir manualmente no localhost: o cartão concluído deve mostrar `✓ registrado` e abrir só
   a mensagem de leitura; o encaixe aguardando do mesmo paciente deve continuar editável, sem selo.
2. Materiais/etiquetas é hoje uma prévia visual: OCR, persistência e estoque continuam pertencendo
   a R-140d/R-140e. Decisão de produto: no celular, abre a câmera traseira após toque explícito;
   desktop oferece arquivo/webcam.
3. Após concluir R-141/R-142, testar o pacote Dex em clínica de teste autenticada com os casos
   realizado, indicado, negação e procedimento sem tipo canônico.

## Próximo da fila

Ordem de publicação permanece: preflight R-132 → R-139c → R-133 → R-143 → R-141 → R-142 → auditoria
completa. R-140a pode ser validado apenas no ambiente local, mas não entra em produção antes desse
gate clínico.
