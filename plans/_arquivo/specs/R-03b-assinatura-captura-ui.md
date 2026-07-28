# R-03b — Assinatura por procedimento: captura/UI + reconciliar os 3 fluxos legados

> **SPEC** · **R-03b** · fase **contrato — decisões travadas 28/07 (todas como recomendado), pronta pra execução** ·
> **Modelo:** Sonnet na execução (decisões técnicas abaixo, produto confirma antes de codar).
> **Aberto:** 2026-07-28 · **Depende de:** R-03a (migration 111/112, `assinar_procedimentos`,
> `assinarProcedimentos` action) — no ar, não pushado ainda no momento de escrever isto.
> **Overlap:** R-11 (achado um gap real durante a investigação, ver Decisão #B5).

## Visão geral

R-03a moveu o congelamento pra granularidade de registro (`odontograma_eventos.assinatura_id`),
mas nenhuma tela usa isso ainda — os 3 fluxos de captura continuam escrevendo só
`fichas.assinatura_url`/`assinado_em` (a ficha inteira). R-03b conecta a UI: os 3 fluxos passam a
assinar o **lote de realizados não assinados** via `assinarProcedimentos`, preservando o gesto de
1-clique de hoje. Ficha sem evento (`eventos.length === 0`, dado anterior ao event-log) continua
no caminho legado, inalterado — não há granularidade possível sem evento pra apontar.

## Investigação (achado no código, 28/07 — não presumido)

### Os 3 fluxos, como são hoje

| # | Fluxo | Arquivo | Quem assina | Gatilho | Escolhe qual ficha? | Service role? |
|---|---|---|---|---|---|---|
| 1 | Ficha rápida | `FichasTab.tsx` (`handleSaveSignature`, botão "Coletar assinatura" ~L2111-2133) | Dentista autor, coleta a assinatura do paciente na tela | `podeEditarFicha(evo) && !evo.assinadoEm && (realizados.length > 0 \|\| legado)` | Ficha já aberta no card (explícita) | Não — client normal + RLS |
| 2 | Recepção | `AssinaturaRecepcaoModal.tsx` + `assinatura-actions.ts` | Secretária, na tela de agendamentos | Status do agendamento em `checked_in`/`in_progress`/`completed` | **`buscarFichaParaAssinar`: "qualquer ficha do paciente sem `assinatura_url`, a mais recente" — sem checar autor nem o `aptId` clicado** | **Sim — `createServiceClient()`, bypassa RLS** |
| 3 | Fim de consulta | `consulta-assinatura-modal.tsx` + `salvarAssinaturaConsulta` | Dentista, ao fim do modo consulta | Fase `'salvo'`, botão "Solicitar assinatura do paciente" | A ficha recém-criada nesta consulta (`savedFichaId`, explícita) | Sim — `createServiceClient()` |

### Duplicação de captura já existente (não é algo que R-03b introduz)

Só o fluxo 1 usa o componente compartilhado `src/components/fichas/SignaturePad.tsx`. Os fluxos 2
e 3 reimplementam a mesma lógica de canvas + `signature_pad` inline, cada um do seu jeito. R-03b
**não** unifica isso (fora de escopo — risco desnecessário mexer nos 3 canvas pra um item que já é
grande) — só notado pra não presumir errado.

### `RegistroCardData.assinada` é cosmético

O campo só desenha o selo "· Assinatura coletada ✓" (`registro-card.tsx:204`). Toda trava de
interação de verdade (encaminhar, toggle status, editar detalhe do destino, mostrar o botão de
assinar) é calculada fora do card, em `FichasTab.tsx`, a partir de `evo.assinadoEm` — e hoje é
**por ficha**, não por registro. R-03b muda a granularidade dessas travas pra `evento.assinatura_id`.

### `EncaminharBar` — o esqueleto que a `AssinarBar` clona

Componente 100% controlado (sem estado próprio): `totalSelecionado`, `totalEncaminhavel`,
`onSelecionarTudo`, `onLimpar`, `onConfirmar`, `onSair`. O estado de seleção mora no pai
(`modoSelecaoFichaId: string | null` + `selecionados: Set<string>`, comentário no código: "só uma
consulta em modo por vez"). **Decisão #B4** trata se a `AssinarBar` reusa esse mesmo estado
(generalizado) ou ganha um paralelo.

## Decisões

### #B1 — Gesto padrão: 1-clique assina tudo, ou sempre exige seleção manual?

O sketch do R-03a já apontava a resposta: preservar o gesto de hoje. **Recomendo:** os 3 fluxos
continuam sendo 1 clique = assina todos os realizados-não-assinados da ficha (comportamento
idêntico ao de hoje, só que gravando granular por baixo). A ficha rápida (único fluxo com a UI de
seleção do R-04 já disponível) ganha **também** a opção de assinar um subconjunto via `AssinarBar`
— os fluxos 2 e 3 são momentos de "fechar tudo agora", sem necessidade de seleção manual.

### #B2 — Um caminho único pro gesto padrão (evita R-11 de novo: 3 lugares fazendo a mesma coisa)

**Recomendo:** `assinarTodosRealizadosDaFicha(fichaId, pacienteId, assinadoPor, assinaturaDataUrl)`
— server action nova, fina: busca os `eventoIds` com `status='realizado' AND assinatura_id IS NULL`
dessa ficha, chama `assinarProcedimentos` (R-03a) com eles. Os 3 fluxos chamam essa; só a ficha
rápida, quando o dentista opta por selecionar um subconjunto, chama `assinarProcedimentos`
diretamente com os ids escolhidos. Ficha sem evento (`legado`) não passa por aqui — continua no
caminho de hoje.

### #B3 — Caminho legado (ficha sem evento) muda?

**Recomendo: não.** `fichas.assinado_em`/`assinatura_url` continuam existindo só pra esse caso
(sketch do R-03a já assumia isso). Os 3 handlers atuais ficam como estão pra esse ramo —
inclusive o fluxo 2 continua em service role só aqui. É dado cada vez mais raro (toda ficha nova
desde R-01/R-02 nasce com evento) e não vale o risco de mexer em RLS por um caminho em extinção.
Cada um dos 3 fluxos precisa só de **1 branch**: `temEventos ? granular : legado (como hoje)`.

### #B4 — `AssinarBar` reusa o estado de seleção do `EncaminharBar`, ou ganha um paralelo?

**Recomendo: generalizar o existente.** `modoSelecaoFichaId`/`selecionados` viram um seleção
genérica com discriminador (`tipo: 'encaminhar' | 'assinar'`); `cardsEncaminhaveis` vira
`cardsSelecionaveis(tipo)` (encaminhar → `status='indicado' && !encaminhadoPara`; assinar →
`status='realizado' && !assinaturaId`). Evita duplicar 5 handlers (`ligarModoSelecao`,
`sairModoSelecao`, `toggleSelecao`, etc.) por um componente que já existe pronto. Efeito colateral
aceito: não dá pra estar em modo "encaminhar" e "assinar" ao mesmo tempo na mesma ficha — condizente
com "só uma consulta em modo por vez" que já é a regra hoje.

### #B5 — Achado fora do escopo original, mas do mesmo tema: `deletarFicha` não barra ficha legada assinada

`deletarFicha` (R-11) checa autoria mas **não** checa `fichas.assinado_em` — hoje dá pra apagar uma
ficha *legada* (sem evento) já assinada pelo paciente. Comparar com o caminho novo: ficha com
evento assinado já é imutável até no DELETE (trigger, confirmado ao vivo). **Recomendo** fechar essa
assimetria no mesmo commit deste item — 1 linha (`if (ficha.assinado_em) return { ok:false,
error: 'Ficha assinada não pode ser apagada.' }` antes do DELETE em `deletarFicha`).

### #B6 (confirmação, não decisão nova) — Retificação e imagem vs. nome digitado

R-03a assumiu defaults e pediu confirmação aqui: **sem desfazer assinatura** (correção é evento
novo) e **só traço**, sem fallback de nome digitado. A investigação confirma que os 3 fluxos hoje
só suportam traço — não achei nenhum caso de uso represado pedindo o contrário. Recomendo manter os
2 defaults.

## Escopo

**Cobre:** os 3 fluxos passam a chamar `assinarTodosRealizadosDaFicha`/`assinarProcedimentos`
quando a ficha tem evento; `AssinarBar` (clone do `EncaminharBar`) na ficha rápida; `assinada` no
card e as travas de interação (encaminhar, toggle status, detalhe do destino) migram de
`evo.assinadoEm` (ficha) pra `evento.assinaturaId` (registro); `fetchFichas`/`EventoView` passam a
trazer `assinatura_id`; fix do #B5.

**Não cobre:** unificar a duplicação de captura (`signature_pad` inline nos fluxos 2/3) — cosmético,
não é o problema deste item. Reescrever `buscarFichaParaAssinar` pra amarrar no `aptId` do
agendamento clicado — bug pré-existente real, mas ortogonal à granularidade; vira nota separada se
o Mateus quiser.

## Plano de implementação

| Arquivo | O que muda |
|---|---|
| `src/app/consulta/[agendamentoId]/actions.ts` | nova `assinarTodosRealizadosDaFicha` |
| `src/components/pacientes/FichasTab.tsx` | fetch traz `assinatura_id`; `EventoView` ganha o campo; travas migram pra por-evento; botão "Coletar assinatura" chama o caminho granular quando `temEventos`; seleção generaliza (`tipo`); nova `AssinarBar` montada ao lado da `EncaminharBar` |
| `src/components/fichas/assinar-bar.tsx` (novo) | clone do `EncaminharBar` sem o seletor de destino |
| `src/components/fichas/AssinaturaRecepcaoModal.tsx` + `assinatura-actions.ts` | chama `assinarTodosRealizadosDaFicha` quando a ficha achada tem evento; mantém o legado como está |
| `consulta-assinatura-modal.tsx` (chamador em `consulta-client.tsx`) | idem — `assinarTodosRealizadosDaFicha` quando tem evento |
| `src/server/patients/salvar-ficha.ts` | `deletarFicha` ganha o guard de `assinado_em` (#B5) |
| `src/types/odontograma.ts` | nada novo — `assinatura_id` já entrou no R-03a |

### Fases

1. **Contrato + fix isolado** — `assinarTodosRealizadosDaFicha` (Parte 2) + fix #B5. Risco baixo,
   nenhum chamador muda ainda.
2. **Ficha rápida** — fetch + `EventoView.assinaturaId` + travas por-evento + `AssinarBar` + botão
   "Coletar assinatura" brancheado. Risco médio — é o fluxo mais usado.
3. **Recepção e fim de consulta** — os 2 fluxos restantes chamam o mesmo contrato da Fase 1. Risco
   baixo, mesma função já provada na Fase 2.

**Verificável por fase:** ao vivo, com 2 contas (dentista autor / secretária) — assinar lote
completo em cada um dos 3 fluxos, e o subconjunto granular só na ficha rápida.

## Parte 2 — Contrato técnico

```typescript
// src/app/consulta/[agendamentoId]/actions.ts
export async function assinarTodosRealizadosDaFicha(params: {
  fichaId: string;
  pacienteId: string;
  assinadoPor: string;
  assinaturaDataUrl: string;
}): Promise<{ ok: boolean; error?: string }>;
// Busca eventoIds com status='realizado' AND assinatura_id IS NULL dessa ficha;
// se vazio, retorna { ok: false, error: 'Nada a assinar nesta ficha.' } sem chamar a RPC;
// senão delega pra assinarProcedimentos (R-03a) com esses ids.
```

### Invariantes (adição às do R-03a)

- [ ] `assinarTodosRealizadosDaFicha` nunca inclui evento já assinado no lote (a query já filtra
      `assinatura_id IS NULL` — dupla proteção com o guard da RPC).
- [ ] Ficha sem evento nunca chama `assinarProcedimentos`/`assinarTodosRealizadosDaFicha` — fica
      100% no caminho legado.
- [ ] `deletarFicha` rejeita ficha com `assinado_em` não-nulo, mesma classe de proteção do trigger
      pra fichas com evento assinado.

### Gates de aceite

- [ ] Ficha rápida, ficha com 3 realizados: 1 clique assina os 3, badge "· Assinatura coletada ✓"
      aparece nos 3 cards, botões de toggle/encaminhar somem só nesses 3 (não na ficha toda).
- [ ] Ficha rápida, mesma ficha: selecionar 1 dos 3 via `AssinarBar` e confirmar assina só esse.
- [ ] Recepção: secretária assina uma ficha do paciente (com evento) — mesmo resultado.
- [ ] Fim de consulta: assinar ao fechar a consulta — mesmo resultado.
- [ ] Ficha legada (sem evento) nos 3 fluxos: comportamento idêntico ao de hoje, sem regressão.
- [ ] Tentar apagar ficha legada já assinada → rejeitado (#B5), testado ao vivo.
- [ ] Dentista não-autor tentando assinar (qualquer fluxo) → rejeitado, 2 contas reais.
