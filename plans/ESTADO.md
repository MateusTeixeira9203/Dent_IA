# Estado — Odonto.IA

> **ESTADO** · atualizado 2026-08-03 01:54 · sessão #13
> **Item ativo:** R-46 (Meu dia) — fatia **cockpit** · **Modo:** nenhum (sessão encerrada)

## Agora

**C0, C1, C2 e C3 do cockpit estão codados** — typecheck, lint e build limpos. Ele testou
C0/C1 ao vivo e achou 3 bugs reais (largura/espaçamento do layout, scroll faltando em 3 dos
4 blocos, ordem obrigatória no registro passando por bug de "+dente"); os três foram
corrigidos na hora. **C2 e C3 ele ainda não testou.**

### Os 3 documentos que continuam governando
- **[Spec](specs/R-46-cockpit.md)** (`aprovada`) · **[Contrato](specs/R-46-cockpit-contrato.md)**
  · **[Artefato v2](artefatos/R-46-cockpit.html)** (`aprovado`).

### O que falta do contrato
- **C4** — campo mágico em tela cheia, só o container. Espera o **R-46c** (aprovação pendente).
- **C5** — múltipla seleção no odontograma (anel de seleção no `ToothSVG`).

### Novo nesta sessão — precisa de spec antes de codar
**R-51 a R-54** no `ROADMAP.md`, Bloco 1: modelo multi-sessão via `grupo_id` (sem 3º status) ·
encaminhar dentro do "A fazer" · orçamento a partir dos indicados em aberto do paciente ·
o bug real da ficha duplicada quando salva 2x no mesmo dia. **São interdependentes** — uma
spec só, não 4 soltas (R-53 depende de como R-51/R-52 definem "o que conta como pendente").

## Travado

Nada tecnicamente. C4 espera aprovação do R-46c (fora do meu controle). O bloco R-51-54
espera decisão dele sobre quando entrar na fila — a spec ainda não foi escrita, só a
investigação que a alimenta (2 workflows, ver handoff).

## Esperando você

- [ ] **Testar C2/C3** em localhost — rail arrastável, CTA "Salvar", painel do dente ao lado.
- [ ] **Commit** — 9 sessões no working tree agora.
- [ ] **Aprovar R-46c** (campo mágico completo, upload + organizar) — pendente desde 02/08.
- [ ] **Decidir a ordem:** C4/C5 do cockpit primeiro, ou a spec do bloco R-51-54?
- [ ] **`CLAUDE.md` desatualizado nos tokens** (`bg-card`/`text-foreground`/etc. têm 0-2 usos
      reais; a família certa é `bg-surface`/`text-text-primary`) — é um `/pontual`.
- [ ] **R-49 A1** — a tabela de especialidade deve abrir sozinha? (66% dos endos vazios)
- [ ] Itens mais antigos: R-28 Parte 3 · gate de 2 contas · R-40 · R-44.

## Próximo da fila

C4/C5 do cockpit, ou a spec do bloco R-51-54 (modelo clínico multi-sessão). Fila completa
no [ROADMAP](ROADMAP.md).
