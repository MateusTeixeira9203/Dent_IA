# R-49 — Endodontia preenchida por texto e voz

> **SPEC** · **R-49** · ⏳ fila
> **Aberto:** 2026-08-02 · **Fechado:** — · **Fase:** F1 determinística integrada localmente; F2 IA/dúvidas pendente
> **Depende de:** R-106 validado. R-100 está congelado; transcrição na ficha será item futuro.
> **Recorte 17/08:** somente endodontia. Outras especialidades entram em fatias posteriores.

## 1. Problema

Um molar de três canais pode exigir 17 campos. Em produção, 21 de 32 eventos de endodontia
(66%) tinham odontometria totalmente vazia. Os forms, cards, persistência JSONB e a rota de
despacho do pass 2 já existem; `endodontiaPlugin.extractor` ainda é `null` e a rota não tem
chamadores.

O objetivo não é tornar voz infalível. É evitar que o custo de preencher a tabela faça o
registro desaparecer, mantendo revisão humana visível para números clínicos.

## 2. Decisão e alternativas descartadas

| Decisão | Alternativa descartada | Motivo |
|---|---|---|
| Primeira fatia somente endodontia | endo+implante+orto+perio juntas | vocabulários e validações diferentes; falha fica impossível de isolar |
| Texto e voz usam o mesmo relato transcrito | caminho exclusivo para áudio | a entrada clínica real do parser é texto |
| Parser determinístico tenta primeiro; IA só completa o que foi dito | somente IA | gramática estruturada não precisa inferência nem custo |
| Tabela endodôntica abre após extração com algum detalhe | abrir toda vez que existe evento de canal | não força 17 campos quando nenhum detalhe foi narrado |
| Origem da célula acompanha o rascunho | gravar provenance clínica permanentemente agora | revisão precisa da marca; prontuário não precisa dessa coluna nesta fatia |
| Número plausível pode ser preenchido pela IA e revisado | proibir todo número da voz | campo vazio já é o modo de falha dominante medido |
| Correção manual sempre vence | reextração sobrescreve tabela | evita perda silenciosa |

## 3. Objetivo e como funciona

**Objetivo:** ditar ou escrever detalhes de canal preenche a tabela endodôntica correspondente,
abre a revisão no Meu Dia e reduz o preenchimento manual sem inventar campos ausentes.

O pass 1 identifica evento e dente. Para cada endodontia detectada, o cliente chama o pass 2
com relato original e dentes. O extractor determinístico resolve abreviações estruturadas;
quando não bastar, o extractor IA retorna dados e dúvidas. O resultado é mesclado sem substituir
células já editadas. Se houver detalhe ou dúvida, a tabela do dente abre automaticamente.

**Andamento 17/08:** F1 já aplica o parser determinístico após o pass 1, preserva detalhe
manual/preexistente e abre o perfil do primeiro dente com dado válido. F2 continua pendente:
dispatcher/IA complementar, dúvidas transitórias e merge por campo. Ela só começa após o gate
do R-106, para que não se misture falha de classificação do evento com extração de odontometria.

## 4. Contrato técnico

### Dados

Reusa `odontograma_eventos.detalhe`; zero migration.

```typescript
export type OrigemCelulaEndo = 'deterministico' | 'ia' | 'manual';

export type DuvidaEndo = {
  campo: string;
  trecho: string;
  motivo: 'sem_canal' | 'fora_da_faixa' | 'resolucao_invalida' | 'conflito';
};

export type EndoExtraction = {
  dente: number;
  detalhe: EndoDetalhe;
  origemPorCampo: Record<string, OrigemCelulaEndo>;
  duvidas: DuvidaEndo[];
};

export type EndoExtractionResult =
  | { ok: true; extracoes: EndoExtraction[] }
  | { ok: false; motivo: 'nada-extraido' | 'erro'; mensagem?: string };
```

`origemPorCampo` e `duvidas` vivem no rascunho da UI; somente `EndoDetalhe` válido persiste.

### Parser determinístico

```typescript
export function extrairEndoDeterministico(
  texto: string,
  dentesContexto: number[],
): EndoExtractionResult;
```

Gramática inicial aceita, sem diferenciar maiúsculas e com vírgula/ponto decimal:

```text
46: MV 21,5 15/35; DV 20 15/30; D 20,5 15/30; obturação lateral; AH Plus
```

