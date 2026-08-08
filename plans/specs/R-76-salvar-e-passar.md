# R-76 — Salvar e passar

> **SPEC** · **R-76** · ✅ aprovada · **Fase:** `aprovada`
> **Aberto:** 2026-08-08 · **Fechado:** —
> **Modelo:** Sonnet 5 (reversão mecânica de lógica que já existiu, sem ambiguidade de design)
> **Depende de:** nada bloqueia · **Zero migration · zero RLS.**

## 1. O que ele pediu (08/08)

O botão "Salvar" do Registrar volta a avançar sozinho pro próximo paciente do rail depois de
salvar — rótulo muda pra **"Salvar e passar"**.

## 2. Reverte uma decisão específica, não é greenfield

Em 03/08 (commit `0669503`, comentário C2/P7 em `meu-dia-client.tsx`) esse exato
comportamento foi **removido de propósito**: "`onSalvo` NÃO avança mais pro próximo slot:
decisão dele, o dentista já troca de paciente clicando no rail." Ele confirmou hoje que quer
reverter — não foi tocado por engano nem é reinterpretação, é mudança de ideia dele mesmo,
registrada aqui pra não se perder de novo numa 3ª rodada.

**Detalhe que quebrou nesse meio-tempo:** a função que decidia "qual é o próximo elegível"
(`podeAtender`) morava em `rail.tsx` e foi **apagada ontem no R-72** — na hora, o único uso
dela era o link "Iniciar consulta" que saiu junto com `/consulta`. Ninguém sabia que ia
precisar dela nesta sessão. Precisa nascer de novo.

## 3. Contrato

**`meu-dia-client.tsx`** — recria as duas peças que existiam antes de `0669503`, idênticas,
só que `podeAtender` agora vive aqui (não em `rail.tsx` — só este arquivo a usa hoje):

```ts
function podeAtender(status: string): boolean {
  return !['cancelled', 'no_show', 'completed'].includes(status);
}

function avancarProximo() {
  const idxAtual = slots.findIndex((s) => s.agendamentoId === selecionadoId);
  const proximo = idxAtual === -1 ? undefined : slots.slice(idxAtual + 1).find((s) => podeAtender(s.statusAgendamento));
  setSelecionadoId(proximo?.agendamentoId ?? null);
}
```

`handleSalvo` (hoje só limpa rascunho + `router.refresh()`) ganha a chamada a
`avancarProximo()`, nesta ordem: limpar rascunho local (trava §5.6.1 anti-duplo-clique) →
`avancarProximo()` → `router.refresh()`.

**`slots` é a prop vinda do servidor** — no instante em que `avancarProximo` roda (dentro de
`onSalvo`, antes do refresh terminar), `slots` ainda é o array pré-save. Isso é seguro: a
lista de agendamentos do dia não muda de tamanho/ordem por causa de 1 ficha salva, só o
conteúdo de pendências dentro de cada paciente muda — mesma leitura que o código original já
fazia.

**`registrar-painel.tsx`** — só o rótulo padrão do botão muda, de "Salvar" pra
**"Salvar e passar"**. Os outros 2 estados (`"Salvando…"` durante o save, `"Já registrado
hoje"` quando não há rascunho novo) continuam iguais — não fazem sentido com o rótulo novo.

## 4. Invariantes (herdados, não renegociáveis)

| # | Regra | Por quê |
|---|---|---|
| I1 | Nunca avança quando o odontograma falhou ao gravar (`eventosFalharam`) | I4 do R-46b2/C2 — `RegistrarPainel.handleSalvar` só chama `onSalvo()` fora desse caso; o avanço herda a proteção de graça, nada muda aqui |
| I2 | Sem próximo elegível → `selecionadoId = null` (fim de dia), nunca cai de volta no `slots[0]` escondido | Comportamento original — reabrir o 1º paciente do dia em silêncio seria pior que não selecionar nada |

## 5. Gates

| Gate | Como testar |
|---|---|
| G1 | Salvar ficha com sucesso (odontograma gravou) → rail muda de seleção pro próximo slot elegível, painel remonta pro novo paciente |
| G2 | Salvar a ficha do último paciente elegível do dia → nenhum slot selecionado, tela de fim de dia — nunca volta pro primeiro |
| G3 | Salvar mas o odontograma falha ao gravar → continua no mesmo paciente, com o aviso de "tentar de novo" (I1) |
| G4 | Botão mostra "Salvar e passar" (padrão) · "Salvando…" (durante) · "Já registrado hoje" (sem rascunho) — nos 3 estados certos |
