# R-46b2 — Salvar e chamar próximo

> **SPEC** · sub-item do **R-46** · fase **plano escrito, aguardando aprovação** (31/07)
> **Modelo:** Sonnet 5 (a peça cara é entender o que já existe, e isso já foi mapeado).
> **Depende de:** **R-46b** (sem `eventosDraft`, não há o que salvar). **Bloqueia:** a fase 2
> do [R-46 §5](R-46-meu-dia.md) (aposentar `/consulta`) — sem salvar no Meu dia, não há
> substituto pra testar.
> **Artefato:** [R-46-ficha-dia.html](../artefatos/R-46-ficha-dia.html) §2, rodapé
> (`Salvar e chamar próximo → Carla, 15:15`).

## 1. A simplificação que a pesquisa achou

O nome do botão parece 4 ações (salvar ficha + gravar odontograma + fechar agendamento +
abrir o próximo). **São 2.**

`salvarFicha` (`server/patients/salvar-ficha.ts`) com `origem: 'modo_consulta'` +
`agendamentoId` + **sem `fichaId`** (create) já faz, numa chamada só:
- INSERT em `fichas` com `status: 'concluida'` (derivado no servidor da `origem`)
- Grava os eventos do odontograma pela RPC `salvar_eventos_odontograma` (upsert por id,
  migration 111) — fail-soft: se a RPC falhar, a ficha fica salva e volta `eventosFalharam: true`
- **`UPDATE agendamentos SET status='completed'`** (linhas 287-291)
- **Notifica a secretária** (`consulta_finalizada`, linhas 293-307)

Ou seja: "salvar" e "fechar agendamento" **não são dois passos** — é 1 chamada. Sobra
"abrir o próximo", que é navegação client-side pura.

**Armadilha verificada (não é bug hoje, mas é armadilha certa aqui):** esse bloco de
efeitos colaterais está **depois do `return` do ramo de update** (linha 219). Salvar com
`fichaId` — mesmo mandando `origem: 'modo_consulta'` e `agendamentoId` — **nunca fecha o
agendamento nem notifica**. Se o Meu dia salvar rascunho primeiro e editar depois, a agenda
nunca fecha. Vira invariante I2.

## 2. Assinatura fica de fora — decisão dele, 31/07

A pergunta era: "Salvar e chamar próximo" assina (data + CRO), como o D10 do R-46 dizia?

**Pesquisa:** não existe mecanismo de "dentista certifica com CRO+data" sem o paciente. O
único caminho de assinatura que existe hoje exige o **paciente desenhando num `<canvas>`**
(`consulta-assinatura-modal.tsx:183`) → `salvarAssinaturaConsulta` →
`assinarTodosRealizadosDaFicha` → RPC `assinar_procedimentos` (migration 111). O CRO **não é
digitado** — a RPC lê `dentistas.cro` do autor da ficha e congela em
`assinaturas.cro_no_ato` (linhas 86-96). Não há caminho no código que assine sem o dataUrl
da imagem.

**Decisão (D1, dele):** **opção (b)** — "Salvar e chamar próximo" salva e avança. A
assinatura continua sendo ação separada e opcional, de onde já é hoje. Parar pra pedir o
paciente desenhar quebraria justamente o "próximo" imediato que é o ponto do botão.

**Consequência que precisa ficar registrada:** o **D10 do R-46** (`"Salvar e chamar próximo"
= assina (data+CRO) + conclui + abre o seguinte`) estava **errado sobre o mecanismo** — foi
escrito antes desta pesquisa. Ele descrevia algo que não existe. D1 aqui o corrige.

## 3. Contrato técnico

```typescript
// meu-dia/actions.ts — nova server action, wrapper fino sobre o que já existe.
export async function salvarVisitaMeuDia(dados: {
  pacienteId: string;
  agendamentoId: string;
  textoVisita: string;
  eventosDraft: OdontogramaEventoDraft[];
}): Promise<{ ok: true; fichaId: string; eventosFalharam?: boolean } | { ok: false; error: string }>;
```

Mapeamento pro `salvarFicha` existente (todos os campos são obrigatórios no schema Zod, mas
aceitam vazio — `salvar-ficha.ts:65-84`):

| Campo de `salvarFicha` | Valor no Meu dia |
|---|---|
| `origem` | `'modo_consulta'` — **é o que dispara fechar agendamento + notificar** |
| `fichaId` | **sempre ausente** (create) — ver I2 |
| `agendamentoId` | do slot selecionado no rail |
| `dataAtendimento` | `hojeBRT()` |
| `anotacoes` | `textoVisita` (D13 do R-46 fundiu anotações+conduta num campo só) |
| `conduta` | `''` (vira `null` no banco) |
| `odontogramaEventos` | `eventosDraft` (do R-46b) |
| `queixaPrincipal`, `dentesAfetados`, `dentesObservacoes`, `procedimentos` | derivados do rascunho — ver §4 |

