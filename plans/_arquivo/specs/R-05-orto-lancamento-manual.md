# R-05 — Ortodontia: lançamento e edição manual

> **SPEC** · **R-05** · fase **contrato — pronta pra execução.**
> **Modelo:** Sonnet na execução (wiring mecânico de um componente que já existe; zero ambiguidade de
> produto — o `OrtoForm` e o schema já estão fechados desde a Fatia A0).
> **Aberto:** 2026-07-27 · **Peso:** P · **Depende de:** nada em código (R-01/R-02 no ar).
> **Overlap:** R-11 lista `orto_manutencao` no escopo dele — mas em camada diferente (R-11 = persistência
> `salvarFicha`; R-05 = entrada que seta `formData.ortoManutencao`). R-05 **não muda o contrato de save**,
> só passa a permitir que `formData.ortoManutencao` seja preenchido/corrigido à mão. Ver Invariante I4.
> **Migration:** nenhuma. **RLS/enum/IA:** nada. Por isso R-05 é o 1º item — sem gate de prod, sem 2 contas.
> **Brief de design:** dispensado — `OrtoForm` já existe e foi desenhado na Fatia A0 (DESIGN-ficha-a0 §4).
> A afordância adicionar/remover segue o padrão dos forms de especialidade que já existem no FichasTab.

## Visão geral

Todo o plugin de orto está construído e no ar **menos a mão do dentista**: `OrtoForm`
([orto-form.tsx](../../src/components/fichas/orto-form.tsx)) e `OrtoCard` estão completos, a coluna
`fichas.orto_manutencao` existe (migration 105), o pass 1 já extrai orto da voz, o FichasTab já **lê**
(`<OrtoCard>`) e **salva** (`orto_manutencao: formData.ortoManutencao`). Só falta o caminho de entrada:
o `OrtoForm` **nunca é montado**, então `formData.ortoManutencao` só é preenchido pela voz. Se o dentista
não ditar, ou se a IA errar a arcada/fio, **não há como lançar nem corrigir**. R-05 fecha esse furo
montando o `OrtoForm` no formulário editável da evolução — nada mais.

## Escopo

**Cobre:** montar `OrtoForm` no corpo editável da evolução no **FichasTab** (a superfície viva de
criação/edição de ficha), ligado a `formData.ortoManutencao`, com afordância de **adicionar** (quando
ausente) e **remover** (voltar a `null`). Vale para ficha nova **e** para edição de ficha salva
(`editingId`) — é a mesma tela e o mesmo `formData`, então a correção da arcada errada da IA sai de graça.

**Não cobre:** modo consulta (`consulta-client`) — voz-first por design, correção via edição no FichasTab;
qualquer reformulação dele é R-15. Nenhuma mudança no `OrtoForm`, no `OrtoCard`, no schema Zod, na coluna,
no pass 1 da voz, nem no contrato de save (esse é território do R-11). Sem tela nova.

## Contrato técnico

Arquivo único: **`src/components/pacientes/FichasTab.tsx`**.

1. **Import.** `import { OrtoForm } from '@/components/fichas/orto-form';` (o `OrtoCard` já está importado).

2. **Onde montar.** No corpo do formulário **editável** da evolução (o mesmo bloco onde `formData.queixaPrincipal`,
   `formData.conduta` etc. são editados), numa seção própria "Manutenção ortodôntica". Não no `ToothDetailPanel`
   (aquele é por-dente; orto é por-ficha). O `OrtoCard` de leitura na lista de evoluções salvas
   ([FichasTab:1998](../../src/components/pacientes/FichasTab.tsx#L1998)) **permanece como está** — é a
   visão read-only do histórico; R-05 só toca a visão de edição.

3. **Ligação de estado.**
   - `valor={formData.ortoManutencao}` (tipo `OrtoManutencaoInfo | null`, que é estruturalmente
     `OrtoManutencaoDetalhe`).
   - `onChange={(v) => setFormData((f) => ({ ...f, ortoManutencao: v }))}`.

4. **Afordância adicionar / remover** (orto é opcional por ficha):
   - `formData.ortoManutencao == null` → mostrar botão **"Adicionar manutenção ortodôntica"**. Ao clicar,
     inicializa com o `VAZIO` do plugin (`{ arcada: 'superior', fio: null, ativacao: null,
     elastico_corrente: null, elastico_intermaxilar: null }`) e o `OrtoForm` aparece.
   - `formData.ortoManutencao != null` → renderiza `OrtoForm` + um botão discreto **"Remover"** que faz
     `setFormData((f) => ({ ...f, ortoManutencao: null }))`.
   - A presença do registro é **intenção explícita** do usuário (adicionou / removeu) — sem heurística de
     "campos vazios viram null". Registrar arcada + nada mais é um registro clínico válido ("veio pra
     manutenção da arcada superior"). Ver Invariante I3.

5. **Reuso do `VAZIO`.** O `VAZIO` já existe dentro de `orto-form.tsx` mas é privado. Exportá-lo de lá
   (ou de `orto.ts`) e reusar no botão adicionar — **nunca** redigitar o objeto no FichasTab (evitar a
   segunda fonte da verdade do estado inicial).

## Invariantes

- **I1.** Entrada manual grava o **mesmo** `orto_manutencao` que a voz grava — mesma coluna, mesmo shape
  (`ortoManutencaoSchema`), mesmo caminho de save. Nenhum campo novo, nenhum branch novo de persistência.
- **I2.** `especialidadesDetectadas` detecta orto manual automaticamente — a `detecta` do plugin é
  `evo.orto_manutencao != null`, já satisfeita ao setar `formData.ortoManutencao`. Nada a mudar na detecção.
- **I3.** Ausência = `null`, nunca objeto vazio disfarçado. Só existe `orto_manutencao` quando o usuário
  adicionou; remover volta a `null`. (O `OrtoForm` já normaliza campo de texto vazio → `null` via `limpar`.)
- **I4.** R-05 não escreve no banco por conta própria: só alimenta `formData.ortoManutencao`, que o save
  existente já persiste. Se o R-11 refatorar o save antes, R-05 continua válido sem mudança (só o alvo do
  `setFormData` importa). Coordenar a ORDEM com R-11 só se os dois rodarem na mesma janela.

## Gates de aceite

Como FichasTab é autenticado + com dado (o pane embutido não renderiza — usar o harness Playwright logado):

1. **Typecheck + build** limpos (`OrtoManutencaoInfo` ↔ `PluginFormProps<OrtoManutencaoDetalhe>` casam sem `any`).
2. **Lançar do zero:** ficha nova, sem voz → "Adicionar manutenção ortodôntica" → preencher arcada + fio →
   salvar → recarregar → o `OrtoCard` na lista mostra os valores.
3. **Corrigir a IA:** editar uma ficha cuja voz gravou orto com arcada errada → trocar a arcada no `OrtoForm`
   → salvar → persiste o valor corrigido.
4. **Remover:** abrir uma ficha com orto → "Remover" → salvar → `orto_manutencao` vira `null`, o `OrtoCard`
   some do histórico daquela evolução.
5. **Light + dark** impecáveis na seção nova (a seção usa os mesmos tokens do `OrtoForm`/dos demais forms).
