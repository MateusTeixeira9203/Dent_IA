# Estado — Odonto.IA

> **ESTADO** · atualizado 2026-08-08 01:00 (sessão #28) · **Item ativo:** nenhum · **Modo:**
> nenhum (sessão encerrada)

## Agora

**5 commits nesta sessão** (`366cd64`..`bf070a9`): R-46h (botão de orçamento no Meu dia),
R-76 (Salvar e passar), R-77 (Histórico scroll + observação expansível) e R-80 (fix de
segurança — orçamento não pode mais puxar procedimento de outro dentista). Todos **codados,
commitados e verificados por mim no Brave** (cliques reais, escrita conferida no banco onde
coube) — mas isso não substitui ele testar. Ficam 🟡, não ✅, até ele confirmar pessoalmente.

**R-78 (Meu dia orientado a fluxo) — spec aprovada e artefato aprovado por ele**
("exatamente como o artefato", `plans/artefatos/R-78-meu-dia-fluxo.html`). Redesign das 3
zonas: odontograma vira espelho, lista única "Nesta ficha" com status clicável, perfil do
dente como ocupante da direita (espelho ⇄ perfil), "A fazer" e Histórico viram gaveta. Zero
código ainda — **é o próximo item de execução**, ele já confirmou.

**R-79 (audit trail de edição de ficha) e R-81 (assistente registra pelo dentista)** —
achados durante o debate do R-78, foram pro ROADMAP sem spec.

## Travado

Nada travado.

## Esperando você

- [ ] **Testar pessoalmente R-46h/R-76/R-77/R-80** no Meu dia — os 2 pontos de entrada do
      orçamento, o avanço automático pro próximo paciente ao salvar, o scroll+observação do
      Histórico, e confirmar que não aparece mais botão de orçamento em ficha de colega.
- [ ] **Decidir a ordem: R-78 antes ou depois do R-81?** Se a assistente vai operar essa tela
      sem ser dentista (R-81), isso muda o que "fica confuso" significa pro R-78 — vale
      decidir antes de eu começar a codar o redesign, não descobrir no meio.
- [ ] **Testar upload de documento real (R-75, sessão anterior)** — segue pendente desde
      07/08, arquivos intocados nesta sessão.
- [ ] **"Salvar e marcar como concluído"** — comentário dele em sessão anterior, não virou
      item ainda.
- [ ] **Etapas 'plano'/'procedimentos'/'sucesso' do onboarding** — ficaram inalcançáveis
      desde que o passo demo saiu (sessão #27). Não tocado.
- [ ] R-71 (2 achados restantes — nativeButton warning, Agenda com janela de hora fixa) segue
      na fila.

## Próximo da fila

**R-78** — spec aprovada, artefato aprovado, ele já confirmou que é o próximo a executar.
