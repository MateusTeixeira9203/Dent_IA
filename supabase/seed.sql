-- Seed local da auditoria completa. Nunca aplicar em ambiente remoto.
-- Todas as pessoas, clínicas e dados abaixo são fictícios.
-- Senha comum das contas: AuditoriaLocal140!

begin;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'b0000000-0000-4000-8000-00000000000a', 'authenticated', 'authenticated', 'dentista.a.r140@example.invalid', crypt('AuditoriaLocal140!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'b0000000-0000-4000-8000-00000000000b', 'authenticated', 'authenticated', 'dentista.b.r140@example.invalid', crypt('AuditoriaLocal140!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-00000000000a', 'authenticated', 'authenticated', 'admin.a.auditoria@example.invalid', crypt('AuditoriaLocal140!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-00000000000c', 'authenticated', 'authenticated', 'secretaria.a.auditoria@example.invalid', crypt('AuditoriaLocal140!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-00000000000d', 'authenticated', 'authenticated', 'dentista.c.auditoria@example.invalid', crypt('AuditoriaLocal140!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now())
on conflict (id) do update set
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = excluded.email_confirmed_at,
  raw_app_meta_data = excluded.raw_app_meta_data,
  updated_at = now();

update auth.users
set confirmation_token = '', recovery_token = '', email_change_token_new = '', email_change = ''
where id in (
  'b0000000-0000-4000-8000-00000000000a',
  'b0000000-0000-4000-8000-00000000000b',
  'c0000000-0000-4000-8000-00000000000a',
  'c0000000-0000-4000-8000-00000000000c',
  'c0000000-0000-4000-8000-00000000000d'
);

insert into auth.identities (
  provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
select
  u.id::text,
  u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true, 'phone_verified', false),
  'email', now(), now(), now()
from auth.users u
where u.id in (
  'b0000000-0000-4000-8000-00000000000a',
  'b0000000-0000-4000-8000-00000000000b',
  'c0000000-0000-4000-8000-00000000000a',
  'c0000000-0000-4000-8000-00000000000c',
  'c0000000-0000-4000-8000-00000000000d'
)
on conflict (provider_id, provider) do update set identity_data = excluded.identity_data, updated_at = now();

insert into public.clinicas (id, nome, plano, status_assinatura, trial_ends_at, onboarding_completo) values
  ('b0000000-0000-4000-8000-000000000001', 'Clínica Local A', 'CLINICA', 'trial', now() + interval '30 days', true),
  ('b0000000-0000-4000-8000-000000000002', 'Clínica Local B', 'CLINICA', 'trial', now() + interval '30 days', true)
on conflict (id) do update set
  nome = excluded.nome,
  status = 'ativa',
  trial_ends_at = excluded.trial_ends_at,
  onboarding_completo = true;

insert into public.users (id, email, active_clinica_id) values
  ('b0000000-0000-4000-8000-00000000000a', 'dentista.a.r140@example.invalid', 'b0000000-0000-4000-8000-000000000001'),
  ('b0000000-0000-4000-8000-00000000000b', 'dentista.b.r140@example.invalid', 'b0000000-0000-4000-8000-000000000002'),
  ('c0000000-0000-4000-8000-00000000000a', 'admin.a.auditoria@example.invalid', 'b0000000-0000-4000-8000-000000000001'),
  ('c0000000-0000-4000-8000-00000000000c', 'secretaria.a.auditoria@example.invalid', 'b0000000-0000-4000-8000-000000000001'),
  ('c0000000-0000-4000-8000-00000000000d', 'dentista.c.auditoria@example.invalid', 'b0000000-0000-4000-8000-000000000001')
on conflict (id) do update set email = excluded.email, active_clinica_id = excluded.active_clinica_id;

