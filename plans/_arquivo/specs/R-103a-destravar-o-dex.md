# R-103a — Destravar o Dex e trocar pela casca de 3 colunas

> **SPEC** · **R-103a** · status: **✅ no ar e verificado por ele**
> **Aberto:** 2026-08-11 · **Fechado:** 2026-08-12 · **Fase:** concluída — `b427391`
> **Modelo:** Sonnet 5 — é deleção + fiação + casca contra artefato já aprovado. Zero schema,
> zero RLS, zero prompt de IA. (O R-103b escala pra Opus: lá a definição de pendência cruza a
> assimetria de RLS entre `fichas` e `agendamentos`.)
> **Master:** [R-103](R-103-painel-do-dex.md) — o diagnóstico (C1-C4), a medição e as perguntas
> abertas moram lá. **Este doc não repete nada disso.**
> **Depende de:** nada codado. **Bloqueia:** R-103b e R-103c (os dois pousam nesta casca).
> **Artefato:** `plans/artefatos/R-103-painel-do-dex.html` (3 colunas, aprovado por ele)

## 1. Decisão

| # | Decisão | Alternativa descartada | Motivo |
|---|---|---|---|
| D1 | Primeiro **limpar, depois destravar**, e só então query nova | Começar pelas pendências (o que ele citou primeiro) | 3 das 4 causas do master são deleção ou 1 condição. Query nova em cima de painel que não abre não é verificável. E a limpeza vem antes de destravar porque destravar **expõe** o mock (§7) |
| D2 | **Reescrever no lugar** (`dex-widget.tsx` mantém mount/portal/listener) e **apagar** `dex-presence.tsx` | Terminar o órfão | O widget atual **já é modal central 75vw×90vh** (`dex-widget.tsx:189-190`) — a geometria que ele quer. O órfão é slide-over de 380px, a que ele rejeitou. O que o órfão tem de bom (tokens semânticos, uso de `/api/dex/alerts`) são ~40 linhas que se copiam |
| D3 | Apagar o órfão **é** o fix do listener duplo | Renomear o evento, ou contexto React | Zero mudança em `floating-dock.tsx` |
| D4 | Hub monta **também pra secretária** | Manter o gate de role | Ela tem os 3 computados e é quem liga pro paciente. Hoje o botão é morto pra ela |
| D5 | Badge = **pendências + notificações não lidas** — **resolvido 11/08** | Só pendências (era **minha** posição, não dele — atribuição corrigida) | As duas zeram quando resolvidas. Mês e novidades **nunca** entram. Com o sino fora (D6), não contar as não lidas deixaria check-in/pagamento sem aviso visual nenhum |
| D6 | Notificação do banco vira a zona **Aconteceu**, na coluna 1, sob "Precisa de você"; **o sino é apagado** | Manter o sino ao lado do hub | **Decisão dele, 11/08:** o painel é o dono único das notificações e o sino sai (*"meio redundante, já não está funcionando muito legal"*). O artefato não tem casa pras 13 `TipoNotificacao` — essa casa é a zona Aconteceu, e ela entra no MESMO commit que remove o sino |
| D7 | Marcar lida **só no clique** + botão "marcar todas" | Comportamento atual | `notification-bell.tsx:137` chama `markAllNotifsRead()` **ao abrir**, e `markRead` filtra a lista (`:126`) — abrir apaga antes de ler |
| D8 | Novidades = **arquivo estático versionado** (`src/lib/novidades.ts`) | Tabela + tela de admin | Zero infra, zero schema, zero custo, e a fonte de verdade é o nosso `ROADMAP.md`. Tabela só quando houver autor que não é o dev |
| D9 | **Apagar** as 2 métricas mentirosas em vez de corrigir agora | Corrigir `pacientesInativos60d` já aqui | O conserto honesto dela **é** a query de "parou de vir" — isso é o R-103b. Uma fase sem o número é melhor que uma mostrando 0 (ou 230 nomes) |
| D10 | Coluna 2 aqui = **"Hoje e a semana"**, com o que já existe | Já entregar o mês | Mês exige query nova (R-103c). Coluna vazia estraga o layout aprovado |
| D11 | Escopo do dado = `scopado = role !== 'secretaria'` | Sempre clínica inteira | Precedente em produção (`financeiro/actions.ts:252`). `agendamentos_access` (089) é **por dentista**; `fichas_select` (099) é **da clínica**. Sem escolher explicitamente, app e RLS discordam — a classe de bug que o silo já produziu 3× |
| D12 | **Sem WhatsApp em lote.** CTA do card abre a lista/agenda | "Chamar os 3 no WhatsApp", como o artefato mostra | Disparo em massa é superfície nova, 0 uso hoje, sujeita a template aprovado e janela de 24h da Meta. Muda o item de *painel* pra *campanha* |
| D13 | Bloco de paciente e `consultation-context` **saem** do hub | Manter | `src/app/consulta` não existe (R-72 apagou); o regex `dex-widget.tsx:49` nunca casa. Deletar a rota órfã é do R-95, não daqui |

