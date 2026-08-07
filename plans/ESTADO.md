# Estado — Odonto.IA

> **ESTADO** · atualizado 2026-08-07 (sessão #25) · **Item ativo:** nenhum · **Modo:** nenhum
> (sessão em andamento, sem item ativo formal)

## Agora

**Push feito 07/08.** 37 commits (30 represados + 7 desta sessão) em `main`, deploy Vercel
disparado automaticamente (`dpl_Fk6GScfk...`, commit `ee0b4dd`). Organizados em 7 commits por
área — o cockpit inteiro do Meu dia (R-46/50/53/57/58/61/62/63) virou 1 commit só, sem como
separar por item depois de semanas em camada sobre os mesmos arquivos sem commit incremental.
Typecheck e build limpos antes de subir. **Migration do R-64 (`072_horarios_almoco`) está
aplicada em produção mas não tem arquivo local em `supabase/migrations/`** — foi feita via
editor SQL do dashboard. Vale backfillar o arquivo pra não perder o histórico.

**Auditoria pré-produção rodada 07/08** (ficha núcleo + Meu dia + Dex) —
[relatório completo](auditorias/2026-08-07-pre-producao.md). **Sem achado crítico ou alto.**
R-47 (Organizar com Dex apagava dado) e orçamento por-ficha reconfirmados com dado real denso
e chamada de IA de verdade — zero perda, zero vazamento. Cockpit inteiro do Meu dia (nunca em
produção) rodou ponta a ponta, light e dark, sem quebrar. 2 achados baixos viraram **R-71**
(warning Base UI em `not-found.tsx`/`error.tsx` + Agenda não rola acima das 07h). **Sidebar
"Meu dia" confirmada visualmente** — `whitespace-nowrap` renderiza certo, sai da lista de
pendências.

**Fechados, todos os gates confirmados ao vivo, falta só o push:** R-59, R-64, R-57 (F1+F2
confirmadas, F3 cortada — ele descartou em vez de escolher entre alfabético×frequência).
Orçamento por-ficha e excluir paciente também confirmados ao vivo no navegador dele (14
procedimentos → 14 itens, zero vazamento; excluir com cascade + log conferidos no banco).

**R-31b cortado** — limpeza dos 16 grupos duplicados não vira item de roadmap; a ferramenta
(`excluirPaciente`) fica disponível se algum dia for retomado.

## Travado

Nada travado. A pane do Claude_Browser não foi nem tentada hoje — fui direto de Brave +
extensão Claude in Chrome (funcionou de novo, sem travar, confirma o padrão da sessão
passada). Esse é o caminho a abrir primeiro sempre que precisar de prova visual.

## Esperando você

- [ ] **Comparação do artefato R-01 vs. implementação real (fim de semana, decisão dele).**
      Achado principal: o banner "Organizado com Dex" (relato original + "N registros/M
      especialidades", permanente na ficha salva) nunca foi implementado fora do `/consulta`
      antigo — `fichas.transcricao` existe no schema mas não é lido nem escrito em lugar
      nenhum do código atual. Segundo achado, menor: o modal de assinatura ficou mais simples
      que o artefato (sem lista de revisão nem texto-guia no canvas). Ele quer discutir antes
      de decidir se vira item de roadmap.
- [ ] **Backfill do arquivo de migration do R-64** (`072_horarios_almoco`) — aplicada em prod,
      sem arquivo em `supabase/migrations/`.
- [ ] **R-70 (congelado)** — ficha com muitos procedimentos difícil de editar. Precisa saber
      se o feedback real dos dentistas é "muitos procedimentos numa consulta" (empurra pro
      Organizar com Dex) ou "tela ruim mesmo com poucos" (aí um scroll interno resolve).
- [ ] **Status do orçamento vira só quitado/pendente** — tema levantado 06/08, ainda sem
      item de roadmap.
- [ ] **4 achados menores da auditoria do R-64** nunca viraram item de roadmap (mistura
      client/server em `disponibilidade.ts`, grade da secretária mostrando disponibilidade
      enganosa, `Map` engolindo duplicata silenciosa, `semanaInicioISO` sem validar domingo).
- [ ] **G10 do R-63/R-62** (`prefers-reduced-motion`, voz real) — gates humanos, sem como
      emular.
- [ ] **Gate de 2 contas** (R-30, R-31a, R-41) — pendente de sempre, não é achado novo.
- [ ] Antigos, sem urgência: apagar dado de teste do "marcos" (agora com +1 encaixe de teste
      às 01:33 de hoje, sem ficha, inalcançável na Agenda — ver R-71) · motion do C7 no olho ·
      R-51 · R-60 · G3 do R-53 · R-40 · R-44.

## Próximo da fila

Ele decide: escolher o próximo entre {R-49, R-56, R-67}. Fila completa no
[ROADMAP](ROADMAP.md).
