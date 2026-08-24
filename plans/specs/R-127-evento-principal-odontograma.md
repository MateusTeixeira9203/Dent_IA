# R-127 — Evento principal do odontograma

> **SPEC** · aprovada para execução em 24/08/2026 · migration: zero

## Problema

O resumo do dente agrega todo o histórico, mas uma exodontia/esfoliação realizada ativa a
silhueta de ausência e encerra o desenho. Assim, um implante registrado depois não aparece.

## Contrato

- O histórico e todos os eventos permanecem armazenados e visíveis.
- Por dente, o evento mais recente comanda apenas o estado estrutural de ausência.
- Exodontia ou esfoliação realizada mais recente: desenha dente ausente.
- Qualquer evento posterior: deixa de desenhar a ausência e permite o símbolo atual aparecer.
- Evento novo no rascunho vence o histórico persistido; edição com o mesmo id substitui a
  versão persistida.
- Entre eventos salvos, `created_at` define a ordem; `registrado_em` e posição são fallback.

## Gates

- Ausente antigo + implante posterior: odontograma mostra implante.
- Implante antigo + exodontia realizada posterior: odontograma mostra ausência.
- Implantar no rascunho sobre ausência persistida atualiza a tela antes de salvar.
- Remover o rascunho restaura o estado persistido.
- Nenhum registro é apagado ou alterado no banco.
