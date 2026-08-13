# R-107d — lote por chip: 1 procedimento pra N dentes selecionados

> **SPEC** · fase **`aprovada`** — decisões tomadas em debate por ele (13/08), incluindo 1
> consulta em produção (faces por lote) que mudou a recomendação inicial.
> **Aberto:** 2026-08-13 · **Fechado:** —
> **Modelo:** Sonnet 5 — mecanismo reaproveita `onde`/`ancorasDoOnde` que já existe; a única
> peça nova de desenho é o seletor de face condicional pra Restauração.
> **Irmãs:** [R-107b](R-107b-perfil-do-dente.md) (busca livre + tipo `outro` — reaproveitados
> aqui tal qual). [R-107a](R-107a-barra-meu-dia.md) (mesma área visual, campo mágico).

## 1. Problema

Selecionar vários dentes no espelho **já funciona hoje** — `onToothToggle`
(`registrar-painel.tsx:409`) acumula em `onde.dentes` a cada clique, e digitar um tipo no
campo mágico depois já cria o evento em todos de uma vez (`ancorasDoOnde(onde)`, testado e
funcionando desde 05/08). O problema não é o mecanismo — é que ele é **invisível**: nada na
tela confirma "3 dentes selecionados", e não existe caminho manual/clicável equivalente aos
chips do painel do dente — só digitando a frase inteira no campo mágico. Ele descreveu o
atrito: "clica, fecha, clica, fecha" pra registrar o mesmo procedimento em vários dentes um
por um.

## 2. Decisão

- Sob o campo mágico, quando `onde.dentes.length >= 2`, aparece uma faixa: **"N dentes
  selecionados: 14, 15, 16 · ✕"** com os mesmos chips do painel do dente (menos os que não
  fazem sentido em lote) + a mesma busca livre do R-107b.
- **Clique num chip aplica no lote inteiro de uma vez** — reaproveita `ancorasDoOnde(onde)`,
  o mesmo caminho que o campo mágico digitado já usa.
- **Restauração pede 1 face antes de aplicar** (não os 17 tipos genéricos, só este) — decisão
  baseada em dado real, não suposição: consultei a base em produção e **quase metade** das
  fichas com 4+ dentes tem faces diferentes por dente — lote "aplica direto" seria errado na
  metade dos casos. Uma pergunta de face resolve o outro caso (mesma face em todos).
- **Faces diferentes por dente continua dente a dente** — não entra matriz dente×face (25
  checkboxes pra um painel de 555px é abstração especulativa, mais lento que clicar dente a
  dente pro caso que existiria pra resolver).
- **Não mexe no clique que abre o histórico do dente** (`setDenteAberto` dentro de
  `onToothToggle`) — ele confirmou que mudar isso é decisão separada, arriscada de misturar
  com o fluxo de 1-dente-só já aprovado.
- Escopo: **só Meu dia** (`registrar-painel.tsx`). A ficha do paciente (`FichasTab.tsx`) tem
  um mecanismo de seleção múltipla próprio e mais antigo (`selectedTeeth`/`teethNotes`, ligado
  ao form de texto livre, não ao `eventosDraft` estruturado) — portar o lote de chips pra lá é
  item novo, não esta fatia (ver §6).

## 3. Contrato técnico

### Arquivo tocado

Só `src/app/dashboard/meu-dia/_components/registrar-painel.tsx` — zero arquivo novo, zero
migration (mesmos tipos do R-107b, já no ar).

### Types (novo estado em `useRegistrarPainel`)

```typescript
// Reusa `onde`/`OndeValor` que já existe — nenhum estado de seleção novo.

const [loteBusca, setLoteBusca] = useState('');
const [loteCatalogoPendente, setLoteCatalogoPendente] = useState<MeuDiaCatalogoProcedimento | null>(null);
/** Restauração em lote pede a face ANTES de aplicar — null = chip ainda não clicado. */
const [loteFacePendente, setLoteFacePendente] = useState(false);
/** Espelha o "salvar no catálogo" do R-107b — mesmo texto, mesma action reusada. */
const [loteAvulso, setLoteAvulso] = useState<string | null>(null);
const [lotePrecoCatalogo, setLotePrecoCatalogo] = useState<string | null>(null);
const [loteSalvandoCatalogo, setLoteSalvandoCatalogo] = useState(false);
```

