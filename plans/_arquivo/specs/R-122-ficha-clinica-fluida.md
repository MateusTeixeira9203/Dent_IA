# R-122 — Ficha clínica fluida

> **SPEC** · fase **aprovada — pronta para execução**
> **Aberto:** 2026-08-19 · **Migration:** zero · **API nova:** zero
> **Primeira tela de referência:** `/dashboard/meu-dia`
> **Aprovação visual do Meu Dia:** 2026-08-19 — “perfeito, muito bem feito”.
> **Artefatos:** `R-122-ficha-clinica-fluida.html` (Meu Dia, aprovado) e
> `R-122-ficha-completa.html` (ficha completa, aprovada em 2026-08-19).

## 1. Problema

O produto já tem as peças clínicas certas, mas elas estão distribuídas de um jeito que aumenta
o trabalho do dentista. Na ficha completa, o formulário cresce verticalmente: Campo Mágico,
metadados, odontograma, registros, notas, rotina e ortodontia competem ao mesmo tempo. No Meu
Dia, captura, seleção dental, ações MultiDent e revisão ficam afastadas umas das outras.

O resultado é paradoxo: o sistema guarda mais que uma tabela simples, mas pode exigir mais
gestos para registrar uma consulta. O objetivo deste item é reduzir esse atrito sem perder o
dado estruturado que alimenta histórico, planejamento e orçamento.

## 2. Decisão de produto

- **Meu Dia:** bancada rápida. O dentista fala/digita, confere cards, corrige status/observação
  e destino e salva.
- **Ficha completa:** base clínica completa. Reutiliza os mesmos cards, mas privilegia histórico,
  detalhe e organização progressiva.
- **Texto livre entra; estrutura sai.** Campo Mágico e observações dão liberdade. Cards
  estruturados continuam sendo o registro persistido e editável.
- **Seleção dental é uma linguagem só.** Clicar em qualquer dente apenas seleciona ou remove da
  seleção; nunca troca a bancada por histórico ou editor automaticamente. Com um ou mais dentes,
  a faixa de ações rápidas aparece junto do odontograma. Histórico, faces e tabelas específicas
  só abrem pelo gesto explícito **Abrir detalhe dental**.
- Procedimentos de boca, arcada, quadrante, região, dente e face aparecem como cards tanto no
  Meu Dia quanto na ficha e no histórico.
- Ortodontia mantém os campos livres já implementados: arcada superior, arcada inferior e
  observações gerais.

## 3. Inventário confirmado

| Responsabilidade | Código existente a reutilizar |
|---|---|
| Entrada rápida por voz/texto | `CapturaLivreCard` / Campo Mágico |
| Evento clínico editável | `RegistroCard` |
| Ações para vários dentes | `FaixaLote` + `lote-multidente` |
| Seleção e anatomia | `Odontograma` + `ToothDetailPanel` |
| Ortodontia | `OrtoForm` + `OrtoCard` |
| Histórico do Meu Dia | `HistoricoBloco` + `eventosParaCards` |
| Revisão antes de salvar | `NestaSessaoBloco` |
| Roteamento entre fichas | `EncaminharBar` e regras atuais |
| Modelo de localização | `NivelAncora` / `AncoraClinica` |

Os tipos atuais já cobrem `boca`, `arcada`, `quadrante`, `dente` e `face`; não é necessário
criar coluna ou tabela para esta reorganização.

## 4. Trava de segurança do redesign

Não mudam nesta entrega:

- cabeçalho e navegação do perfil do paciente; as abas reais continuam **Prontuário,
  Orçamentos, Arquivos e Agenda**;
- nomes e semântica de campos persistidos;
- Server Actions, APIs, RLS e isolamento por clínica/dentista;
- classificação `indicado` × `realizado` da voz — pertence ao R-106;
- regra que devolve evento antigo à ficha de origem e envia evento novo ao destino escolhido;
- formatos legados, inclusive regiões sentinela já salvas;
- símbolos do odontograma — R-115 segue congelado;
- geração de orçamento e aceite clínico;
- regras de falha parcial e repetição de salvamento.

Qualquer necessidade de mudar um item acima interrompe a execução e volta para planejamento.

## 5. Escopo de lançamento

### 5.1 Meu Dia — referência primeiro

1. Campo Mágico permanece no topo e é a entrada principal.
2. Área central vira uma bancada de duas colunas no desktop:
   - esquerda: **Revisão da consulta**, com todos os cards desta sessão;
   - direita: odontograma, seleção e faixa MultiDent no mesmo bloco visual.
