# R-118 — Retorno da secretária na agenda do dentista

> **SPEC** · **R-118** · ✅ no ar e verificado; registro histórico
> **Aberto:** 2026-08-18 · **Fechado:** — · **Fase:** aprovada · **Migration:** zero

## 1. Problema

No perfil do paciente, “Marcar retorno” envia o ID da secretária à grade. A action de
disponibilidade só aceita a agenda do próprio usuário, portanto ela falha. Não há seletor de
dentista. A criação de agendamento aceita um `dentistaId` do cliente, mas não restringe esse alvo
a secretárias no servidor.

## 2. Decisão

| Decisão | Alternativa | Motivo |
|---|---|---|
| Secretária escolhe o dentista antes da grade | Abrir no primeiro dentista | Evita retorno no profissional errado. |
| Dentista/admin ficam apenas na própria agenda | Seletor para todos | Preserva privacidade da agenda. |
| Troca de alvo limpa data/hora | Manter horário | O horário pertence à agenda anterior. |
| Autorização no servidor | Confiar na UI | A action pode ser chamada fora da tela. |

## 3. Objetivo

Secretária escolhe um dentista ativo da própria clínica, vê a semana dele e marca o retorno. O
agendamento recebe esse mesmo alvo no servidor e notifica o dentista. Dentista/admin não veem
seletor e só usam a própria agenda.

## 4. Contrato técnico

```ts
type DentistaAgenda = { id: string; nome: string };

interface MarcarRetornoModalProps {
  role: DentistaRole;
  meuDentistaId: string;
  dentistasClinica: DentistaAgenda[];
  dentistaAlvoId: string | null;
  onDentistaAlvoChange: (id: string) => void;
}
```

- `PacienteDetailClient` reutiliza `dentistasClinica` já carregado.
- Para secretária, alvo inicia `null`; para dentista/admin, o alvo efetivo é sempre `dentistaId`.
- `RetornoSemanaGrid` aceita `dentistaId: string | null`; com `null`, não chama servidor e mostra
  “Selecione o dentista para ver a agenda”.
- `buscarDisponibilidadeSemana` e `criarAgendamento` mantêm a assinatura atual e aplicam a mesma
  regra: alvo diferente só é permitido à secretária e precisa ser `admin`/`dentista` ativo da mesma
  clínica. Outros papéis recebem erro sem consulta ou insert.

## 5. Comportamento

| Estado | Tela | Ação |
|---|---|---|
| Secretária sem alvo | seletor e orientação; grade vazia | sem request |
| Seleção | loader | carrega a agenda do alvo |
| Troca de alvo | data/hora “—” | limpa seleção e recarrega |
| Agenda pronta | grade do profissional escolhido | permite data/hora |
| Sem permissão | erro claro | não expõe agenda nem cria retorno |
| Sucesso | toast com data/hora | salva com alvo e notifica dentista |

## 6. Referência visual

- Rota `/dashboard/pacientes/[id]`; componente `MarcarRetornoModal`.
- O seletor entra acima da grade, seguindo `novo-orcamento-modal.tsx`: nomes, sem UUID, apenas
  para secretária. Para dentista/admin, zero mudança visual.

## 7. Invariantes

- [ ] Secretária vê disponibilidade apenas de profissional ativo da própria clínica.
- [ ] Dentista/admin não consultam nem marcam agenda de colega por este fluxo.
- [ ] O servidor decide a permissão do alvo.
- [ ] `dentista_id` do retorno é o alvo; `created_by` é quem o criou.
- [ ] Trocar dentista nunca preserva hora/data anterior.

## 8. Gates de aceite

- [ ] Secretária abre: sem agenda até escolher um nome; nenhum ID aparece.
- [ ] Escolhe Dr. A: vê a semana de A e salva retorno com `dentista_id=A`.
- [ ] Troca A para B: data/hora limpam e a grade vira a de B.
- [ ] Dentista: sem seletor, agenda própria.
- [ ] Dentista A chama as actions para B: erro e zero agendamento criado.
- [ ] Secretária tenta dentista de outra clínica: erro, sem leitura ou insert.
- [ ] Typecheck e teste com duas contas passam.

## 9. Fora de escopo

- Redesenho da agenda, R-110, protético como destino ou alteração global de visibilidade.
