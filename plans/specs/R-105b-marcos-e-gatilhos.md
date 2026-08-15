# R-105b — Onboarding: os marcos da semana 1 e os gatilhos

> **Modelo:** Opus pro recorte dos 5 marcos (§4.1) — é onde há decisão de produto. Sonnet pro
> cron (§4.2), que é fiação contra uma rota que já existe.
> **Fase:** `contrato` — 15/08. Mesmo artefato aprovado do irmão.
> **Irmão:** [R-105a](R-105a-primeira-fase-e-ativacao.md) — a primeira fase e a ativação.
> O diagnóstico do funil e a definição de momento de valor moram lá (§1 e §2); **não repito aqui**.
> Os dois não compartilham arquivo nenhum; sobem separados, em qualquer ordem.

---

## 1. Problema

O R-105a leva o dentista até a primeira ficha. Depois disso, hoje, **o produto cala.** Duas
lacunas concretas, medidas no repo:

**1.1 Não existe nenhum reforço dentro do produto.** Quatro coisas que pagam de volta na semana 1
— orçar o que acabou de registrar, colocar os próprios preços, marcar o retorno, cadastrar o
horário — dependem inteiramente do dentista descobrir sozinho que existem. Dado real do R-110:
**11 de 14 dentistas em produção não têm grade de horário cadastrada**, incluindo os 2 mais
movimentados da Clindent. Ninguém nunca pediu.

**1.2 Três dos cinco e-mails de onboarding nunca saem.**
`src/server/services/onboarding-emails.ts` tem 4 funções com template pronto e assunto escrito.
Só `enviarEmailD0` tem chamador (`onboarding/actions.ts:73`). **D1, D3 e D7 não têm chamador em
lugar nenhum do projeto, e não há cron.** O D7 ainda depende de um `dataExpiracao` que só passa a
existir com o R-105a.

`vercel.json` já roda um cron (`/api/whatsapp/run-reminders`, 9h) — a infraestrutura está provada.

---

## 2. Decisão

O Playbook pede **um checklist de 3 a 5 primeiros passos com progresso visível** (PLG, p.10).
O conteúdo entra; o continente não. **Caixa fixa plantada no dashboard vira mobília que ninguém
fecha** — os marcos viram pendências do **Dex**, que já tem bola no dock com badge e painel de
pendências no ar (R-103b). Nenhuma superfície nova, e a fila **desaparece sozinha** quando as
condições caem.

Todo gatilho, dentro e fora do produto, é o mesmo mecanismo: **condição de banco → frase escrita
à mão**. Zero IA de runtime, por regra do `CLAUDE.md` — IA operacional, não conversacional.

---

## 3. Objetivo

O dentista que já salvou a primeira ficha encontra, na semana seguinte, os quatro gestos que
pagam de volta na hora — **cada um no momento em que passa a fazer sentido**, e nenhum antes.

---

## 4. Contrato técnico

### 4.1 Os 5 marcos — pendências derivadas do Dex

Entram em `derivarPendencias` (`src/lib/dex/pendencias.ts:24`) como `DexPendencia`
(`lib/dex/tipos.ts:9`) de severidade `baixa` — não competem com "orçamento parado há 30 dias".

`DexContextData` (`api/dex/context/route.ts:6`) ganha um bloco:

```ts
onboarding: {
  fichas: number;                  // deste dentista
  temOrcamento: boolean;           // desta clínica
  procedimentosPendente: boolean;  // clinicas.procedimentos_pendente (já existe no schema)
  temRetornoMarcado: boolean;
  temGradeHorario: boolean;        // horarios_disponiveis deste dentista
  agendamentos: number;
}
```

| # | Marco | `id` | Gatilho | Devolve na hora |
|---|---|---|---|---|
| 1 | A ficha pela voz | — | — *(é a própria sessão 1; nunca vira pendência)* | a ficha sem digitar |
| 2 | Orçamento do que acabou de registrar | `onb_orcamento` | `fichas ≥ 1 && !temOrcamento` | o que dá dinheiro, sem digitar de novo |
| 3 | Seus preços na tabela | `onb_precos` | `temOrcamento && procedimentosPendente` | orçamento com o **seu** preço |
| 4 | Marcar o retorno | `onb_retorno` | `fichas ≥ 2 && !temRetornoMarcado` | amanhã não abre vazio |
| 5 | Seu horário de atendimento | `onb_horario` | `!temGradeHorario && agendamentos ≥ 3` | a agenda para de aceitar horário inválido |

