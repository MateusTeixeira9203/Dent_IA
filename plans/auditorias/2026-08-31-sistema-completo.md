# Auditoria funcional e de segurança — sistema completo

> **Data:** 31/08/2026 · **Ambiente funcional:** Supabase local descartável + aplicação local
> **Produção:** somente consultas agregadas, schema, privilégios e headers; nenhuma escrita

## Veredito

O sistema **não está 100% aprovado ponta a ponta**. O caminho central
`login → paciente → agenda → Meu Dia → orçamento → prontuário` funciona no cenário básico e o
isolamento entre clínicas passou. Porém, a nova Ficha ainda tem ações quebradas ou incompletas, e
Financeiro, integrações, arquivos e assinatura final não receberam uma rodada funcional completa.

O banco local foi útil para provar comportamento e RLS, mas contém drift de privilégios em relação
à produção. Esse drift não foi encontrado no Supabase remoto e não deve ser tratado como falha de
produção. O inverso também vale: passar localmente não autoriza afirmar que a produção inteira foi
testada.

## Matriz dos fluxos

| Fluxo | Estado | Evidência |
|---|---|---|
| Login com conta de teste | PASSOU | sessão autenticada e rotas protegidas abertas |
| Criar paciente | PASSOU | validação de nome e persistência de todos os campos preenchidos |
| Buscar paciente na Agenda | PASSOU | resultado apareceu após debounce |
| Criar consulta | PASSOU | data, hora, duração, observação e paciente persistidos |
| Agenda → Meu Dia | PASSOU | consulta nova apareceu no atendimento do dia |
| Meu Dia manual | PASSOU | rascunho, procedimentos e evolução salvam pela mesma visita |
| Meu Dia com Dex | PASSOU NO BÁSICO | execução, indicação e próxima sessão foram separadas corretamente |
| Dente e face | PASSOU | restauração no 16/O persistida como realizada |
| Boca toda | PASSOU | profilaxia persistida como realizada |
| Sem localização | PARCIAL | banco correto; UI mostrou “Próxima sessão” para item da sessão atual |
| Arcada, quadrante e ortodontia | NÃO CONCLUÍDO | cobertura unitária/estática, sem prova completa no navegador |
| Somente retorno | PARCIAL | retorno agenda normalmente; consulta vazia não pode ser finalizada |
| Gerar orçamento | PASSOU NO BÁSICO | três itens, valores e total persistidos |
| Renegociar/aprovar parcialmente | NÃO TESTADO | caso financeiro real continua pendente |
| Salvar atendimento | PASSOU | finalizou agenda, persistiu visita e não forçou abrir a Ficha |
| Prontuário longitudinal | PASSOU NO BÁSICO | visita, evolução, procedimentos e próxima sessão foram lidos |
| Abrir registro | PASSOU | detalhe abriu com evolução, procedimentos e ações |
| Editar o registro aberto | FALHOU | “Editar ficha” abriu compositor vazio em vez do registro atual |
| Marcar retorno no registro | FALHOU | botão não abriu o fluxo esperado |
| Encaminhar procedimento | PASSOU | destinatário da mesma clínica concluiu; autoria/data ficaram registradas |
| Isolar encaminhamento | PASSOU | outro dentista sem encaminhamento e outra clínica foram bloqueados |
| Assinar procedimento | PARCIAL | seleção e bloqueio de assinatura vazia funcionam; documento final não foi provado |
| Materiais/etiquetas | NÃO IMPLEMENTADO | seção é prévia; sem câmera, OCR, lote ou persistência |
| Upload e documentos | NÃO CONCLUÍDO | autorização inspecionada; fluxo visual/arquivo final não foi percorrido |
| PDF/exportação | PARCIAL | rotas negam anônimo; conteúdo final não recebeu inspeção visual |
| Financeiro completo | NÃO TESTADO | recebimento, parcelas, estorno e conciliação ficaram fora da rodada |
| WhatsApp/calendário externo | NÃO TESTADO | depende de credenciais e serviços externos |
| Mobile, light/dark e acessibilidade | NÃO CONCLUÍDO | automação do navegador foi interrompida antes desse gate |

## O que o banco local comprovou

- Dentista A, administrador e secretária da clínica A enxergam apenas o paciente da clínica A.
- Dentista B não leu nem alterou dados da clínica A; usuário anônimo não leu pacientes.
- Secretária foi bloqueada ao criar Atendimento clínico.
- Dentista C só conseguiu concluir o procedimento depois de recebê-lo por encaminhamento.
- O autor clínico original foi preservado e a alteração do encaminhado gerou autoria própria.
- O retorno criado no Meu Dia ficou ligado à visita de origem.
- O Atendimento, as Fichas, evoluções e eventos da consulta básica foram persistidos sem duplicação.

## Falhas funcionais prioritárias

### P0 — antes de considerar a nova Ficha pronta

1. **Editar registro não edita o registro.** A ação abre “Nova ficha clínica” vazia e pode induzir o
   dentista a criar outro registro em vez de corrigir o existente.
