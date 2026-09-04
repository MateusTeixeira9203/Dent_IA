# R-153 — Orçamento da Ficha em fluxo contínuo

> **SPEC** · **R-153** · 🔵 ativo
> **Aberto:** 2026-09-03 · **Fechado:** — · **Fase:** execução local; ainda não publicado
> **Predecessor:** R-145, concluído e arquivado · **Migration:** validação de dono do catálogo na RPC

## 1. Problema

O fluxo atual salva o orçamento da Ficha, fecha a montagem e obriga o dentista a abrir a aba
Orçamentos e localizar o card recém-criado para aprovar itens e terminar a configuração. A
continuidade se perde exatamente quando o paciente está negociando na frente do profissional.

Há três riscos adicionais: o gerador geral pode agregar várias Fichas e salvar `ficha_id = null`;
o fallback de texto legado cria item sem `evento_id`, impedindo prova de não duplicidade; e o
cadastro rápido vincula somente a linha clicada, deixando itens iguais sem preço canônico.

A rota geral `/dashboard/orcamentos` não é usada no fluxo desejado. Seu cliente antigo e as
actions compartilhadas estão misturados na mesma pasta, portanto apagar a pasta diretamente
quebraria perfil, Financeiro, aceite e WhatsApp.

## 2. Decisão

- **Uma Ficha por orçamento clínico:** criação no perfil ou no Meu Dia sempre preserva
  `paciente_id` e `ficha_id`; o fluxo agregado entre Fichas deixa de existir.
- **Todos os procedimentos clínicos daquela Ficha:** entram eventos próprios com
  `origem='clinica'`, indicados ou realizados. Evento pré-existente é histórico e não é cobrado.
- **Duplicidade por identidade:** evento presente em `orcamento_eventos` não é oferecido e a
  restrição `unique(evento_id)` continua fechando concorrência no banco.
- **Sem fallback financeiro por texto:** Ficha sem evento estruturado exibe impedimento claro;
  texto antigo não cria item cobravel sem identidade. O histórico antigo permanece legível.
- **Catálogo seguro:** vínculo automático usa `procedimento_id` ou nome canônico normalizado
  exatamente igual. Correspondência parcial/fuzzy nunca escolhe procedimento ou preço.
- **Falha de catálogo é explícita:** erro ao carregar procedimentos não vira lista vazia; a
  montagem informa que os preços não puderam ser carregados e bloqueia a criação até recarregar.
- **Cadastro sincronizado na montagem:** a ação explícita de cadastrar/atualizar o procedimento
  reutiliza a entrada canônica e aplica ID/preço a todas as linhas iguais ainda não salvas no
  modal. Orçamento persistido nunca recebe atualização retroativa de preço.
- **Fluxo contínuo:** após criar com sucesso, o modal não fecha; usa o ID persistido e avança de
  `montagem` para `configuracao`, mantendo o contexto da Ficha.
- **Aceite não é presumido:** o dentista marca itens aceitos individualmente ou usa `Aprovar tudo`.
  Criar proposta não cria recebimento nem transforma previsão em receita.
- **Saída recuperável:** fechar antes da configuração preserva a proposta. A reentrada mostra uma
  única ação `Continuar configuração`, abrindo diretamente o orçamento correto.
- **Duas fases para o legado:** primeiro a rota geral perde links/importadores e vira somente
  redirecionamento; depois dos gates, o cliente antigo é removido.
- **Dados antigos imutáveis:** isolamento/remoção não apaga, migra, recalcula nem regrava orçamento,
  item, evento vinculado, pagamento, cobrança, aceite, PDF ou log existente.

## 3. Objetivo

O dentista conclui proposta, aceite e configuração financeira sem trocar de aba nem procurar o
orçamento recém-criado:

1. Abre `Gerar orçamento` em uma Ficha.
2. Revisa todos os eventos clínicos elegíveis, descrições e preços.
3. Salva; o mesmo modal avança para o orçamento persistido.
4. Marca os procedimentos aceitos e configura cobrança, se já houver acordo.
5. Conclui e retorna à Ficha com resumo de aprovado, recebido e saldo.

## 4. Contrato técnico

```ts
type EtapaFluxoOrcamento = 'montagem' | 'configuracao';

type CriarOrcamentoResult =
  | { ok: true; orcamentoId: string }
  | { ok: false; erro: string };

interface OrigemOrcamentoFicha {
  pacienteId: string;
  fichaId: string;
  eventoIds: string[];
}
```

- `useOrcamentoModal` mantém `EtapaFluxoOrcamento` e só entra em `configuracao` com
  `orcamentoId` retornado pelo servidor; ID temporário nunca aciona escrita financeira.
- `criarOrcamento` exige `fichaId` no caminho clínico. A RPC continua validando clínica,
  paciente, responsável canônico, dono do catálogo e cada `evento_id` na mesma transação.
- O gerador consulta uma Ficha específica e não filtra por status clínico; filtra por origem,
  responsável e ausência de vínculo em `orcamento_eventos`. A leitura exige também o
  `paciente_id` do perfil aberto.
- A consulta do catálogo exige `clinica_id`, `dentista_id` do responsável e `ativo=true`. Seu
  resultado é `Carregado | Falhou`; falha não pode ser convertida em catálogo vazio.
- A RPC aceita `procedimento_id` somente quando ele pertence à mesma clínica **e** ao dentista
  responsável pelo orçamento. Este vínculo é validado tanto na criação como ao adicionar itens.
- A sincronização do catálogo compara o nome sem dente/localização, normalizado, e altera apenas
  o estado de montagem. Alterações históricas continuam exigindo edição explícita do orçamento.
- Actions usadas pelo perfil, Financeiro, aceite e WhatsApp passam a morar em
  `src/server/orcamentos/`; componentes não importam lógica de uma rota desativada.
- `/dashboard/orcamentos` preserva temporariamente apenas `redirect('/dashboard/pacientes')`.
  Nenhum menu, alerta, notificação ou CTA interno aponta para essa URL.
- Nenhuma tabela, coluna, FK, policy ou dado existente é removido nesta entrega.

## 5. Comportamento

| Situação | Resultado obrigatório |
|---|---|
| Ficha com indicados e realizados | lista todos os eventos clínicos próprios elegíveis |
| Evento já em outro orçamento | não aparece; envio concorrente falha sem salvar parcialmente |
| Ficha sem evento estruturado | explica que não há procedimento identificável; não usa texto como cobrança |
| Procedimento com ID canônico | carrega nome e preço do catálogo |
| Nome exato sem ID | vincula ao cadastro canônico e carrega o preço |
| Nome apenas semelhante | mantém sem vínculo e pede escolha/cadastro; não adivinha preço |
| Catálogo indisponível | exibe erro e não permite criar orçamento com preço presumido ou lista vazia |
| Cadastrar item repetido na montagem | todas as linhas iguais não salvas recebem o mesmo ID/preço |
| Criação concluída | modal permanece aberto e avança direto para configuração |
| Paciente ainda não aceitou | dentista pode fechar; proposta permanece sem dívida/receita automática |
| Reabrir proposta incompleta | `Continuar configuração` abre diretamente seu detalhe |
| Concluir configuração | retorna à Ficha mostrando aprovado, recebido e saldo |
| URL geral antiga | redireciona para Pacientes; nunca renderiza o cliente antigo |
| Falha de rede entre criar e configurar | orçamento criado continua preservado e pode ser retomado sem duplicar |

## 6. Referência visual

- Preservar integralmente o design aprovado da Ficha, `NovoOrcamentoModal` e
  `DetalheOrcamentoModal`; esta entrega muda continuidade e hierarquia de ações, não a linguagem
  visual.
