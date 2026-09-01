# Estado — Odonto.IA

> **ESTADO** · atualizado em 01/09/2026

## Agora

🔵 **R-140c — Prontuário longitudinal implementado offline.** Artefato v7 e revisão 2 aprovados.
Branch local `codex/r140c-prontuario-vm-20260831`, sem push, deploy ou migration remota.

**Feito**

- Superfície única para timeline, registro, tratamento e editor; novo/editar/complementar separados.
- Edição preenchida, volta com contexto, destino exato pelo odontograma e breadcrumb explícito.
- Fallback legado sem duplicação; status/Próxima sessão canônicos; “Planejado para hoje” no Meu Dia.
- Assinatura exposta até Arquivos e exportação agrupada por Atendimento preservando seção por Ficha.
- 164/164 testes, TypeScript, build e `git diff --check` passaram; arquivos tocados estão limpos no lint.
- Paginação real/500 Atendimentos foi deferida formalmente ao R-129; não é gate aprovado da R-140c.

**Falta provar no PC/local navegador**

1. Dente → registro/tratamento, edição/complemento/volta e odontograma inteiro em 375/768/1440 px.
2. Assinatura → Storage → documento congelado → Arquivos, inclusive visita com duas Fichas.
3. Retorno único ligado ao Atendimento e reabertura na Agenda; depende dos objetos da `110000`.
4. Encaminhamento e log atômicos com dois dentistas; depende da `111000`, ainda somente local.
5. RLS com duas clínicas e perfis dentista/admin/secretária; legado, anexos, PDF, light/dark e teclado.

## Restrições do teste local

- Localhost pode usar Supabase de produção somente com clínica, contas e paciente sintéticos de teste.
- Sem `service_role`, dados clínicos reais, pagamentos ou integrações externas.
- Não executar `repair`: objetos da `20260831110000` existem no remoto sem histórico correspondente.
- Ausência da `20260831111000` bloqueia a prova da auditoria atômica do encaminhamento.
- Nenhum push, deploy, Vercel ou publicação antes da revisão e dos gates acima.

## Bloqueios conhecidos

- `supabase db reset` não reproduz produção: migrations históricas `001`/`007` estão fora de ordem.
- Lint geral mantém baseline preexistente de 14 erros/65 warnings fora dos arquivos desta execução.
- Produção não recebe a R-140c enquanto os gates funcionais, RLS e build não passarem.

## Próximo

Testar a R-140c no PC com dados sintéticos. Performance/paginação segue no R-129; R-144 e R-140d
permanecem posteriores e fora desta execução.