### Comportamento

**Chips oferecidos em lote** (subconjunto de `TIPO_LABEL` — exclui os que não fazem sentido
em lote clicável):

| Entra | Fora | Por quê |
|---|---|---|
| Canal, Coroa total, Implante, Pino/núcleo, Extração, Fratura, Lesão periapical | Ponte | Ponte já tem fluxo próprio extremo→extremo, aplicar em N soltos não faz sentido clínico |
| Restauração (com face) | Selante | Selante sempre ancora em face 'O' fixa — cabe no mesmo grupo da Restauração, mas como ele não pediu, fica fora desta fatia (nota em §6) |
| Dente ausente | Esfoliação | Batch de "chegou faltando" é o mesmo padrão do R-107b, mas em N dentes — esfoliação (só decíduo, só realizado) é caso raro demais pra entrar sem pedido |
| Busca livre + `outro` | — | Mesmo escape hatch do R-107b, reusado tal qual |

```typescript
/** Chips dente-inteiro (não-Restauração): cria em todos de uma vez, sem cycle — mesma
 *  filosofia do `registrar()` que o campo mágico digitado já usa pro caminho de `onde`.
 *  Guard simples contra duplicata óbvia: pula dente que JÁ tem esse tipo com origem clínica. */
function aplicarLote(tipo: TipoRegistroOdontograma) {
  if (!onde) return;
  const novos = onde.dentes
    .filter((d) => !eventosDraft.some((e) => e.tipo === tipo && e.origem === 'clinica' && e.ancora.dente === d))
    .map((d) => ({
      id: crypto.randomUUID(), tipo, status: 'realizado' as const, origem: 'clinica' as const,
      momento_planejado: 'sessao_atual' as const, ancora: { nivel: 'dente' as const, dente: d },
      grupo_id: null, papel_no_grupo: null, observacao: '', realizado_em: dataPadrao,
    }));
  setEventosDraft([...eventosDraft, ...novos]);
}

/** Restauração em lote: pede a face 1x, aplica em todos os dentes do lote com a MESMA face. */
function aplicarLoteRestauracao(face: FaceDental) {
  if (!onde) return;
  const novos = onde.dentes.map((d) => ({
    id: crypto.randomUUID(), tipo: 'carie_restauracao' as const, status: 'realizado' as const,
    origem: 'clinica' as const, momento_planejado: 'sessao_atual' as const,
    ancora: { nivel: 'face' as const, dente: d, faces: [face] },
    grupo_id: null, papel_no_grupo: null, observacao: '', realizado_em: dataPadrao,
  }));
  setEventosDraft([...eventosDraft, ...novos]);
  setLoteFacePendente(false);
}

/** "Dente ausente" em lote — mesma regra do R-107b (exodontia + preexistente), batelada. */
function aplicarLoteAusente() {
  if (!onde) return;
  const novos = onde.dentes.map((d) => ({
    id: crypto.randomUUID(), tipo: 'exodontia' as const, status: 'realizado' as const,
    origem: 'preexistente' as const, momento_planejado: 'sessao_atual' as const,
    ancora: { nivel: 'dente' as const, dente: d },
    grupo_id: null, papel_no_grupo: null, observacao: '', realizado_em: null,
  }));
  setEventosDraft([...eventosDraft, ...novos]);
}

/** Busca livre em lote — mesmo matcher do R-107b (`casarProcedimentoLocal`), aplicado a
 *  `onde.dentes` em vez de 1 dente fixo. Tipo casado sem chip correspondente cai no ciclo
 *  padrão `['indicado','realizado']`, mesma regra do R-107b. */
function aplicarSugestaoLote(s: SugestaoLocal) {
  if (s.catalogo) { setLoteCatalogoPendente(s.catalogo); return; }
  if (s.tipo) aplicarLote(s.tipo);
  setLoteBusca('');
}

/** Nada casou — mesmo escape hatch do R-107b, em lote. */
function lancarLoteAvulso() {
  if (!onde) return;
  const texto = loteBusca.trim();
  if (!texto) return;
  const novos = onde.dentes.map((d) => ({
    id: crypto.randomUUID(), tipo: 'outro' as const, status: 'realizado' as const,
    origem: 'clinica' as const, momento_planejado: 'sessao_atual' as const,
    ancora: { nivel: 'dente' as const, dente: d },
    grupo_id: null, papel_no_grupo: null, observacao: texto, realizado_em: dataPadrao,
  }));
  setEventosDraft([...eventosDraft, ...novos]);
  setLoteAvulso(texto);
  setLoteBusca('');
}
```