## 2. Objetivo

O Dex abre do dock e **abre de verdade**, mostrando só o que tem origem em query.

**Cobre:** destravar C1-C4 · apagar mock e as 2 métricas mentirosas · desgatear os computados pro
dentista · corrigir o sino que marca lido ao abrir · casca de 3 colunas com tokens semânticos ·
faixa "agora" · zona Aconteceu · coluna 2 "Hoje e a semana" · coluna 3 de novidades por arquivo
estático · badge no botão do dock.

**Não cobre:** as 3 pendências novas (R-103b) · números do mês (R-103c) · curso/vídeo/guia
(R-104) · WhatsApp em lote (D12) · mascote desenhado (o avatar segue no espírito do `Bot` do
lucide, como no artefato) · mobile (o hub é modal de desktop; o dock mobile não muda) · deletar
`/api/dex/consultation-context` e `sidebar*.tsx` (candidatos a morto — R-95).

## 3. Assunções

- **`sidebar-content.tsx:320` tem uma 2ª instância do sino, provavelmente já morta:** `grep` não
  achou importador de `layout/sidebar`. **Não confirmado por compilador** — a regra do projeto é
  verificar com compilador, não com grep. Trato a instância viva como sendo só
  `floating-dock.tsx:163` e não toco nesse arquivo.
- **Não observei o realtime de `notificacoes` acendendo a tela.** A subscrição existe
  (`notification-bell.tsx:80-103`); que funciona hoje é assunção. **G9 é o gate.**
- **Não medi o volume de notificações não lidas por clínica.** Se forem centenas, a coluna 1
  precisa de limite/agrupamento (o sino já agrupa a partir de 3, `notification-bell.tsx:149`) e o
  badge de D5 fica grande.
- "Ver detalhes" da novidade abre texto nosso no próprio painel — não navega pra changelog
  externo, que não existe.

---

## 4. Contrato técnico

### 4.1 Schema e RLS

**Nenhuma migration. Nenhuma policy nova. Nenhuma coluna nova.** A única escrita do hub é
`notificacoes.lida = true`, que já tem policy de UPDATE com o mesmo predicado do SELECT
(migration 103). Se algo aqui pedir schema, para e vira spec própria.

### 4.2 TypeScript

