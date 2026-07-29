# R-08 — Contrato clínico da Periodontia (vale para todos os sub-itens)

> **SPEC** · **R-08** · fase **contrato** — invariantes clínicos travados 28/07.
> **Modelo:** Opus quando houver ambiguidade clínica; Sonnet na execução de cada sub-item.
> **Escopo deste doc:** só as regras que **todo** sub-item (R-08b…R-08f) precisa respeitar.
> O "como fazer" de cada fatia mora na spec do próprio sub-item. Aqui não há plano de execução.
> **Por que existe:** essas decisões atravessam sub-itens. Se ficarem dentro de um deles, o
> seguinte diverge — e divergência em cálculo de prontuário é dano permanente.

## I1 — Convenção de sinal da Margem Gengival e a fórmula do NIC

**A convenção do projeto:** `mg` em milímetros, **negativo = recessão** (margem apical à JCE,
raiz exposta), **positivo = hiperplasia** (margem coronal à JCE).

**Portanto a fórmula é subtração, não soma:**

```
NIC = ps − mg
```

| Caso | ps | mg | NIC correto | `ps + mg` (ERRADO) |
|---|---|---|---|---|
| Recessão de 3mm, bolsa 4mm | 4 | −3 | **7mm** | 1mm |
| Hiperplasia de 2mm, bolsa 5mm | 5 | +2 | **3mm** | 7mm |
| Margem na JCE, bolsa 4mm | 4 | 0 | **4mm** | 4mm |

