# R-55 — Histórico sem perda de dado (dedup por âncora só serve à pendência)

> **SPEC** · fase `proposta` — aguardando aprovação
> **Modelo:** Opus 5 (contrato de servidor + decisão de agrupamento na apresentação)
> **Depende de:** nada. Zero migration, zero escrita nova, zero query nova.
> **Bloqueia:** histórico detalhado (absorve "Já feito"), C6 do cockpit — nenhum dos dois
> deve entrar antes, ou herdam o mesmo dado incompleto.

## 0. O problema, com prova no banco

`chaveAncora` ([get-meu-dia.ts:176-181](../../src/server/dashboard/get-meu-dia.ts)) identifica
um evento por `[tipo, origem, nivel, arcada, quadrante, dente, faces, papel_no_grupo]` — sem
data, sem `ficha_id`, sem `id`. Em `:312-316` um único Map guarda o "vencedor" por essa chave
(o de `registrado_em` mais recente) e alimenta as **duas** leituras da tela: a pendência
(correto) e o histórico/acumulado (bug).

Prova real, medida no banco de produção em 2026-08-03:

```sql
select paciente_id, tipo, nivel, dente, count(*)
from odontograma_eventos where status = 'realizado'
group by paciente_id, tipo, origem, nivel, arcada, quadrante, dente, faces, papel_no_grupo
having count(*) > 1;
```

**4 colisões já existem hoje**, uma com datas diferentes: `endodontia` dente 11 do paciente
`4df91e93`, fichas de 21/07 e 23/07. A ficha de 21/07 perde o evento no filtro de `:369-371`
e cai no fallback `resumo` ("Evolução") — o histórico mente sobre o que aconteceu naquela
visita.

**Quem é atingido pior:** todo `nivel='boca'` (profilaxia, flúor, clareamento, exame
periodontal) tem arcada/quadrante/dente/faces sempre `null` — logo toda ocorrência do mesmo
tipo, no mesmo paciente, é a mesma chave, para sempre. É a explicação literal do relato do
dentista (03/08): repetir uma profilaxia "não registra como novo procedimento".

## 1. A distinção que resolve

São duas perguntas diferentes dividindo o mesmo Map por acidente de reuso:

| | Leitura de estado (pendência) | Leitura de fato (histórico/acumulado) |
|---|---|---|
| Pergunta | esta âncora está em aberto agora? | o que foi feito neste paciente? |
| Unidade | âncora clínica | linha do banco (`id`) |
| Colapso | obrigatório | proibido |

**A correção não troca a chave — separa as passagens.** `chaveAncora` e o reduce
"`registrado_em` desc, 1º visto vence" ficam intocados, servindo só à pendência. Histórico e
acumulado passam a ler `eventosRaw` filtrado por `status === 'realizado'`, sem Map de vencedor
— cada linha do banco aparece.

⚠️ **Risco descartado, registrado pra não voltar:** pôr `id`/`ficha_id` dentro de
`chaveAncora` "resolveria" trocando por um bug pior — o evento `realizado` deixaria de
compartilhar chave com o `indicado` que ele fecha, e pendências já resolvidas (inclusive
assinadas) reabririam a fila inteira. `get-meu-dia.ts:252-258` já documenta esse modo de
falha, ocorrido em 31/07 — não repetir.

## 2. Contrato — types (`src/server/dashboard/get-meu-dia.ts`)

```typescript
export interface MeuDiaEventoVisita {
  id: string;
  tipo: TipoRegistroOdontograma;
  dente: number | null;
  arcada: Arcada | null;
  quadrante: QuadranteFDI | null;
  faces: FaceDental[];          // NOVO — sem isso, faces diferentes do mesmo dente
  observacao: string | null;    //        renderizam linhas idênticas
}

export interface MeuDiaOcorrenciaFeita {
  id: string;
  data: string;                 // realizado_em ?? registrado_em
  observacao: string | null;
  fichaId: string | null;
}

/** Deixa de ESTENDER MeuDiaEventoVisita — vira grupo por âncora, não evento solto. */
export interface MeuDiaEventoFeito {
  chave: string;                 // chave de React (chaveAncora) — nunca id de banco
  tipo: TipoRegistroOdontograma;
  dente: number | null;
  arcada: Arcada | null;
  quadrante: QuadranteFDI | null;
  faces: FaceDental[];
  origem: OrigemRegistro;        // NOVO — badge "feito" × "pré-exist." correto
  ocorrencias: MeuDiaOcorrenciaFeita[];  // ≥ 1, mais recente primeiro
}
```

`MeuDiaPendencia`, `MeuDiaVisita` (exceto o JSDoc de `:72-75`, que descreve uma regra morta —
reescrever), `MeuDiaContexto`, `MeuDiaSlot`, `MeuDiaCatalogoProcedimento`: **inalterados**.

## 3. Comportamento — o que muda em `get-meu-dia.ts`