```typescript
// src/lib/dex/tipos.ts — novo
export type DexSeveridade = 'alta' | 'media' | 'baixa';

/** Card da zona "Precisa de você". Some quando resolve. */
export interface DexPendencia {
  id: string;                    // estável entre fetches (key + dedup)
  severidade: DexSeveridade;
  titulo: string;                // "1 orçamento sem resposta há 12 dias"
  descricao: string;
  valorParado: number | null;    // R$ em jogo, quando existe
  chips: string[];               // até 4 nomes/datas (o artefato mostra chips)
  cta: { label: string; href: string };
}

/** Notificação do banco, na zona "Aconteceu". */
export interface DexEvento {
  id: string;                    // "notif_<uuid>" — formato que o PATCH já espera
  tipo: TipoNotificacao;         // reusa src/lib/notificacoes.ts
  titulo: string;
  mensagem: string;
  href: string | null;
  createdAt: string;             // ISO
}

export interface DexNumero {
  label: string;
  valor: string;                 // já formatado pt-BR
  detalhe: string | null;        // null = sem sublinha (nunca "demo")
}

export interface DexNovidade {
  id: string;                    // slug estável; a chave de "visto" deriva dele
  titulo: string;
  data: string;                  // ISO YYYY-MM-DD
  resumo: string;
  detalhe: string;
}

export interface DexHubData {
  pendencias: DexPendencia[];
  eventos: DexEvento[];
  agora: { proximo: string | null; consultasHoje: number; entrouHoje: number; amanha: number };
  numeros: DexNumero[];
  /** pendencias.length + eventos.length — o único número do badge (D5) */
  badge: number;
}
```

Em `DexContextData` (`api/dex/context/route.ts:6`) — **removidos**: `pacientesInativos60d`,
`pacientesInativos60dList`, `orcamentosAprovadosSemAgendamento`,
`orcamentosAprovadosSemAgendamentoList` (D9). **Renomeado:** `receitaProjetadaHoje` →
`entrouHoje` — não é projeção, é `pagamentos.status='pago'` do dia; o nome errado já produziu dois
rótulos divergentes (`dex-widget.tsx:832` diz uma coisa, `dex-presence.tsx:188` outra).

### 4.3 Rotas — nenhuma nova

O hook faz `Promise.all` nas duas que já existem (padrão que o órfão já usava,
`dex-presence.tsx:165`). Correções dentro delas:

| Rota | Correção | Onde |
|---|---|---|
| `GET /api/dex/context` | remover os 4 campos de D9; renomear `receitaProjetadaHoje`; **guard de status no dinheiro** — a query de `pagamentos` de hoje não tem `orcamentos!inner(status)` nem exclui `rascunho`/`recusado`, mesma classe do R-65 (que corrigiu 6 leituras e não esta); aplicar `scopado` (D11) | `:146-152`, `:196-210`, `:232-249` |
| `GET /api/dex/alerts` | tirar o `if (isSecretaria)` dos 3 computados; janela do "sem confirmação" passa a **hoje + amanhã** (o artefato pede amanhã) | `:137` · `:57-60` |
| `PATCH /api/dex/alerts` | **conferir linhas afetadas** — hoje só checa `error`, e UPDATE barrado por RLS devolve 0 linhas **sem erro**, então a rota responde `{ok:true}` mentindo | `:199-206` |

### 4.4 Componentes

```
src/components/layout/dex-widget.tsx   -- ENXUGADO: mount + portal + listener 'dex-toggle'.
                                          SAI: gate de onboarding, FAB interno (morto —
                                          dashboard-shell passa hideTrigger, :148), MOCK_OPS,
                                          ScoreRing, MiniBar, gerarInsights, InsightView, HomeView
src/components/layout/dex-hub/
  dex-hub-modal.tsx      -- casca: backdrop, modal, header (avatar + saudação + contagem),
                            faixa "agora" (4 células), grid de 3 colunas
  coluna-pendencias.tsx  -- "Precisa de você" + "Aconteceu" (D6)
  coluna-numeros.tsx     -- "Hoje e a semana" (D10); vira "O mês" no R-103c
  coluna-novidades.tsx   -- lista de src/lib/novidades.ts + "visto" em localStorage
  pendencia-card.tsx     -- título, valor parado, descrição, chips, CTA
src/hooks/useDexHub.ts   -- Promise.all das 2 rotas, realtime de `notificacoes` (porta o canal
                            de notification-bell.tsx:80-103), marcar lida, badge, 'dex-badge'
src/lib/dex/pendencias.ts -- (DexAlert[], DexContextData) => DexPendencia[]. Função PURA, sem
                            fetch, sem React — é onde a regra de negócio mora, e é o ponto de
                            extensão que o R-103b vai usar
src/lib/dex/tipos.ts     -- §4.2
src/lib/novidades.ts     -- conteúdo estático (§4.5)
src/components/layout/floating-dock.tsx -- bola ganha badge (ouve 'dex-badge');
                            NotificationBell sai do dock (:161-165)
APAGADO: src/components/layout/dex-presence.tsx      (D2/D3)
APAGADO: src/components/layout/notification-bell.tsx (função migrada pra zona Aconteceu)
```

