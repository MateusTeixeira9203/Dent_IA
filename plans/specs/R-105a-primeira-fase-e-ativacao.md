# R-105a — Onboarding guiado até o primeiro valor

> **SPEC** · **R-105a** · 🟡 no ar; aguarda ciclo completo em conta nova
> **Aberto:** 2026-08-21 · **Fechado:** — · **Fase:** aprovada
> **Depende de:** ajuste de formação do R-92 descrito no §4.4
> **Irmão:** [R-105b](R-105b-marcos-e-gatilhos.md) — retenção da primeira semana e medição.

## 1. Problema

O produto já possui as peças certas (`DexBoasVindas`, `DicaZona`, `AtenderAgoraModal`, Campo
Mágico e ficha), mas elas não formam uma jornada única. O onboarding antigo mantém etapas mortas,
limites e preços legados; o card de ativação ainda diz que o trial começa depois da primeira
ficha, em conflito com o R-92.

O risco maior é ensinar o software em vez de levar o dentista a sentir o valor. A ativação não é
“terminou o tour”: é o dentista salvar uma ficha clínica estruturada e voltar a usar o fluxo.

## 2. Decisão

O Dex conduz **uma missão real**, sem bloquear controles nem criar um tour paralelo:

`cartão → primeiro atendimento → Campo Mágico → revisão → ficha pronta`.

- O usuário controla o ritmo, pode pular e retomar.
- Agenda, financeiro e configurações aparecem depois, por contexto.
- A missão não obriga paciente novo: aceita existente, criação rápida ou demonstração.
- Demonstração é isolada e descartável; nunca escreve dado clínico ou financeiro.
- Depois do cadastro da clínica, um único slide apresenta o Dex e leva ao Meu Dia. Não há
  carrossel, pergunta de persona nem configuração adicional antes do primeiro valor.
- Clínica em formação entra no produto durante as 48h quando o criador já cadastrou o cartão e
  enviou ao menos um convite válido.
- Se a formação expirar, o criador escolhe reiniciar ou migrar para Consultório; nunca há
  cobrança automática decorrente da expiração.

## 3. Objetivo

Levar um dentista novo do checkout à primeira ficha estruturada em até 10 minutos, com no máximo
uma ação destacada por vez e sem configuração obrigatória antes do valor.

## 4. Contrato técnico

### 4.1 Estado do onboarding

Migration aditiva, sem backfill de dados clínicos:

```sql
create table public.onboarding_usuarios (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  etapa text not null default 'intro'
    check (etapa in ('intro','escolha_atendimento','em_atendimento','revisao','concluido','pulado')),
  caminho text check (caminho in ('existente','novo','demonstracao')),
  iniciou_atendimento_em timestamptz,
  usou_campo_magico_em timestamptz,
  primeira_ficha_em timestamptz,
  concluido_em timestamptz,
  pulado_em timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.onboarding_usuarios enable row level security;
```

É estado global do usuário, não dado de uma clínica. A escrita ocorre apenas por actions
autenticadas; não há policy de escrita direta pelo cliente. Leitura: `auth.uid() = usuario_id`.

```ts
export type EtapaOnboarding =
  | 'intro' | 'escolha_atendimento' | 'em_atendimento'
  | 'revisao' | 'concluido' | 'pulado';

export type CaminhoPrimeiroAtendimento = 'existente' | 'novo' | 'demonstracao';

export interface ProgressoOnboarding {
  etapa: EtapaOnboarding;
  caminho: CaminhoPrimeiroAtendimento | null;
  primeiraFichaEm: string | null;
  podeRetomar: boolean;
}

export type AtualizarOnboardingResult =
  | { ok: true; progresso: ProgressoOnboarding }
  | { ok: false; error: string };
```

Actions:

```ts
iniciarOnboardingClinico(): Promise<AtualizarOnboardingResult>
escolherPrimeiroAtendimento(caminho: CaminhoPrimeiroAtendimento): Promise<AtualizarOnboardingResult>
pularOnboardingClinico(): Promise<AtualizarOnboardingResult>
registrarMarcoOnboarding(marco: 'atendimento' | 'campo_magico' | 'primeira_ficha'):
  Promise<AtualizarOnboardingResult>
```

Todas são idempotentes e só alteram a linha de `auth.uid()`. Etapas nunca regridem.

### 4.2 Orquestração no Meu Dia

`DexOnboardingController` compõe o que já existe; não implementa clínica, agenda ou ficha.