| Onde | Muda para |
|---|---|
| `:269` (select) | acrescenta `realizado_em` — único campo de data que a RPC de fechamento atualiza |
| `:176-181` (`chaveAncora`) | **não muda uma letra** |
| `:312-316` (`vencedorPorAncora`) | **não muda** — continua alimentando só a pendência |
| `:321-345` (loop) | perde o `else`: monta só `pendenciasPorPaciente` |
| novo | 2ª passagem sobre `eventosRaw`: todo evento `status === 'realizado'`, sem dedup, na ordem da query |
| `:369-371` (`visitas[].eventos`) | mesmo filtro por `ficha_id`, agora sobre a lista bruta; `.map` leva `faces`/`observacao` |
| `:376-383` (`jaFeito`) | agrupa por `chaveAncora` como **agregação** (nunca descarte), monta `ocorrencias[]` ordenadas por data desc |

Zero mudança em: RLS, RPC, `salvarVisitaMeuDia`, migration.

## 4. Apresentação

**Ajuste 03/08 (ele pediu pra cortar antes de aprovar):** "Já feito" está pra sair no C6 — não
vale desenhar a versão polida de um componente que morre em seguida. `ja-feito-bloco.tsx`
recebe só o **mínimo pra não quebrar e não perder dado** enquanto o C6 não chega:

- 1 linha por grupo (`chave`), sempre — sem a divisão "1 vs. 2 linhas" cogitada antes.
- Badge de contagem `n×` ao lado do badge de estado, só quando `n > 1`. Data mostrada = a da
  ocorrência mais recente do grupo (`ocorrencias[0].data`).
- Badge de estado lê `origem` real (`feito` × `pré-exist.`) — troca de 1 linha, corrige o bug
  de hoje (carimba "feito" nos 2 eventos `preexistente` que já existem no banco), custo zero.
- **Sem** sub-lista de ocorrências, sem "+N", sem observação visível aqui — isso é trabalho de
  apresentação que o C6/histórico detalhado decide depois, com o componente certo.
- Chips do resumo fechado (`RESUMO_MAX`) ganham o mesmo `n×`; nada além disso.

**Contador do bloco continua `.length` da lista renderizada** (G7 do contrato R-46) — `jaFeito`
já vem agregado do servidor. Medido: 114 eventos realizados hoje, 4 colisões → **110 grupos
antes e depois**. A correção não muda nenhum número que o dentista já vê.

`historico-bloco.tsx` **recebe o tratamento completo**, sem o corte acima — a coluna esquerda
não sai no C6, então `ondeLabel` ganha face e o texto por evento fica correto sem prazo de
validade. Sem agregação aqui: histórico é cronológico por ficha, não por âncora.

## 5. Invariantes

1. Pendência resolvida não ressuscita — `chaveAncora` e o reduce, byte-idênticos.
2. "fazer hoje →" fecha o mesmo registro — `id` de `MeuDiaPendencia` intacto.
3. Nenhuma ocorrência realizada some da tela — soma de `ocorrencias` renderizadas ==
   `count(*) where status='realizado'`.
4. Recidiva aparece nos dois blocos ao mesmo tempo (mesma âncora em "A fazer" e "Já feito") —
   é clinicamente correto, não é bug. Precisa estar escrito, senão o QA reporta como defeito.
5. Zero escrita, zero migration, zero query nova.

## 6. Gates

- **G1** — os 4 grupos de colisão reais (query da §0) aparecem corretamente: "Já feito" mostra
  1 grupo com badge `2×` (data = ocorrência mais recente); o histórico expandido mostra a
  visita mais antiga com a linha do procedimento, não "Evolução".
- **G2** — contagem: soma de ocorrências == `count(*) realizado` por paciente; grupos == badge.
- **G3** — pendências inalteradas antes/depois (mesmo `count(*) indicado` por paciente).
- **G4** — faces: dente com 4 restaurações em faces diferentes vira 4 grupos distintos, não 4
  linhas idênticas.
- **G5** — badge `pré-exist.` nos eventos `origem='preexistente'`, nunca `feito`.
- **G6** — paridade: o histórico do Meu dia bate com o que o FichasTab já mostra pro mesmo
  paciente (que nunca dedupla por âncora).
- **G7** — `git diff --stat` não toca `supabase/`, `actions.ts`, `salvarVisitaMeuDia`;
  typecheck + lint + build limpos.

## 7. Fronteira e fila

**Fora deste item:**
- `grupo_id` na decisão de pendência ("em andamento" derivado) → R-51, que herda a trava do
  algoritmo intacta.
- Upsert que não atualiza `ficha_id`/`registrado_em` no fechamento de pendência → item próprio,
  parente do R-54.
- Gerador de duplicata (`dedupEventosDraft` não roda no caminho do Meu dia) → item próprio.
- A apresentação polida de "Já feito" — decisão dele, já indicada em conversa de 03/08: o
  componente sai/absorve no C6. Este item conserta o **dado** e entrega só o mínimo (§4); o
  C6 decide o resto.

## 8. Emenda necessária — R-46 antes de codar

`R-46-cockpit.md:50` e `R-46-cockpit-contrato.md §2` travam "o algoritmo do vencedor por
âncora não muda" sem distinguir pendência de histórico — e o `ROADMAP.md` já credita o R-51
como dono da mesma função. As duas travas precisam de uma linha de exceção antes deste item
entrar em execução: **valem só para o lado da pendência** (`vencedorPorAncora` +
`pendenciasPorPaciente`); histórico e acumulado saem da trava. Feito nesta mesma sessão —
ver as duas edições em `R-46-cockpit.md` e `R-46-cockpit-contrato.md`.
