# R-16 — Filtro por responsável na ficha

> **SPEC** · **R-16** · ✅ `aprovada` (24/07) · **Modelo:** Sonnet (execução — frontend puro, sem schema)
> **Aberto:** 2026-07-24 — nasceu da quebra do [R-04](R-04-encaminhar-procedimento.md) (decisão #8).
> A spec do R-04 passou de 400 linhas; o filtro é independente do fluxo de encaminhar (só lê o
> campo) e entrega valor sozinho, então virou item próprio.

## Problema

Numa clínica com mais de um dentista, a ficha do paciente mistura registros de todos — o núcleo
clínico é compartilhado desde a migration 099, e o encaminhamento (R-04) aumenta a mistura. O
dentista abre a ficha e quer ver **o que é dele** sem ler tudo. Hoje não há como.

## O que vamos fazer

Chips **Meus / Todos / [por dentista]** no topo da aba de fichas. O filtro esconde os cards cujo
responsável não bate. **Responsável = `encaminhado_para ?? dentista_id`** — quem vai fazer, não quem
lançou. Frontend puro sobre dados que já existem, reversível, sem schema.

Entrega o "clean" (filtra pra Meus, a lista encolhe) sem reorganizar nada — compõe com o
abertos-primeiro do R-02 em vez de brigar com ele.

## Decisão #8 (24/07) — filtro, não seções

**Seções persistentes por dentista foram REJEITADAS.** Registrado aqui pra não re-litigar em sessão
futura (thinking-partner 24/07, com fontes reais):

- Um prontuário é **cronológico/por-dente e legal** (CFO: CRO + assinatura por lançamento). Agrupar
  por pessoa quebra a espinha do documento.
- Em todo prior art, "responsável" é **atributo + filtro**, nunca a estrutura: Open Dental = provider
  por procedimento + relatório; FHIR CareTeam = overlay; Linear = view.
- Seção criava 4 problemas concretos: seção órfã (dentista sai da clínica), grupo partido
  (`grupo_id` multi-dente atravessando seções), **autor-exibido ≠ autor-assinado** (risco legal), e
  chrome inútil no caso **solo** — que é a maioria das clínicas.
- Densidade real (Mateus): *"passa pacientes muitas vezes, mas não divide todo paciente"* → filtro cobre.

**Condição de revisão:** se o dogfooding mostrar clínica que divide **todo** paciente, promove o
filtro pra view agrupada. Barato e reversível — é o motivo de começar pelo filtro.

## Escopo

**Cobre:** chips de filtro por responsável na `FichasTab` · derivação do responsável ·
comportamento solo (sem chips).

**Não cobre:** seções/agrupamento persistente (rejeitado acima) · filtro no odontograma, no
orçamento ou em qualquer outra tela · persistir a escolha entre sessões · relatório de
produção-por-dentista (item próprio se um dia precisar) · qualquer mudança de schema, API ou RLS.

## Assunções

- Responsável = `encaminhado_para ?? dentista_id`. É **display**; nunca vaza pro PDF/prontuário
  exportado, que mostra `dentista_id` + CRO + assinatura por evolução — o responsável derivado **não
  é a autoria legal**.
- A lista de responsáveis sai dos registros **daquela ficha**, não da clínica: chip só aparece pra
  quem tem registro ali. Dentista inativo que tem registro antigo continua aparecendo (é histórico).
- Estado local, `null` = "Todos". Não persiste em URL nem em storage na v1.
- Depende do `encaminhado_para` já chegar na `FichasTab` — isso é a **Fase 2 do R-04**, já codada.
  Sem ela o filtro degrada pra `dentista_id` puro (funciona, mas ignora encaminhamento).

## Plano de implementação — fase única (Risco: BAIXO)

| Arquivo | O que muda |
|---|---|
| `src/components/pacientes/FichasTab.tsx` | deriva `responsaveis`, segura `filtroResponsavel`, esconde cards que não batem |
| `src/components/fichas/…` (novo, ou inline) | `FiltroResponsavel` — chips |

1. `FichasTab.tsx` — deriva a lista de responsáveis presentes nos registros da ficha
   (`encaminhado_para ?? dentista_id`, dedup, com nome). Estado `filtroResponsavel: string | null`
   (`null` = Todos, `'me'` = Meus, senão um `dentista.id`).
2. O filtro esconde os cards cujo responsável não bate. **Consulta que fica sem card visível
   colapsa** — não deixa evolução vazia na tela.
3. Chips no topo da aba. **Solo (1 responsável distinto) → não renderiza chips** (regra: nada de
   chrome no caso mais comum).
4. Componente `FiltroResponsavel` próprio **ou inline** — decidir na hora se paga componente (regra 3
   do CLAUDE.md: não criar abstração que não se repete).

**Dependências:** R-04 Fase 2 (leitura de `encaminhado_para`). **Compõe** com o modo seleção do R-04
Fase 3 (as duas leem a mesma lista de cards).

**Costura com o modo seleção (R-04 Fase 3)** — regra única, pra não ficar indefinido: **o filtro
opera sobre o que está visível.** "Selecionar tudo" marca só os encamináveis **visíveis** (não os
escondidos pelo filtro); trocar o filtro com o modo ligado **não** desmarca o que já foi selecionado
(a seleção é por id, sobrevive a esconder/mostrar). Sem gate próprio além deste — é a única
interação possível entre os dois.

## Contrato técnico

```typescript
// Chips Meus / Todos / [por dentista]. Display puro — nenhuma escrita, nenhuma action.
export interface FiltroResponsavelProps {
  /** Responsáveis presentes (encaminhado_para ?? dentista_id) nos registros da ficha. */
  responsaveis: { id: string; nome: string }[];
  atual: string | null;                     // null = "Todos"; 'me' = "Meus"; senão um dentista id
  onSelecionar: (v: string | null) => void;
  meuDentistaId: string;
}
// Estado que FichasTab segura: filtroResponsavel: string | null.
```

### Componentes

```
FichasTab (client)
  -> FiltroResponsavel (chips)   Meus / Todos / [por dentista] — some quando ha 1 responsavel so
  -> por consulta (evolucao)     colapsa se nenhum card dela sobrevive ao filtro
       -> RegistroCard           escondido quando (encaminhado_para ?? dentista_id) nao bate
```

## Invariantes

- [ ] O filtro **nunca** escreve: sem action, sem RPC, sem mudança de schema ou RLS.
- [ ] Responsável derivado (`encaminhado_para ?? dentista_id`) nunca aparece no PDF/prontuário
      exportado — lá vale `dentista_id` + CRO + assinatura.
- [ ] Filtrar não reordena: a ordem continua a do R-02 (abertos-primeiro). Filtro esconde, não move.
- [ ] Nenhum registro é editável por causa do filtro — permissão continua vindo de autor/destino.

## Gates de aceite

- [ ] Ficha com registros de 2 dentistas → **"Meus"** mostra só os do usuário; **"[Dr. X]"** só os
      dele; **"Todos"** mostra tudo.
- [ ] Registro **encaminhado** pro Dr. X aparece em "[Dr. X]" e **some** de "Meus", mesmo o autor
      sendo o usuário — é `encaminhado_para` que manda.
- [ ] Consulta que perde todos os cards pro filtro **colapsa**; não sobra evolução vazia.
- [ ] Clínica/ficha **solo** (1 responsável) → **sem chips** na tela.
- [ ] Compõe com o abertos-primeiro do R-02: dentro do filtro, a ordem não muda.
- [ ] Claro **e** escuro; chips tocáveis no mobile (≥40px).
- [ ] PDF/prontuário exportado da mesma ficha continua idêntico com qualquer filtro ativo.
