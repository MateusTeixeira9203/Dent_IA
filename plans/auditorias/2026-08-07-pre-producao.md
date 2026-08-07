# Auditoria — pré-produção (ficha · Meu dia · Dex)

> **AUDITORIA** · ficha núcleo + Meu dia + Dex · 2026-08-07
> **Ambiente:** localhost + conta de teste (Dr. teste, Clindent) · **Navegador:** Brave +
> extensão Claude in Chrome (pane própria não foi usada — histórico de travamento)
> **Motivo:** decisão de subir ~35 commits represados (R-59, R-64, R-57, orçamento por-ficha,
> excluir paciente, e todo o backlog do cockpit Meu dia) pra produção

## Veredito

**Sem achado crítico ou alto.** Os três caminhos de maior risco — dinheiro (orçamento
por-ficha), perda de dado (Organizar com Dex) e exclusão permanente (excluir paciente) —
seguraram sob dado real e denso, incluindo uma chamada de IA de verdade. O backlog inteiro do
Meu dia (nunca em produção até hoje) renderizou e funcionou ponta a ponta, em light e dark.
2 achados baixos (cosmético/edge case), nenhum novo bloqueio. Os gaps que restam já eram
conhecidos antes desta rodada (gate de 2 contas, gates de motion) — não são descobertas de
hoje.

## Achados

| # | Severidade | Onde | O que acontece | Como reproduzir |
|---|---|---|---|---|
| 1 | baixo | `src/app/not-found.tsx:29`, `src/app/error.tsx` (mesmo padrão) | `<Button render={<Link .../>}>` sem `nativeButton={false}` — Base UI avisa no console que o botão perde semântica nativa (a11y/forms). Só warning de dev, não quebra nada visível | Navegar pra uma rota inexistente, abrir o console |
| 2 | baixo | Agenda (`/dashboard/agendamentos`), views Dia/Semana | Agendamento criado antes das 07h (ex.: encaixe "atender agora" de madrugada) não aparece na grade — o scroll não vai acima das 07h. O agendamento existe (contador "1 consulta" confirma), só fica inalcançável nessa tela | Criar encaixe com o relógio do sistema antes das 07h, abrir Agenda → Dia |

**Consolidado em 1 item de roadmap** (ambos baixo, por padrão da auditoria).

## Confirmações positivas (não promovem 🟡→✅ — nada disso está em produção ainda, mas fecham lacunas de teste que estavam em aberto)

- **R-47 (Organizar com Dex apagava dado)** — ROADMAP pedia "falta teste ao vivo". Feito: no
  paciente `marcos` (ficha real com 21 registros/14 procedimentos), rodei uma extração de IA
  de verdade a partir de texto livre ("dor no dente 26... restauração composta..."). O Dex
  identificou dente 26, tipo restauração, status feito — e **nenhum dos 21 registros
  existentes mudou ou sumiu**, antes ou depois de salvar. Testado 2×, com reload pra confirmar
  persistência real (não só otimismo de tela).
- **Orçamento por-ficha (R-59)** — reconfirmado com o caso mais denso que existe no banco de
  teste: ficha de 21 registros (14 procedimentos distintos, faces agrupadas corretamente) →
  "Gerar orçamento" trouxe exatamente os 14 itens dela, R$ 5.150,00, zero contaminação de
  outra ficha/evolução do mesmo paciente.
- **Excluir paciente** — modal, cascade e trava por nome reconferidos visualmente (não cliquei
  o excluir de verdade em cima do `marcos`, que tem histórico real de teste). Código
  (`excluir-paciente.ts`) revisado: filtra por `clinica_id` além da RLS, e confere
  `.select().length` pra não mentir em caso de bloqueio silencioso da RLS — mesmo padrão que o
  projeto já aprendeu à força em sessões anteriores.
- **Sidebar "Meu dia"** — a 2ª correção (`whitespace-nowrap`) está confirmada visualmente.
  "MEU DIA" renderiza lado a lado, não quebra em 2 linhas. Item sai do "esperando você".
