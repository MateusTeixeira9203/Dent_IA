# R-107b — perfil do dente: busca livre, tipo genérico, dente ausente

> **SPEC** · fase **`aprovada`** — decisões tomadas em debate por ele (12-13/08).
> **Aberto:** 2026-08-13 · **Fechado:** —
> **Modelo:** Sonnet 5 — desenho já fechado; risco real é threading de prop em 5 call sites,
> não ambiguidade.
> **Irmãs:** [R-107a](R-107a-barra-meu-dia.md) (barra do Meu dia, codada e testada 13/08).
> [R-107c](R-107c-altura-estavel-perfil-dente.md) (altura do card — separada por ser mudança
> de CSS, sem relação de arquivo com esta).
> **Verificação obrigatória antes de codar** (mesmo princípio do documento que ele colou pra
> abrir o debate, §8.3): confirmar que a migration 139 ainda está livre — `ls
> supabase/migrations/ | sort | tail -3` — antes de criar o arquivo. Pode ter mudado entre a
> escrita desta spec e a execução.

## 1. Problema

O painel do dente (`ToothDetailPanel.tsx`) tem 3 limitações que ele apontou ao vivo:

1. **Sem escape hatch.** Só lança os 9 tipos fixos do array `CHIPS`. Se o procedimento não
   está ali (faceta é o exemplo dele), não tem como registrar sem sair do painel.
2. **Incluso e Extração competem por espaço sem necessidade.** Uso real na base (conferido em
   produção, 13/08): `inclusao` = 1 evento, 1 paciente. `exodontia` = 37. O chip de Incluso é
   peso morto pro caso de uso dele.
3. **Não existe "dente que já chegou faltando".** Hoje a única forma de marcar ausência é
   lançar `exodontia` como `realizado` — o que é um registro falso (diz que o dentista extraiu
   um dente que nunca tocou). O achado é do padrinho dele, não de uso próprio.

## 2. Decisão

- **Incluso sai do array `CHIPS`** (UI). O tipo `inclusao` continua existindo no TS e no CHECK
  do banco — o evento real na base não é tocado, não é migration de remoção.
- **Campo de busca livre** no painel, abaixo dos chips — reaproveita `casarProcedimentoLocal`
  tal qual (zero rede, zero IA, já tem 28/28 fixtures). Resolve pro mesmo fluxo que os chips
  já usam.