Cada um aponta pro destino que **já existe**: marco 2 e 4 no rodapé do Meu dia (R-46h e R-64),
3 em `configuracoes?aba=procedimentos`, 5 em `?aba=horarios`.

**O gatilho do marco 3 mudou** do desenho original ("abriu Gerar orçamento pela 1ª vez") para
"já criou o 1º orçamento": o primeiro exigiria persistir um evento de UI que não existe hoje; o
segundo é mais forte — ele já viu o preço errado sair — e sai de graça do dado que já existe.

**Marcos 3 e 5 são configuração, e vêm depois do valor, disparados pelo uso.** Pedir qualquer um
antes da primeira ficha é o erro nº 4 do Playbook. É o invariante **I3**.

**Por que 5 e não 8.** A régua do roadmap ("gestos por registro") vale aqui igual: o marco tem que
devolver benefício **na hora**. Convidar equipe, configurar WhatsApp, preencher endereço — nada
disso devolve nada na semana 1 do dentista solo. Se um 6º aparecer, um dos 5 sai.

### 4.2 O cron dos e-mails

`vercel.json` ganha uma segunda entrada; a rota espelha `api/whatsapp/run-reminders`
(Bearer `CRON_SECRET`, `runtime='nodejs'`, `dynamic='force-dynamic'`):

```json
{ "path": "/api/cron/onboarding-emails", "schedule": "0 12 * * *" }
```

`src/server/services/onboarding-run.ts` varre dentistas criados nos últimos 15 dias e despacha
por **idade exata em dias**, nunca por intervalo:

| Dia | Condição | Função | Estado do texto |
|---|---|---|---|
| D1 | `idade == 1` — com/sem 1ª ficha | `enviarEmailD1({ fezPrimeiraConsulta })` | **2 versões escritas** |
| D3 | `idade == 3 && fichas < 2` | `enviarEmailD3` | escrito |
| D7 | `idade == 7` | `enviarEmailD7({ fichasCriadas, dataExpiracao })` | escrito — `dataExpiracao` = `trial_ends_at`, que só existe com o R-105a |
| D14 | `idade == 14` | véspera da cobrança | **falta escrever** (Playbook p.10 pede a régua até D14) |

**Anti-duplicata sem migration:** a janela é um dia exato e o cron roda 1×/dia, então cada e-mail
cai exatamente uma vez. Trade-off assumido explicitamente: **se o cron falhar num dia, aquele
e-mail se perde.** E-mail perdido é melhor que e-mail duplicado, e evita uma coluna nova só pra
log de envio.

### 4.3 A rede de segurança do trial (dívida do R-105a)

Na mesma varredura diária: clínica com ≥ 1 ficha e `trial_ends_at` NULL recebe a partida do
relógio. É o que sustenta o **I5 do R-105a** quando a chamada imediata falha por rede.

### 4.4 Gatilhos in-app — as frases

| Condição | A frase | Onde |
|---|---|---|
| `fichas ≥ 1 && !temOrcamento` | "Você indicou N procedimentos para {paciente}. Isso vira orçamento em um clique." | badge da bola do Dex |
| `temOrcamento && procedimentosPendente` | "Seu orçamento saiu com preço padrão. Colocar os seus leva 5 minutos." | painel do Dex |
| `!temGradeHorario && agendamentos ≥ 3` | "Sua agenda aceita qualquer horário hoje. Defina seu expediente." | painel do Dex |
| `fichas ≥ 2 && !temRetornoMarcado` | "Amanhã seu dia abre vazio. Marque o retorno antes do paciente sair." | rodapé do Meu dia |

**Slot reservado, não preenchido:** planejamento, tratamento, despesa e o modo consulta novo estão
fora do ar por decisão dele. Nenhum gatilho nasce prevendo esses quatro — cada um ganha o seu no
dia em que voltar. Escrever frase pra tela que não existe é o erro que a landing já cometeu
vendendo o modo consulta apagado.

---

## 5. Comportamento