**Badge entre irmãos:** `DexWidget` e `FloatingDock` são irmãos no `dashboard-shell`. O hub
despacha `new CustomEvent('dex-badge', { detail: { count } })` e a bola ouve — mesmo padrão de
`dex-toggle` que o projeto já usa. Sem provider novo, sem segundo fetch.

### 4.5 Conteúdo das novidades

```typescript
// src/lib/novidades.ts — a fonte é o ROADMAP.md; entrada nova é 5 linhas num commit
export const NOVIDADES: DexNovidade[] = [ /* R-102, R-101, R-99 — as 3 de 10-11/08 */ ];
```

"Visto" por entrada em `localStorage` (`dex_novidade_<id>`) — não vai ao banco, não é dado de
clínica, e não entra no badge (D5): o ponto na coluna 3 é a única indicação.

## 5. Comportamento

| Estado | Quando | Tela |
|---|---|---|
| Carregando | fetch em voo | skeleton das 3 colunas (**não** `DexLoader` — não é processamento de IA) |
| Tudo em dia | 0 pendência e 0 evento | coluna 1 com estado vazio honesto; colunas 2 e 3 seguem cheias; badge ausente |
| Falha de rede | as 2 rotas rejeitaram | linha de erro + botão Atualizar (o header já tem o ícone). **Nunca cair pra número inventado** (I1) |
| Secretária | `role === 'secretaria'` | mesmo hub; os 3 computados dela continuam; coluna 2 sem filtro de dentista (D11) |
| Protético | `role === 'protetico'` | não existe: a bola já não aparece (`floating-dock.tsx:128`) e `alerts` devolve `[]` (`:37`) |

```
[dentista] clica a bola do dock (badge "5")
  -> hub abre no centro; Promise.all(/api/dex/alerts, /api/dex/context)
  -> pendencias.ts classifica e ordena por severidade
  -> col 1 "Precisa de voce" + "Aconteceu" | col 2 hoje/semana | col 3 novidades
  -> clica um evento -> PATCH marca lida (confere linhas) -> sai da lista -> navega no href
  -> clica uma pendencia -> fecha o hub e vai pro href (agenda, orcamento, paciente)
  -> fecha -> badge recalculado; nada foi marcado lido sem clique (D7/I2)
```

| Situação | Sistema faz | Resultado |
|---|---|---|
| Browser novo, dentista que nunca viu o guia | sem gate (C1 morto) | hub abre com dado na 1ª tentativa |
| Secretária clica a bola | widget agora monta pra ela (C2) | hub abre com os 3 computados dela |
| Abre com 4 notificações e fecha sem clicar | nenhum PATCH disparado | as 4 continuam lá e no badge (D7) |
| Pagamento de orçamento `recusado` | guard `orcamentos!inner(status)` | "Entrou hoje" não conta dinheiro fantasma (classe do R-65) |
| Dentista sem CRO, 3 consultas sem confirmar amanhã | computados desgateados | vê 4 pendências, não 1 |

## 6. Referência visual

`plans/artefatos/R-103-painel-do-dex.html` — **aprovado por ele (3 colunas)**. Abrir por HTTP
local (skill `artefato-visual`), nunca `file://`. Os tokens no artefato são **cópia literal de
`globals.css`**, então a implementação usa as classes semânticas direto: `bg-surface`,
`bg-surface-alt`, `text-text-primary`, `text-text-secondary`, `border-border`, `text-teal-ink`,
`--color-warning`/`-ink`, `--color-coral`/`-ink`.

