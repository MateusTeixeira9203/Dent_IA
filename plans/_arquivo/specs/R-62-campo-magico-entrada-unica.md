# R-62 — campo mágico vira entrada única: match local inline mata o "Registrar sem IA"

> **SPEC** · fase **`aprovada`** — aprovada por ele 05/08, sem decisão aberta.
> **Aberto:** 2026-08-05 · **Fechado:** —
> **Modelo:** Sonnet 5 — o mecanismo está decidido (§2) e o achado do §1.2 derrubou a parte cara.
> O que sobra é uma função pura de casamento de texto + tornar clicável uma faixa de chips que
> já existe e já é renderizada. Risco real é de regressão na voz, não de desenho.
> **Nasce de:** conversa de 05/08 — ele propôs a fusão nestes termos: *"o campo mágico vira
> entrada única e, enquanto você digita, se o texto casar com um tipo conhecido ou item do
> catálogo, ele oferece a opção determinística inline — sem chamada de IA, sem latência, sem
> custo. Mata a segunda caixa e mantém o caminho offline, porque o match é local."*
> **Emenda ao:** [R-46d](R-46d-campo-magico.md) — esta fatia fecha o D1.2 (a disclosure
> "Registrar sem IA" era explicitamente provisória)

## 1. Problema

### 1.1 Dois campos disputando o mesmo gesto

O painel "Registrar" tem duas entradas para a mesma coisa: o **campo mágico** (texto livre → IA
estrutura) e a disclosure **"Registrar sem IA"** (Combobox de 17 tipos + catálogo comercial +
chips de status + chip de orto). Registrar "restauração no 35" funciona pelos dois caminhos,
com gestos diferentes. Numa coluna cujo orçamento vertical já está estourado
(`MAPA-MEU-DIA.md`), isso é peso morto visual **e** dúvida de qual usar.

Deletar a disclosure não é opção: ela é o fallback obrigatório do
[R-46d §2.1](R-46d-campo-magico.md) (invariante **I8** — registro tem que funcionar com a IA
fora do ar), e leva junto duas coisas que só ela faz hoje:

- os **4 tipos de nível boca** (`profilaxia`, `clareamento`, `fluor`, `exame_periodontal`) —
  não têm dente pra clicar, então o odontograma não os alcança
- a **busca no catálogo comercial** do dentista (`procedimentos`, privado, ~250 linhas reais)

### 1.2 Achado que derruba a parte cara da proposta

Ele previu o custo assim: *"o campo mágico deixa de ser um textarea e vira um
combobox-com-texto-livre, o que não é trivial."*

**Não precisa.** A faixa de chips já existe e já é renderizada:

```tsx
// captura-livre-card.tsx:122-146
{/* Detecção ao vivo */}
{texto.length > 20 && (detectedProcs.length > 0 || isDetecting) && (
  …<span className="…border bg-teal/10…">{p}</span>…   // ← <span>, não <button>
)}
```

Os chips são **display-only** (`<span>`) e vêm de uma **chamada de rede**:
`/api/dex/detectar-consulta`, debounce de 2000ms, mínimo 20 caracteres
([`useCapturaLivre.ts:100-131`](../../src/hooks/useCapturaLivre.ts:100)) — ou seja,
exatamente o oposto de "local, sem latência, sem custo".

Então a mudança não é trocar o textarea por um combobox. É:
**(a) derivar os chips localmente e (b) torná-los clicáveis.** O textarea fica intacto, a voz
fica intacta, e o slot de UI já está no lugar certo, com motion já implementado.

## 2. Decisão e alternativas

**Decisão:** o campo mágico vira entrada única. A faixa de chips passa a ser alimentada por um
**matcher local puro** (zero rede) e cada chip vira um botão que registra o evento
deterministicamente. A disclosure "Registrar sem IA" sai; o que ela tinha de único é absorvido
(§3.3).

| Alternativa | Por que não |
|---|---|
| Deletar a disclosure sem substituir | Quebra o I8: IA fora do ar = nenhum caminho de registro |
| Manter as duas caixas (status quo) | É o problema (§1.1) |
| Trocar o textarea por combobox-com-texto-livre (proposta original dele) | Desnecessário (§1.2) e caro: o textarea é o alvo da voz (R-48) e do anexo (D8); mexer nele arrisca regressão nos dois |
| Manter a detecção por IA e só tornar os chips clicáveis | Não resolve offline (é chamada de rede), não resolve latência (2s de debounce + round-trip), e custa token por tecla parada. O match local é o ponto inteiro |

