# Auditoria funcional e mapa de atrito — Clínica teste

> **Data:** 02/09/2026 · **Ambiente:** aplicação local em `http://localhost:3200` com a Clínica teste
> no projeto Supabase configurado no `.env.local` · **Escopo:** fluxo do dentista, Meu Dia,
> prontuário, ficha, agenda, orçamento e financeiro.

## Veredito

O núcleo clínico foi exercitado com lançamentos autorizados na Clínica teste: procedimentos por
dente e boca toda foram salvos, a visita foi registrada, um procedimento foi concluído depois na
Ficha e um retorno foi criado e apareceu na Agenda. Ainda **não está aprovado ponta a ponta**.

Foi encontrado um bloqueio crítico: ao iniciar pela Agenda uma consulta futura do paciente teste,
o Meu Dia abriu o atendimento de outro paciente. O fluxo foi interrompido imediatamente para não
produzir mais dados clínicos no contexto errado. Não há base para afirmar que o sistema está 100%.

## Lançamentos feitos na Clínica teste

| Ação | Resultado |
|---|---|
| Meu Dia: coroa total no dente 16 | Salvo como realizado |
| Meu Dia: profilaxia preventiva em boca toda | Salvo como procedimento sem localização |
| Meu Dia: canal no dente 13 | Salvo como próxima sessão e depois concluído na Ficha |
| Salvar atendimento | Toast “Visita registrada”; nova visita apareceu no prontuário |
| Ficha: concluir Canal · dente 13 | Persistiu após recarregar |
| Marcar retorno em 07/10/2026 às 12:45 | Persistiu na Agenda com observação de teste |

Esses registros são dados de teste e devem ser removidos/isolados antes de qualquer uso real.

## Matriz dos fluxos

| Fluxo | Estado | Evidência |
|---|---|---|
| Dashboard → Meu Dia | PASSOU | Consulta e paciente teste carregaram |
| Meu Dia manual por dente | PASSOU | Dente 16, procedimento e status persistiram |
| Meu Dia boca toda | PASSOU | Profilaxia preventiva apareceu no prontuário |
| Próxima sessão → Ficha | PASSOU | Dente 13 foi concluído e permaneceu após reload |
| Prontuário → Ficha unificada | PASSOU | Evolução, odontograma, procedimentos e ações abriram |
| Retorno pelo registro | PARCIAL | Toast e Agenda corretos; sidebar da Ficha diz “Nenhum retorno” |
| Agenda → Ver Ficha | PASSOU | Abriu o paciente correto |
| Agenda → Iniciar consulta futura | **FALHOU — P0** | Abriu “mateus fonseca” em vez de Paciente teste 1 |
| Criar paciente | PASSOU | Validação de nome obrigatório; nenhum vazio criado |
| Orçamento | PASSOU NO BÁSICO | Orçamento com 3 itens e total de R$ 1.950,00 foi criado como rascunho e aprovado |
| Financeiro/pagamento | **FALHOU — P1** | Registro de recebimento e reorganização ficaram presos em “Salvando…” |
| Assinatura, documentos e Storage | NÃO TESTADO | Falta prova do documento final |
| Materiais/etiquetas/câmera | NÃO TESTADO | Fluxo real ainda não percorrido |
| DEX/áudio | NÃO TESTADO nesta rodada | Depende de captura e credenciais |
| RLS com duas contas | NÃO TESTADO nesta rodada | Requer sessão separada por perfil |
| Mobile, light mode, teclado e acessibilidade | NÃO CONCLUÍDO | Sem gate visual completo |

## Achados

### P0 — contexto clínico incorreto ao iniciar consulta futura

**Reprodução:** Agenda → mês → 07/10 → Paciente teste 1 → “Iniciar consulta”. A URL carregou o
`agendamentoId` correto, mas a tela mostrou o atendimento de **mateus fonseca**, com consulta já
registrada. O Meu Dia só procura o parâmetro `?ag=` entre os horários de hoje; quando o horário é
futuro, ignora o parâmetro e cai no atendimento padrão. Isso pode levar o dentista a registrar
procedimentos no paciente errado.

**Ação obrigatória:** impedir fallback silencioso. O servidor deve resolver o agendamento informado
(qualquer data permitida pela regra de agenda), validar paciente/clínica e, se não puder resolver,
mostrar erro explícito sem abrir outro atendimento. Repetir o mesmo fluxo antes de qualquer release.

### P1 — retorno não aparece na Ficha após ser salvo

O retorno criado gerou compromisso correto na Agenda, mas a seção de retorno da Ficha continuou
“Nenhum retorno vinculado a esta visita”. A persistência e a leitura não estão usando o mesmo vínculo,
ou a Ficha não revalida os dados após o agendamento.

### P2 — dois pontos de entrada para retorno

O botão de retorno no cabeçalho funcionou; o botão equivalente na lateral da Ficha aparentou não
abrir o fluxo. Manter uma ação canônica e fazer todos os atalhos chamarem o mesmo handler.

### P2 — Financeiro tem entrada genérica concorrente

“Registrar entrada” no Financeiro é diferente do recebimento ligado ao orçamento. Para o dentista,
isso pode parecer o mesmo pagamento. A tela deve explicar a origem (orçamento ou receita avulsa) e
preservar um único caminho para parcelas, recebimento, edição e estorno.

### P1 — ações RPC financeiras quebram ao salvar

Ao registrar R$ 500,00 de recebimento, o botão ficou em “Salvando…” e o console registrou
`TypeError: Cannot read properties of undefined (reading 'rest')` em `registrarPagamento`. A mesma
falha ocorreu ao abrir/salvar a organização de parcelas, em `reorganizarParcelas`. O código extrai
`supabase.rpc` para uma variável e a chama sem preservar o contexto do cliente; a implementação
deve chamar o método no objeto ou fazer bind explícito. Corrigir também as ações de confirmar,
editar e estornar, que usam o mesmo padrão, e repetir cada fluxo.

### P2 — primeiro vencimento não habilita o fluxo

O campo de data exibiu `2026-09-30`, mas a UI continuou mostrando “Informe o primeiro vencimento”
e manteve “Organizar cobrança” desabilitado. Pode ser estado React não atualizado no input `date`;
revalidar com digitação manual depois do ajuste do RPC.

### P3 — copy de Configurações

Foram vistos “Clinia Odonto.ia - teste” e “6 vagas disponívelis de 8 dentistas”. Corrigir antes do
gate visual final.

## Gates técnicos observados

- Testes automatizados: 171/171 passaram.
- TypeScript estrito: passou.
- `git diff --check`: passou.
- Lint do recorte R-145: passou; lint geral ainda não foi considerado gate verde.
- Build completo e RLS com duas contas: pendentes.
- Nenhum push, deploy ou migration foi feito nesta rodada.

## Próxima ordem segura

1. Corrigir o P0 de resolução de `?ag=` e adicionar teste que garanta paciente/clínica corretos.
2. Corrigir a leitura/vínculo do retorno na Ficha e unificar o botão lateral/cabeçalho.
3. Repetir Meu Dia → Ficha → Agenda sem criar contexto cruzado.
4. Após corrigir o P1 financeiro, repetir orçamento completo, parcelas, recebimento, alteração e
   estorno na Clínica teste.
5. Fechar assinatura/Storage, materiais/etiquetas, DEX, perfis/RLS e mobile.
6. Rodar lint/build e promover qualquer item amarelo para ✅ somente após prova manual completa.

**Recomendação:** manter a versão local em validação. O fluxo clínico básico é promissor, mas o P0
impede publicação ou conclusão da auditoria.
