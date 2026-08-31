# R-133 — Dex clínico sem perda

> **SPEC** · **R-133** · ⏳ fila P0
> **Aberto:** 2026-08-26 · **Fechado:** — · **Fase:** aprovada para execução · **Revisão:** 2

## 1. Problema

O usuário confirmou que um procedimento não existente na “base” do Dex pode ser excluído ou
ignorado. O problema real não é o catálogo financeiro da clínica: o schema estruturado da rota
aceita apenas um enum visual fechado. O domínio TypeScript e o banco já aceitam `outro` e
`exame_periodontal`, mas `ODONTOGRAMA_EVENTO_SCHEMA` e `TIPOS_ACEITOS` não. `parseEventos`
descarta tipos fora da lista com `continue`.

O mesmo fato também é gerado em `procedimentos`, `dentes_observacoes` e
`odontograma_eventos`. Essas estruturas podem divergir: o texto sobrevive, mas o evento/card que
alimenta revisão, plano e orçamento desaparece. Perda silenciosa é o pior resultado possível.

## 2. Decisão e alternativas descartadas

| Decisão | Alternativa descartada | Motivo |
|---|---|---|
| Abrir `outro` e `exame_periodontal` | criar um tipo para cada procedimento | domínio e banco já suportam fallback |
| Nome real fica em `observacao` | título genérico “Outro procedimento” | preserva o dado clínico útil |
| Reconciliação determinística após o parser | confiar que três arrays da IA sempre concordam | elimina descarte silencioso |
| Divergência vira indicado + revisão | inferir realizado pela frase genérica | visibilidade segura vence falso realizado |
| Reusar os cards atuais | modal separado de “não reconhecidos” | reduz clique e duplicação de UI |
| Catálogo não aprende sozinho | cadastrar todo desconhecido automaticamente | associação errada viraria erro recorrente |
| Uma chamada de IA | segunda chamada para desconhecidos | menor latência/custo e menos pontos de falha |
| Sem migration | novo modelo universal agora | a persistência atual já comporta a solução |

## 3. Objetivo e como funciona

**Objetivo:** toda intervenção odontológica explícita chega à revisão como tipo específico ou
`outro` com nome preservado; nenhuma divergência entre as saídas da IA some silenciosamente.

Fluxo:

```text
relato → 1 chamada Gemini → parse dos tipos conhecidos/outro
  → reconciliação contra `procedimentos`
    → coberto: mantém evento
    → não coberto: cria `outro` indicado + precisa revisar
      → cards atuais → dentista confirma/edita/remove → salvar
```

## 4. Contrato técnico

### 4.1 Schema e parser

- `ODONTOGRAMA_EVENTO_SCHEMA.properties.tipo.enum` e `TIPOS_ACEITOS` ganham
  `exame_periodontal` e `outro`.
- O prompt define `outro` como escape obrigatório para **intervenção** sem tipo específico.
- `outro.observacao` guarda nome clínico não vazio; nunca somente “outro”.
- `exame_periodontal` usa nível `boca` e permanece distinto de `raspagem`.
- `outro` aceita `dente`, `arcada`, `quadrante` ou `boca` conforme localização explicitamente
  dita; nunca inventa dente/face.
- `outro` com observação vazia é inválido e segue para a reconciliação, não é persistido vazio.

### 4.2 Reconciliação sem perda

Novo módulo puro, sem rede e compartilhado pela rota:

```ts
interface ResultadoReconciliacaoDex {
  eventos: OdontogramaEventoInput[];
  adicionadosComoOutro: number;
  procedimentosSemCobertura: string[]; // só retorno interno/teste; não logar texto
}

function reconciliarProcedimentosDex(input: {
  procedimentos: readonly string[];
  eventos: readonly OdontogramaEventoInput[];
  dentesObservacoes: Readonly<Record<string, string>>;
  modo: 'consulta' | 'exame_inicial';
}): ResultadoReconciliacaoDex;
```

Algoritmo obrigatório:

1. Remove strings vazias e duplicatas normalizadas de `procedimentos`.
2. Um procedimento está coberto quando casa com `observacao` de `outro` ou com aliases
   explícitos do tipo estrutural em `DEX_ALIASES_POR_TIPO`; substring solta não basta.
3. Cada procedimento sem cobertura gera fallback `tipo: 'outro'`, `status: 'indicado'`,
   `evidencia_status: 'ambiguo'`, `revisar_status: true` e `momento_planejado: 'sessao_atual'`.
4. Se o nome casar de forma inequívoca com observações de dentes, gera um evento por dente com
   o mesmo `grupo_id`; sem correspondência inequívoca, usa `ancora: { nivel: 'boca' }`.