**As duas detecções convivem, não competem:** o matcher local cobre "procedimento + dente"
(o caso rápido, 1 linha); o "Organizar com Dex" continua cobrindo relato corrido (o caso
narrativo, com anotações/conduta/orto). O local nunca chama rede; o Dex continua sendo um
clique explícito.

## 3. Contrato técnico

### 3.1 O matcher — função pura, testável, sem IO

```typescript
// src/lib/odontograma/casar-procedimento-local.ts  (NOVO)

export interface SugestaoLocal {
  /** Tipo estrutural (sempre resolvido — item de catálogo vira `null` e pede o tipo). */
  tipo: TipoRegistroOdontograma | null;
  /** Nome comercial quando o casamento veio do catálogo — vira `observacao` do evento. */
  catalogo: MeuDiaCatalogoProcedimento | null;
  /** Dentes extraídos do MESMO trecho. Vazio = precisa de clique no odontograma. */
  dentes: number[];
  /** Trecho do texto que originou a sugestão — o chip mostra isto, não o texto todo. */
  trecho: string;
}

export function casarProcedimentoLocal(
  texto: string,
  catalogo: MeuDiaCatalogoProcedimento[],
): SugestaoLocal[];
```

**Regras do casamento (todas determinísticas, zero heurística de IA):**

1. Casa contra `TIPO_LABEL` (os 17 tipos) e contra `catalogo[].nome`, sem acento e sem caixa.
   ⚠️ **Normalizar acento é obrigatório** — é a família de bug do R-44 (busca sensível a
   acento, 2 ocorrências ainda abertas); "extracao" tem que achar "Extração".
2. Extrai dente generalizando o antigo `extrairDenteDoTexto` pra `extrairDentesDoTexto`
   (plural — movido pra dentro deste arquivo, único parser do projeto, não duplicado).
   **Achado na implementação:** `\d{2}` cru casava "35" dentro de "Z350" (Filtek Z350, nome
   comercial real) — regex final usa `(?<!\d)\d{2}(?!\d)`, 2 dígitos ISOLADOS. Pego pelo
   teste do catálogo, não por inspeção.
3. Os 4 tipos de `TIPOS_NIVEL_BOCA` casam sem dente e sugerem âncora `boca` direto.
4. Ordena tipo estrutural antes de item de catálogo (o estrutural registra em 1 clique; o
   comercial ainda precisa do tipo).
5. Sem limite mínimo de caracteres (o `length < 20` de hoje é da chamada de rede — local não
   precisa esperar). Teto de 8 sugestões, mesmo do catálogo hoje.

**Testes unitários obrigatórios** (mesmo padrão de `dedup-eventos-draft.ts`, que tem 8):
acento, dente colado ao texto, tipo boca, item de catálogo, texto sem match, e
`"restauração 35 e 36"` (2 dentes).

### 3.2 UI — a faixa de chips vira ação

`CapturaLivreCardProps` ganha o necessário pra sugerir e aplicar:

```typescript
export interface CapturaLivreCardProps {
  // …existentes
  /** R-62 — catálogo pro match local. Ausente = só tipos estruturais (FichasTab não passa). */
  catalogoProcedimentos?: MeuDiaCatalogoProcedimento[];
  /** R-62 — clique num chip. Ausente = chips seguem display-only (comportamento de hoje). */
  onAplicarSugestao?: (s: SugestaoLocal) => void;
}
```

- `<span>` → `<button>` quando `onAplicarSugestao` existe. **Opcional de propósito**: o
  `FichasTab` também monta o `CapturaLivreCard` e não deve mudar nesta fatia.