> **Por que isto está escrito com tabela numérica.** A literatura enuncia `CAL = PS + recessão`
> ([SDCEP](https://www.periodontalcare.sdcep.org.uk/guidance/assessment/special-tests/full-periodontal-examination/what-should-be-recorded/periodontal-parameters/)),
> onde *recessão* é positiva. Com a convenção deste projeto (recessão negativa) a mesma regra
> vira subtração. Ler a fórmula da literatura e aplicá-la direto ao nosso campo **inverte o
> resultado** — e o modo de falha é o pior possível: **subestima justamente os casos graves**
> (recessão é onde há doença), fazendo periodontite severa parecer saudável no prontuário.
> Achado em 28/07, antes de existir código.

**Gate obrigatório:** a função de NIC nasce com teste das 3 linhas da tabela acima. Sem esse
teste, nenhum sub-item que calcule NIC entra.

## I2 — NIC é derivado, nunca persistido

Grava-se só o que foi **medido**: `ps` e `mg` por sítio. NIC é função pura em TypeScript,
calculada na leitura. Confirma a decisão de 16/07 (SDCEP: *"sistemas informatizados calculam CAL
automaticamente"*).

Não existe a mesma fórmula em SQL — duas verdades divergem na primeira correção.

> **Consequência que o R-08d precisa resolver:** exame assinado é imutável, mas valor derivado
> muda se a fórmula mudar. A saída é congelar o **documento renderizado** no ato da assinatura
> (padrão da migration 111), não congelar o número.

## I3 — Furca é por entrada, não por dente

Registrar "furca grau II" no dente inteiro perde a informação que decide tratamento.

| Dente | Entradas de furca |
|---|---|
| Molar superior | 3 — mesial, distal, vestibular |
| Molar inferior | 2 — vestibular, lingual |
| Pré-molar superior (1º, birradicular) | 2 — mesial, distal |
| Unirradiculares | **nenhuma** |

**Validação obrigatória:** furca em dente unirradicular é entrada inválida, não um zero. O
sistema não pode aceitar furca em incisivo.

Graus I/II/III (Glickman/Hamp) por entrada.

## I4 — Implante não tem JCE: o NIC não transfere

O NIC se mede a partir da junção cemento-esmalte. **Implante não tem JCE** — a referência passa a
ser a plataforma/ombro do implante, e os valores normais de sondagem são outros.

Portanto: sítio sobre implante **não** usa a fórmula de I1. O modelo precisa saber se o alvo é
dente natural ou implante antes de calcular qualquer coisa — e o odontograma já sabe disso
(evento `tipo='implante'`).

**Decisão de escopo:** o peri-implantograma **não entra** no primeiro corte da grade (R-08c).
Entra como bifurcação explícita depois. O que R-08c precisa garantir é só **não calcular NIC
errado em implante** — na dúvida, não calcular.

## I5 — Severidade sim, estágio não

O sistema **pode** mostrar, rotulado como derivação do que o dentista mediu:

> "CAL interdental máximo: 5mm — faixa de severidade III/IV"

O sistema **não pode** declarar "Estágio III" como diagnóstico. Pelo AAP/EFP 2018 o estágio
depende de CAL interdental **+ perda óssea radiográfica + dentes perdidos por periodontite +
fatores de complexidade**; o grau depende de tabagismo e HbA1c. **Nada disso existe no sistema.**

Declarar estágio a partir de sondagem é diagnóstico incompleto — e viola a regra permanente do
projeto: *a IA nunca inventa diagnóstico, nunca age como dentista*.

Se um dia houver campo pra perda óssea radiográfica e histórico médico, isto se reabre — como
**sugestão com confirmação do dentista**, nunca como valor que entra sozinho no prontuário.

## I6 — Zero LLM no caminho do número (reafirmado, com o limite preciso)

Já declarado em `src/lib/especialidades/plugin.ts` e `registry.ts`. O limite exato:

- **Proibido para sempre:** IA deduzir/inferir números de perio a partir de narrativa livre.
- **Permitido (só no R-08f, depois da grade manual existir):** ditado **posicional** — o dentista
  fala os números na ordem dos sítios, o ASR transcreve, e um **parser determinístico**
  (regex/máquina de estados, zero LLM na interpretação) coloca cada número no sítio onde o cursor
  está, com o cursor visível avançando na tela.

A diferença: no primeiro caso a IA decide *qual número vai onde*; no segundo quem decide é o
dentista e o ASR só digita. Voz nunca é entrada única — a grade manual é a via de correção
obrigatória.

## I7 — Exame é append-only

Cada exame é um registro novo, datado. O segundo exame **nunca** faz update no primeiro.

Custa uma constraint hoje e é o que torna a comparação temporal (R-08e) possível depois. Se esta
invariante não estiver no R-08c, a comparação fica impossível de construir sem migração de dado
clínico.

## I8 — O periograma não muta o odontograma compartilhado

O `Odontograma` atual (coroas + símbolos, polido em R-02/R-06/R-07) é usado na ficha, no modo
consulta e no PDF. A visualização periodontal — raízes anatômicas, linha de gengiva dinâmica,
símbolos de furca e mobilidade — tem necessidades de render **diferentes**.

**Decisão:** o periograma ganha visualização própria. Não se estende o componente compartilhado
pra servir os dois — o risco de quebrar o que já funciona e é usado em todo lugar não se paga.
Reuso é de vocabulário (constantes de dentes, tokens, padrão de tabela densa do `endo-form`),
não de componente.

## I9 — Margem gengival é por SUPERFÍCIE, não por sítio

`ps` e `ss` são por **sítio** (6 por dente). `mg` é por **superfície** — 2 por dente (vestibular e
lingual/palatina) — e se aplica aos 3 sítios daquela superfície no cálculo do NIC.

Sancionado pelo [SDCEP](https://www.periodontalcare.sdcep.org.uk/guidance/assessment/special-tests/full-periodontal-examination/what-should-be-recorded/periodontal-parameters/):
recessão aceita por superfície. Além de ser a norma, medir recessão interproximal é menos
confiável — a papila esconde a JCE.

Efeito: 6 medidas de `mg` por dente viram 2. Sozinho, corta 128 entradas do exame de boca toda.

## I10 — Registro por exceção: a ficha periodontal é quase toda zero

Dois grupos, com regras de entrada opostas:

| Grupo | Campos | Entrada |
|---|---|---|
| **Sempre preenchido** | `ps` (6/dente) · `mg` (2/dente) | Valor numérico obrigatório em cada posição |
| **Esparso — por exceção** | `ss` · supuração · placa · mobilidade · furca | Só se registra **o que existe**. Ausência = ausência de marca, nunca um "não" digitado |

Exigir os esparsos como campo obrigatório é pedir ao dentista **192 "nãos"**. Supuração é
opcional na própria norma (SDCEP), placa é ferramenta de motivação (não de diagnóstico), e
mobilidade/furca são majoritariamente grau 0.

**Resultado no exame de boca toda:** ~1.024 entradas obrigatórias caem para **~256**
(6 `ps` + 2 `mg` por dente). É o que tira a grade da faixa "tela que ninguém abre".

> Isto é regra de **entrada**, não de modelo: o dado continua existindo por sítio na leitura
> (um sítio sem marca de sangramento é um sítio que não sangrou). O que muda é que o dentista
> nunca digita o normal.

## I11 — O exame anterior fica visível durante o registro

Periodontista em consulta de manutenção precisa ver que aquele sítio era 5mm e sangrava. Registrar
sem isso é trabalhar cego.

Isto é invariante de **fluxo**, não campo. Vale a partir do R-08c e é o motivo de I7 (append-only)
existir desde o primeiro dia — a tela de comparação (R-08e) espera, a capacidade de comparar não.

> **Correção de enquadramento (28/07):** a comparação temporal tinha sido classificada como
> "feature bônus, vem por último". Operacionalmente ela vem depois mesmo (ninguém tem 2 exames no
> dia 1), mas **para o especialista comparar É o trabalho** — o periograma completo acontece 2–3×
> por ano, enquanto a manutenção (a cada 3–6 meses) é essencialmente *"o que ainda sangra"*.
> Adia-se a tela, não a importância.

## Onde cada invariante é cobrada

| Invariante | Cobrado em |
|---|---|
| I1 (sinal/fórmula) + teste das 3 linhas | R-08c (primeiro sub-item que calcula NIC) |
| I2 (derivado, não persistido) | R-08c · congelamento do documento em R-08d |
| I3 (furca por entrada + validação) | R-08c |
| I4 (implante sem JCE) | R-08c (não calcular) · bifurcação própria depois |
| I5 (severidade, não estágio) | R-08c (exibição) |
| I6 (zero LLM no número) | R-08b (enum do Gemini só pro evento) · R-08f (parser) |
| I7 (append-only) | R-08c (constraint) — habilita R-08e |
| I8 (visualização própria) | R-08c |
| I9 (mg por superfície) | R-08c (modelo de dado) |
| I10 (registro por exceção) | R-08c (UI de entrada) |
| I11 (exame anterior visível) | R-08c (fluxo) — habilita R-08e |