```ts
interface DexOnboardingControllerProps {
  progresso: ProgressoOnboarding;
  primeiraSessao: boolean;
  podeUsarDemo: boolean;
  emFormacaoClinica: boolean;
}
```

- `DexBoasVindas` vira a abertura compacta da missão.
- A abertura aparece na primeira sessão mesmo quando já existe agendamento; sua exibição não
  depende de a faixa de pacientes estar vazia.
- `AtenderAgoraModal` ganha os três caminhos no estado de primeira sessão.
- Existente: pesquisa e seleciona paciente.
- Novo: nome obrigatório e telefone opcional, pelo fluxo atual.
- Demonstração: abre uma sessão efêmera no Meu Dia, sem insert/update/delete no Supabase.
- `DicaZona` permanece contextual; no máximo uma zona fica realçada.
- Salvar a primeira ficha real marca `primeira_ficha` somente depois do salvamento clínico.
- Demo concluída mostra o resultado e oferece “Atender paciente real”; não marca primeira ficha.

### 4.3 Quando mostrar

- Usuário sem `onboarding_usuarios`: cria progresso em `intro` ao entrar no Meu Dia.
- Usuário com `concluido` ou `pulado`: não recebe abertura; dicas normais do produto continuam.
- Usuário já concluído em outra clínica não repete a missão clínica.
- Dentista convidado novo recebe a missão depois de cadastrar o próprio cartão.
- Secretária e protético não recebem onboarding clínico.

### 4.4 Ajuste obrigatório no R-92 — Clínica em formação

Fluxo aprovado:

1. Criador escolhe Clínica e inicia a formação.
2. Cadastra cartão via Stripe Setup, sem cobrança.
3. Envia pelo menos um convite de dentista válido.
4. Entra imediatamente no dashboard como `clinica_em_formacao`.
5. Pode criar pacientes, usar Meu Dia e gerar fichas durante as 48h.
6. O trial de 7 dias e as subscriptions só começam quando 2 dentistas tiverem cartão pronto.
7. Se ninguém aceitar em 48h, a formação expira e oferece reiniciar ou migrar para Consultório.

Consequências técnicas:

- `confirmarEquipeMinimaEmFormacao` deixa de bloquear a criação do Setup Checkout.
- O gate do dashboard libera `cartao_pronto` apenas se a formação estiver válida e existir ao
  menos um convite de dentista pendente/aceito.
- A liberação provisória é derivada no servidor; status de cobrança não é falsamente promovido
  para `trialing`.
- Formação expirada nunca inicia Consultório nem cobra sem confirmação explícita.
- RLS e silos permanecem iguais; o modo formação muda acesso, não propriedade dos dados.

### 4.5 Entrada pública sem ciclo de rota

Cadastro comum sempre cria identidade e clínica provisória antes de abrir `/planos`. A escolha
antecipada da landing (`CONSULTORIO`/`CLINICA`) é preservada como intenção, não executa checkout
antes de existir `clinicId`. Convite continua preservando `/convite/{token}` e não cria clínica.

## 5. Comportamento

### Apresentação do Dex

1. O cadastro coleta somente identidade profissional e nome da clínica.
2. A antiga pergunta “O que mais te ajudaria agora?” sai da interface; a coluna existente
   recebe o padrão `economizar_tempo` para preservar compatibilidade sem criar uma decisão.
3. Após a clínica ser criada, um slide único apresenta o fluxo `você fala → Dex organiza →
   você revisa` e a garantia de que nada é salvo sem confirmação.
4. “Conhecer o Meu Dia” e “Pular apresentação” concluem o cadastro e levam ao Meu Dia.
5. Se a página for recarregada antes dessa ação, o slide é retomado em vez de repetir o formulário.

### Caminho principal — paciente real

1. Checkout concluído → Meu Dia.
2. Dex explica em um único bloco os três gestos: escolher o paciente, falar/colar e revisar antes
   de salvar. A abertura afirma que nada entra no prontuário sem revisão do dentista.
3. Usuário escolhe paciente existente ou cria rapidamente.
4. Atendimento selecionado → Campo Mágico recebe o único realce.
5. Fala, cola ou digita → Dex estrutura → revisão aparece.
6. Usuário corrige e salva.
7. Ficha pronta abre no mesmo paciente, mostrando fala → estrutura → registro final.
8. Dex conclui e oferece retorno/orçamento como próximos gestos opcionais.

### Caminho demonstração

1. “Quero testar com um exemplo” abre consulta demo no mesmo layout do Meu Dia.
2. Relato e resultado podem ser experimentados, sem escrita no banco.
3. Final mostra “Isso foi uma demonstração” e CTA para atendimento real.
4. Fechar ou recarregar descarta tudo.

