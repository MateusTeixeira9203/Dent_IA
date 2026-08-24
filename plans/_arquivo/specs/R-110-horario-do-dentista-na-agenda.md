# R-110 — O horário do dentista vale na agenda

> **SPEC** · **R-110** · 🔵 ativo
> **Aberto:** 2026-08-13 · **Fase:** **`implementação local`** — decisões de §9 fechadas em 22/08
> **Modelo:** Sonnet — é validação com números já levantados, sem ambiguidade de modelo de dado.
> **Origem:** pedido dele 13/08 como pontual; **recusado como pontual** (mexe na rota de escrita
> da agenda e tinha 5 decisões abertas). O levantamento de 14/08 mudou o item de *bloquear* pra
> *avisar* — ver §2.

---

## 1. Problema

`criarAgendamento` ([actions.ts:50](../../src/app/dashboard/agendamentos/actions.ts:50)) valida três
coisas — conflito do dentista, conflito do paciente e compromisso pessoal (R-102) — e **nunca
olha `horarios_disponiveis`**. Quem lê a grade é só o bot do WhatsApp e o "Marcar retorno". A
secretária marca 22h de domingo e o sistema aceita sem piscar.

### O que o dado disse (medido 14/08, produção)

| # | Medição | Resultado |
|---|---|---|
| 1 | Onde a grade é lida | 1 lugar só: `getDisponibilidadeSemana` ([disponibilidade.ts:163](../../src/lib/agenda/disponibilidade.ts:163)) — `livres: grade ? livresDoDia(grade) : []`. **Sem grade, `livres` é vazio**, então a régua ingênua bloqueia tudo |
| 2 | Dentistas com grade cadastrada | **3 de 14.** Os 11 sem grade incluem **Renato (217 agendamentos)** e **Jenaina (74)**, na Clindent |
| 3 | Agendamentos já fora da própria grade | **32 de 232 (13,8%)** entre quem TEM grade: 14 depois de fechar · 7 antes de abrir · 6 no almoço · 5 em dia sem grade. Armando sozinho tem 17 |
| 4 | 2º caminho de escrita | `atualizarAgendamento` ([actions.ts:280](../../src/app/dashboard/agendamentos/actions.ts:280)) **já revalida** paciente e bloqueio quando a data muda, com override próprio — mas é **bloco paralelo**, não código compartilhado |

**A medição 3 é o que vira o item do avesso.** Marcar fora do expediente não é acidente: é 1 em
cada 7. Encaixe, urgência, paciente que só pode às 19h. Um bloqueio duro seria a primeira coisa
que a recepção pediria pra desligar — e contradiz a decisão dele de 21/07, escrita no próprio
código: *"a recepção precisa dessa liberdade — sobreposição acontece na clínica real"*.

---

## 2. Decisão

| Decisão | Alternativa descartada | Motivo |
|---|---|---|
| **Avisar com override**, não impedir | Bloqueio duro, como ele pediu originalmente | Medição 3: 13,8% dos agendamentos já são fora do expediente. Bloqueio vira atrito diário contra um comportamento legítimo. **Ele aprovou a virada em 14/08** |
| **Sem grade cadastrada = sem restrição** | Tratar `livres: []` como "tudo bloqueado" | Medição 2: 11 de 14 dentistas não têm grade. A régua ingênua trancaria a agenda dos 2 dentistas mais movimentados da clínica real no dia do deploy |
| **A validação vira função compartilhada** entre criar e editar | Somar a checagem só no criar | Medição 4: são dois blocos irmãos escritos duas vezes. Cobrir um deixa o furo aberto pelo outro — e duas cópias divergem (é a história do `montarRowsEventos`, R-108b) |
| **Lê a grade com o client da requisição**, respeitando RLS | `createServiceClient`, como o `getDisponibilidadeSemana` faz | A policy `horarios_access` é `belongs_to_active_clinic AND is_own_clinical_record`, e `is_own_clinical_record` libera **qualquer** dentista pra `role = 'secretaria'`. Quem mais precisa da checagem já enxerga o dado — não há motivo pra escalar privilégio |
| **Flag de override própria** (`forcarForaDoExpediente`) | Reusar `forcarConflitoDentista` | São motivos diferentes. Aceitar sobrepor a agenda de alguém não é o mesmo gesto que aceitar marcar às 21h; juntar os dois faria um "sim" valer pelo outro |
| **Nada é migrado** | Corrigir/marcar os 32 agendamentos legados | Com aviso em vez de bloqueio, os 32 simplesmente continuam existindo. Não há estado inválido pra consertar |

---

## 3. Objetivo