**UI** — nasce logo abaixo da faixa de chips de rotina do R-107a (mesmo card do campo mágico),
só quando `onde && onde.dentes.length >= 2`:

```
N dentes selecionados: 14, 15, 16                                    ✕ limpar
[Canal] [Coroa total] [Implante] [Pino/núcleo] [Extração] [Fratura]
[Lesão periapical] [Restauração ▾] [Dente ausente]
🔍 Outro procedimento — digite
```

Clicar "Restauração ▾" expande as 5 letras de face (V M O D L, mesmo `FACES` array do
`ToothDetailPanel`) em vez de aplicar direto; clicar uma face aplica e recolhe. "✕ limpar"
chama `setOnde(null)` — não desfaz o que já foi registrado, só esvazia a seleção.

"Salvar no catálogo" do avulso em lote reusa `criarProcedimento` tal qual — mesma ação do
R-107b, chamada uma vez (o nome do procedimento é o mesmo pros N dentes, preço também).

## 4. Invariantes

- [ ] `onToothToggle` não muda de comportamento — a faixa de lote é só uma leitura nova de
      `onde`, nunca uma escrita que o clique no dente não fizesse antes
- [ ] Faixa de lote só aparece com `onde.dentes.length >= 2` — 1 dente selecionado continua
      exclusivamente pelo fluxo de `ToothDetailPanel`/`DenteHistoricoCard`
- [ ] Nenhum chip de lote cria evento duplicado óbvio (guard de `aplicarLote` — mesmo tipo,
      mesma origem clínica, mesmo dente, não repete)
- [ ] Restauração em lote sempre pede face antes — nunca aplica sem escolha explícita
- [ ] `FichasTab.tsx` — zero mudança nesta fatia

## 5. Gates de aceite

- [x] **G1** — testado ao vivo: clicar 14 → voltar à boca → 15 → voltar à boca → 16 → faixa
      "3 dentes selecionados: 14, 15, 16" (confirmado por anel de seleção no SVG, não só texto)
- [x] **G2** — testado ao vivo: clicar "Canal" → contador "Nesta ficha" 0→3, lista mostra
      "Canal · dente 14/15/16", todos "Realizado em 13/08/2026"
- [x] **G3** — testado ao vivo (dentes 24, 25): "Restauração ▾" → 5 faces aparecem, contador
      NÃO muda (nenhum evento criado ainda); clicar "O" → "Restauração O · dente 24" e
      "· dente 25", contador 3→5
- [x] **G4** — testado ao vivo (dentes 24, 25, 44, 45): "Dente ausente" → 4×
      "Extração · dente N" com pill "Pré-existente", sem tocar as Restaurações já registradas
      nos mesmos dentes 24/25
- [x] **G5** — testado ao vivo (dentes 27, 28): termo sem match nenhum → "Lançar 'zzteste
      procedimento lote' nos 2 dentes" → "Outro procedimento · dente 27/28", Realizado, com a
      oferta "+ Salvar no meu catálogo" aparecendo. Achado à parte: um termo real do catálogo
      da clínica ("gengivoplastia") casou como sugestão de catálogo em vez de cair no avulso —
      comportamento correto, só exigiu trocar o termo de teste
- [x] **G6** — testado ao vivo: "✕ limpar" zerou a faixa (`onde=null`) sem apagar nenhum dos 3
      eventos já criados (contador continuou 3)
- [x] **G7** — testado ao vivo: 1 dente selecionado (27) → mostra histórico normal
      (`voltar à boca` presente), faixa de lote ausente
- [x] **G8** — typecheck + lint (zero warning) + `next build` limpos. Zero erro de console em
      toda a sessão de teste (aba nova por trecho, sem histórico de HMR)

### Achado durante a verificação (não é bug — documentando o mecanismo real)

