# R-49b — Painel de registro ao vivo: brilho provisório e tabela na hora

> **SPEC** · ⏳ fila
> **Aberto:** 2026-08-10 · **Fechado:** — · **Fase:** plano
> **Modelo:** Sonnet 5 (superfície + fiação de peças existentes; sem prompt novo, sem migration)
> **Origem:** discussão dele 10/08 (sessão #36). Sub-item do
> [R-49](R-49-voz-e-campos-de-especialidade.md) — spec própria porque somar isso lá estouraria
> o teto de 300 linhas.
> **Depende de:** nada codado. **Não bloqueia** nada.
> **Não substitui o R-49 mãe** — a razão do R-49 existir (66% de endo com odontometria vazia)
> é o extractor, que continua não existindo. Ver §6.

## 1. O problema

**Entre o dentista digitar/falar e apertar "Organizar com Dex", a tela não mostra nada.** O
produto promete que a ficha nasce pronta e fica mudo exatamente no momento em que o dentista
está decidindo se acredita nisso.

Segundo problema, apontado por ele: **a tabela de especialidade só aparece depois de tudo
pronto** — e é justamente ela que corrige erro de captação de áudio. Campo explícito não deixa
o erro passar; texto corrido deixa.

⚠️ **Registrado de propósito pra não virar promessa falsa:** este item **não reduz gesto
nenhum**. Pelo filtro do `CLAUDE.md` ("isso reduz atrito operacional?") ele não se justifica
sozinho. O que justifica é credibilidade da promessa central num produto novo — e a tabela como
superfície de correção de ASR, que é ganho real de precisão.

## 2. O que já existe (medido no código, 10/08)

Este item é majoritariamente **fiação**, não construção.

| Peça | Onde | Estado |
|---|---|---|
| Detecção ao vivo | [`useCapturaLivre.ts:99`](../../src/hooks/useCapturaLivre.ts) | Roda hoje (debounce 2s), devolve `{descricao, dentes[]}`. **`dentes` é descartado na `:120`** |
| Match local sem rede | [`casar-procedimento-local.ts:67`](../../src/lib/odontograma/casar-procedimento-local.ts) | Síncrono, zero IA, zero rede, devolve `dentes[]` |
| Slot de ocupante único | [`registrar-painel.tsx:169`](../../src/app/dashboard/meu-dia/_components/registrar-painel.tsx) | *"mapa espelho ou OrtoForm — **nunca os dois**"* |
| Forms de especialidade | `endo-form.tsx` · `orto-form.tsx` · `implante-form.tsx` · `psr-form.tsx` | Existem em disco, reusados tal qual |
| `presentationMode` no Odontograma | `Odontograma.tsx` | R-98a |
| Rota de pass 2 | `/api/dex/extrair-especialidade` | Completa, **zero chamadores** (é o R-09) |

**O que NÃO existe e este item não constrói:** nenhum extractor (`endo.ts:42`, `implante.ts:52`,
`orto.ts:39` são todos `extractor: null`).

## 3. Fluxo

```
1. Painel abre em 2 colunas — campo livre à ESQUERDA, odontograma à DIREITA
2. Dentista digita ou dita
   ├─ digitado  → match local (síncrono) acende o dente na hora
   └─ ditado    → transcreve, depois detectar-consulta acende
3. Detectou especialidade com tabela (canal, implante) → a tabela aparece,
   na ORDEM DO RELATO. Dentista preenche, "ok" confirma e fecha aquela tabela.
   Setinha lateral / clique no dente reabre.
4. "Organizar com Dex" (canto inferior direito) → extração definitiva
5. Provisórios apagam de uma vez, definitivos acendem, odontograma volta
   pro lugar dele, campo mágico fecha
```

## 4. Decisões

| # | Decisão | Alternativa descartada | Motivo |
|---|---|---|---|
| **D1** | Brilho é **reveal, não progresso** — o dado chega todo junto | Streaming real (`generateContentStream`) | `odontograma_eventos` é o **último** campo gerado hoje (`formatar-evolucao/route.ts:110` e `:129`) e `propertyOrdering` não está setado. Streaming sem inverter a ordem não adianta nada; inverter é mudança de ordem de geração = **gate de eval** |
| **D2** | Digitado acende por **match local síncrono**; ditado por `detectar-consulta` | Um caminho só pros dois | Digitado tem que ser instantâneo (exigência dele). O debounce de 2s + ida na rede é lento demais nesse caso |
| **D3** | **Dois estados visuais inconfundíveis:** provisório × definitivo | Um estado só | Se parecerem iguais, a tela mostra um odontograma clínico que não é real. É o único jeito disto dar errado |
| **D4** | Brilho só apaga quando **o texto que o gerou** mudou | Apagar sempre que a detecção mudar | Errar porque o dentista mudou de ideia é ele dirigindo. Sumir porque o modelo voltou atrás sozinho com o mesmo texto lê como sistema inseguro |
| **D5** | Tabela preenchida à mão **cria o evento** se a extração final não produzir | Bloquear o fechamento · virar dúvida | Preencher a odontometria do 46 **é** afirmar o canal no 46. Gesto deliberado vence texto ambíguo, e a tabela é o sinal mais forte que existe na tela |
| **D6** | Ordem de apresentação das tabelas = **ordem do relato** | Ordem por quadrante/FDI | O dentista confere contra a própria memória do que acabou de falar |
| **D7** | Uma tabela por vez, confirmada com "ok" | Todas abertas de uma vez | 3 tabelas simultâneas reconstroem o problema dos 17 campos que abriu o R-49 |
| **D8** | Extração incremental durante o ditado **fica fora** | Eventos aparecendo enquanto ele fala | 4 motivos no §6 — o decisivo é que exige o dentista dividir atenção entre falar e editar, com a mão na boca do paciente. Mesma barreira física que matou o modo consulta (27% de uso) |

## 5. Invariantes

- [ ] **I1** — **Provisório nunca é gravado.** Nada vai ao banco antes do Salvar; o brilho é
      pixel. É o que dispensa lógica de retratação, conflito e merge no caminho ao vivo.
- [ ] **I2** — Provisório e definitivo são **visualmente inconfundíveis** (D3). Não é preferência
      de estilo — é a invariante que impede a tela de mentir.
- [ ] **I3** — **Detalhe preenchido à mão nunca se perde.** Sem evento correspondente na extração
      final, o detalhe **cria** o evento (D5). Nunca descartado, nunca silencioso.
- [ ] **I4** — Merge nunca sobrescreve célula preenchida pelo dentista (herda a I4 do R-49).
- [ ] **I5** — Número fora da faixa clínica é **recusado, nunca arredondado** (herda a I5 do
      R-49). Faixas desta fatia: comprimento de trabalho **8–30mm**, sondagem **1–12mm**.
      Recusado mostra **o que ouviu**, em coral tracejado — convenção que o `EndoForm` já usa
      (`endo-form.tsx:65`). Não inventar um 3º código de cor.
- [ ] **I6** — Brilho não pisca por instabilidade do modelo (D4).

## 6. Fora de escopo

| O quê | Por quê |
|---|---|
| **Extração incremental durante o ditado** | (a) o dentista se corrige falando ("canal no 46… não, 47") e o chunk 1 já pintou o 46 — conflito contra valor que a máquina inventou 4s antes; (b) contexto chega depois do dente ("14, 15 e 16, tudo em resina"); (c) o prompt cruza os próprios campos (`route.ts:336`), num fragmento isso não significa nada — prompt novo = **baseline de eval novo**; (d) o ganho prometido (editar enquanto fala) o dentista não consegue coletar |
| **Streaming real do Gemini** | D1 — sem `propertyOrdering` invertido não muda nada, e inverter aciona o eval |
| **Extractor de endo/implante** | É o **R-49 mãe**. Este item é a superfície de revisão; não é o que faz a extração existir |
| **Log do trio · camada fuzzy · dicionário modular** | Itens próprios (§7). O documento de arquitetura desaconselha o dicionário antes do log — sem coleta, as variantes seriam inventadas |
| **Periograma completo** | R-08c |

## 7. O documento de arquitetura — o que entra e o que não

Decisão dele 10/08: **só a superfície + validação de faixa clínica.** Do documento:

| Item do doc | Situação |
|---|---|
| `language: 'pt'` (item 1) | ✅ **já feito** — `transcrever/route.ts:42` |
| Prompt do Whisper com confundíveis (item 1) | ✅ **já feito** — `odonto-dictionary.ts:295`. Nota: o limite real do Groq é **896 caracteres** (400 em prod, 13/07), não 224 tokens como o doc afirma |
| `responseSchema` (item 2) | ✅ **já feito** — regra do `CLAUDE.md` |
| **Validação de faixa (§7 do doc)** | **ENTRA aqui** (I5) — é onde o número é digitado |
| Normalização numérica (§5.5) | Item próprio, junto do extractor |
| Log do trio (§8) | **Item próprio, pequeno e prioritário** — nada mais da pipeline dá pra priorizar direito sem ele |
| Camada fuzzy (§5) | Item próprio, **depois** do log. Hoje quem corrige erro fonético é o LLM (`formatar-evolucao/route.ts:319`) — sem log e sem auditoria |
| Dicionário modular (§2.2) | Último. `buildDentalContext()` hoje injeta ~180 procedimentos de todas as especialidades em toda chamada |
| Cache de contexto (item 3) | **Parado.** Com 0 pagantes, custo de token não é dor |

## 8. Gates de aceite

- [ ] **G1** — Digitar "canal no 46" acende o 46 **sem ida na rede** (aba Network limpa).
- [ ] **G2** — Ditar o mesmo acende o 46 depois da transcrição, sem piscar no meio.
- [ ] **G3** — Provisório e definitivo distinguíveis por quem nunca viu a tela antes.
- [ ] **G4** — Apagar "46" do texto apaga o brilho; **detecção rodando de novo com o mesmo
      texto não apaga nada** (I6).
- [ ] **G5** — Preencher a tabela de canal do 46, e a extração final não produzir canal no 46 →
      **o evento aparece mesmo assim**, com a odontometria digitada intacta (I3/D5).
- [ ] **G6** — Comprimento de trabalho `45mm` é recusado em coral tracejado, não arredondado (I5).
- [ ] **G7** — Recarregar a página no meio da composição não deixa nada no banco (I1).
- [ ] **G8** — Ditar canal + implante apresenta as tabelas **na ordem falada** (D6), uma por vez.
- [ ] **G9** — Light **e** dark conferidos nos dois estados de brilho.
- [ ] **G10** — `prefers-reduced-motion`: o reveal vira troca sem stagger, nada é perdido.

## 9. Aberta

- **A1 · Geometria do slot.** A coluna direita é hoje **ocupante único**
  (`registrar-painel.tsx:169`). Este item põe um terceiro ocupante (tabela de especialidade).
  O contêiner precisa de **contrato de tamanho que caiba o periograma do R-08c (2 arcadas ×
  6 sítios × até 32 dentes)** — senão o painel é refeito quando o R-08c chegar. Orto são 2
  arcadas, PSR são 6 sextantes, endo é por-dente × por-canal: **quatro geometrias diferentes**.
  Desenhar pro orto e descobrir o resto depois é o erro caro deste item.
- **A2 · Precisa de artefato?** Pela regra 4 do `CLAUDE.md`, mexer no slot central do Meu dia é
  redesenho de tela que já existe — caminho do `templates/spec-redesign.md`, com §3 escrito
  **por ele**. O brilho não precisa; o painel de 2 colunas provavelmente sim.