O código que sai daqui é o **oposto** do que existe hoje: `dex-widget.tsx` monta cor por
`isDark ? '#0d0f0e' : '#ffffff'` em `style` inline (`:159-162`) e espalha hex por ~40 lugares.
Nada disso volta (I5). Light **e** dark conferidos, nos 2 roles.

Do artefato ficam de fora nesta fase: os 3 cards de pendência nova (R-103b), o bloco "O mês"
(R-103c) e os 2 cartões de curso (R-104). A coluna 2 entra como "Hoje e a semana" (D10).

---

## 7. Fases

> ⚠️ **A ordem importa, e não é a intuitiva.** Ele confirmou (11/08) que o mock **nunca chegou a
> produção** porque o C1 mantinha o painel fechado — um bug tapou o outro. Logo: **destravar antes
> de limpar publicaria a ficção**. A limpeza vem primeiro, e é invisível pro usuário justamente
> porque o painel ainda está fechado enquanto ela acontece. Nenhuma fase aqui pode subir sozinha
> antes da limpeza.

| Fase | Ações | Risco | Verificável | Depende |
|---|---|---|---|---|
| **1 — Parar de mentir** (era a 2) | apagar `MOCK_OPS`/`ScoreRing`/`MiniBar`/"DEX esta semana"; tirar os 4 campos de D9 de `context`; guard de status no `pagamentos` de hoje; renomear pra `entrouHoje`; aplicar `scopado` | BAIXO-MÉDIO | `grep MOCK_OPS` e `grep demo` não acham nada; "Entrou hoje" bate com o financeiro do mesmo dia. **Invisível em produção** — o painel segue fechado | — |
| **2 — Alerta pro dentista** | tirar `if (isSecretaria)` (`alerts:137`); janela do "sem confirmação" passa a hoje+amanhã; PATCH confere linhas afetadas | MÉDIO | Resposta de `/api/dex/alerts` como dentista traz os computados; contagem bate com a agenda | 1 |
| **3 — Destravar** (era a 1) | remover o gate (`dex-widget.tsx:79-94`, `:98`, `:171`); montar pra secretária (`dashboard-shell.tsx:142`); apagar `dex-presence.tsx` | BAIXO | Perfil limpo de browser: a bola abre **com dado e sem mock**, como dentista **e** secretária | 1, 2 |
| **4 — Casca de 3 colunas** | `dex-hub/*`, `useDexHub`, `pendencias.ts`, `tipos.ts`, tokens, badge por evento | MÉDIO | Lado a lado com o artefato, light e dark, nos 2 roles | 3 |
| **5 — Sino sai** | remover `NotificationBell` do dock (`:161-165`); zona Aconteceu com realtime portado e marcar-lida no clique; apagar o componente | MÉDIO | Notificação aparece no hub, **não** desaparece ao abrir, some ao clicar, realtime vivo | 4 |
| **6 — Novidades** | `src/lib/novidades.ts` (R-99/R-101/R-102) + coluna 3 + "visto" | BAIXO | 3 entradas reais; ponto apaga depois de visto e não volta ao recarregar | 4 |
| **7 — Gates** | rodar G1-G12 (§9) | BAIXO | todos fechados | 1-6 |

**Fases 1 e 2 podem subir sozinhas** (limpeza + correção de rota, sem efeito visível). **A fase 3
é a que liga a luz** — a partir dela o painel existe pro dentista, então ela não sobe sem 1 e 2.

### Riscos

