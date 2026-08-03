-- R-46c — histórico transcrito do Word (nível 1, sem IA — D7). Só relaxa a constraint pra
-- aceitar o 3º valor de origem; nenhuma linha existente usa 'importado'. Reversível: o
-- drop/add inverso volta ao estado anterior.
alter table fichas drop constraint fichas_origem_check;
alter table fichas add constraint fichas_origem_check
  check (origem in ('modo_consulta', 'manual', 'importado'));
