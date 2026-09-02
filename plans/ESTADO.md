# Estado — Odonto.IA

> **ESTADO** · atualizado em 02/09/2026

## Agora

🔵 **R-145 — Orçamento financeiro flexível.** Implementação local em revisão; a decisão desta
sessão foi voltar ao fluxo leve: Next.js no localhost, sem depender de Supabase local/Docker.

**Feito**

- RPCs e actions para recebimento livre, reorganização de previsões, correção e estorno auditável.
- Modal do paciente e tela Financeiro usam o mesmo caminho transacional.
- 171/171 testes, TypeScript e `git diff --check` passaram; lint do recorte sem erros.
- Auditoria browser somente leitura percorreu Dashboard, Meu Dia, Prontuário, Ficha, Orçamentos,
  Financeiro, Pacientes, Agenda e Configurações sem erros de console.
- Next.js está ativo em `http://localhost:3200`, sem Docker.

**Falta**

- Provar as operações financeiras e demais gravações em um banco de homologação isolado.
- Repetir RLS com duas contas, assinatura/Storage, retorno, encaminhamento e fluxo Meu Dia → Ficha.
- Validar build com rede disponível; a tentativa anterior parou na resolução do Google Fonts.
- Decidir e executar commits separados de migration, feature e documentação; nenhum push foi feito.
- Auditoria funcional de 02/09 encontrou P0: `Agenda → Iniciar consulta` em agendamento futuro
  abriu o paciente errado no Meu Dia. O fluxo foi interrompido e não deve ser repetido em escrita
  até corrigir a resolução de `?ag=`.
- O retorno criado na Agenda não aparece na seção de retorno da Ficha; precisa corrigir o vínculo ou
  a revalidação antes do gate clínico.
- O orçamento de teste foi criado e aprovado. O recebimento de R$ 500 e a organização de parcelas
  ficaram presos em “Salvando…” por `supabase.rpc` chamado sem contexto (`reading 'rest'`). A correção
  (`bind(supabase)`) está no commit `b791a54`, mas a revalidação manual ainda precisa ser feita.

## Travado

- O `.env.local` aponta para o Supabase remoto `zenfemoxvwerplrjgfqz`; não executar gravações,
  pagamentos, estornos ou exclusões nesse ambiente sem confirmar que é homologação.
- Supabase local via Docker é inviável neste PC por consumo de RAM e não será usado no ciclo diário.

## Esperando você

- Disponibilizar/confirmar um projeto Supabase de homologação separado da produção antes do teste
  transacional completo.

## Próximo da fila

Corrigir os achados P0/P1 da auditoria (`plans/auditorias/2026-09-02-sistema-completo.md`), repetir
o fluxo clínico sem cruzamento de paciente e então concluir o gate transacional do R-145.