- **Cockpit inteiro do Meu dia** (rail, campo mágico, histórico, a fazer, odontograma, status,
  observação, salvar) — nunca esteve em produção (27+ commits represados) e rodou ponta a
  ponta sem erro: criar encaixe → registrar via campo mágico → Dex organiza → salvar → persiste
  → aparece na ficha → deletar limpo. Dark mode consistente em toda a tela, sem cor hardcoded
  vazando.
- **`/consulta` continua alcançável de propósito** — cliquei "Iniciar consulta" no rail e caí
  na rota antiga. **Não é regressão**: a spec do R-46 (§5) documenta 3 fases de aposentadoria
  e hoje estamos na Fase 1, onde `/consulta` convive com o Meu dia até a pergunta em aberto A1
  (Dex escala pra cirurgia de 40min?) ser respondida. Vale saber antes de subir: a
  aposentadoria **não** é parte deste lote.

## Não verificado

> Por honestidade, não por esquecimento — nada abaixo teve tempo/recurso nesta rodada.

- **Voz real** (microfone) — G10 do R-62, teste de voz do R-50 (orto pelo Dex). Precisa de
  hardware que esta sessão não tem.
- **`prefers-reduced-motion`** (G10 do R-62/R-63) — gate humano, sem como emular no ambiente.
- **2 contas logadas simultâneas** (RLS cruzando dentista/clínica ao vivo) — Claude não
  autentica por regra do projeto. Usei leitura de código como proxy parcial em
  `excluir-paciente.ts` e `get-meu-dia.ts` (ambos filtram por `clinica_id` corretamente), mas
  isso **não substitui** o teste de 2 contas que R-30/R-31a/R-41 já esperam há um tempo.
- **Rota protegida sem sessão** — confirmado só por leitura de `src/proxy.ts` (redirect pra
  `/login` quando `!session` em `/dashboard/**`), não por um teste ao vivo em aba anônima —
  evitei derrubar a sessão de teste compartilhada no meio da auditoria.
- **Mobile/responsivo** — tentei redimensionar o viewport pra 375px; a ferramenta reportou
  sucesso mas o conteúdo renderizado não refletiu o layout mobile. Não é conclusão de que
  funciona nem de que quebra — genuinamente não verificado.
- **Anexar documentos** (upload de arquivo real) e **"A fazer" → fazer hoje / encaminhar** —
  vistos na tela, não clicados (os 27 itens em "A fazer" são dado de teste rastreado entre
  sessões; evitei mutar sem necessidade).
- **Orto pelo Dex (R-50)** especificamente — testei o pipeline geral de extração (mesmo motor
  que R-50 usa), não o caminho de ortodontia em si.

## Nota de ambiente (não é achado de produto)

Duas requisições `503` transitórias (grade do "Marcar retorno" e criação do encaixe) — mesmo
padrão de "corrupção do dev server por excesso de Fast Refresh" já documentado em handoffs
anteriores. Ambas se resolveram sozinhas no request seguinte; o dado gravado conferiu certo
depois. Se voltar a acontecer com mais frequência, reiniciar o servidor dev é o contorno
conhecido.

**Resíduo de teste não limpo:** 1 encaixe do paciente `marcos` às 01:33 de hoje (07/08), sem
ficha associada (mostra "⚠ sem registro" no rail) — sobrou porque fica antes das 07h e a
Agenda não deixa alcançar pra cancelar (achado #2 acima). Baixo risco (mesmo paciente já tem
bastante dado de teste), mas fica registrado em vez de escondido.

## Cobertura

| Rota/área | Técnica | Visual | Papéis testados |
|---|---|---|---|
| `/dashboard/pacientes/[id]` (ficha núcleo) | Sim | Sim (light+dark) | Dentista (teste) |
| `/dashboard/meu-dia` (cockpit completo) | Sim | Sim (light+dark) | Dentista (teste) |
| Dex — Organizar com Dex (extração de IA) | Sim (chamada real) | — | Dentista (teste) |
| `/dashboard/agendamentos` | Parcial (só limpeza) | Não | Dentista (teste) |
| `/consulta/[id]` | Não (fora de escopo — Fase 1 intocada) | Não | — |
| Mobile / responsivo | Não | Não | — |
