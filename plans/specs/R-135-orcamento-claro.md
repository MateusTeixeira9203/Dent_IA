# R-135 — Orçamento claro vindo da ficha

> **SPEC (redesign + correção de comportamento)** · **R-135** · aprovada
> **Aberto:** 2026-08-26 · **Fechado:** — · **Fase:** implementação

## 0. Identificação

| | |
|---|---|
| **Tela / módulo** | Novo orçamento dentro do perfil do paciente |
| **Tipo** | Redesign de tela existente + diagnóstico explícito da fonte |
| **Rota** | `/dashboard/pacientes/[id]` |
| **Arquivos principais** | `use-orcamento-modal.ts`, `novo-orcamento-modal.tsx`, `orcamentos/actions.ts`, `arcadas.ts` |

## 1. Estado atual

- O modal mistura procedimentos, quantidade, preços, valor negociado e plano de pagamento.
- A origem de cada item não aparece: ficha, dente/face, item manual ou catálogo.
- Evento já orçado, evento de outro responsável e falha de sincronização somem da lista sem motivo.
- Orçamento existente não mostra que a ficha recebeu procedimentos depois da emissão.
- “Adicionar procedimento” cria uma linha com um único campo de descrição.
- Itens vindos da ficha usam o formato `Restauração — D16`, porém `stripDenteDoNome()` não
  remove esse sufixo. O cadastro rápido pode salvar o dente no nome do catálogo.
- `criarProcedimentoRapido()` insere diretamente, sem procurar equivalente antes.
- Produção tem 315 procedimentos no catálogo; 27 nomes contêm referência dental compatível com
  os padrões auditados. A leitura foi agregada, sem expor nomes ou clínicas.

## 2. Trava de segurança

- [x] Um evento clínico não entra em dois orçamentos.
- [x] Orçamento emitido continua snapshot; atualização exige ação explícita.
- [x] Clínica e responsável continuam filtrados.
- [x] Aprovação parcial, recebimentos, parcelas, PDF e assinatura continuam intactos.
- [x] Itens manuais continuam permitidos.
- [x] Catálogo guarda **apenas o nome do procedimento**; dente, face e região são contexto do item.
- [x] O dentista pode ajustar qualquer valor antes de gerar o orçamento.

## 3. O que o usuário pediu

**Sensação pretendida:** fácil de entender, rápido e sem esconder por que um procedimento não
apareceu.

**Regra de simplicidade:** a inteligência de conciliação fica nos bastidores. Em cada momento,
a tela apresenta somente a próxima decisão necessária ao dentista. Informações secundárias
ficam recolhidas e nenhum termo técnico de sincronização, evento ou snapshot aparece na UI.

**Problemas concretos:**

1. Procedimentos adicionados depois à ficha podem não aparecer no orçamento.
2. Dentistas têm dificuldade para entender o que foi puxado da ficha.
3. O preço precisa ser editável porque a dificuldade clínica muda o valor.
4. Adicionar procedimento não pode poluir o catálogo com nomes contendo dentes.

| Elemento | Como está | Como será proposto |
|---|---|---|
| Cabeçalho | Título + instrução genérica | Paciente, origem e progresso em 3 passos |
| Fonte | Invisível | Contadores: novos, já orçados e atenção |
| Procedimentos | Tabela plana editável | Cards compactos com procedimento separado de dente/face |
| Preço | Input sem contexto | Valor visível e editável, com selo “Catálogo” ou “Ajustado” |
| Adicionar | Um campo de descrição | Procedimento + localização opcional em campos separados |
| Já orçados | Somem | Grupo recolhível com acesso ao orçamento de destino |
| Erro de fonte | Lista vazia | Motivo explícito + tentar sincronizar |
| Financeiro | Misturado à seleção | Resumo lateral; plano de pagamento fica fora do caminho principal |
| Mobile | Sequência longa | Uma coluna + barra inferior fixa com quantidade e total |

## 4. Contrato do catálogo

```ts
interface ItemOrcamentoEditavel {
  procedimentoId: string | null;
  procedimentoNome: string;   // ex.: "Restauração em resina"
  localClinico: string | null; // ex.: "D16 · face O" — nunca vai para procedimentos.nome
  quantidade: number;
  precoUnitario: number;
  origem: 'ficha' | 'manual';
  eventoIds: string[];
}
```

Ao cadastrar rapidamente:

1. normalizar somente `procedimentoNome`;
2. procurar equivalente do mesmo dentista antes de inserir;
3. reutilizar o existente quando encontrar;
4. nunca usar `localClinico` em `procedimentos.nome`;
5. manter a descrição completa no item do orçamento/PDF.

## 5. Contrato de persistência

### 5.1 Criar x acrescentar

`abrirOrcamentoParaFicha(fichaId)` procura um orçamento existente da **mesma ficha, paciente,
clínica e dentista responsável**.

