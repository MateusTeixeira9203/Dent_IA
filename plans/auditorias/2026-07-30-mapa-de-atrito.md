# Mapa de atrito — Odonto.IA contra a tabelinha do Word

> **Auditoria** · 2026-07-30 · 13 agentes (6 mapeadores + 6 verificadores adversariais + síntese)
> **Motivo:** *"o dentista antes usava uma tabelinha no Word que funcionava bem, e agora no
> sistema é muita coisa, muitos cliques — é um preço que muitos dentistas podem não querer pagar."*

**Como se contou:** um gesto = um clique, um foco+digitação, uma navegação, uma rolagem
necessária, uma escolha em dropdown. Usuário experiente, **pelo atalho mais curto que já
existe** (não pelo caminho óbvio). Todo número de banco é de produção, leitura pura.

**Atrito ESTRUTURAL** = o clique compra estrutura que o Word não dá.
**Atrito ACIDENTAL** = o clique existe por decisão de implementação. **É de graça remover.**

## Placar

| Caminho | Hoje | Sem o acidental | Word |
|---|---|---|---|
| Orçamento a partir da ficha | 3,5 | **2** | 3 |
| Registrar atendimento (ficha) | 7–9 | **5** | 5 |
| Histórico do dente | 6 | **3** | 3 |
| Agendar | 8 | **5** | 3 |
| Receber dinheiro | 8 | **2** | 3 |
| Achar paciente com acento | 3 **e erra** | 3 | 3 |
| "Quem faltou e não voltou" | ~58 | **1** | não responde |

O produto **já ganha** do Word em orçamento, empata em ficha e histórico, e perde em
dinheiro e agenda — **quase inteiramente por atrito acidental**, não pela estrutura que
cobra. Em dois caminhos o problema nem é gesto: a resposta não existe ou vem errada.

## Achados confirmados por mim, com evidência

Estes eu reconferi pessoalmente (query própria ou leitura do arquivo), não aceitei do agente.

### 1. Regressão no R-30 — **corrigida antes do push**

`fichaParaItens` (working tree) lia só `odontograma_eventos` com status `indicado`.
Medido: das **87 fichas, 82 têm texto por dente (94%) e só 24 têm evento `indicado` (28%)**.
Subir assim tiraria o pré-preenchimento do orçamento de **58 fichas** — trocaria "gerou do
procedimento errado" por "não gerou nada", que é pior porque falha em silêncio.

**Corrigido:** `itensDoTexto` como fallback. Fonte única se faz por **precedência, não por
exclusão** — evento ganha quando existe, texto entra quando não há evento, nunca somados.
Cobertura volta a 82/87, e as 24 com evento passam a incluir procedimento de boca/arcada
que nunca chegava ao orçamento.

### 2. "Registrar Recebimento" do financeiro **nunca funcionou**

`registrarRecebimento` (`financeiro/actions.ts:695`) declara o parâmetro `dentistaId` e
**não o usa** — o insert em `pagamentos` não grava `dentista_id`, e a coluna é **`NOT NULL`
sem default** (conferido no schema). Toda chamada falha. É o formulário mais bem resolvido
do sistema e é 100% erro.

De carona: o Select oferece **"Transferência"**, que o CHECK de `forma_pagamento` não
aceita (só `dinheiro`, `pix`, `cartao_credito`, `cartao_debito`, `boleto`, `outro`).

### 3. O microfone **não grava em iPhone**

`useAudioRecorder.ts:80-82` testa `audio/webm;codecs=opus`, cai para `audio/webm`, e
**nunca tenta `audio/mp4`** — o único container que o Safari do iOS grava. O
`NotSupportedError` é engolido e o usuário lê *"Verifique as permissões do navegador"*,
o que manda ele caçar o problema no lugar errado.

**Por que isso importa mais do que parece:** a conclusão registrada era que o modo consulta
morreu por barreira física — o dentista longe do PC. Mas **o caminho móvel nunca existiu**.
Não é que ele preferiu o PC; no iPhone o botão de gravar simplesmente falha. São 4 linhas.

## Achados do agente, ainda não reconferidos por mim

Vieram com evidência e passaram pelo verificador adversarial, mas eu não refiz a prova.
Tratar como forte, não como certo.

| # | Achado | Onde | Ganho |
|---|---|---|---|
| 4 | CTA "Registrar pagamento" faz INSERT e deixa a parcela pendente aberta. Rastro: **6 orçamentos quitados com pendente aberta = R$ 5.100 de "a receber" fantasma** | `detalhe-orcamento-modal.tsx:1013` · regra pronta em `orcamentos/actions.ts:782` | 2 gestos + para a duplicação |
| 5 | "Novo Agendamento" ignora o dia que o dentista está olhando; `selectedDate` está em escopo e o mecanismo já existe | `agendamentos-client.tsx:1067` · `:196` | 1 gesto em 74% dos casos |
| 6 | Modal de orçamento abre sempre em "Procedimentos", mesmo com parcela pendente | `detalhe-orcamento-modal.tsx:159` | 1 gesto |
| 7 | O 2º "Organizar com DEX" **apaga o odontograma revisado** (replace em vez de merge) — e o tooltip **instrui** o fluxo de duas passadas | `consulta-client.tsx:259-272` | 3 gestos por dente |
| 8 | **A entrada de 1 gesto já existe e ninguém sabe:** "Ver perfil do paciente →" no card do próximo atendimento colapsa sidebar + busca + clique. Disponível em 51% das fichas manuais | `next-appointment-hero.tsx:498` | 2 em ficha, 2 em dinheiro, 1 em busca. **Zero código** |
| 9 | Busca sensível a acento: `unaccent` **não está instalado**, `ilike` cru. "Antonio" → 8 pacientes, "Antônio" → 2, **conjuntos disjuntos**. 44 de 244 (18%) | busca de pacientes | 0 gestos, mas conserta a **causa da duplicata** ([R-31a](../specs/R-31a-paciente-unico-prevencao.md)) |
| 10 | "Quem faltou e não voltou" custa ~58 gestos e a resposta existe num `SELECT` (9 pacientes) | — | 57 gestos. É o [R-26](../ROADMAP.md) |

## O que fazer com isto

Nada aqui virou item ainda — decisão dele. A ordem que os números sugerem:

1. **Item 9 (acento)** — melhor retorno da fila inteira: mata atrito **e** duplicata de uma vez, zero migration de dado, já está dentro da R-31a.
2. **Item 2 (registrarRecebimento)** — um caminho inteiro que nunca funcionou, ~2 linhas.
3. **Item 3 (iPhone)** — destrava uma plataforma, 4 linhas, e reabre a hipótese do modo consulta.
4. **Item 8 (descoberta)** — zero código, só mostrar o que já existe.
5. **Item 4 (R$ 5.100 fantasma)** — dinheiro errado na tela é o pior tipo de erro num SaaS de clínica.
