# R-105b — Retenção da primeira semana e medição

> **SPEC** · **R-105b** · ⏳ sequência do R-105a
> **Aberto:** 2026-08-21 · **Fechado:** — · **Fase:** aprovada
> **Depende de:** [R-105a](R-105a-primeira-fase-e-ativacao.md)

## 1. Problema

A primeira ficha prova valor, mas não cria hábito sozinha. O produto hoje mistura e-mails do
trial legado de 14 dias, domínio antigo e marcos que podem aparecer cedo demais. Sem medição,
“terminou o tour” pode parecer sucesso mesmo que o dentista nunca volte.

## 2. Decisão

Depois da primeira ficha, o Dex vira um painel pequeno de próximos ganhos. Os marcos são
contextuais, opcionais e somem pelo estado real. A régua acompanha o trial de 7 dias.

Métrica principal: dentista salvou a primeira ficha estruturada e voltou a criar outra.

## 3. Objetivo

Fazer o dentista repetir o fluxo clínico em outro dia e descobrir retorno, orçamento e
configurações somente quando cada ação devolver benefício imediato.

## 4. Contrato técnico

### 4.1 Marcos derivados do Dex

```ts
export type MarcoOnboarding =
  | 'primeira_ficha'
  | 'segundo_dia'
  | 'tres_fichas'
  | 'primeiro_retorno'
  | 'primeiro_orcamento'
  | 'perfil_clinica'
  | 'pwa_instalado';
```

| Marco | Quando aparece | Destino |
|---|---|---|
| Segunda ficha | primeira ficha real e fichas do dentista < 2 | Meu Dia |
| Marcar retorno | ficha real salva e nenhum retorno marcado | rodapé do Meu Dia |
| Gerar orçamento | existe procedimento indicado e nenhum orçamento | ficha/Meu Dia |
| Configurar procedimentos | primeiro orçamento e preços pendentes | Configurações |
| Definir horários | ≥3 agendamentos e nenhuma grade | Configurações |
| Instalar aplicativo | primeira ficha concluída e PWA não instalado | instrução por plataforma |

No máximo três itens visíveis. Ordem: repetir ficha → ação ligada ao atendimento → configuração.
Financeiro não aparece sem recebimento real.

### 4.2 Medição

`onboarding_usuarios` registra timestamps dos marcos de primeira sessão. Dados já existentes
derivam os demais. O relatório do funil combina:

- cadastro criado;
- cartão pronto/trialing em `assinaturas_dentista`;
- primeiro atendimento e Campo Mágico em `onboarding_usuarios`;
- primeira e terceira fichas pelo autor;
- retorno no D2;
- conversão `active` após o trial.

Não registrar texto clínico, áudio, nome do paciente ou conteúdo do Campo Mágico como analytics.

### 4.3 E-mails da primeira semana

Remetente único: `EMAIL_FROM`, fallback `Odonto.IA <equipe@odontoia.app>`.

| Momento | Condição | Mensagem |
|---|---|---|
| D0 | cartão/trial ou acesso de formação confirmado | entrada + missão do primeiro atendimento |
| D1 | sem primeira ficha | retomar exatamente do passo salvo |
| D1 | com primeira ficha | reforço do resultado e convite para repetir |
| D3 | menos de 3 fichas | caso prático curto; CTA Meu Dia |
| D5 | trial ativo | valor já produzido + dias restantes |
| D6 | trial ativo | aviso pré-cobrança claro, valor e portal |
| D7 | pagamento/conversão | confirmação ou ação de regularização |

Cada envio tem chave idempotente `(usuario_id, marco)`. Ao contrário da spec antiga, falha do
cron não perde o e-mail: pendências podem ser retomadas sem duplicar.

```sql
create table public.onboarding_comunicacoes (
  usuario_id uuid not null references auth.users(id) on delete cascade,
  marco text not null,
  enviado_em timestamptz,
  tentativas smallint not null default 0,
  last_error text,
  primary key (usuario_id, marco)
);
alter table public.onboarding_comunicacoes enable row level security;
```

Tabela operacional global por usuário, acessível somente ao serviço do cron.

## 5. Comportamento

1. Primeira ficha salva → Dex mostra “Repita em outro atendimento” e, se aplicável, retorno.
2. Segunda ficha em outro dia → marco de repetição some.
3. Procedimento indicado sem orçamento → CTA de orçamento aparece.
4. Ao concluir a ação, o card desaparece sem botão “marcar como feito”.
5. Pular onboarding remove a abertura, mas não desativa sugestões contextuais úteis.

Estados de e-mail: pendente, enviando, enviado, falhou/tentará novamente. Erro de e-mail nunca
bloqueia o produto ou cobrança.

## 6. Referência visual

O painel usa o mesmo artefato e tokens do R-105a. Não redesenha a central do Dex: acrescenta uma
lista compacta, máximo três itens, com progresso sem barra gamificada.

## 7. Invariantes

- **I1** — Marco concluído é derivado do fato real, não de clique manual.
- **I2** — Conteúdo clínico e identidade do paciente nunca entram em analytics/e-mail.
- **I3** — Nenhuma configuração precede a primeira ficha.
- **I4** — Cada comunicação é idempotente e retomável.
- **I5** — Falha de e-mail não altera assinatura, trial ou acesso.
- **I6** — Trial e datas vêm da assinatura individual Stripe, nunca da clínica legada.
- **I7** — CTA sempre aponta para rota/controle existente.

## 8. Gates de aceite

- [ ] G1 — primeira ficha mostra no máximo três próximos passos, na ordem definida.
- [ ] G2 — concluir retorno/orçamento remove o marco sem gravar status manual.
- [ ] G3 — segunda ficha no D2 mede repetição e encerra o marco principal.
- [ ] G4 — nenhum payload/log contém texto clínico, áudio ou nome do paciente.
- [ ] G5 — D0/D1/D3/D5/D6/D7 usam a assinatura individual e domínio `odontoia.app`.
- [ ] G6 — executar o cron duas vezes envia uma única mensagem por marco.
- [ ] G7 — falha temporária é retomada e não bloqueia o produto.
- [ ] G8 — dentistas da mesma clínica têm progressos independentes.
- [ ] G9 — secretária/protético não recebem a régua clínica.
- [ ] G10 — painel em mobile, light/dark, teclado e leitor de tela.

## 9. Fora de escopo

- CRM de campanhas, WhatsApp de onboarding ou testes A/B automáticos.
- Gamificação, ranking e checklist obrigatório.
- Métricas clínicas ou análise de conteúdo do prontuário.