Salvou a 1ª ficha → a bola do Dex acende com 1. Abriu o painel → o marco 2 com CTA pro rodapé do
Meu dia. Gerou o orçamento → o marco 2 **some** e o 3 aparece. E assim por diante: nenhum estado
de "onboarding concluído" é gravado — quando as 4 condições caem, o Dex simplesmente volta ao
normal.

D1 chega no dia seguinte na versão certa (fez ou não fez a ficha); D3 só se ainda houver 1 ficha
só; D7 com a contagem real e a data real de fim do trial; D14 na véspera.

---

## 6. Referência visual

Mesmo artefato do irmão: `plans/artefatos/R-105-onboarding-primeira-fase.html` **v4** — §2 (os 5
marcos) e §3 (os gatilhos e a régua de e-mail). O painel do Dex em si tem artefato próprio
(R-103); **este item não redesenha o painel**, só acrescenta pendências à lista que ele já
renderiza.

---

## 7. Invariantes

- **I1** — Os marcos são derivados a cada leitura, **nunca persistidos**, e somem quando a
  condição cai. Mesmo princípio do "em andamento" derivado do R-51 — nenhum status novo por
  acidente.
- **I2** — Nenhum e-mail sai duas vezes para o mesmo dentista no mesmo marco.
- **I3** — Configuração nunca é pré-requisito do momento de valor: todo marco de configuração
  tem um gatilho que exige uso anterior.
- **I4** — Nenhuma superfície nova. Marco que não couber numa `DexPendencia` existente **não
  entra** — vira achado, não improviso.
- **I5** — `id` de pendência é estável entre fetches (contrato do `DexPendencia`), senão a lista
  pisca e o badge conta errado.
- **I6** — O cron nunca escreve dado clínico. Só e-mail e `trial_ends_at` (§4.3).

---

## 8. Gates de aceite

- [ ] **G1** — os 4 marcos **aparecem** quando a condição vale, um a um, em clínica de teste
- [ ] **G2** — os 4 marcos **somem** quando a condição cai — é a metade que costuma faltar
- [ ] **G3** — badge da bola bate com a contagem do painel (marcos + eventos), sem duplicar
- [ ] **G4** — cron: D1 nas 2 versões, D3, D7 com contagem e data reais, D14.
      **Rodar 2× no mesmo dia não duplica.** Conferir no painel do Resend, não só no log
- [ ] **G5** — rota do cron rejeita chamada sem `Bearer CRON_SECRET` (401)
- [ ] **G6** — rede de segurança: clínica com ficha e `trial_ends_at` NULL é corrigida na
      próxima passada
- [ ] **G7** — **2 contas logadas**: os marcos de dentista A não vazam pro painel do dentista B
      na mesma clínica. *`fichas`, `temRetornoMarcado` e `temGradeHorario` são por dentista;
      `temOrcamento` e `procedimentosPendente` são da clínica* — o gate é conferir que cada um
      lê do escopo certo
- [ ] **G8** — secretária e protético não recebem marco nenhum (nenhum destino é deles)
- [ ] **G9** — typecheck + lint + `next build` limpos; zero erro de console
- [ ] **G10** — painel do Dex em light **e** dark com os marcos na lista, e em 375px

---

## 9. Fora de escopo, e por quê

| Fora | Motivo |
|---|---|
| Redesenho do painel do Dex | É o R-103. Este item só acrescenta itens à lista |
| Checklist com barra de progresso na tela | Recusado no artefato §5: vira mobília |
| Vídeos por área · chatbot de dúvidas | Recusados 14/08 — 4 áreas em obras; chatbot é reativo |
| Gatilhos p/ planejamento, tratamento, despesa | Fora do ar por decisão dele (§4.4) |
| Painel de métricas do placar | Os 3 números são SQL direto (artefato §4), não uma tela |
| Tabela de log de e-mail enviado | Trocada pela janela de 1 dia exato (§4.2), com o trade-off assumido |

**Decisão aberta:** **"apresentação"** na lista de momentos de valor dele — planejamento
renascendo com esse nome, ou apresentação do orçamento ao paciente? Sem resposta desde 14/08.
Não bloqueia: se for momento de valor de verdade, vira um 6º marco e um dos 5 sai.