### 3.1 Navegação pro próximo

Não existe precedente: `/consulta` nunca teve "próximo" (grep negativo em toda
`src/app/consulta`). É lógica nova, mas trivial — o rail do Meu dia **já tem a lista
ordenada** (`slots`, `get-meu-dia.ts`, `order('data_hora')`). Próximo = primeiro slot depois
do atual cujo status permite atender (mesma condição do R-46g:
`!['cancelled','no_show','completed'].includes(status)`).

```typescript
// client, depois do ok da action: router.refresh() (o slot atual vira 'completed' e
// '✓ registrado') e seleciona o próximo no rail. Sem navegação de rota — continua no Meu dia.
```

Se não houver próximo: estado de fim de dia (o artefato §2 mostra
`⚠ 1 atendimento sem registro — Pedro M., 09:30 · registrar agora →`).

## 4. O que derivar do rascunho — aberta A1

`salvarFicha` exige `queixaPrincipal`, `dentesAfetados`, `dentesObservacoes` e
`procedimentos`. O Meu dia não tem formulário pra nenhum deles (é o ponto do R-46: os 7
campos mortos saíram). Precedente que existe: `derivarV2DosEventos()`
(`FichasTab.tsx:284-309`) já deriva `procedimentos` dos eventos via `TIPO_LABEL`, e
`dentesAfetados` das âncoras.

**A1 (aberta):** reusar `derivarV2DosEventos` — hoje é local do `FichasTab.tsx`, teria que
ser extraída pra um util compartilhado. É refactor pequeno mas toca um arquivo de 2725
linhas em produção. Extrair, ou duplicar as ~25 linhas no Meu dia? **Recomendo extrair** —
duplicar regra de derivação clínica é como as duas versões divergem depois. Ele decide.

## 5. Invariantes

- [ ] **I1** — 1 clique = 1 ficha. `salvarFicha` **não tem idempotência por `agendamentoId`**
      (verificado) — dois cliques rápidos criam 2 fichas e disparam o efeito colateral 2x. A
      única proteção hoje é `disabled` no client (`consulta-client.tsx:1176`); replicar isso
      é obrigatório, não polish.
- [ ] **I2** — Meu dia **sempre** chama `salvarFicha` em modo create (sem `fichaId`). Se um
      dia salvar rascunho e editar, a agenda para de fechar silenciosamente (§1).
- [ ] **I3** — Assinatura nunca acontece dentro deste botão (D1). Nenhuma chamada a
      `assinarProcedimentos`/`salvarAssinaturaConsulta` neste fluxo.
- [ ] **I4** — `eventosFalharam: true` (odontograma não gravou, ficha sim) **não pode passar
      silencioso** — o dentista tem que ver, e o "chamar próximo" não avança sem ele decidir.
      `/consulta` já tem esse caminho de retry (`salvarEventosOdontograma`), reusar.
- [ ] **I5** — Só dentista/admin. `salvarFicha` já barra `role === 'secretaria'` no servidor
      (linha 136) — a UI não pode oferecer o botão pra secretária (a rota já a redireciona).

## 6. Gates de aceite

- [ ] **G1** — Registrar 2 procedimentos + texto → "Salvar e chamar próximo" → **conferir no
      banco**: 1 linha nova em `fichas` (`status='concluida'`), N linhas em
      `odontograma_eventos`, agendamento `completed`, 1 notificação pra secretária.
- [ ] **G2** — A ficha aparece **idêntica** no perfil do paciente (timeline, odontograma,
      PDF) — mesma régua do G2 original do R-46b na spec do R-46: se diverge, o modelo velho
      não foi reusado de verdade.
- [ ] **G3** — Depois de salvar, o slot vira `✓ registrado` no rail e o próximo é
      selecionado sozinho, sem sair da rota.
- [ ] **G4** — Último paciente do dia → estado de fim de dia, sem próximo, sem erro.
- [ ] **G5** — Dois cliques rápidos → **1 ficha só** (I1).
- [ ] **G6** — Forçar falha da RPC de eventos → dentista vê o aviso e o retry; não avança
      pro próximo em silêncio (I4).
- [ ] **G7** — Salvar sem nenhum evento no rascunho (só texto) → funciona, ficha nasce com
      `procedimentos: []`.

## 7. Abertas

- **A1 · `derivarV2DosEventos`** — extrair de `FichasTab.tsx` pra util compartilhada
  (recomendo) ou duplicar no Meu dia? Ver §4.
- **A2 · O que fazer com o `⚠ sem registro`** — o artefato mostra o fim do dia acusando quem
  ficou sem ficha, com "registrar agora →" retroativo. Isso é escopo desta fatia ou item
  próprio? O caminho retroativo já existe no perfil do paciente; aqui seria só o atalho.