- No desktop, procedimentos e financeiro mantêm a composição existente. No mobile, o mesmo modal
  avança entre montagem e configuração sem abrir outra rota.
- CTA principal: `Criar e continuar` na montagem; `Concluir configuração` no final; proposta
  interrompida usa `Continuar configuração`.
- Loading usa `DexLoader`; transição curta e funcional, sem animação decorativa nova.

## 7. Invariantes

1. Orçamento clínico novo sempre tem `paciente_id`, `ficha_id` e ao menos um `evento_id` válido.
2. Um `evento_id` participa de no máximo um orçamento em todo instante.
3. Indicado e realizado são elegíveis; pré-existente nunca é cobrável.
4. Criar orçamento não aprova item, não recebe dinheiro e não lança receita automaticamente.
5. Atualizar catálogo/linhas em montagem não altera orçamento persistido.
6. O ID usado na configuração é sempre o ID real retornado pelo servidor.
7. Falha após persistência nunca cria segundo orçamento ao tentar continuar.
8. Perfil e Financeiro mantêm todas as capacidades necessárias antes de remover o cliente geral.
9. Nenhum dado histórico é apagado, migrado ou recalculado pelo isolamento do legado.
10. Toda leitura/escrita mantém `clinica_id` e as regras de responsável/RLS existentes.
11. A Ficha lida para o orçamento pertence obrigatoriamente ao paciente do perfil aberto.
12. Um `procedimento_id` vinculado a item novo pertence ao dentista responsável pelo orçamento.

## 8. Gates de aceite

- [ ] Ficha com um indicado e um realizado gera os dois; evento pré-existente fica fora.
- [ ] Evento já vinculado não aparece; duas tentativas concorrentes geram somente um vínculo.
- [ ] Orçamento criado persiste `paciente_id`, `ficha_id` e todos os `evento_ids` selecionados.
- [ ] Salvar mantém o modal aberto e mostra a configuração do ID real sem aba/card intermediário.
- [ ] Aprovar um item ou `Aprovar tudo` habilita a cobrança no mesmo modal sem aprovação implícita.
- [ ] Fechar antes da cobrança preserva proposta; `Continuar configuração` retoma o mesmo ID.
- [ ] Falha de carregamento após criar não duplica proposta ao repetir/retomar.
- [ ] ID ou nome canônico exato carrega preço; nome semelhante não recebe vínculo automático.
- [ ] Falha ao buscar o catálogo aparece como erro e não como “sem procedimentos”.
- [ ] A Ficha de outro paciente não pode ser lida nem salva pelo perfil aberto.
- [ ] RPC rejeita `procedimento_id` da mesma clínica que pertença a outro dentista.
- [ ] Cadastrar um procedimento repetido sincroniza todas as linhas iguais ainda não salvas.
- [ ] Alterar preço canônico não muda nenhum item de orçamento antigo, aceito ou não.
- [ ] Não existe link/CTA interno para `/dashboard/orcamentos`; URL direta redireciona.
- [ ] Perfil mantém criar, editar, aceitar, assinar e enviar; Financeiro mantém receber, corrigir,
  estornar e reorganizar previsões.
- [ ] Contagens e amostras de orçamentos, itens, vínculos, pagamentos, cobranças, aceites e logs são
  idênticas antes/depois do isolamento; nenhuma escrita automática é executada.
- [ ] Duas contas logadas comprovam isolamento entre clínicas e entre responsáveis.
- [ ] TypeScript, testes focados, lint, build e QA manual desktop/mobile passam sem Docker local.

## 9. Fora de escopo

- Redesenhar a Ficha ou os modais aprovados.
- Alterar cálculos financeiros concluídos no R-145.
- Atualizar em massa preços de orçamentos históricos.
- Inferência fuzzy/IA para escolher procedimento ou preço.
- Apagar tabelas, dados ou documentos antigos.
