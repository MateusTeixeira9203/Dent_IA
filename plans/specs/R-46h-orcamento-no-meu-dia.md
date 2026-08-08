# R-46h — Botão de orçamento no Meu dia (picker de ficha)

> **SPEC** · **R-46h** · ✅ aprovada · **Fase:** `aprovada`
> **Aberto:** 2026-08-07 · **Fechado:** —
> **Modelo:** Opus 5 (extração de estado compartilhado entre 2 telas, decisão de contrato)
> **Depende de:** [R-59](../_arquivo/specs/R-59-ficha-orcamento-integridade.md) ✅ (a regra
> por-ficha que este item reusa) · nada bloqueia — pode entrar a qualquer momento
> **Zero migration · zero RLS.** Query reusada é a que já roda em produção (`carregarFichasAgregado`).

## 1. O que ele pediu (discussão 06-07/08)

Escopo final, ditado em duas sessões:

1. Um botão no Meu dia abre um **modal picker**: lista as fichas em aberto do paciente
   selecionado (hoje, se já salva, + antigas com procedimento `indicado` pendente).
2. Ele escolhe **uma só**. O orçamento nasce só dela — mesma regra do R-59/#6
   (`abrirOrcamentoParaFicha`): nunca funde com outra ficha, nunca cruza dentista.
3. **07/08, item novo (não estava no escopo de ontem):** o mesmo botão/modal também acessível
   de dentro da aba **Histórico** do Meu dia, não só de onde ele foi discutido originalmente.

Isso **substitui** a ideia de 02/08 ("Salvar e gerar orçamento" como CTA do rodapé,
`R-46-cockpit.md §5a` P7) — não é mais preso ao save; é um ponto de entrada independente.

## 2. O que já existe (não é código novo)

`paciente-detail-client.tsx` já resolve exatamente este problema pra a tela do paciente — o
código de R-46h é extrair isso pra um lugar que as duas telas montam, mais 1 função nova
pequena. Nada disto é reescrito, só movido:

| Peça | Onde está hoje | O que faz |
|---|---|---|
| `carregarFichasAgregado()` | `paciente-detail-client.tsx:1151` | Busca fichas do paciente com ≥1 evento `indicado`/`assinatura_id IS NULL` (`!inner`, já filtra o embed). **É literalmente "fichas em aberto" — a query do picker é esta, sem mudar 1 linha.** |
| `selecionarFichaParaOrc(fichaId)` | `:1217` | Dado o id escolhido, popula os itens **só daquela ficha** (`fichaParaItens`, nunca funde) |
| Passo `'selecionar'` do modal | `novo-orcamento-modal.tsx` (via `etapaNovoOrc`) | UI de lista-e-escolha já existe e já roda em produção (fallback do botão "Novo orçamento" quando há >1 ficha candidata) |
| `abrirOrcamentoParaFicha(fichaId)` | `:1235` | Padrão de botão por-ficha já usado no `FichasTab` (`onGerarOrcamento`, `FichasTab.tsx:2101`) — R-46h no Histórico do Meu dia é o mesmo botão, mesmo texto ("Gerar orçamento"), outra tela |
| `NovoOrcamentoModal` | `modals/novo-orcamento-modal.tsx` (498 linhas) | O modal inteiro — criação de item, catálogo, plano de pagamento, tudo pronto |

**A única função genuinamente nova:** um wrapper de ~10 linhas que chama
`carregarFichasAgregado()`, abre o modal direto no passo `'selecionar'` (pula o "geral vs.
por-ficha" que a tela do paciente tem porque lá não existe seleção prévia de paciente — no
Meu dia o paciente já está óbvio, é o slot aberto).

## 3. O trabalho real: extrair o estado compartilhado

`isNovoOrcOpen`, `fichaOrcId`, `fichasParaOrc`, `novoOrcItens`, `etapaNovoOrc`,
`novoOrcValorFinal`, `orcError`, `orcSaving`, `planoForma`/`planoNumParcelas`/etc. — ~15
`useState` + as 3 funções da tabela acima vivem hoje dentro de `paciente-detail-client.tsx`
(2301 linhas). `MeuDiaClient` precisa dos mesmos, sem duplicar.

**Decisão: extrair para um hook `useOrcamentoModal`** em
`src/app/dashboard/pacientes/[id]/_components/use-orcamento-modal.ts` (fica perto do que já
existe — é código de orçamento, não de Meu dia nem de paciente especificamente).

```ts
interface UseOrcamentoModalInput {
  pacienteId: string;
  clinicaId: string;
  meuDentistaId: string;
  procedimentosClinica: ProcedimentoClinica[];
  // Meu dia é dentista-only (page.tsx:24 redireciona secretaria) — os dois campos abaixo
  // só fazem sentido pra paciente-detail-client. Meu dia sempre passa isSecretaria=false
  // e dentistasClinica=[] (a UI de troca de responsável já é condicional a isSecretaria).
  isSecretaria: boolean;
  dentistasClinica: { id: string; nome: string }[];
}

interface UseOrcamentoModalResult {
  // ...todo o estado + handlers que NovoOrcamentoModalProps já pede hoje, sem mudar forma
  abrirNovoOrcamento: () => Promise<void>;        // existente — só a tela do paciente usa
  abrirOrcamentoParaFicha: (fichaId: string) => Promise<void>;  // existente — as 2 telas usam
  abrirPickerFichasAbertas: () => Promise<void>;  // NOVO — só o Meu dia usa
  modalProps: NovoOrcamentoModalProps;            // spread direto em <NovoOrcamentoModal {...modalProps} />
}
```

