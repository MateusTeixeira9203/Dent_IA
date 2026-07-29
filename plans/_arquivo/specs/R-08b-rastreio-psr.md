# R-08b — Rastreio periodontal (PSR/CPITN): 6 números em vez de 192

> **SPEC** · **R-08b** · fase **contrato** — pronta pra execução.
> **Modelo:** Sonnet (mecânico depois das decisões — sem ambiguidade de produto sobrando).
> **Aberto:** 2026-07-28 · **Depende de:** R-08a (✅ no ar) · **Migration: NENHUMA.**
> **Peso:** P · **Contrato clínico que rege este item:** [R-08](R-08-contrato-clinico-perio.md)

## Problema

O R-08a fez o exame periodontal **existir** como registro (aconteceu, com data e autor). Mas ele
não guarda **nenhum número** — e sem número não há como o exame indicar conduta.

O periograma completo (~256 entradas obrigatórias mesmo depois das reduções de I9/I10) é o exame
do especialista, feito 2–3× por ano. O exame que o **clínico geral faz de rotina** — que é 12 dos
13 dentistas ativos hoje — é o rastreio: **6 códigos, um por sextante**.

E é o rastreio que **decide se o periograma completo é necessário**. Construir a grade antes dele
é construir a tela do especialista antes da tela de quem abre o sistema todo dia.

## Escopo

**Cobre:** captura manual dos 6 códigos PSR no form de evolução (dentro do registro
`exame_periodontal` que o R-08a criou), persistência no `detalhe` jsonb do evento, card de leitura
na ficha salva, e a **conclusão determinística** (qual conduta o código indica).

**Não cobre:** grade 6×32 e tabela `perio_exames` (R-08c) · NIC/CAL (não existe no rastreio —
PSR não mede inserção) · PDF e assinatura (R-08d) · comparação temporal (R-08e) · voz (R-08f).

## O que é o PSR — códigos verificados

Sonda OMS/CPI: ponta esférica de 0,5mm, **faixa colorida de 3,5 a 5,5mm**. Registra-se **apenas o
código mais alto de cada sextante** — um número por sextante, não por dente.

| Código | O que se vê | Profundidade | Conduta indicada |
|---|---|---|---|
| **0** | Faixa toda visível, sem sangramento, sem cálculo | 1–3mm | Prevenção + revisão do controle de placa |
| **1** | Faixa toda visível, **com sangramento**, sem cálculo | 1–3mm | Orientação de higiene individualizada |
| **2** | Faixa toda visível, **com cálculo ou margem defeituosa** | 1–3mm | Higiene + remoção de cálculo + correção de margens |
| **3** | Faixa **parcialmente** visível | 4–5mm | **Periograma completo** (ver regra abaixo) |
| **4** | Faixa **desaparece** completamente | > 5,5mm | **Periograma completo de boca toda** + tratamento avançado |
| **X** | Sextante edêntulo | — | — |
| **\*** | Modificador: furca, mobilidade, problema mucogengival, ou recessão ≥ 3,5mm | — | Soma-se ao código do sextante |