Construir a seleção de 2+ dentes **exige alternar com "voltar à boca" entre cada clique** —
não dá pra clicar 2 dentes em sequência direto no espelho, porque o 1º clique já troca o
espelho pelo histórico daquele dente (arquitetura R-78: "1 ocupante por vez" na direita). É
exatamente o "clica, fecha, clica, fecha" que ele descreveu. A faixa de lote (`campoMagico`,
área separada do ocupante da direita) sobrevive a essa alternância porque lê `onde` direto —
mas ela só resolve a ETAPA de aplicar o procedimento, não a etapa de montar a seleção. Ele
marcou essa 2ª parte como decisão separada, fora desta fatia (spec §6) — registrado aqui pra
não virar surpresa.

## 6. Fora de escopo

- Selante e Esfoliação em lote — mesmo grupo técnico de Restauração/Dente ausente, fora por
  não terem sido pedidos; entram fácil se ele sentir falta
- Múltiplas faces por rodada de lote (ex.: O e V de uma vez) — clicar "Restauração ▾" de novo
  pra uma 2ª face resolve sem UI nova
- Lote na ficha do paciente (`FichasTab.tsx`) — mecanismo de seleção lá é outro
  (`selectedTeeth`/`teethNotes`, ligado ao texto livre) — portar o lote de chips pra lá é
  item novo, precisa de investigação própria de como esse mecanismo se relaciona com
  `eventosDraft`
- Mudar o clique do odontograma pra não abrir mais o histórico do dente sozinho — decisão
  dele, separada, não entra aqui (ver §9, é exatamente o que o "Modo multidente" virou)

## 9. Adendo (13/08, pedido dele ao vivo, depois da execução original) — "Modo multidente"

**Problema achado testando o §5:** montar a seleção de 2+ dentes exigia "voltar à boca" entre
cada clique — o 1º clique já trocava o espelho pelo histórico daquele dente (arquitetura R-78,
"1 ocupante por vez" na direita). Era o "clica, fecha, clica, fecha" que ele sentiu ao vivo.

**Mecanismo:** novo estado `modoMultidente` (`registrar-painel.tsx`). Com o modo ligado,
`onToothToggle` continua acumulando em `onde.dentes` normalmente, mas **pula** o
`setDenteAberto(dente)` — o espelho nunca sai de vista, clique em sequência funciona direto.
Desliga sozinho em toda ação de lote (`aplicarLote`, `aplicarLoteRestauracao`,
`aplicarLoteAusente`, `lancarLoteAvulso`) e no "✕ limpar" — nunca fica aceso sem o dentista
perceber (ele apontou o chip de orto, que fica preso ligado até trocar de paciente, como o
padrão errado de copiar).

**Testado ao vivo:** 2 dentes clicados em sequência direta (sem "voltar à boca" no meio) →
faixa mostrou os 2 corretos, espelho nunca sumiu. Aplicar um chip desligou o modo sozinho
(`aria-pressed` voltou a `false`).

**Posição — discutida, não fechada.** Está codado **acima do odontograma**, em linha própria
(onde entrou primeiro). Debate ao vivo sobre mover:
- Testei dentro da barra do Legenda (mesmo estilo, ícone+texto sem pílula) — ele achou
  "complicado" (mexe em `Odontograma.tsx`, componente compartilhado com a ficha do paciente)
- Cheguei a defender manter fora, colado no odontograma (proximidade do clique) — mas
  reconsiderei ao vivo: o argumento mais forte é ele ser **da mesma família** de Profilaxia/
  Clareamento/Manutenção (controle de como registrar, não resultado), não proximidade física
- **Recomendação registrada:** mover pra dentro da faixa do campo mágico, como último chip
  (depois de Manutenção ortodôntica, com respiro visual maior — os 3 primeiros lançam
  procedimento, ele muda comportamento)
- **Decisão dele:** não aplicar agora — "amanhã eu pego a opinião dos dentistas". Código fica
  como está (acima do odontograma) até ele decidir

**Também descartado no debate:** mover a faixa de lote inteira (contador + chips + busca) pra
dentro do card "Nesta ficha" — rejeitado porque separaria de novo o que a faixa e o toggle
formam juntos hoje (toggle + contador + chips no mesmo bloco, campo mágico), recriando em
forma nova o problema que motivou tirar o chip de orto do jeito que ele é.
