# R-107a — barra do campo mágico: tira status/observação global, traz rotina da ficha

> **SPEC** · fase **`aprovada`** — todas as decisões tomadas em debate por ele (12-13/08), sem
> pergunta aberta restante nesta fatia.
> **Aberto:** 2026-08-13 · **Fechado:** —
> **Modelo:** Sonnet 5 — mecanismo mecânico (remover 2 controles, portar 1 padrão já pronto de
> `FichasTab.tsx`), zero ambiguidade de desenho.
> **Irmã:** [R-107b](R-107b-perfil-do-dente.md) (perfil do dente — arquivo próprio, ainda sem
> spec). As duas nasceram do mesmo debate mas não dependem uma da outra — esta sobe sozinha.

## 1. Problema

A faixa abaixo do campo mágico (`registrar-painel.tsx`) tem 3 controles que ele avaliou, ao
vivo, como sem utilidade hoje:

1. **Status (a fazer/feito)** — era necessário quando existia o combobox de 17 tipos (pré-R-62).
   Hoje todo lugar que mostra um evento criado (`ToothDetailPanel`, `NestaSessaoBloco` via
   `RegistroCard`) já tem o próprio pill clicável que cicla o status. O global na barra ficou
   redundante com o controle por-evento que já existe.
2. **Observação (input "acompanha o próximo procedimento")** — redundante com o textarea por
   evento que já existe em `ToothDetailPanel` (R-04b) e em `RegistroCard`/`NestaSessaoBloco`
   (`onObservacaoChange`). Dois lugares pra escrever a mesma coisa.
3. **"+ texto da visita"** — existe, já é expansível, já é onde o Dex escreve a nota da consulta
   (`CampoMagicoMeuDia` → `onTextoVisitaChange`). O problema não é o mecanismo, é o rótulo: ele
   não bate o olho que aquilo é "a observação da visita".

Em paralelo, profilaxia/clareamento/manutenção ortodôntica são procedimentos reais e
frequentes (22, 7 e histórico de uso real na base — conferido em produção) que hoje só têm
chip rápido dentro da ficha do paciente (`FichasTab.tsx:1875-1935`), não no Meu dia. Raspagem,
flúor e exame periodontal ficam de fora desta fatia — decisão dele, sem sinal de uso que
justifique brigar por espaço na barra agora.

## 2. Decisão

- **Sai** o controle global de Status (`status`/`setStatus`) e o botão "Manutenção ortodôntica"
  continua, mas some da mesma linha (a linha vira só chips de rotina).