5. O fallback nunca infere realizado, face, preço, material, diagnóstico ou catálogo.
6. A lista textual `procedimentosSemCobertura` só existe durante a request/teste. Logs recebem
   apenas a contagem agregada.

O viés deliberado é visibilidade: um falso fallback revisável é aceitável no rascunho; perda
silenciosa ou falso realizado não são. A R-143 impede salvar fallback sem decisão humana.

### 4.3 Apresentação e campos derivados

- `RegistroCard` usa `observacao` como título quando `tipo === 'outro'`.
- A edição continua alterando a observação; remover/status usam os controles atuais.
- `derivarV2DosEventos` usa o nome de `outro`, não “Outro procedimento”, em `procedimentos` e
  `dentes_observacoes`.
- Orçamento mantém preço vazio quando não há item de catálogo correspondente.
- O dentista pode cadastrar o termo manualmente no catálogo depois; nenhuma escrita automática.

### 4.4 Compatibilidade e performance

- Body, status HTTP e `EvolucaoFormatada` permanecem compatíveis.
- Nenhuma tabela, RPC, RLS ou Server Action muda.
- Uma captura continua com uma chamada principal; reconciliação é síncrona local.
- O mesmo resultado é entregue para Ficha e Meu Dia.
- Mediana e p95 pós-mudança não podem piorar mais de 10% na mesma máquina/sessão.

## 5. Comportamento — alvo funcional

| Situação | Resultado esperado |
|---|---|
| Procedimento conhecido | card estrutural atual |
| “Fiz gengivoplastia no 11 e 21” | dois `outro` agrupados, nome Gengivoplastia |
| “Instalei mantenedor de espaço no 75” | `outro`, dente 75 |
| “Fiz moldagem para estudo” | `outro`, nível boca |
| Exame periodontal | `exame_periodontal`, não `outro` |
| Procedimento textual sem evento | fallback `outro` indicado + revisão |
| “Não fiz gengivoplastia” | nunca realizado; não pode salvar sem revisão se houver fallback |
| Cárie/material/conversa isolados | não viram `outro` confirmável automaticamente |
| Timeout/JSON inválido | relato permanece; nenhum evento parcial |

## 6. Referência visual

Sem tela nova nem artefato. Reutiliza o `RegistroCard` aprovado. A única mudança de conteúdo é o
título clínico real e a sinalização “Confira o status”; layout, tokens e hierarquia permanecem.

## 7. Invariantes

- [ ] Procedimento explícito não é descartado por falta de enum.
- [ ] `outro` sempre tem descrição clínica não vazia.
- [ ] Diagnóstico, material isolado, negação e conversa não viram realizado por fallback.
- [ ] Nenhum dente, face, status, preço ou item de catálogo é inventado.
- [ ] Divergência vira revisão visível, nunca perda silenciosa.
- [ ] Correção humana e evento existente não são sobrescritos por reextração.
- [ ] R-139c, ortodontia e eventos conhecidos não regridem.
- [ ] Nenhum conteúdo clínico aparece em log operacional.

## 8. Gates de aceite

- [ ] **G1:** schema/provider mockado aceita `outro` e `exame_periodontal`; parser preserva ambos.
- [ ] **G2:** os três exemplos desconhecidos geram nome e âncora esperados, 3/3 execuções.
- [ ] **G3:** caso misto conhecido + desconhecido mantém os dois sem duplicar o conhecido.
- [ ] **G4:** procedimento presente no array e ausente dos eventos vira fallback revisável.
- [ ] **G5:** negação, achado, material e conversa têm zero falso realizado e zero fallback
  persistível sem confirmação.
- [ ] **G6:** `outro` aparece no card, campos derivados e orçamento com nome real e preço vazio.
- [ ] **G7:** Ficha e Meu Dia têm paridade antes do save e após reload.
- [ ] **G8:** p50/p95 dentro de 10% do baseline; uma chamada principal por organização.
- [ ] **G9:** eval anterior continua passando; novos casos medem recall de desconhecidos,
  falsos fallbacks e procedimentos sem cobertura.
- [ ] **G10:** typecheck, todos os 23 testes e eval passam antes de qualquer publicação.

## 9. Fora de escopo

- Criar símbolo para cada procedimento ou ontologia universal.
- Aprender aliases/catálogo automaticamente a partir das correções.
- Inventar diagnóstico ou sugerir tratamento.
- Alterar preço, faturamento, schema, RLS ou dados históricos.
- Redesenhar Campo Mágico/cards; segurança da revisão pertence à R-143.
