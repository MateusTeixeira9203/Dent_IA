# R-57 — Atrito da faixa rápida (encaixe · observação · repetir)

> **SPEC** · **R-57** · ⏳ fila
> **Aberto:** 2026-08-03 · **Fechado:** — · **Fase:** contrato (F1, F2) · ⛔ bloqueada (F3)
> **Modelo:** Sonnet 5 — as duas fatias vivas reusam mecanismo existente, sem decisão ambígua
> **Origem:** revisão do Meu dia de 03/08, feita sob a pergunta *"pensando como dentista de
> clínica com muito atendimento, está faltando alguma coisa?"*
> **Zero migration · zero RLS · zero API nova.** As 3 fatias são independentes e commitáveis
> sozinhas.

## 1. Problema

O núcleo da faixa rápida está certo: registrar uma restauração no 35 custa **3 gestos**
(digitar → Enter → Salvar), e "restauração 35" resolve o dente pelo próprio texto. O que
sobrou são três atritos que aparecem **todo dia** numa clínica de fluxo alto e que hoje
empurram o dentista pra fora da tela:

1. **Encaixe.** O rail vem de `slots` = a agenda de hoje. Paciente que chegou sem marcar,
   urgência, encaixe — não tem caminho. O dentista sai pro `/dashboard/agendamentos`, cria, e
   volta. É exatamente a troca de contexto que o Meu dia existe pra eliminar.
2. **Observação por procedimento.** O campo `observacao` do evento existe e é editável — mas
   **só dentro do painel do dente**, que exige abrir o dente e sair da faixa rápida. No painel
   Registrar não há nenhum input. Some-se a isso que `queixaPrincipal` e `conduta` nascem
   **sempre vazios** (`actions.ts:39` e `:44`): o caminho padrão do Meu dia produz um
   prontuário que registra *o que foi feito* e nunca *por que o paciente veio*.
3. **Repetição.** ⛔ Ver §2-F3 — conflito com decisão anterior dele.

## 2. Decisão e alternativas descartadas

| Decisão | Alternativa descartada | Motivo |
|---|---|---|
| **F1** — reusar `AtenderAgoraModal` no rail do Meu dia, parametrizando o destino | Construir um fluxo de encaixe próprio | O mecanismo **já existe inteiro**: `AtenderAgoraModal` + `criarEncaixe` + `criarPacienteRapido`, testado em produção pela Agenda. Falta só não estar preso lá |
| **F1** — depois de criar, `router.refresh()` e selecionar o slot novo no rail | `router.push('/consulta/{id}')`, como o modal faz hoje | `/consulta` é a rota que o R-15 aposentou (absorvida pelo R-46). Mandar o encaixe pra lá seria alimentar o que está sendo desligado |
| **F2** — o nome do catálogo **continua** indo pra `observacao`; a observação do dentista é um 2º campo que **concatena**, não sobrescreve | Trocar: a observação do dentista ocupa o campo e o nome do catálogo se perde | O nome comercial está ali de propósito (`registrar-painel.tsx:239`) — não existe de-para confiável entre item de catálogo e os 16 tipos estruturais, então o nome é a única prova do que foi escolhido. Perder isso é perder dado |
| **F2** — o input aparece **inline no Registrar**, opcional, sem clique extra pra abrir | Abrir um dialog/popover pra digitar observação | Um clique pra abrir o campo de texto anula o ganho — a fatia existe pra tirar gesto, não pra mover gesto de lugar |
| **F3** — ⛔ **não escrita.** Ver bloqueio abaixo | — | — |

### ⛔ F3 — "mais usados" está em conflito com uma decisão dele de 31/07

`get-meu-dia.ts:139-142`, em comentário no código:

> *"mesma tabela e mesma ordem que Orçamentos já usa (`orcamentos-client.tsx:213-226`):
> privada por dentista, alfabética. **Decisão dele 31/07: sem frequência de uso — 'muito
> relativo, usar o que já está no sistema'.**"*

A sugestão de "mais usados / repetir o último" saiu da revisão de 03/08 **sem que essa decisão
tivesse sido consultada** — foi proposta nova em cima de assunto já fechado.

**Não escrevo esta fatia até ele decidir**, porque as duas fontes discordam e a regra do
projeto manda mostrar as duas em vez de escolher sozinho:

| A favor de manter alfabética (31/07) | A favor de reabrir (03/08) |
|---|---|
| Palavra dele: frequência é "muito relativo" | Em fluxo alto os mesmos 5-6 procedimentos repetem o dia todo |
| Consistência: Orçamentos usa a mesma ordem | O combobox começa vazio **toda vez** — zero memória do padrão |
| Ordem alfabética é previsível; ranking muda debaixo do dedo | Gesto por registro é a métrica declarada do projeto |