**Regra de indicação do periograma** (fonte: [ADA/dentalcare — Guidelines for Patient Management](https://www.dentalcare.com/en-us/ce-courses/ce617/guidelines-for-patient-management)):

- Código **3 em 1 sextante** → periograma completo **daquele sextante**
- Código **3 em ≥2 sextantes** → periograma completo de **boca toda**
- Código **4 em qualquer sextante** → periograma completo de **boca toda**

## Sextantes (FDI)

| | Direito | Anterior | Esquerdo |
|---|---|---|---|
| **Superior** | S1 · 18–14 | S2 · 13–23 | S3 · 24–28 |
| **Inferior** | S6 · 48–44 | S5 · 43–33 | S4 · 38–34 |

Layout na tela segue a convenção do odontograma do projeto: **direito do paciente à esquerda de
quem olha** — `S1 S2 S3` em cima, `S6 S5 S4` embaixo.

## Contrato técnico

```typescript
// src/lib/especialidades/perio.ts (novo)

export const CODIGOS_PSR = [0, 1, 2, 3, 4] as const;
export type CodigoPSR = typeof CODIGOS_PSR[number];

export const sextanteSchema = z.object({
  /** null = ainda não avaliado. Distinto de 0 (avaliado, saudável). */
  codigo:    z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).nullable(),
  /** "X" — sextante sem dentes. I10: esparso, só aparece quando true. */
  ausente:   z.boolean().optional(),
  /** "*" — furca, mobilidade, mucogengival ou recessão ≥3,5mm. I10: esparso. */
  asterisco: z.boolean().optional(),
});

export const psrDetalheSchema = z.object({
  psr: z.object({
    s1: sextanteSchema, s2: sextanteSchema, s3: sextanteSchema,
    s4: sextanteSchema, s5: sextanteSchema, s6: sextanteSchema,
  }),
});
export type PsrDetalhe = z.infer<typeof psrDetalheSchema>;
```

**Persistência:** `odontograma_eventos.detalhe` (jsonb) do evento `exame_periodontal`.
A coluna existe e a RPC `salvar_eventos_odontograma` já a persiste — **zero SQL, zero migration**.

### A conclusão determinística (o valor do item)

```typescript
export type ConclusaoPSR =
  | { tipo: 'sem_avaliacao' }
  | { tipo: 'sem_alteracao' }                            // todos 0
  | { tipo: 'higiene' }                                  // máx 1
  | { tipo: 'calculo_margens' }                          // máx 2
  | { tipo: 'periograma_sextante'; sextantes: string[] } // 3 em exatamente 1
  | { tipo: 'periograma_boca'; motivo: 'codigo_4' | 'multiplos_3' };

/** Função PURA — zero IA (I6). Deriva conduta dos 6 códigos. */
export function concluirPSR(d: PsrDetalhe): ConclusaoPSR;
```

O asterisco **não muda** o tipo de conclusão — acrescenta uma nota ("achado adicional em S3"),
porque ele sinaliza condição que o periograma vai detalhar, não uma conduta própria.

### UI

**Form** (dentro do bloco de evolução, aparece quando o registro `exame_periodontal` existe no
rascunho — mesmo padrão do bloco "Manutenção ortodôntica"):

- 6 células no layout de boca (`S1 S2 S3` / `S6 S5 S4`).
- **Toque cicla** `vazio → 0 → 1 → 2 → 3 → 4 → X → vazio` — mesmo idioma dos chips de rotina que o
  dentista já usa. Na prática a maioria dos sextantes é 0–2, então são 1–3 toques.
- Asterisco: toggle pequeno no canto de cada célula (não entra no ciclo — é ortogonal).
- Cor por código, usando token existente: 0–1 teal · 2 âmbar · 3–4 coral.
- Abaixo, a conclusão em texto, atualizada ao vivo.

**Card** (ficha salva, readOnly): as 6 células no mesmo layout + a conclusão. Montado pelo slot
`Card` do plugin, lido por `safeParse` — mesmo padrão do `EndoCard`.

### Registry

`periodontiaPlugin` ganha `detalheSchema: psrDetalheSchema`, `Form` e `Card`.

> **Divergência conhecida, decidida aqui:** o plugin declara
> `persistencia: { forma: 'tabela-satelite', tabela: 'perio_exames' }`, mas o **rastreio** mora no
> `detalhe` do evento. Isso não é bug — `persistencia` é metadado declarativo e **nenhum código em
> `src/` o lê pra decidir nada** (verificado por grep). O campo descreve a persistência principal
> do plugin, que continua sendo a tabela satélite do periograma (R-08c). **O R-08c decide** se o
> tipo passa a admitir duas formas; mudar agora seria churn sem consumidor.

## Invariantes

- [ ] Zero migration — `detalhe` jsonb e o CHECK do tipo já existem no banco vivo.
- [ ] `concluirPSR` é função pura, sem IA (I6 do contrato).
- [ ] `codigo: null` (não avaliado) é distinto de `codigo: 0` (avaliado, saudável).
- [ ] `ausente` e `asterisco` são esparsos — ausentes do JSON quando falsos (I10).
- [ ] O rastreio **não** calcula NIC — PSR não mede inserção (I1/I2 não se aplicam aqui).
- [ ] Nenhum comportamento dos chips de rotina existentes muda.

## Gates de aceite

- [ ] Com o chip "Exame periodontal" ativo, o bloco PSR aparece no form.
- [ ] Toque cicla `vazio → 0 → 1 → 2 → 3 → 4 → X → vazio` nas 6 células.
- [ ] Asterisco liga/desliga sem alterar o código.
- [ ] Conclusão bate com a tabela, testada nos 6 casos: todos 0 · máx 1 · máx 2 · um 3 · dois 3 · um 4.
- [ ] Salvar persiste; **recarregar a página** mostra os códigos (persistiu de verdade).
- [ ] Card na ficha salva mostra os 6 códigos e a conclusão.
- [ ] Conferir no banco: `detalhe->'psr'` com os 6 sextantes no evento `exame_periodontal`.
- [ ] Dark e light conferidos nas 3 faixas de cor (teal/âmbar/coral).
