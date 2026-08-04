# R-49 — Voz e campos de especialidade: preencher sem digitar 17 vezes

> **SPEC** · ⏳ fila — **entra depois do cockpit (R-46)**, por decisão dele (02/08)
> **Aberto:** 2026-08-02 · **Fechado:** — · **Fase:** debate
> **Modelo:** Sonnet 5 (parser determinístico + testes; sem IA nova, sem migration)
> **Origem:** recortada da spec do cockpit ([R-46-cockpit.md](R-46-cockpit.md)) quando ela
> estourou o teto de 300 linhas — o item era grande demais, como a regra prevê.
> **Depende de:** nada codado. **Não bloqueia** o cockpit.

## 1. O problema

Quando o procedimento é de especialidade, ele tem tabela própria. **Um molar de 3 canais são
17 campos** (5 por canal × 3 + obturação + cimento); o teto teórico é 32. Isso é o oposto de
"ficha rápida" — e o concorrente real é uma linha de texto no Word.

**Já está tudo construído** (contrato de plugin de 5 peças, `plugin.ts`): os 4 Forms e os 4
Cards existem em disco. O que falta é **como preencher sem 17 gestos**.

| Especialidade | Campos | Persistência | Form |
|---|---|---|---|
| Endodontia | 5 por canal (nome, referência, comprimento mm, lima inicial, lima final) × 1–6 canais + obturação + cimento | `evento-detalhe` (JSONB) | `endo-form.tsx` (193 ln) |
| Ortodontia | 5 (arcada, fio, ativação, elástico corrente, elástico intermaxilar) | `ficha-coluna` | `orto-form.tsx` (79 ln) |
| Periodontia | PSR: 6 sextantes × (código 0–4 · ausente · asterisco) | `tabela-satélite` | `psr-form.tsx` |
| Implantodontia | 8 | `evento-detalhe` | `implante-form.tsx` |

## 2. O dado que reposiciona a pergunta (medido em produção, 02/08)

Workflow de 20 agentes (4 ângulos → 16 propostas → verificação adversarial) foi medir o banco.
**A pergunta estava mal-posta: a tabela de endo não é cara demais — ela é majoritariamente
vazia.**

- **21 de 32 eventos de endodontia (66%) têm ZERO odontometria**, mesmo com a tabela abrindo.
- **Obturação e cimento: 1 preenchimento real em 32 eventos.**
- **Implante: 4 dos 8 campos nunca foram preenchidos.**
- **PSR (perio), construído e no ar: zero uso.**

Mesmo padrão dos 7 campos mortos do §1 da spec-mãe (0/88). **Cortar gestos de um formulário que
ninguém preenche resolve o problema errado** — antes de otimizar o gesto, decidir se a tabela
deve abrir sozinha.

## 3. Decisões (dele, 02/08)

| # | Decisão | Alternativa descartada |
|---|---|---|
| **D1** | **O parser é determinístico e come TEXTO, não áudio.** `(texto) => EndoDetalhe` | Extractor `modo:'ia'` com Gemini — LLM no caminho de uma medida clínica |
| **D2** | **"Refinar a voz" ≠ voz infalível.** A voz gera, o dentista **revisa na própria tabela**, corrige a célula errada e salva | Passo de confirmação campo a campo (17 confirmações = pior que digitar) |
| **D3** | **Preenchimento manual fácil é obrigatório** — *"a voz pode vir a falhar"*. O campo mágico aceita digitação com o mesmo destaque | Voz como caminho principal |

### D1 — por que determinístico

O extractor de endo (`endo.ts:42`) é hoje `extractor: null`, com o comentário *"Dex hoje não
emite odontometria; entrada é manual"*. A vaga existe no contrato (Peça 2) e está vazia.

- **Uma linha digitada resolve:** `MV 21,5 lima 15/35; DV 20,0 15/30; P 22,0 15/40 · lateral · AH Plus`
- **Precedente no código:** `perio.ts:154` já usa `extractor: { modo: 'deterministico' }`, com o
  comentário *"I6 — zero LLM no caminho do número"*. Não é caminho novo.
- **Não aciona o gate de eval** do `CLAUDE.md` (nenhum prompt muda) · zero rota · zero migration.
- **Gestos:** ~20 interações → **~5** com texto digitado. Por voz o ganho real é ~20 → ~9
  (fator 2,2×, não 4–5×) — 2 a 4 dúvidas em 17 campos é o caso realista de ASR em consultório.

**A voz entra depois, em cima de gramática já provada em texto.**

⚠️ **Barra honesta, registrada para não virar promessa falsa:** **voz não reduz erro de
odontometria — aumenta.** Digitar tem o laço olho-régua-dedo-tela; voz não tem. Se o Dex ouve
22 onde era 21, os dois são plausíveis e nenhuma validação pega. A meta é *"não menos seguro"*.

→ Daí: **voz escreve as palavras, o dedo digita os milímetros.** Os 3 `comprimentoRaiz` são 18%
dos campos e carregam quase todo o risco; são os únicos lidos de instrumento (régua/localizador).

### D2 — a revisão é a tabela (o que dissolve o teatro de confirmação)

Dele: *"quando gerar com a voz, o cara pode olhar, revisar e salvar. Ou já ir pra tabela e só
corrigir na tabela — é muito mais rápido."*

