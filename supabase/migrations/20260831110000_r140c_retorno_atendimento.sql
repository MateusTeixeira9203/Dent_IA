-- R-140c — um retorno pode apontar para a visita clínica que o originou.
--
-- EXPAND aditivo: agendamentos históricos permanecem com NULL; nada é reinterpretado.
-- A relação é de navegação/auditoria e não muda agenda, RLS ou regra de disponibilidade.

alter table public.agendamentos
  add column if not exists atendimento_origem_id uuid
  references public.atendimentos_clinicos(id) on delete set null;

-- Uma visita possui no máximo um retorno. Se for necessário alterar, isso acontece
-- no agendamento já criado — nunca criando outro retorno silenciosamente.
create unique index if not exists agendamentos_atendimento_origem_unico_idx
  on public.agendamentos (clinica_id, atendimento_origem_id)
  where atendimento_origem_id is not null;

comment on column public.agendamentos.atendimento_origem_id is
  'R-140c — atendimento clínico que originou este retorno. NULL preserva agendas anteriores.';