- **Procedimento sem tipo estrutural correspondente vira tipo genérico** (`outro`) — pinta o
  dente com a cor do status, **sem símbolo próprio** (ele confirmou: "não é muito diferente de
  identificar, como a restauração" — só precisa aparecer, não precisa de desenho especial).
- **Oferece salvar no catálogo com preço** (decisão dele, opção b da conversa) — não bloqueia o
  registro; é uma ação secundária opcional que faz a próxima vez vir pronta.
- **Dente ausente reaproveita `exodontia` + `origem: 'preexistente'`** (decisão dele, opção b) —
  não cria tipo novo. O mecanismo de renderização (contorno tracejado, badge "Pré-existente")
  já existe e já funciona pra este caso sem tocar em `Odontograma.tsx`/`buildResumos`.
- Vale nos **2 lugares** que montam `ToothDetailPanel`: Meu dia (`meu-dia-client.tsx`) e a
  ficha do paciente (`FichasTab.tsx`, 2 call sites — criação e histórico).

## 3. Contrato técnico

### 3.1 Arquivos tocados

| Arquivo | Muda |
|---|---|
| `supabase/migrations/YYYYMMDDHHMMSS_139_odontograma_tipo_outro.sql` (novo) | `alter table odontograma_eventos drop/add constraint` — CHECK ganha `'outro'` (mesmo padrão da migration 106) |
| `src/types/odontograma.ts` | `TipoRegistroOdontograma` ganha `\| 'outro'`; `TIPO_LABEL.outro = 'Outro procedimento'` |
| `src/components/odontograma/ToothDetailPanel.tsx` | `inclusao` sai de `CHIPS`; novo campo de busca; novo botão "Dente ausente"; `cycleDenteTipo`/`criarDenteTipo` para o tipo `exodontia` passam a filtrar por `origem === 'clinica'` ao procurar o evento existente (novo parâmetro `catalogoProcedimentos?`) |
| `src/app/dashboard/meu-dia/_components/meu-dia-client.tsx` | passa `catalogoProcedimentos` pro `<ToothDetailPanel>` (linha ~613) — já está em escopo no componente, só falta a prop |
| `src/components/pacientes/paciente-detail-client.tsx` | query de `procedimentosClinica` (linha ~549-556) ganha `categoria` no `.select()`; novo prop repassado pra `FichasTab` |
| `src/components/pacientes/FichasTab.tsx` | recebe `catalogoProcedimentos` via prop nova, repassa pros 2 call sites do `ToothDetailPanel` (linhas ~1784, ~2217) |

**Reusa sem tocar:** `criarProcedimento` (`configuracoes/actions.ts:191`) pro "salvar no
catálogo" — já aceita `nome`/`categoria`/`preco_padrao`/`duracao_minutos`, já autoriza
`dentista` (não só admin, confirmado em `permissions.ts:29`). `casarProcedimentoLocal` — zero
mudança na função.

### 3.2 Types

```typescript
// src/types/odontograma.ts
export type TipoRegistroOdontograma =
  | 'carie_restauracao' | 'exodontia' | 'endodontia' /* ...os 16 de sempre... */
  // R-107b — procedimento digitado sem tipo estrutural correspondente (ex.: faceta).
  // Ancora em dente (nunca face — decisão dele: simples, sem seletor). Pinta com a cor do
  // status; sem símbolo próprio (buildResumos não tem case pra 'outro' — cai fora do switch,
  // só a cor dominante, já setada antes do switch, se aplica).
  | 'outro';

export const TIPO_LABEL: Record<TipoRegistroOdontograma, string> = {
  // ...os 17 de sempre...
  outro: 'Outro procedimento',
};
```

```typescript
// ToothDetailPanel.tsx — novo prop
export interface ToothDetailPanelProps {
  // ...os existentes...
  /** R-107b — catálogo pro match local (§3.1). Ausente = busca só casa os 17 (18 com
   *  'outro') tipos estruturais, sem sugestão de catálogo — mesmo padrão de degradação que
   *  `captura-livre-card.tsx` já usa. */
  catalogoProcedimentos?: MeuDiaCatalogoProcedimento[];
}
```

### 3.3 Comportamento — busca livre

Campo de texto abaixo da faixa de `CHIPS` (mesma faixa, novo elemento). Ao confirmar (Enter ou
botão):

1. `casarProcedimentoLocal(texto, catalogoProcedimentos ?? [])` — mesma função do campo mágico.
2. **Casou tipo estrutural** → `criarDenteTipo`/`cycleDenteTipo` de sempre, mesmo caminho que
   clicar o chip.
3. **Casou item de catálogo** → mesma pergunta "qual tipo clínico?" que o campo mágico já usa
   (`registrar-painel.tsx`, bloco `catalogoPendente`) — consistência de interação entre os 2
   pontos de entrada, não 2 padrões diferentes pro dentista aprender.
4. **Não casou nada** → botão "Lançar '<texto>' como procedimento" aparece. Clique cria evento
   `tipo: 'outro'`, `ancora: {nivel:'dente', dente}`, `status: 'realizado'` (mesmo default do
   R-107a), `observacao: texto`. Abaixo, ação secundária opcional "Salvar no meu catálogo" —
   expande um campo de preço; confirmar chama `criarProcedimento({ nome: texto, descricao: '',
   categoria: 'Outros', preco_padrao: valorDigitado, duracao_minutos: 30 })`. Pular esta ação
   não impede o registro — ele já aconteceu no passo anterior.

### 3.4 Comportamento — dente ausente

Botão próprio "Dente ausente" (fora do array `CHIPS`, estilo visual igual). Toggle:

```typescript
function toggleAusente() {
  const i = eventos.findIndex(
    (e) => e.tipo === 'exodontia' && e.origem === 'preexistente' && e.ancora.dente === dente,
  );
  if (i === -1) {
    onChange([...eventos, {
      id: crypto.randomUUID(), tipo: 'exodontia', status: 'realizado',
      origem: 'preexistente', momento_planejado: 'sessao_atual',
      ancora: { nivel: 'dente', dente }, grupo_id: null, papel_no_grupo: null,
      observacao: '', realizado_em: null, // data desconhecida — pré-existente não tem "quando"
    }]);
  } else {
    onChange(eventos.filter((_, j) => j !== i));
  }
}
```

**Sem mudança em `buildResumos`/`Odontograma.tsx`.** `case 'exodontia': if (status ===
'realizado') r.ausente = true` já não checa `origem` — herda o desenho tracejado de graça.
`corDoRegistro('realizado', 'preexistente')` já devolve `slate` — badge "Pré-existente" no
painel também já existe (`temPreexistente`, linha 161 do arquivo atual).

**Ponto que exige mudança real:** o chip normal de "Extração" (`cycleDenteTipo('exodontia',
[...])`) usa `findIndex` só por `tipo === 'exodontia' && ancora.dente === dente` — sem filtrar
`origem`, ele encontraria o evento de "Dente ausente" e o confundiria com uma extração em
andamento. `cycleDenteTipo`/`criarDenteTipo`, especificamente para `exodontia`, passam a
filtrar `origem === 'clinica'` na busca do índice — as 2 ações nunca colidem.

## 4. Invariantes

- [ ] `inclusao` continua no CHECK do banco, no TS, em `TIPO_LABEL` — só sai do array `CHIPS`
- [ ] Evento de `inclusao` já existente na base (1, produção) renderiza idêntico a antes
- [ ] "Dente ausente" e "Extração" nunca colidem — marcar um não altera o outro, mesmo dente
- [ ] `outro` nunca aparece no array `CHIPS` fixo — só nasce pela busca
- [ ] `criarProcedimento` não muda de assinatura — R-107b só passa argumentos, não toca a função
- [ ] Nenhuma mudança em `Odontograma.tsx`/`buildResumos` — dente ausente e tipo genérico
      pintam usando mecanismo que já existe

## 5. Gates de aceite

- [x] **G1** — chip "Incluso" sumiu do painel nos 2 lugares (medido por DOM:
      `inclusoAindaExiste: false`). Tipo continua no TS/CHECK; o 1 evento da base não foi tocado
- [x] **G2** — testado ao vivo (dente 21): digitar "faceta" → botão "Lançar 'faceta' neste
      dente" → dente pintou, evento "Outro procedimento / faceta" na lista e card em "Nesta ficha"
- [x] **G3** — testado ao vivo: digitar "canal" → sugestão "Canal" → clique abriu a FICHA
      ENDODÔNTICA, idêntico ao chip
- [x] **G4** — testado ao vivo: digitar o nome de um item real do catálogo → "&ldquo;…&rdquo; —
      qual tipo clínico?" com os chips, igual ao campo mágico
- [x] **G5** — medido por DOM (não por pixel): dente 25 com "Dente ausente" → contador "Nesta
      ficha 1"; clicar "Extração" → contador **2**, com os 2 pills distintos coexistindo
      (`['Pré-exist.', 'A fazer']`). Desligar "Dente ausente" → contador volta a 1 e sobra só
      `['A fazer']` — a extração não foi tocada. **Não colidem nos 2 sentidos**
- [x] **G6** — testado ao vivo com escrita real: item `zzteste apagar R107b` gravado em
      `procedimentos` (categoria `Outros`, R$350,00, 30min, ativo) — confirmado por SQL.
      **Item de teste apagado do banco depois de conferido**
- [x] **G7** — testado ao vivo na ficha do paciente (`FichasTab.tsx`, "Nova Evolução", dente
      26): busca presente, "Dente ausente" presente, "Incluso" ausente, lançamento avulso
      funcionando. Rascunho cancelado sem salvar
- [x] **G8** — typecheck + lint + `next build` limpos. **Zero erro de console** em toda a
      sessão de teste (aba nova, sem histórico de HMR)

### Achado durante a verificação (não corrigido — fora do contrato desta fatia)

A busca **não é type-ahead**: `casaLabel` testa `textoDigitado.includes(label)`, então digitar
"zzt…" **não** encontra "zzteste apagar R107b" — só o nome (quase) inteiro casa. É o
comportamento correto pro caso pro qual `casarProcedimentoLocal` foi escrito (casar labels
curtos dentro de um relato longo ditado), e errado pro caso "busca incremental num catálogo".
Não muda nada aqui — quem não acha por prefixo cai no "Lançar … neste dente", que é o escape
hatch e resolve. Mas se o catálogo dele crescer, isto vira atrito real: **candidato a item
próprio** (busca por prefixo/substring no catálogo, separada do matcher de relato).

## 6. Fora de escopo

- Seletor de face pro tipo `outro` — nasce sempre nível-dente, nunca face (decisão dele:
  simples, sem UI de seleção)
- Reordenar/priorizar `outro` por frequência de uso — mesma decisão de 31/07 que vetou
  auto-ordenação por uso (registrado no `R-107a` §2)
- Editar `duracao_minutos`/`categoria` no fluxo rápido de "salvar no catálogo" — nasce com
  default (`'Outros'`, 30min), edição fina continua em `/dashboard/configuracoes`
- Migrar o 1 evento de `inclusao` existente pra outro tipo — fica como está (§4 invariante)
- R-107c (altura estável do card) — spec própria, arquivo diferente