Não existe botão de "aceitar tudo" porque **não existe passo de aceite**. A tabela editável é a
revisão; corrigir uma célula já é conferir a linha. Isso responde ao guarda-corpo do ECRI Rec D
(≈100% de aceite sem edição = teatro) sem inventar métrica nova.

### ⚠️ EMENDA 04/08 — D1 relaxado: a IA PODE preencher o número

**Decisão dele, 04/08**, revogando parte do D1:

> *"De todo jeito o dentista vai verificar. Se já tiver certo, ótimo, ganhamos pontos; se tiver
> errado, é uma correção normal. E a gente pode dar prioridade ainda mais pra quando tiver
> essas operações que entram números, milímetros: o procedimento com a tabela **fica aberto** —
> o único que vai ficar aberto é esse, porque ele é necessário."*

**Por que a objeção original caiu.** O D1 comparava *número da IA possivelmente errado* contra
*número certo digitado à mão*. Essa não é a comparação real. O baseline medido nesta mesma spec
é **66% dos endos com odontometria vazia** — campo em branco não é o estado seguro, é **ausência
de prontuário**. Uma tabela pré-preenchida que o dentista é obrigado a olhar ganha de um
formulário que dois terços das vezes nunca é preenchido.

**A trava que torna isso seguro é dele:** a tabela de um procedimento com campo numérico
**nasce aberta**, e é a **única** que abre por padrão. Isso converte "preenchido em silêncio"
em "apresentado pra revisão" — que era exatamente o modo de falha que o D1 temia.

**O que muda:**

| | Antes (D1 original) | Depois (emenda 04/08) |
|---|---|---|
| Quem lê o número | só parser determinístico | parser determinístico **ou** a IA do campo mágico |
| Tabela com número | abre como as outras | **abre sozinha, sempre** |
| Célula preenchida por máquina | borda teal (já previsto) | idem — **provenance continua obrigatória** |

**O que NÃO muda, e fica mais importante ainda:**

- **I5 (recusa em vez de chute) vira o guarda-corpo principal.** Com LLM no caminho, a validação
  de faixa clínica deixa de ser detalhe: a IA emite `45mm` de comprimento radicular sem piscar,
  e é a faixa que barra. Número fora da faixa ou fora da resolução da régua (0,5 mm) **continua
  sendo recusado**, nunca arredondado.
- **I1** — campo que o texto não mencionou continua `null`. A IA preenche o que **foi dito**,
  nunca completa o que faltou.
- **I4** — merge nunca sobrescreve célula já preenchida pelo dentista.
- O parser determinístico **não morre**: quando o texto vier semi-estruturado
  (`MV 21,5 lima 15/35`), ele resolve sem gastar token nem inferir.

**Risco aceito conscientemente e registrado:** ancoragem. Número plausível já preenchido recebe
menos escrutínio que campo vazio. A mitigação é a tabela aberta + a marca de proveniência na
célula — não há como zerar esse risco, e ele foi aceito com o número dos 66% na mão.

**Estados de célula** (desenhados no artefato do cockpit §4):
- **Veio do texto/voz:** borda teal, editável no lugar.
- **Parser recusou:** mostra **o que ouviu**, nunca um palpite — em **coral tracejado**, que é a
  convenção que o `EndoForm` já usa para "não foi ditado" (`endo-form.tsx:65`, `linhaTemDado()`
  em `:38`). Não inventar um 3º código de cor.
- Vazio **nunca** vira zero; número fora da faixa clínica vira dúvida, não vira dado.

## 4. Invariantes

- [ ] **I1** — Campo não ditado fica `null`, **nunca inferido** (herda a I5 do `endo.ts`).
- [ ] ~~**I2**~~ — ⚠️ **REVOGADA em 04/08** (ver emenda no §3). Era *"zero LLM no caminho de
      qualquer número clínico"*. **Substituída por:** a IA pode preencher número clínico, desde
      que (a) a tabela do procedimento **abra sozinha**, (b) a célula carregue marca de
      proveniência, e (c) a **I5 valide a faixa** — a validação de faixa deixa de ser rede de
      segurança e vira o guarda-corpo principal.
- [ ] **I3** — Nada sai do texto sem virar **linha ou dúvida**: fragmento com número que não
      ancorou em canal produz dúvida com o texto cru. Silêncio aqui é perda de dado.
- [ ] **I4** — Merge nunca sobrescreve: canal já preenchido que reaparece com valor diferente
      gera **conflito visível**, não overwrite (o ditado incremental é o caso real).
- [ ] **I5** — Recusa em vez de chute: número fora da faixa clínica ou fora da resolução da
      régua (0,5 mm) é **recusado**, não arredondado — arredondar é inferir.

## 5. Fora de escopo

Voz como caminho principal (é o 2º passo, depois da gramática provada em texto) · mexer nos
schemas para cortar campos (a medição do §2 sugere, mas cortar campo de prontuário é decisão
com risco legal — item próprio se for o caso) · periograma completo (R-08c).

## 6. Aberta

- **A1 · A tabela deve abrir sozinha?** Com 66% de odontometria vazia, abrir a tabela em todo
  canal pode ser o gesto desperdiçado. Alternativa: nível 1 (só o sinal "3 canais") por
  default, tabela sob demanda. **Não decidido** — depende de ele olhar o dado.