- canal + comprimento + lima inicial/final;
- obturação e cimento vinculados ao dente corrente;
- número sem dente/canal inequívoco vira dúvida, nunca palpite.

### Validação clínica

- comprimento: `8–30 mm`, passo de `0,5 mm`;
- limas: inteiros positivos aceitos pelo schema atual;
- fora da faixa ou resolução inválida não entra em `detalhe`;
- campo não mencionado permanece `null`;
- vazio nunca vira zero;
- o extractor IA usa Structured Output tipado e passa pela mesma validação local.

### Orquestração

`/api/dex/extrair-especialidade` continua como dispatcher. O plugin de endodontia ganha
`extractor: { modo: 'ia', extrair }`; a implementação tenta o determinístico antes de chamar
o provider. A resposta reúne resultados de todos os dentes citados.

No cliente, `CampoMagicoMeuDia`:

1. aplica o pass 1 sem perda;
2. deriva dentes com evento `endodontia`;
3. chama o pass 2 uma vez;
4. mescla por dente/campo;
5. abre o perfil do primeiro dente com detalhe/dúvida;
6. os seguintes ficam acessíveis pelos cards, sem fila em tempo real.

### Merge

Prioridade: `manual > valor já presente > determinístico > IA > vazio`.

- mesmo valor: mantém o atual, sem conflito;
- valor novo diferente de manual/presente: não sobrescreve; cria dúvida `conflito`;
- nova célula válida: preenche e marca origem;
- nova dúvida: acumula por chave sem duplicar.

## 5. Comportamento

| Dado / situação | Resultado esperado |
|---|---|
| `46 MV 21,5 lima 15/35` | abre 46; MV preenchido; demais canais vazios |
| `MV 45 mm` | 45 não entra; trecho aparece como dúvida fora da faixa |
| `MV 21,3 mm` | não arredonda; dúvida de resolução inválida |
| `21,5 lima 15/35` sem canal | nada associado por palpite; dúvida preserva trecho |
| IA não extrai nada | evento do pass 1 permanece; form manual continua disponível |
| célula manual 21,5; reprocessa 22 | mantém 21,5 e mostra conflito |
| dois dentes narrados | detalhes ligados ao dente correto; abre o primeiro com dado |
| falha do pass 2 | pass 1 e texto permanecem; erro não impede edição ou save |

## 6. Referência visual

Não cria tela. Reusa `EndoForm` dentro do perfil de dente já existente.

- célula preenchida por parser/IA: borda `teal` existente;
- dúvida/recusa: coral tracejado, com trecho ouvido;
- manual: aparência normal do form;
- light e dark usando tokens, sem cor hardcoded.

## 7. Invariantes

- [ ] Campo não dito fica `null`; nunca inferido para completar a tabela.
- [ ] Número inválido é recusado, nunca arredondado.
- [ ] Fragmento numérico não ancorado vira dúvida; nunca desaparece.
- [ ] Merge nunca sobrescreve célula manual ou valor anterior.
- [ ] Falha do pass 2 nunca remove o evento produzido pelo pass 1.
- [ ] Somente detalhe validado persiste; provenance/dúvida são revisão transitória.
- [ ] Zero comportamento em tempo real enquanto o dentista ainda fala.

## 8. Gates de aceite

- [ ] Testes unitários cobrem a gramática e todos os exemplos da §5.
- [ ] `45 mm` e `21,3 mm` são recusados sem aparecer em `EndoDetalhe`.
- [ ] Campo ausente permanece `null` no payload salvo e após recarregar.
- [ ] Correção manual seguida de reprocessamento não é sobrescrita.
- [ ] Ditar um caso de 3 canais no localhost preenche o dente certo e abre a tabela.
- [ ] Falha simulada do pass 2 mantém texto, evento e form editável.
- [ ] Eval do R-106 não regride após ligar o pass 2.
- [ ] Light/dark e largura móvel conferidos na tabela aberta.
- [ ] A futura ficha recolhível de transcrição não é pré-requisito deste fluxo; a tabela
      endodôntica continua sendo a superfície de revisão desta fatia.

## 9. Fora de escopo

- Brilho, odontograma reagindo enquanto dita e fila de tabelas ao vivo (R-49b congelado).
- Implantodontia, ortodontia e periodontia; cada uma terá recorte próprio após endodontia.
- Periograma completo, aprendizado automático e alteração dos campos clínicos existentes.