- Chip **sem** dente resolvido mostra o estado pendente que já existe ("aguardando onde —
  clique no dente"), reusando `tipoPendente` de `registrar-painel.tsx`. Nenhum estado novo.
- Chip de item de catálogo abre o mesmo passo "qual tipo clínico?" que já existe
  ([`registrar-painel.tsx:394-422`](../../src/app/dashboard/meu-dia/_components/registrar-painel.tsx:394)).
- A detecção por IA (`detectedProcs`) **continua** intocada, na mesma faixa mas ACIMA dela,
  visualmente distinta (`<span>` outline, sem ícone — vs. chip local `<button>` sólido com
  ícone de raio). **Sem dedup entre as duas**: não faz falta — só o chip local é clicável, o
  da IA é puramente informativo, então não existe ação duplicada a evitar, só 2 sinais lado a
  lado. (A frase original desta spec previa dedup por `tipo`+`dentes`; não implementado
  porque não tem efeito prático nenhum dado que um dos dois lados nunca é clicado.)

### 3.3 O que sai e pra onde vai o que era só dela

| Hoje, dentro de "Registrar sem IA" | Depois |
|---|---|
| Combobox de 17 tipos | Chips locais do campo mágico (§3.1) |
| Busca no catálogo comercial | Idem — o matcher recebe o catálogo |
| 4 tipos de nível boca | Idem — regra 3 do §3.1 |
| Chips de Status (`a fazer` / `feito`) | **Continuam**, movidos pra junto da faixa de chips. Não somem: definem o `status` do evento que o chip cria |
| Chip "Manutenção ortodôntica" (`OrtoForm`) | **Continua**, promovido pra fora da disclosure. Não tem match textual local; é gesto próprio. (O R-50 já faz o Dex extrair orto do relato — os dois caminhos convivem) |
| "+ texto da visita" | **Continua** — achado na implementação: NÃO é redundante. A ponte "texto do campo mágico → `textoVisita` salvo" só existe hoje através do "Organizar com Dex" (chamada de IA). Sem "+ texto da visita", uma nota pura ficaria sem caminho de gravação com a IA fora do ar — quebraria o próprio I1 desta spec. Decisão original (removê-lo) estava errada, corrigida antes de codar |

### 3.4 Arquivos

| Arquivo | Muda |
|---|---|
| `src/lib/odontograma/casar-procedimento-local.ts` | **novo** — matcher puro |
| `…/casar-procedimento-local.test.ts` | **novo** — testes do §3.1 |
| `src/components/fichas/captura-livre-card.tsx` | 2 props opcionais; `<span>`→`<button>`; sugestões locais na faixa existente |
| `src/hooks/useCapturaLivre.ts` | expõe `texto` pro matcher (já expõe); **nenhuma mudança na detecção por rede** |
| `…/meu-dia/_components/campo-magico-meu-dia.tsx` | repassa catálogo + `onAplicarSugestao` |
| `…/meu-dia/_components/registrar-painel.tsx` | remove a disclosure; Status, orto, catálogo-pendente e "+ texto da visita" sobem pra faixa sempre visível; `registrar()` ganha `dentesSugeridos` (3º parâmetro, substitui a extração por texto); `catalogoPendente` passa a guardar `{item, dentes}` em vez de só o item — ver §7 achados |

## 4. Invariantes

- [x] **I1 (era I8 do R-46d) — registrar funciona com a IA fora do ar.** Testado ao vivo
      05/08: `window.fetch` sobrescrito pra rejeitar TODA chamada, registrei "canal 47" ponta
      a ponta (chip apareceu, cliquei, dente pintou com a marca de mexido) — zero dependência
      de rede confirmada
- [x] **I2 — nada entra na ficha sem gesto do dentista.** Verificado nos testes ao vivo:
      sugestão nunca aplica sozinha, só no clique
- [x] **I3 — os 17 tipos continuam todos alcançáveis**, inclusive os 4 de nível boca (testado)
- [ ] **I4 — a voz não regride.** Não testável por automação (exige microfone real — ver G10).
      `git diff --stat` confirma `useCapturaLivre.ts`/`useAudioRecorder.ts` intocados
- [x] **I5 — `FichasTab` não muda.** Testado ao vivo (G9): sem chip local, sem erro de console
- [x] **I6 — zero token gasto no caminho local.** Mesmo teste do I1 prova isto — nenhuma
      chamada de IA no caminho de registro
- [x] Nenhuma mudança de schema, RLS ou migration

## 5. Gates de aceite

- [x] **G1** — testado ao vivo: digitar `restauração 32` fez aparecer o chip na mesma
      execução de script (sem `await` entre digitar e checar) — **zero request novo**
      confirmado via `read_network_requests` (mesmo último ID antes/depois)
- [x] **G2** — testado ao vivo (dente 32, limpo, sem histórico): clique criou o evento com o
      status selecionado, dente pintou coral/teal conforme o Status ativo
- [x] **G3** — confirmado nos testes unitários (10/10, `tsx --test`) — `extracao` casa
      `Extração`. Não re-testado ao vivo (redundante com o teste unitário determinístico)
- [x] **G4 (I1, crítico)** — testado ao vivo com `fetch` bloqueado (ver I1). **Recorte:**
      testei o registro ponta a ponta, não o "e salvar" — Salvar depende de rede por
      definição (grava no banco), não é isso que o I1 garante
- [x] **G5** — testado ao vivo 05/08: chip "Profilaxia" (sem número no texto) registrou
      **direto**, sem passar por `tipoPendente` ("aguardando onde" nunca apareceu) — âncora
      boca resolvida sozinha, como a regra 3 do §3.1 prevê
- [x] **G6** — testado ao vivo: "faceta de resina no 45" casou o item do catálogo, o passo
      "qual tipo clínico?" apareceu, e o dente certo (45) recebeu o evento — **achado e
      corrigido**: o dente se perdia nesse caminho até eu propagar `catalogoPendente.dentes`
- [x] **G7** — testado ao vivo: "fratura" (sem número) entrou em `tipoPendente` ("aguardando
      onde"), clicar o dente 33 completou o registro e limpou o pendente
- [x] **G8** — testado ao vivo: chip "Manutenção ortodôntica" abriu o `OrtoForm` normalmente
- [x] **G9** — testado ao vivo 05/08: abri `/dashboard/pacientes/[id]` → "Nova Evolução" (o
      `FichasTab`), digitei "restauração 14" no textarea — **nenhum chip local apareceu**
      (`onAplicarSugestao`/`catalogoProcedimentos` não são passados por esse caller). Console
      sem erros
- [ ] **G10** — **não testável por esta via**: exige microfone real, automação de browser não
      grava áudio. Evidência indireta forte: `git diff --stat` da sessão inteira não lista
      `useCapturaLivre.ts` nem `useAudioRecorder.ts` — zero linha tocada no caminho de voz
- [x] **G11** — 10/10 testes passando (`npx tsx --test src/lib/odontograma/casar-procedimento-local.test.ts`); typecheck + lint limpos nos arquivos tocados
- [x] **G12** — testado ao vivo: `document.body.textContent.includes('Registrar sem IA')`
      → `false`

## 7. Achados na implementação (2 bugs reais, corrigidos antes de considerar pronto)

1. **`onde` "sujo" vencia o dente do texto atual.** `registrar()` só usava `dentesSugeridos`
   quando `onde` estava vazio — mas `onde` nunca é limpo entre registros (comportamento
   antigo do multi-seleção, C6 §2 Q3, preservado de propósito). Resultado: registrar
   "restauração 34" e depois "selante 18" fazia os DOIS caírem no dente 34. Achado ao vivo
   (não por leitura) — dois cliques seguidos foram parar no mesmo dente. Fix: quando o texto
   atual tem dente explícito, ele **sempre** vence e **sobrescreve** `onde` — não só cai no
   `else`. Ver comentário no código, `registrar-painel.tsx`.
2. **Catálogo perdia o dente entre "escolher item" e "escolher tipo".** `escolherDoCatalogo`
   só guardava o `item`; ao clicar "qual tipo clínico?", `registrar()` caía de volta no
   `onde` (velho ou vazio). Fix: `catalogoPendente` guarda `{item, dentes}`, e o dente viaja
   até o clique final.

Os dois só apareceram testando **sequências de 2+ registros**, nunca num registro isolado —
por isso o teste unitário do matcher (que testa `casarProcedimentoLocal` em isolamento, sem
o componente) não os pegou. Fica registrado como lição: gate de UI precisa de sequência, não
só de chamada isolada.

## 6. Fora de escopo

- **Substituir o "Organizar com Dex"** — o caminho narrativo continua igual; esta fatia só
  acrescenta o caminho rápido
- **Trocar a detecção por rede (`/api/dex/detectar-consulta`) por local** — as duas convivem
  (§2). Se depois de uso real a por-rede virar redundante, é item próprio
- **Extração de valor / orçamento pelo campo mágico** — já registrado como item separado no
  R-46d
- **Gramática de região** ("restauração nos molares superiores") — o matcher casa tipo e
  número de dente, nada mais. Relato assim é caso do Dex
- **D9/D11 do R-46d** (motion do odontograma acendendo na detecção) — segue pendente lá