2. **Retorno no registro não funciona.** O caminho existe visualmente, mas não chega à Agenda.
3. **Assinatura não foi validada até o documento.** Seleção e canvas não bastam; falta provar
   geração, congelamento, armazenamento e abertura em Documentos do paciente.
4. **Status visual diverge do banco.** Um procedimento “sem localização” da sessão atual apareceu
   como “Próxima sessão”. Isso altera a leitura clínica mesmo sem corromper a persistência.

### P1 — continuidade do produto

1. **Materiais/etiquetas ainda são uma promessa visual.** Não há captura por câmera, OCR,
   rastreabilidade nem integração com estoque; isso pertence ao R-140d.
2. **Consulta só de revisão exige conteúdo clínico mínimo para finalizar.** O retorno é salvo de
   forma independente, mas “Salvar atendimento” permanece desabilitado sem evolução, procedimento
   ou ortodontia. A saída de menor atrito é uma ação explícita “Revisão sem procedimento”, que grava
   evolução determinística e editável; não é seguro salvar uma visita totalmente vazia.
3. **Sugestões do Dex ficaram ruidosas.** Dentes 16 e 36 apareceram juntos em sugestões que não
   correspondiam aos dois, aumentando risco de clique errado.
4. **Agenda mostrou um estado transitório confuso após salvar.** O modal resetou por um instante e
   exibiu aviso de conflito antes de desaparecer; os dados foram gravados corretamente.

## Segurança e robustez

### Produção — confirmação somente leitura

- As funções sensíveis analisadas não concedem execução a `anon`; a exceção é
  `can_act_as_dentista(uuid)`, que sem sessão retorna falso, mas deve perder o grant anônimo por
  redução de superfície.
- O Security Advisor apontou `search_path` mutável em `normalizar_nome` e
  `trg_pacientes_nome_busca`, além da proteção de senhas vazadas desativada.
- A página de login tem HSTS, mas não apresentou CSP/frame-ancestors, Referrer-Policy,
  Permissions-Policy nem X-Content-Type-Options. Falta hardening contra clickjacking e redução de
  dados enviados pelo navegador.
- O Performance Advisor apontou policies permissivas duplicadas, chamadas de auth sem initplan e
  FKs sem índice. Isso pede medição e correção dirigida; não autoriza reescrever RLS em lote.

### Código

- `/api/importar-procedimentos` autentica e bloqueia secretária, mas carrega o arquivo inteiro em
  memória antes de impor limite e não tem rate limit. Um usuário autenticado pode pressionar
  memória e custo de IA.
- `/api/processar-documento` tem rate limit e valida clínica, porém baixa o objeto inteiro sem
  limite de tamanho no endpoint.
- Os payloads clínicos ainda contêm `z.array(z.unknown())` em Meu Dia e `salvar-ficha`; precisam de
  schema Zod estrutural antes do gate do Dex.
- O timeout Gemini por `Promise.race` não cancela o transporte real.
- Não foram encontrados segredos versionados nem vulnerabilidades conhecidas nas dependências de
  produção (`npm audit --omit=dev`: zero).

### Drift do banco local

O schema local antigo concedeu `EXECUTE` anônimo a funções `SECURITY DEFINER`, inclusive uma função
de provisionamento. A mesma falha **não existe no remoto consultado**. O problema real é a cadeia de
migrations local não reproduzir produção com fidelidade: `supabase db reset` falha por ordem
histórica e o ambiente pode criar falsos positivos ou esconder regressões.

## Gates técnicos

| Gate | Resultado |
|---|---|
| Testes automatizados | 154/154 passaram |
| TypeScript estrito | passou |
| `git diff --check` | passou |
| Dependências de produção | zero vulnerabilidades conhecidas |
| ESLint | falhou: 14 erros e 66 avisos, parte preexistente |
| Build Next | não verificado: falha do runner ao interpretar `tsc --showConfig` |
| RLS com usuários reais de teste | passou no banco local com duas clínicas |

## O que falta para afirmar “o sistema funciona”

1. Corrigir e repetir os quatro P0 da nova Ficha.
2. Rodar no navegador arcada, quadrantes, manutenção ortodôntica, assinatura até Documentos e
   anexos até a leitura final.
3. Executar o ciclo financeiro completo: orçamento parcial, parcelas, recebimento, alteração e
   estorno/cancelamento permitido.
4. Testar perfis administrador, dentista e secretária pela interface, não apenas por SQL/API.
5. Percorrer mobile, light/dark, teclado, câmera e permissões reais.
6. Testar produção somente com a clínica de teste; nunca criar, assinar, cobrar ou alterar dados de
   pacientes reais durante a auditoria.
7. Reparar a cadeia local de migrations para que um banco vazio reproduza o schema remoto.

## Recomendação de liberação

Não publicar a R-140c como “concluída” ainda. O núcleo existente pode continuar sendo usado, mas a
nova Ficha deve permanecer em validação até os P0 passarem e a prova no navegador ser repetida. A
auditoria funcional de produção será uma etapa separada, restrita à clínica de teste e sem tocar em
dados clínicos reais.