3. Cada card mostra, conforme existir:
   - procedimento e localização clínica;
   - `Feito` ou `Planejado`, editável;
   - observação/material;
   - detalhe da especialidade;
   - destino da gravação quando relevante.
4. Ações de lote `Tudo feito` e `Tudo planejado` continuam disponíveis.
5. Boca toda, arcada e quadrante deixam de parecer registros de segunda classe: usam o mesmo
   `RegistroCard` e entram no histórico.
6. Histórico, A fazer e Anexos continuam em gavetas; não ocupam a bancada permanentemente.
7. Rodapé preserva retorno, orçamento e salvar/avançar.

### 5.2 Ficha completa — depois da aprovação do Meu Dia

1. Reutiliza Campo Mágico, odontograma, faixa MultiDent e `RegistroCard` aprovados na referência.
2. O primeiro plano contém captura + mapa + registros da consulta.
3. Anotações gerais, conduta, rotina e ortodontia viram seções progressivas: abertas quando há
   conteúdo/uso e recolhíveis quando vazias.
4. Histórico permanece completo e legível, sem esconder observação, material ou arcada.
5. Nenhuma regra clínica é duplicada em um componente exclusivo da ficha.

### 5.3 Responsividade

- **Desktop ≥ 1024 px:** revisão flexível + mapa lateral de 500–560 px, ancorado à direita para
  crescer para a esquerda e deixar a anatomia mais legível.
- **Tablet:** duas colunas enquanto couber; depois mapa abaixo da revisão.
- **Celular:** Campo Mágico → revisão → mapa/ações manuais → seções secundárias; ações finais
  respeitam safe area e nunca ficam atrás do teclado.
- O odontograma pode rolar horizontalmente apenas se a anatomia ficar ilegível ao reduzir.

## 6. Fora do corte de lançamento

- Parser/IA novo para todas as especialidades.
- Substituir formulários estruturados existentes por texto livre puro.
- Migração dos registros legados ou remoção de sentinelas.
- Unificação interna de todos os estados `selectedTeeth`/`teethNotes`.
- R-106, R-115, periograma e painel de transcrição integral.
- Nova entidade de catálogo de materiais.

Esses itens podem vir depois sem invalidar a hierarquia visual desta entrega.

## 7. Contrato de componentes

### `MeuDiaClient`

Compõe a bancada; não ganha regra clínica. Continua recebendo e delegando os mesmos estados e
handlers. Mudança principal: ordem, agrupamento e responsividade.

### `NestaSessaoBloco`

Continua sendo a lista única do que será salvo. Aceita cards de qualquer `NivelAncora`. A UI
destaca revisão pendente, mas não inventa novo status persistido.

### `RegistroCard`

É a unidade visual única nas duas telas. A implementação deve preservar props existentes e
adicionar apenas apresentação opcional se necessário. Observação e detalhe nunca são truncados
sem acesso imediato ao conteúdo completo.

**Trava visual aprovada:** o desenho atual do card clínico é preservado. Título no formato
`Tratamento endodôntico · dente 46`, observação, autor/CRO e pill atuais continuam como estão.
R-122 pode acrescentar informação ou abrir o corpo de detalhe existente, mas não redesenha o
card, não cria rodapé novo e não troca sua hierarquia.

### `FaixaLote`

Fica visualmente acoplada ao odontograma e aos dentes selecionados; seu contrato muda de
**2+** para **1+** dente. Restauração continua pedindo faces antes de criar evento; pode
selecionar uma ou mais faces antes de aplicar. A confirmação cria um evento por face selecionada
para cada dente do conjunto, preservando o mesmo formato de dado e os cards atuais. Ações sem
face mantêm o comportamento atual para todos os dentes selecionados.

Com um dente, a mesma faixa mostra ações rápidas e o botão **Abrir detalhe dental**. Esse é o
único caminho que renderiza `ToothDetailPanel` (histórico, faces e tabelas de especialidade).
Com vários dentes, as ações aplicam ao conjunto; o botão de detalhe não aparece. Sem seleção, a
faixa não cria evento e orienta a seleção.

### `FichasTab`

A etapa 2 reorganiza sua composição e extrai blocos finos quando necessário. Não reescreve o
fluxo de salvamento nem cria uma segunda implementação do Meu Dia.

## 8. Estados de interface