Se ele reabrir, o recorte mais barato **não** é ranking: é **"repetir o último"** — 1 botão que
recria o último evento lançado nesta sessão. Não muda ordem nenhuma, não é estatística, e
resolve o caso real (mesmo procedimento em vários dentes seguidos).

## 3. Objetivo e como funciona

**F1 — encaixe:** o rail ganha um "+ Encaixe" no fim. Abre o modal que a Agenda já usa
(buscar paciente existente ou criar rápido), cria o agendamento agora, e o paciente **aparece
no próprio rail já selecionado** — sem sair da tela, sem passar pela Agenda.

**F2 — observação:** abaixo do combobox, um campo de observação opcional que acompanha o
próximo procedimento registrado. Digitou e registrou: a observação vai junto. Não digitou:
nada muda em relação a hoje. O campo se limpa a cada registro, igual ao combobox.

**F3:** — (bloqueada).

## 4. Contrato técnico

### 4.1 F1 — encaixe no rail

```typescript
// src/app/dashboard/agendamentos/_components/atender-agora-modal.tsx — MUDA
interface AtenderAgoraModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** R-57 F1 — o que fazer depois de criar. Default preserva o comportamento da Agenda
   *  (`router.push('/consulta/' + id)`); o Meu dia passa o seu próprio. */
  onCriado?: (agendamentoId: string) => void;
}
```

| Arquivo | Muda |
|---|---|
| `atender-agora-modal.tsx` | Ganha `onCriado?`. Onde hoje faz `router.push('/consulta/${result.id}')` (`:95`), passa a chamar `onCriado?.(result.id)` **ou** o push atual se `onCriado` não vier. **Zero mudança de comportamento pra Agenda** |
| `_components/rail.tsx` | Ganha `onEncaixe: () => void` e renderiza o botão "+ Encaixe" **fora** do `<button>` do slot (a nota do topo do arquivo já avisa: não aninhar botão em botão) |
| `_components/meu-dia-client.tsx` | Dono do `encaixeAberto`. `onCriado` faz `router.refresh()` e guarda o id pra selecionar assim que o slot aparecer em `slots` |

⚠️ **A seleção do slot novo depende do refresh ter chegado.** `router.refresh()` é assíncrono e
`slots` só muda no próximo render do server component. Guardar o id num state e selecionar
quando ele aparecer — nunca `setSelecionadoId(id)` direto, que apontaria pra um slot que ainda
não existe e cairia no `slotSelecionado = null` (tela vazia).

```typescript
// meu-dia-client.tsx
const [aguardandoSlot, setAguardandoSlot] = useState<string | null>(null);
if (aguardandoSlot && slots.some((s) => s.agendamentoId === aguardandoSlot)) {
  setSelecionadoId(aguardandoSlot);
  setAguardandoSlot(null);
}
```

**Reuso — não recriar:** `AtenderAgoraModal`, `criarEncaixe`, `criarPacienteRapido`. Nenhuma
action nova, nenhuma validação nova, nenhum caminho de conflito de horário novo.

### 4.2 F2 — observação no Registrar

```typescript
// registrar-painel.tsx — estado novo, mesma vida do `buscaTipo`
const [observacao, setObservacao] = useState('');
```

`registrar(tipo, observacaoDoCatalogo?)` passa a compor as duas fontes em vez de receber uma:

```typescript
/** F2 — o nome do catálogo (quando houver) e a observação do dentista coexistem.
 *  Nome primeiro: é a identificação do que foi escolhido; a observação qualifica. */
function textoObservacao(doCatalogo?: string): string {
  return [doCatalogo, observacao.trim()].filter(Boolean).join(' — ');
}
```

| Onde | Muda para |
|---|---|
| `registrar()` (`:183`) | `criarEventos(tipo, textoObservacao(observacaoDoCatalogo), ancoras)` nos 3 pontos de saída (boca / âncora resolvida / `tipoPendente`) |
| `handleOndeChange()` (`:217`) | o `tipoPendente` guarda a observação **do momento em que foi criado** — senão o dentista digita a observação, escolhe o dente, e a observação já foi limpa |
| todos os pontos que fazem `setBuscaTipo('')` | fazem `setObservacao('')` junto — o campo acompanha o ciclo do combobox |
| JSX, logo abaixo do `<Combobox>` | `<input>` opcional, `placeholder="Observação (opcional)"`, mesmos tokens do input de busca |