- Sem orçamento: mantém `criarOrcamento()` e cria a proposta normalmente.
- Com um orçamento: abre o mesmo modal em modo **Adicionar ao orçamento**. Só os eventos novos,
  ainda não vinculados, aparecem selecionados.
- Com dois ou mais orçamentos legados para a mesma ficha: não escolhe um arbitrariamente; informa
  que o dentista deve abrir o orçamento desejado na aba Orçamentos.
- Fluxos realmente agregados continuam criando orçamento novo: não têm uma ficha única para
  anexar. Se o seletor chega a uma ficha única, aplica a mesma detecção acima.

O novo RPC `adicionar_itens_orcamento_com_eventos(p_orcamento_id, p_itens)` valida no banco:

1. sessão, clínica e permissão de atuar no dentista do orçamento;
2. item, procedimento do catálogo e evento clínico pertencentes à clínica/paciente/responsável;
3. ausência de vínculo prévio de cada evento em `orcamento_eventos`;
4. inserção dos itens e vínculos numa única transação;
5. atualização de `orcamentos.total` somente pela soma dos novos itens.

Ele **não altera** `valor_acordado`, desconto, aprovações, pagamentos, parcelas, assinatura nem
PDF já gerado. Itens novos nascem não aprovados. Em corrida/duplicidade, tudo falha sem inserir
metade do lote.

### 5.2 Catálogo

`stripDenteDoNome()` passa a entender o formato atual `Procedimento — D16`, múltiplos dentes,
e o contexto da ponte fixa. `criarProcedimentoRapido()` normaliza espaços, procura o nome
canônico no catálogo do dentista e reutiliza o item existente antes de inserir.

### 5.3 Estado de tela

```ts
type ModoPersistenciaOrcamento =
  | { tipo: 'novo' }
  | { tipo: 'adicionar'; orcamentoId: string };

interface NovoOrcItem {
  procedimentoId: string;
  descricao: string;          // PDF e orçamento: procedimento + local clínico
  quantidade: number;
  preco: string;
  eventoIds?: string[];
  origem?: 'evento' | 'manual' | 'legado';
  selecionado?: boolean;      // default true; só os selecionados persistem
}
```

## 6. Fluxo visual

1. **Montar orçamento** — selecionar procedimentos e ajustar valores na mesma tela.
2. **Revisar e criar** — conferência final antes da gravação.

O plano de pagamento é definido depois da criação ou numa opção avançada recolhida.

**Referência visual vigente:** `plans/artefatos/R-135-orcamento-claro-v2.html`. A v1 fica
preservada como histórico. A v2 remove o stepper redundante, reduz o resumo a um total,
mantém exceções recolhidas e apresenta recebimentos em uma área separada do orçamento.

## 7. Implementação visual aprovada

- A v2 é a referência: cabeçalho “Montar orçamento”, uma frase de origem, cards selecionáveis,
  exceções recolhidas e resumo enxuto com **Total**.
- Cada card separa nome do procedimento e localização (`D16 · Oclusal`); preço e quantidade são
  editáveis sem abrir outra tela. O item manual começa com campos separados de procedimento e
  localização opcional.
- “Ajustar valor final” é disclosure; forma de pagamento permanece opcional e recolhida para não
  competir com a escolha clínica. Recebimentos existentes continuam no detalhe do orçamento,
  separados da montagem da proposta.
- No modo adicionar, CTA: **Adicionar X procedimentos**. No modo novo: **Criar orçamento**.
- Sem nova pendência, o CTA não cria registro vazio; a mensagem orienta a abrir o orçamento atual.

## 8. Gates visuais e funcionais

- [ ] Três restaurações adicionadas à ficha aparecem individualmente com dentes/faces.
- [ ] Abrir orçamento antigo mostra os procedimentos novos sem alterá-lo sozinho; confirmar os
      acrescenta ao mesmo orçamento, preservando recebimentos e aprovações.
- [ ] Dois cliques concorrentes para o mesmo evento deixam apenas um vínculo/item gravado.
- [ ] Dois orçamentos legados para a mesma ficha não escolhem alvo silenciosamente.
- [ ] Cada item explica se é novo, já orçado, manual ou precisa de atenção.
- [ ] Editar preço não altera o preço-base do catálogo sem ação explícita.
- [ ] Cadastro rápido salva “Restauração em resina”, nunca “Restauração — D16”.
- [ ] Procedimento equivalente existente é reutilizado, não duplicado.
- [ ] Mobile não possui tabela horizontal nem botão essencial escondido.
- [ ] Em cada etapa existe um único CTA principal e fica evidente o que o dentista deve fazer.
- [ ] Estados raros e detalhes técnicos ficam recolhidos; o caminho comum não exige explicação.
- [ ] Light e dark usam os tokens atuais do sistema.