| Estado | Resposta visual |
|---|---|
| Sem evento | vazio curto com convite para falar, colar ou selecionar o mapa |
| IA processando | `DexLoader`, sem spinner novo |
| Evento ambíguo | card destacado para conferência; sem alterar a regra do R-106 |
| Um dente selecionado | faixa de ações rápidas + **Abrir detalhe dental**; nenhum painel abre sozinho |
| Dois ou mais dentes | a mesma faixa aplica ao conjunto; nenhum painel abre sozinho |
| Evento com detalhe | resumo no card + edição expandida existente |
| Falha ao salvar | rascunho permanece e ação de tentar novamente continua disponível |
| Histórico carregando | skeleton consistente com o card final |

## 9. Design brief

### Direção

**Clinical workbench editorial:** densa o suficiente para trabalho profissional, calma e
hierárquica. Deve parecer feita pela mesma equipe do Dashboard, Tratamento e R-78; não é uma
tela nova de outra marca.

### Hierarquia

1. Paciente e contexto da consulta.
2. Campo Mágico como gesto mais rápido.
3. Revisão do que será salvo.
4. Odontograma e ações manuais como apoio visual.
5. Histórico/gavetas e ações finais.

### Tokens vinculantes do primeiro artefato

| Token | Claro | Escuro |
|---|---|---|
| fundo | `#f5f4f1` | `#0d0d0d` |
| card | `#ffffff` | `#111112` |
| borda | `#c2c2c6` | `#27272a` |
| texto | `#09090b` | `#f5f5f5` |
| texto secundário | `#4b5563` | `#a1a1aa` |
| teal | `#2f9c85` | `#63c9b6` |
| teal suave | `#e4f4f1` | `#102b26` |
| coral | `#e57373` | `#ef8f8f` |
| coral suave | `#fce8e8` | `#351a1d` |
| raio base | `10px` | `10px` |

- Corpo e controles: **Outfit**.
- Títulos editoriais: **DM Serif Display**, somente onde a hierarquia atual já usa.
- Espaçamento: base 4 px; blocos 16–24 px; densidade clínica sem cards inflados.
- Motion: 140–180 ms para abrir faixa, expandir detalhe e confirmar status; sem animação
  ornamental frequente.
- Proibido: gradiente decorativo, ícones em círculos coloridos genéricos, cards enormes para
  ações simples e uma cor diferente para cada procedimento.

## 10. Invariantes

- [ ] Todo conteúdo que seria salvo antes continua salvável depois.
- [ ] Nenhum card some por ser de boca, arcada, quadrante ou região.
- [ ] `RegistroCard` é a mesma unidade visual no Meu Dia e na ficha.
- [ ] Campo Mágico nunca grava silenciosamente sem etapa de revisão.
- [ ] Falha parcial não perde o rascunho.
- [ ] Histórico mantém autor, data, status, localização, observação e detalhe disponíveis.
- [ ] Dark e light preservam contraste e hierarquia.
- [ ] Mobile exige no máximo uma coluna e mantém a ação principal alcançável.

## 11. Gates de aceite

- [ ] **G1** — Ditar/colar uma consulta cria cards revisáveis antes de salvar.
- [ ] **G2** — Selecionar 1 dente não abre painel; a faixa aparece e **Abrir detalhe dental**
      abre histórico/faces sem perder a revisão.
- [ ] **G3** — Selecionar 3 dentes e aplicar implante cria um agrupamento legível.
- [ ] **G4** — Restauração em lote exige face antes de criar o evento.
- [ ] **G5** — Profilaxia de boca toda aparece na sessão e no histórico após salvar.
- [ ] **G6** — Procedimento de quadrante e de arcada aparece nas duas telas sem dente fictício.
- [ ] **G7** — Ortodontia só superior/inferior mantém texto e histórico por arcada.
- [ ] **G8** — Editar observação/material no card persiste e reaparece no histórico.
- [ ] **G9** — Evento antigo retorna à ficha de origem; evento novo respeita o destino escolhido.
- [ ] **G10** — Falha ao salvar mantém o evento e oferece nova tentativa.
- [ ] **G11** — Registro legado com `teethNotes` abre e salva sem perda.
- [ ] **G12** — 375, 768 e 1440 px passam sem sobreposição, corte ou ação atrás do teclado.

## 12. Sequência de execução após aprovação

1. Implementar somente o Meu Dia contra o artefato aprovado.
2. QA local dos G1–G12 aplicáveis e comparação visual com o artefato.
3. Usuário valida a tela de referência.
4. Portar a mesma composição para a ficha completa.
5. QA das duas rotas, revisão TypeScript/UX/design e só então preparar commits separados.