Quem marca fora do expediente **vê que está fora antes de confirmar**, e confirma se quiser. O
sistema para de fingir que 22h de domingo é um horário normal, sem tirar da recepção a liberdade
que ela usa 1 vez a cada 7 agendamentos.

---

## 4. Contrato técnico

```typescript
// src/lib/agenda/expediente.ts (novo) — puro, testável sem banco
export type ForaDoExpediente =
  | { fora: false }
  | { fora: true; motivo: 'antes_de_abrir' | 'depois_de_fechar' | 'no_almoco' | 'dia_sem_grade' };

/** `grade` null/ausente = dentista sem horário cadastrado = SEM restrição (§2). */
export function checarExpediente(
  grade: GradeDoDia | null,
  inicioMin: number,
  duracaoMin: number,
): ForaDoExpediente;
```

```typescript
// src/server/agenda/validar-expediente.ts (novo) — o que criar e editar compartilham
export async function validarExpediente(input: {
  dentistaId: string;
  dataHora: string;
  duracaoMinutos: number;
}): Promise<ForaDoExpediente>;
```

Uma query só: `horarios_disponiveis` do `dentistaId` no `dia_semana` do agendamento, com o client
da requisição. Zero linhas → `{ fora: false }`.

**Os dois chamadores** ganham o mesmo par de campos, no formato que o conflito de dentista já usa:

```typescript
// entrada
forcarForaDoExpediente?: boolean;
// saída
{ foraDoExpediente?: ForaDoExpediente['motivo'] }
```

Minuto do dia **sempre no fuso da clínica** (`America/Sao_Paulo`) — mesma regra do `hora-brt.ts`;
`data_hora` é `timestamptz` e ler em UTC erraria por 3 horas.

---

## 5. Comportamento

| Estado | Quando | A tela faz |
|---|---|---|
| **Dentro do expediente** | caso normal | nada muda — salva direto |
| **Fora** | antes de abrir · depois de fechar · no almoço · dia sem grade | avisa com o motivo em texto ("Dr. Gabriel atende até 20h nas terças") e oferece **Marcar mesmo assim** |
| **Sem grade** | dentista nunca configurou horário | nada muda — salva direto, sem aviso |
| **Editar/arrastar** | data ou duração mudam | mesmo aviso, mesmo override |
| **Só muda status** | confirmar, faltou, concluir | não paga a query (mesmo critério que a revalidação de conflito já usa) |

---

## 6. Invariantes

- [ ] Dentista **sem grade** nunca é bloqueado nem avisado
- [ ] O aviso **nunca** impede — sempre há caminho pra confirmar
- [ ] Criar e editar usam **a mesma função**; divergir entre os dois é o defeito que o item existe pra não criar
- [ ] Nenhum agendamento existente é alterado, marcado ou migrado
- [ ] A grade é lida com o client da requisição — **nunca** service role
- [ ] O minuto do dia é calculado no fuso da clínica, nunca em UTC

---

## 7. Gates de aceite

- [ ] **G1** — secretária marca 21h pra dentista que fecha 18h → aviso com motivo `depois_de_fechar`, e confirma se quiser
- [ ] **G2** — marca 12h num dentista com almoço 11h-13h30 → aviso `no_almoco`
- [ ] **G3** — marca domingo → aviso `dia_sem_grade`
- [ ] **G4** — marca pro **Renato** (sem grade nenhuma) → **nenhum aviso**, salva direto. *É o gate que prova que o deploy não trava a clínica real*
- [ ] **G5** — arrastar um agendamento de 15h pra 21h dispara o mesmo aviso que criar às 21h
- [ ] **G6** — mudar só o status (confirmar/faltou) não dispara aviso nem query extra
- [ ] **G7** — os 32 agendamentos já fora do expediente continuam intactos depois do deploy (SQL antes/depois)
- [ ] **G8** — typecheck + lint + `next build` limpos

---

## 8. Fora de escopo

- **Pintar o expediente na grade da agenda** (fundo cinza fora do horário) — é o R-71, que já tem
  a janela fixa 7h-20h como achado
- **Obrigar o dentista a cadastrar grade** no onboarding — muda cadastro, item próprio
- O **R-68** foi cortado em 07/08 por não sentir falta disso no "Marcar retorno". Este item é
  outra tela (a agenda) e outro gesto (criar, não sugerir) — não reabre aquele

## 9. Decisões fechadas em 22/08

1. O aviso vale para **secretária** e para o **dentista na própria agenda**. Continua sendo
   confirmação, nunca bloqueio.
2. Dentista em agenda de colega não recebe o aviso. Não criamos `security definer` nem elevamos
   privilégio só para ler a grade; a secretária já vê a grade pela RLS existente.
