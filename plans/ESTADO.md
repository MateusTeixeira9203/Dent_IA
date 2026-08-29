# Estado — Odonto.IA

> **ESTADO** · atualizado em 29/08/2026

## Agora

🟡 **Lote R-139a–e está no ar, aguardando validação manual em produção.** Não há item de
implementação ativo enquanto a rodada de teste não devolver achados.

- Produção: `https://www.odontoia.app/login`. O deployment do código (`953f9bc`) está `Ready` no
  Vercel; CI remoto passou typecheck, testes e build. Lint continua não bloqueante e tem dívida
  técnica registrada.
- R-139a remove/restaura procedimento sem apagar histórico; R-139b exibe `I` em anteriores sem
  mudar `O` persistido; R-139c não sobrescreve status do Dex; R-139d/e adiciona visualizador de
  radiografias/fotos em Arquivos e Apresentação.
- Login agora recarrega a aplicação após a sessão Supabase ser gravada. A rota pública respondeu
  `200`, mas o fluxo autenticado ainda não foi exercitado por uma pessoa.
- O visualizador cobre fotos e radiografias. PDF/Word continuam fora de escopo até haver decisão
  explícita de viewer paginado.

## Travado

Nada travado. A próxima ação é validação humana, não código.

## Esperando você

1. Testar login e Dashboard em produção.
2. Testar R-139a (remover/restaurar + orçamento), R-139b (I no odontograma/histórico/PDF) e
   R-139c com uma fala que misture procedimento realizado e indicado.
3. Testar zoom, pan, rotação, filtros e anotações do R-139d/e na Ficha e na Apresentação.
4. Decidir se “editar procedimento” na revisão do Dex significa trocar o tipo clínico ou editar
   um nome comercial; isso abre item próprio, sem código até a decisão.

## Próximo da fila

Após a rodada de produção, validar itens 🟡 e abrir os achados; depois, Intro PWA, auditoria da
Agenda R-138 e R-133 conforme `plans/ROADMAP.md`.