```typescript
// tipoPendente carrega a observação junto (senão ela se perde na ordem livre)
const [tipoPendente, setTipoPendente] =
  useState<{ tipo: TipoRegistroOdontograma; observacao: string } | null>(null);
```

**Não toca** `ToothDetailPanel` — a edição de observação por evento que já existe lá
(`:330`, `:749`) continua sendo o caminho de **corrigir depois**; este campo é o de
**escrever na hora**. Os dois escrevem no mesmo `observacao` do mesmo evento.

### 4.3 F3 — ⛔ não especificada (§2)

## 5. Referência visual

Sem artefato — as duas fatias vivas são 1 botão e 1 input dentro de containers já aprovados.

- **Rota:** `/dashboard/meu-dia` · **Componentes:** `rail.tsx`, `registrar-painel.tsx`, `meu-dia-client.tsx`
- **Tokens** (nenhum novo): botão "+ Encaixe" segue o slot do rail (`bg-surface-alt`,
  `border-border`, `text-text-secondary`, raio 8) · input de observação copia exatamente o
  input do combobox (`bg-surface-alt`, `border-border`, `text-sm`, `focus:border-teal`, min 36px)

## 6. Invariantes

- [ ] **I1** — `AtenderAgoraModal` na Agenda mantém **exatamente** o comportamento de hoje
      (push pra `/consulta/{id}`) — `onCriado` é opcional e a Agenda não passa.
- [ ] **I2** — encaixe criado pelo Meu dia obedece as mesmas travas de conflito de horário e
      as mesmas regras de clínica/RLS de `criarEncaixe` — nenhum caminho paralelo.
- [ ] **I3** — o nome comercial do catálogo **nunca** é sobrescrito pela observação do
      dentista; as duas coexistem no mesmo campo, nome primeiro.
- [ ] **I4** — observação digitada e não registrada (o dentista digita e troca de paciente)
      **não** vaza pro próximo — acompanha o reset do §5.4 do contrato do cockpit.
- [ ] **I5** — nenhuma fatia altera schema, RLS, ou o contrato de `salvarVisitaMeuDia`.

## 7. Gates de aceite

**F1:**
- [ ] **G1** — "+ Encaixe" no rail abre o modal, criar paciente novo funciona, e o paciente
      **aparece no rail já selecionado** sem recarregar a página nem sair da rota.
- [ ] **G2** — registrar e salvar nesse encaixe grava ficha normal — conferir no banco:
      `fichas.origem='modo_consulta'` + `agendamentos.status='completed'`.
- [ ] **G3** — regressão da Agenda: "Atender agora" continua indo pra `/consulta/{id}` como
      hoje, sem nenhuma diferença.
- [ ] **G4** — encaixe em horário que conflita com outro agendamento cai na **mesma** trava de
      conflito da Agenda (não inventa caminho novo).

**F2:**
- [ ] **G5** — digitar observação + registrar procedimento → o evento nasce com ela. Conferir
      **no banco** (`odontograma_eventos.observacao`), não na tela.
- [ ] **G6** — escolher item do catálogo **e** digitar observação → o campo grava
      `"Nome do catálogo — minha observação"`, com o nome preservado.
- [ ] **G7** — ordem livre: digitar observação → escolher procedimento → escolher o dente
      depois. A observação **sobrevive** à espera do "onde".
- [ ] **G8** — registrar limpa o campo de observação junto com o de busca (o próximo
      procedimento não herda a observação do anterior).
- [ ] **G9** — trocar de paciente com observação digitada e não registrada limpa o campo.
- [ ] **G10** — a observação escrita aqui aparece e é editável no painel do dente (mesmo
      campo, duas portas).

## 8. Fora de escopo

- **F3 (repetir / mais usados)** — bloqueada por conflito com decisão de 31/07 (§2).
- **`queixaPrincipal` e `conduta` vazios** — o §1 registra o achado, mas preencher isso é do
  **R-46d** (a IA extrai do relato), não desta fatia. F2 dá o lugar de escrever *observação de
  procedimento*, que é outra coisa.
- **Marcar falta / não compareceu pelo Meu dia** — mesmo tipo de atrito do encaixe, mesma
  família, mas é ação de agenda e não de registro clínico. Vira item próprio se incomodar.
- **Mobile / responsividade** — herdado do P8 do cockpit. Relevante (ele confirmou em 03/08
  que o uso é *"pós-atendimento ou durante, depende do dentista"*, e pós-atendimento costuma
  ser celular), mas é item de outra ordem de grandeza.
- Reordenar o rail, agrupar por horário, ou qualquer mudança no que já existe nele.