- **Sai** o input "Observação" (acompanha o próximo procedimento) — `observacao`/`setObservacao`.
- **"+ texto da visita" vira "+ Observação"** — mesmo mecanismo (`textoAberto`/`textoVisita`),
  só rótulo e placeholder mudam. Continua nascendo fechado (opcional, dele: "se quiser ele pode
  anotar, senão não precisa").
- **Entram 2 chips novos** na faixa: Profilaxia e Clareamento, com o MESMO ciclo que já existe
  em `FichasTab.tsx` (sem registro → a fazer → feito → remove). Manutenção ortodôntica
  continua igual, só reposicionada na mesma linha.
- Evento criado por qualquer caminho que não seja os 2 chips novos (clique em dente, catálogo,
  texto/voz no campo mágico) continua nascendo `realizado` — era o default do `status` state
  antes de sair; vira constante. Correção de status pós-criação é o pill em "Nesta sessão"
  (já existe, `nesta-sessao-bloco.tsx:133`).

## 3. Contrato técnico

### Arquivos tocados

| Arquivo | Muda |
|---|---|
| `src/lib/odontograma/rotina-boca.ts` (**novo**) | Extrai `eventoRotina`/`cycleRotina` de dentro de `FichasTab.tsx` pra util compartilhado. Motivo: a partir desta fatia a mesma lógica de dedup passa a existir em 2 lugares (ficha + Meu dia) — duplicar o código é a mesma classe de bug que já mordeu o projeto (R-44, R-56, R-67: 2 cópias divergindo em silêncio) |
| `src/components/pacientes/FichasTab.tsx` | Troca a definição local de `eventoRotina`/`cycleRotina` (linhas 726-759) pelo import do util novo. Comportamento idêntico — é troca de definição por import, não mudança de lógica |
| `src/app/dashboard/meu-dia/_components/registrar-painel.tsx` | Ver comportamento abaixo |

**Nenhuma migration.** `StatusRegistro`, `TipoRegistroOdontograma`, `OdontogramaEventoDraft`
inalterados — nada de schema muda nesta fatia.

### Types

```typescript
// src/lib/odontograma/rotina-boca.ts — assinatura idêntica ao que já existe hoje em
// FichasTab.tsx, só parametrizado por `eventos` em vez de fechar sobre state local.
export function eventoRotina(
  eventos: OdontogramaEventoDraft[],
  tipo: TipoRegistroOdontograma,
  quadrante?: QuadranteFDI,
): OdontogramaEventoDraft | null;

export function cycleRotina(
  eventos: OdontogramaEventoDraft[],
  tipo: TipoRegistroOdontograma,
  quadrante?: QuadranteFDI,
): OdontogramaEventoDraft[]; // devolve a lista nova — call site faz setEventosDraft(novaLista)
```

### Comportamento — `registrar-painel.tsx`

**Remove:**
- `status`/`setStatus` (linha 201) e o bloco de UI "Status" (linhas 558-575)
- `observacao`/`setObservacao` (linha 205) e o bloco de UI "Observação" (linhas 592-606)
- As 2 linhas correspondentes no reset por-paciente (`setStatus('realizado')`,
  `setObservacao('')`, dentro do bloco `agendamentoIdAoResetar`, linhas 252-271)

**Simplifica:**
- `textoObservacao(doCatalogo)` (linhas 317-321) perde o `.join(' — ')` com `observacao` —
  vira só `return doCatalogo;`. Todo call site de `criarEventos` já passa o nome do catálogo
  quando existe; sem o state `observacao`, não há mais o que compor
- `criarEventos` (linhas 323-339): `status: status` vira `status: 'realizado'` (constante — era
  o default do state removido)

**Adiciona** — mesma linha onde "Status" vivia, mesmo estilo visual dos chips que já existem:

```tsx
import { eventoRotina, cycleRotina } from '@/lib/odontograma/rotina-boca';

// dentro do componente, ao lado do botão de orto já existente:
{(['profilaxia', 'clareamento'] as const).map((tipo) => {
  const ev = eventoRotina(eventosDraft, tipo);
  const cor = ev ? corDoRegistro(ev.status, ev.origem) : null;
  return (
    <button
      key={tipo}
      type="button"
      onClick={() => setEventosDraft(cycleRotina(eventosDraft, tipo))}
      /* mesmo className/estilo condicional por `cor` que FichasTab.tsx:1887-1902 já usa */
    >
      {TIPO_LABEL[tipo]}
    </button>
  );
})}
```

**Renomeia:**
- `"+ texto da visita"` (linha 627) → `"+ Observação"`
- placeholder do textarea (linha 618) `"Anotação da visita (opcional)"` →
  `"Observação da visita (opcional)"`

**Intacto:** `alertaNovo`, `onde`/`OndeValor`, `tipoPendente`, `catalogoPendente`, `ortoChipAberto`/
`ortoValor` (chip de orto continua exatamente como está), `handleSalvar`, `registrar()` pros
demais tipos (dente/catálogo), `TIPOS_NIVEL_BOCA` (o branch de boca em `registrar()` continua
existindo pro caminho digitado/ditado — só ganha `status: 'realizado'` fixo em vez do state).

## 4. Invariantes

- [ ] Nenhuma migration, nenhuma mudança de RLS, nenhuma mudança de schema
- [ ] `eventoRotina`/`cycleRotina` em `FichasTab.tsx` e em `registrar-painel.tsx` chamam a
      MESMA função importada — nunca 2 cópias
- [ ] Clicar Profilaxia/Clareamento 2x no Meu dia nunca cria 2 eventos — sempre cicla o mesmo
- [ ] `textoVisita` continua sendo escrito pelo Dex (`CampoMagicoMeuDia` → `onTextoVisitaChange`)
      exatamente como hoje — só o rótulo do botão que revela o textarea muda
- [ ] Evento criado por clique em dente/catálogo/texto continua `realizado` por padrão (mesmo
      comportamento de hoje, só que fixo em vez de vir do state removido)

## 5. Gates de aceite

- [x] **G1** — `grep -n "setStatus\|setObservacao" registrar-painel.tsx` devolve vazio.
      Typecheck + lint + `next build` limpos (13/08)
- [x] **G2** — testado ao vivo (paciente "teste", localhost): Profilaxia sem registro → 1º
      clique pinta "a fazer" (coral) → 2º clique "feito" (teal, "Realizado em 13/08/2026") →
      3º clique some, "Nesta ficha" volta a 0. Mesmo ciclo confirmado pro Clareamento
- [x] **G3** — testado ao vivo: evento de rotina criado pelo Meu dia aparece em "Nesta ficha"
      com pill de status clicável (`Marcar como realizado`/`Marcar pra próxima seção`/
      `Remover registro`) — mesma via que já existe
- [x] **G4** — regressão testada ao vivo na ficha do paciente (`FichasTab.tsx`, "Nova
      Evolução"): Flúor e Raspagem quadrante 2 ciclam idênticos a antes da extração do util
      (`Flúor (boca toda) — a fazer`, `Raspagem quadrante 2 — a fazer`), zero erro de console
- [x] **G5** — testado ao vivo: "+ Observação" abre o textarea com placeholder "Observação da
      visita (opcional)"
- [x] **G6** — testado ao vivo: digitado "canal 17" no campo mágico → chip local "Canal – dente
      17" → clicado → card nasce "Realizado em 13/08/2026", sem nenhum controle de status na
      barra
- [x] **G7** — testado ao vivo (com o dente fechado — `voltar à boca`): Manutenção ortodôntica
      abre o `OrtoForm` com Arcada "Superior" pré-carregada (herança R-05b intacta)
- [x] **G8** — `git diff --stat`: só os 3 arquivos do contrato mudaram nesta fatia
      (`registrar-painel.tsx`, `FichasTab.tsx`, `rotina-boca.ts` novo) — resto do diff é de
      sessões anteriores (R-103). Zero `salvar-ficha`, zero RPC, zero `supabase/`

**Verificação:** zero erro de console em todas as interações (checado em aba nova, sem
histórico de HMR). Nada foi persistido — testes tocaram só estado de rascunho local, nenhum
clique em "Salvar e passar"/"Salvar Evolução".

## 6. Fora de escopo

- Raspagem/flúor/exame periodontal na barra do Meu dia — sem sinal de uso, decisão dele
- Dedup do caminho TIPADO (campo mágico) pra profilaxia/clareamento — hoje, digitar "profilaxia"
  duas vezes no campo mágico já cria 2 eventos (`registrar()` do tipo boca sempre acrescenta,
  nunca cicla). Esta fatia não muda esse caminho — só adiciona o chip clicável, que cicla
  corretamente. Duplicata por texto é comportamento pré-existente, não introduzido aqui;
  registrado aqui pra não virar achado "novo" numa auditoria futura
- R-107b (perfil do dente) — arquivo e spec própria