### Estados

- Carregando: skeleton no continente, nunca overlay global.
- Erro de progresso: produto continua utilizável e oferece tentar novamente.
- Sem paciente: três caminhos visíveis.
- Formação: aviso discreto com prazo e equipe; não ocupa o cockpit.
- Expirada: bloqueia novas escritas, mantém Arquivo Clínico e apresenta as duas decisões.

## 6. Referência visual

Referência atualizada: `plans/artefatos/R-105-onboarding-primeiro-valor-v2.html`.

Base fixa: tokens e tipografia atuais do produto/R-121; não reabrir paleta. O artefato deve
mostrar desktop e mobile para: abertura, escolha do atendimento, Campo Mágico, ficha pronta,
demo, formação e formação expirada.

Tokens extraídos por JS do R-121 aprovado:

| Token | Valor |
|---|---|
| `--ink` | `#0d0d0d` |
| `--paper` | `#f5f3ef` |
| `--surface` | `#ffffff` no light; token equivalente do produto no dark |
| `--border` | `rgba(13,13,13,.14)` no light |
| `--teal` | `#2f9c85` |
| `--teal-lt` | `#5dbeb0` |
| `--teal-pale` | `#e4f4f1` |
| Display | `DM Serif Display, Georgia, serif` |
| Interface | `Outfit, ui-sans-serif, system-ui, sans-serif` |
| Mono | `DM Mono, ui-monospace, monospace` |
| Sombra de marca | `0 28px 90px -46px rgba(13,13,13,.42)` |

Estados interativos do artefato: abertura, escolha, Campo Mágico, ficha pronta, Clínica em
formação, demonstração e composição mobile. A barra de estados é andaime do artefato e não entra
no produto.

## 7. Invariantes

- **I1** — Onboarding nunca impede usar outro controle ou rota permitida.
- **I2** — No máximo um realce por vez; nenhum loop de pulsação.
- **I3** — Demo nunca escreve em paciente, ficha, evento, orçamento, pagamento ou agenda.
- **I4** — Salvar ficha não pode falhar porque o registro de onboarding falhou.
- **I5** — O mesmo usuário não repete a missão ao trocar de clínica.
- **I6** — Formação não inicia trial nem cobrança antes de 2 cartões prontos.
- **I7** — Expiração não cobra nem migra plano automaticamente.
- **I8** — Nenhum acesso provisório reduz RLS ou rompe silos.
- **I9** — Primeira ficha real, não conclusão do tour, é o marco de valor.

## 8. Gates de aceite

- [ ] G1 — cadastro Consultório → cartão → Meu Dia, sem rota exigir `clinicId` inexistente.
- [ ] G2 — Clínica: cartão antes do convite funciona; sem convite continua na formação; após
      primeiro convite válido entra no dashboard antes da aceitação.
- [ ] G3 — durante formação, criador cria paciente e salva ficha; trial segue não iniciado.
- [ ] G4 — segundo dentista aceita, cadastra cartão e ativa formação; ambos recebem o mesmo fim
      de trial de 7 dias.
- [ ] G5 — formação expira sem aceite: nenhuma cobrança; migrar/reiniciar exige confirmação.
- [ ] G6 — existente, novo e demo chegam ao resultado esperado.
- [ ] G7 — demo: contagem das tabelas clínicas/financeiras antes e depois permanece igual.
- [ ] G8 — salvar ficha real conclui o onboarding mesmo se a escrita de progresso falhar.
- [ ] G9 — usuário concluído entra em outra clínica sem repetir missão.
- [ ] G10 — teclado, leitor de tela, 375/768/1440, light/dark e movimento reduzido.
- [ ] G11 — secretária/protético não veem o fluxo clínico.
- [ ] G12 — teste cronometrado com 3 dentistas: primeira ficha em até 10 minutos.
- [ ] G13 — cadastro não pergunta persona nem exige decisão comercial antes de criar a clínica.
- [ ] G14 — slide do Dex aparece uma vez, pode ser pulado e respeita movimento reduzido.
- [ ] G15 — Meu Dia mostra a missão inicial mesmo quando o dentista já possui agendamento.

## 9. Fora de escopo

- Tour obrigatório de financeiro, configurações ou todas as rotas.
- Vídeo longo, chatbot livre ou personagem animado permanente.
- Onboarding próprio de secretária/protético.
- Cobrança em produção: continua dependente dos gates financeiros do R-92.
