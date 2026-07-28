# R-05b — Orto: atalho "+ Manutenção" com pré-preenchimento

> **SPEC** · **R-05b** · fase **aprovada** — decisões travadas 28/07, pronta pra execução.
> **Modelo:** Sonnet (mecânico — 1 arquivo, sem ambiguidade sobrando depois das decisões).
> **Aberto:** 2026-07-28 · **Depende de:** R-05 (no ar, verificado 27/07) · **Migration:** nenhuma.
> **Peso:** P — confirmado por investigação no código, não por estimativa.

## Problema

Manutenção ortodôntica é **incremental**: entre uma consulta e outra muda pouco (mesmo arco, mesmo
elástico). Hoje o dentista com paciente de orto abre "Nova Evolução" → rola até o fim → clica
"Adicionar manutenção ortodôntica" → **redigita tudo de novo**, toda consulta. É atrito puro no
fluxo mais repetitivo que a especialidade tem.

## Escopo

**Cobre:** um botão "+ Manutenção" no header da aba Prontuário que abre o form de nova evolução
com o bloco orto **já montado e pré-preenchido** com o estado do aparelho da última manutenção.

**Não cobre:** marcação de alta/fim de tratamento ortodôntico (não existe no schema — ver Decisão 2);
o modo consulta (o atalho é da ficha rápida); qualquer mudança no `OrtoForm` (ele já é 100%
controlado por `valor`, não muda uma linha).

## Decisões travadas (28/07)

**D1 — O que é herdado.** Herda **4 campos**: `arcada`, `fio`, `elastico_corrente`,
`elastico_intermaxilar`. **`ativacao` SEMPRE nasce vazia.**

> Os 4 herdados descrevem o **estado do aparelho** entre consultas — repetir é verdade enquanto
> não trocar. `ativacao` descreve o **ato daquele dia** (o placeholder do próprio código é
> "ativado + troca de ligaduras"). Copiar o ato é gravar procedimento que pode não ter acontecido,
> num documento legal — exatamente o modo de falha que o pré-preenchimento precisa evitar.
> Nada fora do bloco orto é herdado (anotações, procedimentos, conduta nascem vazios; a data já
> nasce `hojeBRT()`).

**D2 — Quando o botão some.** Janela de **120 dias** sobre o `data_atendimento` da ficha mais
recente com `orto_manutencao != null`. Fora da janela, o atalho some do header.

> Não existe alta, status de orto nem fim de tratamento em `fichas` (37 colunas conferidas no banco
> vivo). Criar essa marcação custaria migration + tela + o dentista lembrar de marcar — e a
> premissa do item (obs. do Mateus 27/07: *dentistas não usam as classificações da ficha*) diz que
> ele não marcaria, então o dado nasceria morto. A janela erra barato dos dois lados: falso
> negativo = o botão do R-05 continua lá (1 clique a mais); falso positivo = botão que ninguém
> clica. 120 dias porque manutenção é ~mensal e 4 meses absorve férias/falta sem ressuscitar
> tratamento encerrado.

**D3 — Herança entre profissionais.** Herda de **qualquer autor da clínica**, com **autor + data
visíveis** no rótulo do bloco herdado.

> `fichas_select` é `belongs_to_active_clinic AND is_clinic_staff()` — a lista já carregada inclui
> fichas de toda a clínica, então "a última manutenção" incluiria outro autor **queira-se ou não**.
> Fica escrito como decisão em vez de sobrar como consequência acidental de RLS. Mérito: o estado
> do aparelho é fato sobre o paciente, não trabalho do autor (coerente com a hierarquia 3.1).
> Mas **quem salva assina** — por isso o autor de origem aparece antes do save, não depois.

**D4 — Onde o botão mora.** Header da aba Prontuário (`FichasTab`), ao lado de "Nova Evolução",
como botão **secundário (outline)**. "Nova Evolução" continua o único CTA sólido teal.

> `activeTab` nasce em `'ficha-clinica'` — abrir o paciente já cai no Prontuário, então o header
> da aba **é** o topo do prontuário na prática; pôr no header do paciente não economiza um clique
> e custaria ~4 arquivos (canal pai→filho que não existe + `orto_manutencao` no fetch SSR do pai)
> além de um terceiro CTA disputando com "Marcar retorno". **Descartado:** fazer o próprio
> "Nova Evolução" abrir preenchido quando há orto ativo — quem vai registrar uma restauração
> receberia bloco de manutenção preenchido e, esquecendo de remover, grava manutenção fantasma.
> O clique explícito é o que torna o pré-preenchimento **consentido**.

## Contrato técnico

Arquivo único: `src/components/pacientes/FichasTab.tsx`.

```typescript
/** Última manutenção orto do paciente dentro da janela, ou null. Deriva de `evolutions`
 *  (já ordenado por data_atendimento desc) — zero query nova, zero índice. */
type UltimaOrto = {
  valor: OrtoManutencaoInfo;   // o bloco da última manutenção
  data: string;                // data_atendimento da ficha de origem (yyyy-MM-dd)
  autorNome: string | null;    // nome do dentista de origem (D3)
} | null;

const JANELA_ORTO_DIAS = 120;  // D2
```

- `abrirNovaComOrto()` — mesmo corpo de `handleEdit` **sem** `setEditingId` (nasce ficha nova),
  com `formData.ortoManutencao` = os 4 campos herdados + `ativacao: null` (D1).
- O bloco orto renderiza o rótulo de proveniência quando o valor veio herdado.
- `formDirty` passa a considerar `ortoManutencao != null` (senão o atalho abre um form que o guard
  de saída considera limpo e descarta sem avisar).
- `OrtoForm` **não muda**. `salvarFicha` **não muda** (R-11 já persiste orto no create e no update).

## Invariantes

- [ ] `ativacao` nunca é herdada — sempre `null` no form aberto pelo atalho.
- [ ] Nenhum campo fora do bloco orto é herdado.
- [ ] O bloco herdado exibe autor + data de origem **antes** do save.
- [ ] O atalho não aparece quando não há manutenção dentro da janela de 120 dias.
- [ ] O caminho do R-05 ("Adicionar manutenção ortodôntica" dentro do form) continua intacto.

## Gates de aceite

- [ ] Paciente com manutenção recente: botão "+ Manutenção" aparece no header do Prontuário.
- [ ] Clicar abre o form com arcada/fio/elásticos preenchidos e **`ativacao` vazia**.
- [ ] O bloco mostra "da manutenção de DD/MM · <autor> — confira".
- [ ] Salvar grava ficha NOVA (não edita a de origem) — conferir id diferente no banco.
- [ ] Paciente sem orto, ou com orto > 120 dias: botão não aparece.
- [ ] Fechar o form com o bloco herdado dispara o guard de descarte (não sai em silêncio).
- [ ] Dark e light conferidos no botão e no rótulo de proveniência.