insert into public.dentistas (id, clinica_id, user_id, nome, cro, email, role, ativo, foco_principal, especialidade) values
  ('b0000000-0000-4000-8000-0000000000a1', 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000a', 'Dra. Ana Local', 'TESTE-A', 'dentista.a.r140@example.invalid', 'dentista', true, 'economizar_tempo', array['Dentística']),
  ('b0000000-0000-4000-8000-0000000000b1', 'b0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-00000000000b', 'Dr. Bruno Outra Clínica', 'TESTE-B', 'dentista.b.r140@example.invalid', 'dentista', true, 'economizar_tempo', array['Implantodontia']),
  ('c0000000-0000-4000-8000-0000000000a1', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-00000000000a', 'Dra. Alice Admin', 'TESTE-ADM', 'admin.a.auditoria@example.invalid', 'admin', true, 'crescer', array['Clínica Geral']),
  ('c0000000-0000-4000-8000-0000000000c1', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-00000000000c', 'Sara Secretária', null, 'secretaria.a.auditoria@example.invalid', 'secretaria', true, null, '{}'),
  ('c0000000-0000-4000-8000-0000000000d1', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-00000000000d', 'Dr. Carlos Local', 'TESTE-C', 'dentista.c.auditoria@example.invalid', 'dentista', true, 'economizar_tempo', array['Endodontia'])
on conflict (id) do update set nome = excluded.nome, cro = excluded.cro, role = excluded.role, ativo = true;

delete from public.clinica_usuarios where usuario_id in (
  'b0000000-0000-4000-8000-00000000000a',
  'b0000000-0000-4000-8000-00000000000b',
  'c0000000-0000-4000-8000-00000000000a',
  'c0000000-0000-4000-8000-00000000000c',
  'c0000000-0000-4000-8000-00000000000d'
);

insert into public.clinica_usuarios (usuario_id, clinica_id, role, status) values
  ('b0000000-0000-4000-8000-00000000000a', 'b0000000-0000-4000-8000-000000000001', 'dentista', 'ativo'),
  ('b0000000-0000-4000-8000-00000000000b', 'b0000000-0000-4000-8000-000000000002', 'dentista', 'ativo'),
  ('c0000000-0000-4000-8000-00000000000a', 'b0000000-0000-4000-8000-000000000001', 'admin', 'ativo'),
  ('c0000000-0000-4000-8000-00000000000c', 'b0000000-0000-4000-8000-000000000001', 'secretaria', 'ativo'),
  ('c0000000-0000-4000-8000-00000000000d', 'b0000000-0000-4000-8000-000000000001', 'dentista', 'ativo');

insert into public.secretarias (usuario_id, clinica_id, nome, must_change_password) values
  ('c0000000-0000-4000-8000-00000000000c', 'b0000000-0000-4000-8000-000000000001', 'Sara Secretária', false)
on conflict (usuario_id, clinica_id) do update set nome = excluded.nome, must_change_password = false;

-- Torna cada reaplicação determinística: remove somente os prontuários fictícios
-- desta auditoria; as FKs apagam agenda, fichas, orçamento e documentos derivados.
delete from public.pacientes where id in (
  'b0000000-0000-4000-8000-0000000000a2',
  'b0000000-0000-4000-8000-0000000000b2'
);
delete from public.procedimentos where id in (
  'd0000000-0000-4000-8000-000000000001',
  'd0000000-0000-4000-8000-000000000002',
  'd0000000-0000-4000-8000-000000000003',
  'd0000000-0000-4000-8000-000000000004',
  'd0000000-0000-4000-8000-000000000005'
);

insert into public.pacientes (id, clinica_id, nome, cpf, email, telefone, whatsapp, data_nascimento, dentista_id) values
  ('b0000000-0000-4000-8000-0000000000a2', 'b0000000-0000-4000-8000-000000000001', 'Paciente Fluxo Local', '52998224725', 'paciente.fluxo@example.invalid', '31999990001', '31999990001', '1990-05-10', 'b0000000-0000-4000-8000-0000000000a1'),
  ('b0000000-0000-4000-8000-0000000000b2', 'b0000000-0000-4000-8000-000000000002', 'Paciente Isolado Local', '12345678909', 'paciente.isolado@example.invalid', '31999990002', '31999990002', '1985-08-20', 'b0000000-0000-4000-8000-0000000000b1')
on conflict (id) do update set nome = excluded.nome, email = excluded.email, telefone = excluded.telefone;

insert into public.procedimentos (id, clinica_id, dentista_id, nome, categoria, preco_padrao, duracao_minutos, ativo) values
  ('d0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-0000000000a1', 'Restauração em resina', 'Dentística', 280.00, 45, true),
  ('d0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-0000000000a1', 'Tratamento endodôntico', 'Endodontia', 950.00, 60, true),
  ('d0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-0000000000a1', 'Profilaxia', 'Prevenção', 180.00, 30, true),
  ('d0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-0000000000a1', 'Implante unitário', 'Implantodontia', 3200.00, 90, true),
  ('d0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-0000000000a1', 'Manutenção ortodôntica', 'Ortodontia', 220.00, 30, true)
on conflict (id) do update set nome = excluded.nome, preco_padrao = excluded.preco_padrao, ativo = true;

insert into public.agendamentos (id, clinica_id, paciente_id, dentista_id, data_hora, duracao_minutos, status, observacoes) values
  ('b0000000-0000-4000-8000-0000000000a3', 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-0000000000a2', 'b0000000-0000-4000-8000-0000000000a1', now() + interval '30 minutes', 45, 'scheduled', 'Consulta fictícia da auditoria'),
  ('b0000000-0000-4000-8000-0000000000b3', 'b0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-0000000000b2', 'b0000000-0000-4000-8000-0000000000b1', now() + interval '45 minutes', 30, 'scheduled', 'Consulta isolada da outra clínica')
on conflict (id) do update set data_hora = excluded.data_hora, status = 'scheduled', observacoes = excluded.observacoes;

commit;
