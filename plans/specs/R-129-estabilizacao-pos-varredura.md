# R-129 — Estabilização pós-varredura 24/08

> **PLANO-MESTRE** · **R-129** · aguardando comando de execução
> **Aberto:** 2026-08-24 · **Migration:** nenhuma prevista
> **Fonte:** `plans/auditorias/2026-08-24-resultado-varredura.md`

## 1. Corte aprovado

Este plano começa no **R-127**. Itens anteriores não serão reabertos: já foram testados pelo
usuário. Falhas novas encontradas na varredura entram no R-129, mesmo quando tocam uma tela
alterada anteriormente.

O objetivo é deixar o fluxo cotidiano previsível antes de adicionar atalhos ou painéis:

1. odontograma e escopos clínicos corretos;
2. navegação sem espera vazia ou erro de hidratação;
3. Agenda e modais utilizáveis no celular;
4. correção explícita e rápida de ficha já salva;
5. cobrança e isenção dizendo a verdade;
6. navegação acessível por toque e teclado.

## 2. Entregas e ordem

| Ordem | Entrega | Conteúdo | Dependência |
|---:|---|---|---|
| 0 | Preparação | preservar arquivos alheios, registrar baseline e separar commits | — |
| 1 | R-127 | QA visual do evento estrutural mais recente e fechamento | já implementado |
| 2 | R-128 | QA visual de Boca toda/arcadas no Meu Dia e Ficha; commit e deploy isolados | já implementado localmente |
| 3 | [R-129a](R-129a-performance-hidratacao.md) | hidratação, feedback de rota, busca e transições | R-128 publicado |
| 4 | [R-129b](R-129b-mobile-operacional.md) | Agenda Dia/Semana, novo agendamento e orçamento mobile | R-129a |
| 5 | [R-129e](R-129e-edicao-ficha-historica.md) | barra explícita para editar e salvar ficha histórica | R-129a |
| 6 | [R-129c](R-129c-estado-comercial-verdadeiro.md) | isenção, assinatura, domínio, indicação e retorno do checkout | R-129a |
| 7 | [R-129d](R-129d-acessibilidade-operacional.md) | semântica, foco e alvos de toque | R-129b/e |
| 8 | Gate final | QA por papel, mobile real e smoke financeiro | todos |

R-129b e R-129e não dependem um do outro e podem ser codados em sequência sem misturar
commits. R-129c fica depois porque mexe em dinheiro e precisa de um gate próprio.

## 3. Passo a passo de execução

### Passo 0 — congelar o baseline

1. Registrar `git status`, branch e SHA.
2. Ignorar `supabase/.temp/*` e `tmp/`; não entram em commit.
3. Rodar `typecheck`, build e testes existentes antes de alterar.
4. Registrar cinco medições repetidas: Dashboard → Meu Dia → Agenda → paciente → Configurações.
5. Salvar screenshot de console contendo ou não `React #418`.

### Passo 1 — fechar R-127

1. Conferir em localhost e produção: ausente antigo + implante posterior; caminho inverso.
2. Confirmar que o histórico continua completo e só o desenho principal muda.
3. Se passar, fechar documentalmente o item; não misturar código novo neste commit.

### Passo 2 — publicar R-128

1. QA no Meu Dia e na Ficha em desktop e 360–412 px.
2. Validar os sete gates da spec existente e o conflito escopo regional × dente.
3. Commit único do código; commit documental separado.
4. Deploy e repetição dos casos `Boca toda`, `Arcada superior` e `Arcada inferior`.

### Passos 3–7 — executar as specs filhas

Para cada spec: implementar apenas seu contrato, rodar testes focados, verificar em localhost,
commitar isoladamente e só então passar à próxima. Nenhum lote absorve refactor cosmético
global ou item de roadmap antigo.

### Passo 8 — gate pré-comercial

1. Dentista: Agenda, Meu Dia, ficha nova, edição histórica, orçamento e Plano.
2. Secretária: Agenda de dois dentistas, novo agendamento, retorno, orçamento e protético.
3. Protético: receber e atualizar pedido sem alcançar rotas clínicas.
4. Android/PWA e iPhone/Safari: sem overflow, duplo scroll ou CTA atrás da navegação.
5. Conta isenta: zero CTA de cobrança. Conta pagante de teste: Checkout + webhook + portal.
6. Repetir métricas do baseline e anexar antes/depois à auditoria.

## 4. Estratégia de commits e rollback

Cada linha abaixo é reversível sozinha:

1. `fix(odontograma): validar evento estrutural mais recente` — só se surgir ajuste no R-127;
2. `feat(odontograma): registrar procedimentos por escopo regional`;
3. `fix(performance): estabilizar hidratacao e transicoes`;
4. `fix(mobile): estabilizar agenda e formularios operacionais`;
5. `feat(fichas): manter acoes de edicao visiveis`;
6. `fix(billing): representar estado comercial real`;
7. `fix(a11y): tornar navegacao operacional acessivel`;
8. commits `docs(...)` separados do código.

Migration, RLS, nova dependência e mudança de API estão fora do plano atual. Se alguma entrega
descobrir que precisa disso, a execução para e a spec é atualizada antes do código.

## 5. Contrato visual comum

- Reutilizar Dashboard/Tratamento e os contratos aprovados R-122/R-123.
- Tokens sem cor hardcoded: `bg-background`, `bg-card`, `text-foreground`,
  `text-muted-foreground`, `border-border` e equivalentes existentes no projeto.
- Densidade clínica compacta; ações primárias explícitas; alvo mínimo de 44 px.
- Motion apenas em expansão/troca de estado, 150–200 ms, respeitando movimento reduzido.
- Nenhum artefato novo é obrigatório: são correções dentro de superfícies já aprovadas. Se a
  implementação exigir nova composição visual, ela pausa para um artefato antes do código.

## 6. Pronto significa

- R-127 e R-128 verificados em produção.
- Zero `React #418` nos fluxos cobertos.
- Agenda alcança o início e o fim do expediente.
- Orçamento e agendamento têm uma ordem e um dono de rolagem no celular.
- Ficha histórica salva/cancela sem atravessar a página.
- Isentos nunca veem checkout; estados pagos são coerentes com Stripe.
- Fluxos principais funcionam por toque e teclado.
- Build, TypeScript, testes focados e QA por papel passam.

## 7. Fora de escopo

- Pop-up/atalho global da Agenda — só será reavaliado depois da nova medição.
- Novo design do sistema, troca de arquitetura ou refactor global de tokens.
- WhatsApp, ICP-Brasil, novas especialidades e novos relatórios.
- Reescrever isolamento/RLS já validado; o gate apenas confirma que não regrediu.
