# R-60 — Registro ortodôntico livre por arcada

> **SPEC** · **R-60** · fase **contrato — aguardando aprovação**
> **Aberto:** 2026-08-19 · **Fechado:** —
> **Migration:** zero — extensão aditiva do JSON `fichas.orto_manutencao`.

## 1. Problema

O formulário atual de ortodontia divide a evolução em arco/fio, ativação, elástico corrente e
intermaxilar. Isso impõe a estrutura do sistema ao relato clínico e torna um registro simples em
quatro campos por arcada. O dentista precisa poder escrever como trabalha, mantendo a ficha fácil
de ler depois.

## 2. Decisão

O painel já aberto por **Manutenção ortodôntica** continua no mesmo lugar do Meu Dia e da ficha
do paciente. Não haverá nova rota, modal ou odontograma específico.

Ele passa a ter:

1. campo livre **Arcada superior**;
2. campo livre **Arcada inferior**;
3. campo livre opcional **Observações gerais**.

Os três campos são independentes. Preencher só superior grava `arcada='superior'`; só inferior,
`'inferior'`; ambos, `'ambas'`. O dentista não escolhe mais esse valor em chips: ele é derivado
do que escreveu. Pelo menos uma arcada precisa ter texto para existir uma manutenção ortodôntica.

## 3. Objetivo

Registrar uma manutenção em poucos gestos, preservando o vocabulário livre do dentista e exibindo
na ficha uma evolução organizada por arcada. Registros antigos e os extraídos por voz continuam
legíveis, sem conversão nem perda de campos.

## 4. Contrato técnico

### Dado persistido

`OrtoManutencaoInfo` e `OrtoManutencaoDetalhe` ganham somente campos opcionais:

```ts
registro_superior?: string | null;
registro_inferior?: string | null;
observacao_geral?: string | null;
```

Os campos legados (`fio`, `ativacao`, `elastico_corrente`, `elastico_intermaxilar` e variantes
inferiores) permanecem inalterados. Não há backfill e nenhuma escrita apaga um campo legado.

`ortoManutencaoSchema` aceita os dois formatos. A forma livre nova usa os campos acima; voz e
fichas existentes continuam usando a forma estruturada anterior.

### Componentes

| Arquivo | Mudança |
|---|---|
| `src/components/fichas/orto-form.tsx` | troca os grupos rígidos por três `textarea`; deriva `arcada`; preserva campos legados recebidos no valor |
| `src/components/fichas/orto-card.tsx` | exibe blocos Superior, Inferior e Observações quando há formato livre; mantém a leitura estruturada dos registros legados |
| `src/lib/especialidades/orto.ts` | estende Zod e o tipo do plugin, sem trocar persistência |
| `src/types/odontograma.ts` | estende o contrato compartilhado do JSON |
| `registrar-painel.tsx` / `FichasTab.tsx` | normalizam objeto totalmente vazio para `null`, impedindo ficha ortodôntica sem conteúdo |
| `get-meu-dia.ts` / histórico do Meu Dia | expõe `orto_manutencao` na visita, troca o fallback “Evolução” por “Manutenção ortodôntica” e renderiza o mesmo card por arcada |

### Compatibilidade

- Registro antigo ou vindo da voz, sem `registro_superior`/`registro_inferior`, conserva o card
  atual de Arco, Ativação e Elásticos.
- Registro com texto livre e campos legados mostra ambos os blocos, sem ocultar dado clínico.
- A IA não passa a inventar resumo livre; este item não altera prompt, schema de extração ou
  pipeline de voz.

## 5. Comportamento

### Estados

- Vazio: os dois campos de arcada estão vazios; não há registro ortodôntico a salvar.
- Uma arcada: só o bloco preenchido aparece na ficha.
- Ambas: os dois blocos aparecem na ordem Superior → Inferior.
- Legado/voz: card estruturado existente aparece sem mudança.
- Misto: textos livres aparecem primeiro; dados estruturados remanescentes ficam em uma seção
  secundária “Dados extraídos”.
- Histórico no Meu Dia: uma visita ortodôntica aparece como “Manutenção ortodôntica” e exibe o
  mesmo card de Arcada superior/Arcada inferior da ficha; nunca degrada para “Evolução”.

### Caminho principal

1. Dentista toca em **Manutenção ortodôntica**.
2. Escreve livremente em Superior e/ou Inferior; observação geral é opcional.
3. Salva a ficha pelo fluxo normal.
4. A ficha persiste `orto_manutencao` com arcada derivada e apresenta a evolução por arcada.

### Exemplos

| Entrada | Resultado na ficha |
|---|---|
| Superior: “0.018 aço; ativação leve; troca de ligaduras” | bloco Arcada superior com a frase integral |
| Inferior: “Elástico 3/16 Classe II à noite” | bloco Arcada inferior com a frase integral |
| Superior e Inferior preenchidos | dois blocos, sem misturar as descrições |
| Registro antigo com `fio` e `ativacao` | card atual de campos estruturados |

## 6. Referência visual

É um refinamento do painel existente, não uma tela de marca nova. Segue Dashboard, Meu Dia e Ficha clínica:
`bg-surface`, `bg-surface-alt`, `text-text-primary`, `text-text-secondary`, `border-border` e
teal apenas para foco e títulos de arcada. Cada arcada é uma área de texto com label explícito;
não usar chips decorativos, campos com aparência de planilha ou cores novas.

Mobile: os três campos empilham, têm alvo de toque mínimo de 44px e mantêm o botão Salvar fora do
teclado pelo comportamento já adotado no Meu Dia.

## 7. Invariantes

- Nenhum dado ortodôntico existente é convertido, removido ou escondido.
- Ortodontia continua sendo registro de ficha/arcada; não cria evento nem pinta odontograma.
- Uma manutenção sem texto em Superior e Inferior não cria ficha/rascunho ortodôntico.
- A derivação de `arcada` vem apenas dos campos preenchidos; IA não decide a arcada neste fluxo.
- Meu Dia e FichasTab gravam o mesmo formato JSON.

## 8. Gates de aceite

- [ ] Superior preenchida e Inferior vazia → salva e mostra apenas Superior.
- [ ] Inferior preenchida e Superior vazia → salva e mostra apenas Inferior.
- [ ] Ambas preenchidas → salva duas descrições separadas e `arcada='ambas'`.
- [ ] Abrir e fechar o painel sem digitar → Salvar continua desabilitado se não houver outro
      conteúdo na visita; nenhuma ficha ortodôntica vazia nasce.
- [ ] Ficha antiga com campos de arco/ativação continua renderizando exatamente seus dados.
- [ ] Relato de voz com manutenção ortodôntica continua abrindo e salvando o formato legado.
- [ ] Histórico do Meu Dia de uma ficha com manutenção mostra o conteúdo por arcada, tanto na
      gaveta quanto na leitura ampliada; não cai no resumo genérico “Evolução”.
- [ ] Em 375px e desktop, labels, campos e ação de salvar permanecem alcançáveis.

## 9. Fora de escopo

- Nova IA para interpretar a evolução livre.
- Periograma, controle de movimentação dentária ou comparação longitudinal.
- Pinta de ortodontia no odontograma.
- Redesign completo da ficha clínica.
