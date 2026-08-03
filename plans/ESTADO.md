# Estado — Odonto.IA

> **ESTADO** · atualizado 2026-08-03 16:00 · sessão #14
> **Item ativo:** R-46 (Meu dia) — fatia cockpit · **Modo:** nenhum (sessão encerrada)

## Agora

**O cockpit (C0-C5) está todo codado, testado ao vivo e commitado.** Nesta sessão: testei
C2/C3 (pendência da anterior) — funcionam; achei e corrigi 2 bugs reais no Registrar (Enter
não selecionava, boca-toda exigia "onde" que não existe); investiguei e corrigi um bug de
perda de dado real em produção (R-55 — procedimento repetido sumia do histórico); fechei C5
(seleção múltipla no odontograma); implementei o R-46c inteiro (colar histórico do Word,
migration incluída). **9 commits, working tree limpo, nada empurrado.**

### Os documentos que governam
- **Cockpit:** [Spec](specs/R-46-cockpit.md) (`aprovada`) · [Contrato](specs/R-46-cockpit-contrato.md) · [Artefato v2](artefatos/R-46-cockpit.html) (`aprovado`).
- **R-55:** [spec](specs/R-55-historico-sem-perda-de-dado.md) (`aprovada`, codada).
- **R-46c:** [spec](specs/R-46c-colar-do-word.md) (`aprovada`, codada — emendada 03/08 pros arquivos reais do cockpit).

### O que falta no R-46
- **C6** — layout novo que ele descreveu (tirar "Já feito", painel do dente abre na direita,
  fecha os blocos automaticamente). Só uma decisão fechada (fecha ao abrir o painel) —
  precisa de spec antes de codar.
- **R-46d** — campo mágico com IA. **Não é** "adiciona um botão organizar no R-46c" — é 1
  componente com responsabilidade completa (arquivo, voz, ou estruturar em procedimento).
  `CapturaLivreCard` (perfil) já faz os 3; a decisão de arquitetura é se ele migra pro Meu dia
  ou nasce um componente novo compartilhado. Ver `memory/project_campo_magico_unico.md`. Sem
  spec ainda.

## Travado

Nada tecnicamente. As decisões pendentes são de **prioridade**, não de bloqueio técnico.

## Esperando você

- [ ] **Decidir o push** — 9 commits prontos (cockpit C0-C5, R-55, pontual Registrar, R-48,
      R-46c + migration, docs). Nada foi testado em produção ainda.
- [ ] **Escrever a spec do R-46d** (campo mágico único) — decisão de arquitetura real: migrar
      `CapturaLivreCard` pro Meu dia, ou construir um componente novo compartilhado.
- [ ] **Escrever a spec do C6** (layout novo do cockpit).
- [ ] **Decidir a ordem:** C6, R-46d, ou a spec do bloco R-51-54 (modelo multi-sessão)?
- [ ] **R-56** — dois surfaces a mais (`fichasRecentes`, lista do `FichasTab`) vazam ficha sem
      checar `origem`, achado testando o R-46c hoje. Pequeno, não urgente.
- [ ] **R-49 A1** — a tabela de especialidade deve abrir sozinha? (66% dos endos vazios)
- [ ] Itens mais antigos: R-28 Parte 3 · gate de 2 contas · R-40 · R-44.

## Próximo da fila

Push do que está pronto, depois C6/R-46d/R-51-54 (todos precisam de spec antes de codar).
Fila completa no [ROADMAP](ROADMAP.md).
