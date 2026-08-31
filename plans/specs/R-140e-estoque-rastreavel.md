# R-140e — Estoque rastreável preparado para marketplace

> **SPEC** · **R-140e** · ⏳ filha futura do R-140
> **Aberto:** 2026-08-30 · **Fase:** contrato de arquitetura; implementação congelada até R-140d validada
> **Depende:** R-140d com etiquetas reais de pelo menos duas clínicas

## 1. Problema

Compra, etiqueta e uso não significam a mesma coisa. Um pedido não prova recebimento; uma etiqueta
esterilizada pode identificar um pacote reutilizável, não uma unidade comprada; OCR não prova que o
item corresponde ao catálogo. Um estoque automático sem essa separação produziria saldo confiável
na aparência e errado na prática.

## 2. Decisões

| Decisão | Motivo |
|---|---|
| Quatro comportamentos: consumível, uso limitado, reutilizável e implantável | Quantidade simples não representa todos |
| Pedido cria recebimento esperado, não saldo | Compra pode atrasar, divergir ou ser parcial |
| Recebimento confirmado cria lote/ativo | É o primeiro fato físico da clínica |
| Uso confirmado cria movimento append-only | Saldo deriva de fatos, não de updates soltos |
| Etiqueta sugere vínculo; humano confirma produto/lote/ativo | Evita baixa por OCR errado |
| Falta de saldo gera divergência, não bloqueia registro clínico | Verdade clínica vence consistência aparente |

## 3. Objetivo e fluxo futuro

**Objetivo:** usar o dado já capturado no atendimento para manter estoque com o mínimo de digitação
e aceitar pedidos de um marketplace sem acoplar estoque ao fornecedor.

```text
Marketplace/manual → pedido esperado
  → recebimento físico conferido
  → lote (consumível/implantável) ou ativo (limitado/reutilizável)
  → etiqueta confirmada no Atendimento
  → vínculo sugerido e confirmado
  → movimento/uso
  → saldo, ciclos e alertas derivados
```

## 4. Contrato de domínio

```ts
type ComportamentoEstoque = 'consumivel'|'uso_limitado'|'reutilizavel'|'implantavel';
type MovimentoEstoque = 'entrada'|'consumo'|'ajuste_positivo'|'ajuste_negativo'|'descarte';
type EstadoAtivo =
  | 'disponivel'|'em_uso'|'aguardando_limpeza'|'aguardando_esterilizacao'
  | 'quarentena'|'descarte_pendente'|'descartado';

interface RegistrarUsoInput {
  atendimentoId: string;
  rastreabilidadeItemId: string;
  estoqueItemId: string;
  loteId?: string;
  ativoId?: string;
  quantidade?: number;
}
```

| Tipo | Unidade controlada | Ao usar | Encerramento |
|---|---|---|---|
| Consumível | quantidade por lote/validade | movimento negativo | saldo/validade |
| Uso limitado | ativo individual + limite de usos | incrementa contador | descarte pendente no limite |
| Reutilizável | ativo individual | abre ciclo de uso | limpeza → esterilização → disponível |
| Implantável | unidade/lote/serial | consumo definitivo ligado ao paciente | nunca retorna ao estoque |

## 5. Schema previsto

```sql
estoque_itens
  id, clinica_id, nome, comportamento, unidade_base, codigo_interno,
  fabricante_padrao, ativo, created_at

estoque_lotes
  id, clinica_id, item_id, lote_fabricante, validade,
  quantidade_recebida, recebimento_id, created_at

estoque_ativos
  id, clinica_id, item_id, lote_id?, identificador, numero_serie?,
  limite_usos?, usos_confirmados, estado, created_at

estoque_movimentos
  id, clinica_id, item_id, lote_id?, ativo_id?, tipo, quantidade,
  origem_tipo, origem_id, ator_id, ocorrido_em, metadata

estoque_usos
  id, clinica_id, atendimento_id, rastreabilidade_item_id,
  item_id, lote_id?, ativo_id?, movimento_id?, estado

estoque_ciclos
  id, clinica_id, ativo_id, atendimento_id?, iniciado_em,
  limpeza_em?, esterilizacao_lote?, esterilizado_em?, encerrado_em?

recebimentos_estoque
  id, clinica_id, origem ('manual','marketplace'), origem_externa_id?,
  status ('esperado','parcial','conferido','divergente','cancelado'), created_at
```

Tabelas reais serão migrations separadas e tipadas. FKs usam `restrict` para fatos de estoque;
movimentos são append-only. Saldo de consumível é soma de movimentos, com view/RPC otimizada; não
há coluna `saldo` mutável como fonte de verdade. Cada tabela tem `clinica_id` e RLS.

## 6. Regras de vinculação e automação

1. Identidade forte: código/GTIN/registro + lote ou identificador individual.
2. Identidade média: fabricante + descrição normalizada + lote/validade; sistema sugere.
3. Só texto/conteúdo de pacote: nunca vincula automaticamente a produto comprado.
4. Match único e previamente confirmado pode nascer pré-selecionado, ainda revisável.
5. Confirmar uso grava `estoque_usos` e movimento/ciclo na mesma transação.
6. Saldo insuficiente grava o consumo real e marca `divergente`; não bloqueia prontuário.
7. Correção cria movimento inverso + novo movimento, mantendo a trilha.
8. Marketplace usa adaptador de pedido/recebimento; nenhum `provider_id` entra no núcleo.

## 7. Permissões e experiência

- Leitura: admin, dentista e secretária da clínica; protético só entra após escopo próprio.
- Recebimento/ajuste: admin e usuários explicitamente autorizados; não presumir pelo cargo.
- Uso vindo do Atendimento: dentista/admin/secretária que pode confirmar rastreabilidade.
- A tela inicial prioriza pendências de conferência, baixo estoque, validade e ativos fora do ciclo;
  catálogo completo fica secundário.
- Toda automação explica a origem: `Recebido pelo pedido X`, `Usado no atendimento Y`.

## 8. Gates de aceite

- [ ] Pedido não altera saldo antes do recebimento conferido.
- [ ] Recebimento parcial cria somente as quantidades/lotes presentes.
- [ ] Consumível confirmado reduz o lote correto; retry não duplica movimento.
- [ ] Item de dois usos passa 0→1→2 e vira descarte pendente; terceiro uso exige correção explícita.
- [ ] Reutilizável usado sai de disponível e só volta após ciclo de esterilização concluído.
- [ ] Implantável fica ligado a um paciente/Atendimento e não pode ser reutilizado.
- [ ] Saldo insuficiente registra verdade + divergência, sem bloquear o atendimento.
- [ ] Correção preserva movimentos original, inverso e novo.
- [ ] Duas clínicas e dois papéis passam RLS/permissões antes de qualquer rollout.

## 9. Condição de entrada e fora de escopo

Só implementar depois de medir em etiquetas reais: taxa de OCR utilizável, campos recorrentes,
percentual de match de produto e atrito de confirmação. Sem esses dados, este contrato é direção
arquitetural, não autorização de construir.

Fora: catálogo público, checkout, fornecedores, tributação, financeiro de compras, previsão de
demanda por IA e rastreio de instrumental sem identificação individual.
