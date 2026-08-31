# Estado — Odonto.IA

> **ESTADO** · atualizado em 31/08/2026

## Agora

🔵 **R-140 — Atendimento e Meu Dia seguem somente em validação local.** A transferência para a
VM usa a branch `codex/r140-local-20260831`, sem alterar `main`/produção.

- R-140a: schema, RLS, dual-write e backfill foram validados no Supabase local descartável
  (matriz 92/92). Nada foi aplicado em produção.
- R-140b: manual e Dex gravam a mesma visita; salvar limpa o rascunho e passa ao próximo paciente.
  Uma âncora finalizada bloqueia apenas o respectivo `agendamento_id`; novo encaixe do mesmo
  paciente continua editável. Etiquetas continuam somente prévia visual de R-140d.
- Prova local: encaixe sintético salvou `Restauração O · D15`, âncora/evolução/evento ficaram
  íntegros e o prontuário exibiu o registro. `tsc --noEmit`, `git diff --check` e 154/154 testes
  passaram. A conferência manual final dos dois slots no rail ainda falta.

## Travado

- Produção: as migrations R-140/R-142 não existem lá; publicar o código em `main` quebraria o
  Meu Dia ao consultar `atendimentos_clinicos`. Primeiro precisa de homologação, migrations isoladas
  e gate clínico Dex (R-139c/R-133/R-143).
- `next build --webpack` falha neste ambiente ao interpretar `tsc --showConfig`, embora `tsc` passe.
- `supabase db reset` local falha pela ordem histórica de migrations; o teste usou dump de schema.

## Esperando você

1. Na VM, conferir o cartão finalizado (`✓ registrado`, leitura) e o encaixe aguardando do mesmo
   paciente (editável, sem selo).
2. Decidir o próximo artefato após isso: R-140c (Ficha longitudinal) ou continuar o pacote Dex P0.

## Próximo da fila

R-140c só entra após a prova manual; publicação segue a ordem clínica do ROADMAP.