`abrirPickerFichasAbertas` (o único código novo de verdade):

```ts
const abrirPickerFichasAbertas = async () => {
  setOrcError(null);
  setIsLoadingFichaParaOrc(true);
  try {
    const fichas = await carregarFichasAgregado(); // reuso literal, zero mudança
    setFichasParaOrc(fichas);
    setFichaOrcId(null);
    setEtapaNovoOrc('selecionar');
  } catch {
    setFichasParaOrc([]);
    setOrcError('Não deu pra carregar as fichas em aberto.');
  } finally {
    setIsLoadingFichaParaOrc(false);
  }
  setIsNovoOrcOpen(true);
};
```

**G4 do R-53 se repete aqui:** se `fichas.length === 0`, o passo `'selecionar'` da UI precisa
de um estado vazio ("nenhuma ficha em aberto pra este paciente") — conferir se
`novo-orcamento-modal.tsx` já trata lista vazia no passo `selecionar` ou se falta (achar na
implementação, não assumir).

`paciente-detail-client.tsx` passa a **consumir** o hook em vez de declarar os `useState`
inline — mesmo comportamento, motor movido. `MeuDiaClient` monta o mesmo hook +
`<NovoOrcamentoModal {...modalProps} />` (hoje ausente da árvore do Meu dia por completo).

## 4. Ponto de entrada — onde o botão mora

**Decidido:** dentro de cada visita do **Histórico** (`historico-bloco.tsx`,
`VisitaEntry`) — mesmo padrão do `FichasTab`: 1 botão "Gerar orçamento" por entrada,
só quando aquela visita tem ao menos 1 evento `indicado`/`assinatura_id IS NULL` (o card já
computa `abertos` nessa contagem, linha 94 — é reaproveitável como condição de mostrar o
botão). Clique chama `abrirOrcamentoParaFicha(v.fichaId)` **direto** — sem o picker, porque a
entrada já é 1 ficha certa (o padrão do FichasTab, não o do picker).

**Decidido (08/08):** os dois pontos de entrada entram — não são redundantes, cobrem casos de
uso diferentes. Histórico resolve o pedido #3 (visita específica, contexto já aberto). Rodapé
do `RegistrarPainel` (perto do "Salvar"), usando `abrirPickerFichasAbertas()`, resolve o
pedido #1 original (acesso rápido sem precisar navegar até o Histórico e achar a visita
certa). F3 entra no escopo, não é mais condicional.

## 5. Fases

| Fase | O quê | Risco |
|---|---|---|
| F1 | Extrai `useOrcamentoModal` de `paciente-detail-client.tsx`, comportamento idêntico (regressão = a tela do paciente para de funcionar) | Alto se mal extraído — é a tela de dinheiro. Gate: G1 |
| F2 | Monta o hook + `NovoOrcamentoModal` em `MeuDiaClient`, botão por-visita no Histórico | Médio — tela nova pro modal, `clinicaId` não é prop de `MeuDiaClient` hoje (`page.tsx`), precisa passar |
| F3 | Botão "Gerar orçamento" no rodapé do `RegistrarPainel`, chama `abrirPickerFichasAbertas()` | Baixo — mesmo hook de F2, só outro ponto de montagem |

## 6. Invariantes (herdados do R-59, não renegociáveis)

| # | Regra | Por quê |
|---|---|---|
| I1 | Orçamento gerado pelo picker nunca funde 2 fichas — só a escolhida | R-59/#6, decisão de 07/08 |
| I2 | Candidatos do picker são só fichas do **paciente do slot aberto**, filtradas por
`clinica_id` (RLS + `.eq()` explícito, mesmo padrão de `carregarFichasAgregado`) | Silo multi-clínica |
| I3 | Meu dia só mostra fichas onde `dentista_id = meuDentistaId` (decorre de `carregarFichasAgregado` já receber paciente de um slot que só existe pra este dentista) — nunca aparece ficha de colega | Decisão 07/08, "dinheiro é privado" |

## 7. Gates

| Gate | Como testar |
|---|---|
| G1 | Tela do paciente: `abrirNovoOrcamento`/`abrirOrcamentoParaFicha` pós-extração — mesmo resultado de antes, ficha densa real (regressão zero) |
| G2 | Meu dia → Histórico → visita com indicado aberto → botão aparece, clique gera orçamento só dela |
| G3 | Visita SEM indicado aberto (tudo já orçado/assinado) → botão não aparece |
| G4 | Paciente sem nenhuma ficha em aberto → picker geral (se F3 entrar) mostra estado vazio, não tela quebrada |
| G5 | Orçamento criado pelo Meu dia aparece certo em `/dashboard/orcamentos` e na ficha do paciente (mesma tabela, sem campo novo) |