| Risco | Prob. | Mitigação |
|---|---|---|
| Apagar o sino perde notificação viva em produção | média | Fase 5 só depois da 4, e a zona Aconteceu + o realtime entram **no mesmo commit** da remoção. G7 é o gate |
| Reescrever ~1100 linhas de um arquivo que está no ar | média | Fases 1-3 são **deleção e mudança de condição dentro do arquivo atual**, sem componente novo. A fase 4 troca só o conteúdo do portal — mount, portal e listener continuam de pé |
| **Destravar (fase 3) antes da limpeza (fase 1) publica o mock em produção** | **alta, se a ordem for ignorada** | A ordem do §7 existe por isso, e está marcada no topo da tabela. A fase 3 declara dependência explícita de 1 e 2. G3 roda antes de G1 |
| RLS assimétrica gera contagem incoerente | **alta no R-103b**, baixa aqui | Aqui só existem contagens que já rodam hoje. D11 fixa a regra antes do b chegar |
| Secretária passa a ver um hub que nunca montou pra ela; algum bloco supõe dentista | média | Conferir os 2 roles na fase 4. Não é gate de RLS (nenhuma policy muda) — é de UI |
| Hub vira 3º lugar mostrando o mesmo número do Dashboard | média | Coluna 2 é declaradamente provisória (D10); o valor próprio dela é **mensal e comparativo** (R-103c), que nenhuma tela tem hoje |
| Fase 2 apaga um número que ele gostava de ver | baixa | São os dois que devolvem 0 ou 230 nomes. Caminho de volta em D9 (R-103b) |

## 8. Invariantes

- [ ] **I1** — Nenhum número na tela sem origem em query. Zero mock, zero `demo`, zero fallback
      pra valor bonito quando o fetch falha.
- [ ] **I2** — Nada sai da lista de notificação sem gesto explícito (clique no item ou "marcar
      todas"). **Abrir o painel não é gesto.**
- [ ] **I3** — O badge conta só o que zera quando resolvido (pendências + não lidas). Mês e
      novidades nunca entram.
- [ ] **I4** — Toda query do hub filtra `clinica_id` e aplica `scopado` (D11).
- [ ] **I5** — Zero cor hardcoded, hex, `bg-white`, `gray-*` no código novo — só token semântico.
- [ ] **I6** — A única escrita do hub é `notificacoes.lida`, e ela confere linhas afetadas antes
      de reportar sucesso.
- [ ] **I7** — Protético não alcança o hub: os gates de `alerts:37` e `floating-dock:128` ficam.
- [ ] **I8** — Nenhuma policy de RLS é criada, alterada ou removida neste sub-item.

## 9. Gates de aceite

- [ ] **G1** — Browser com localStorage limpo: a bola abre o hub **com dado** na 1ª tentativa,
      como dentista (mata C1)
- [ ] **G2** — Idem logado como secretária (mata C2)
- [ ] **G3** — Nenhum selo `demo` e nenhum número de `MOCK_OPS` em lugar nenhum (C3/I1)
- [ ] **G4** — `grep` no código novo não acha `#`, `bg-white`, `gray-`, `rgba(` (I5)
- [ ] **G5** — Dentista **sem CRO** vê os computados (não confirmados hoje+amanhã, rascunho,
      follow-up) além do aviso de CRO
- [ ] **G6** — "Consultas sem confirmação" bate com a contagem manual na agenda de hoje e amanhã
- [ ] **G7** — Abrir o hub com N não lidas e **fechar sem clicar** deixa as N na lista e no badge
      (I2/D7) — o bug de `notification-bell.tsx:137`
- [ ] **G8** — Clicar uma notificação marca lida, remove, navega; recarregar não a traz de volta;
      e o PATCH devolve erro honesto quando não há linha afetada (I6)
- [ ] **G9** — INSERT em `notificacoes` (2ª aba) acende a zona Aconteceu sem recarregar — o
      realtime sobreviveu à morte do sino
- [ ] **G10** — "Entrou hoje" bate com o financeiro do dia e **não** conta pagamento de orçamento
      `rascunho`/`recusado` (classe do R-65)
- [ ] **G11** — Light **e** dark, nos 2 roles, comparados com o artefato lado a lado
- [ ] **G12** — Badge = pendências + não lidas; some quando ambos zeram; não muda ao rolar as
      colunas 2 ou 3 (I3)

**G1, G2 e G7 definem o item.** Sem G1/G2 o hub continua "bloqueado" — a frase que abriu o item.
Sem G7, trocar o sino por um hub **piora** o que já existe.
