# Estado — Odonto.IA

> **ESTADO** · atualizado **2026-07-30** (sessão da noite)
> **Item ativo:** nenhum · **Próximo:** commit das migrations → gate → commit do código
> Roadmap reorganizado hoje por **importância pro dentista**, não por dependência técnica.

## Agora

**A coisa mais urgente não é item de roadmap — é que o banco está à frente do repositório.**

| | Estado |
|---|---|
| Banco de produção | migrations **116–123** aplicadas (conferido objeto por objeto) |
| App em produção | commit **`f2804b8`**, de 29/07 — **anterior** às migrations 120 e 121 |
| Repositório local | 2 commits sem push + **63 arquivos sem commit** (32 de código, +1117/−447) |

As 8 migrations são arquivos **untracked** — existem só no notebook. E as 120/121 mudaram
RLS **ao vivo** sob código antigo: o Gabriel já enxerga os 54 orçamentos da Clindent agora,
sem ninguém ter conferido.

**Consequência prática:** o R-30 conserta um bug que ele está sentindo hoje (24 de 87 fichas
não salvam ao editar), e esse conserto está no working tree, sem commit, fora do ar.

## Travado

Nada travado por código. O gate depende de logins que só ele faz.

## Commit e push — decidido 30/07: **quando a clínica estiver livre**

Motivo dele: deploy no meio do expediente pega dentista com ficha aberta. Não é downtime,
é refresh no meio do formulário. **Nada de git até ele dar o sinal.**

Bug da ficha **confirmado como R-30** (ele descreveu: edita ficha pronta → odontograma novo
→ some registro). Já consertado no working tree, 7/7 gates. **A correção não está no ar.**

Plano pronto — typecheck da árvore inteira passou limpo (exit 0). Duas ondas:

| Onda | Commit | Arquivos |
|---|---|---|
| **1** | `chore(db)`: migrations 116–123 | os 8 `.sql` untracked (já aplicadas em prod) |
| **1** | `fix(ficha)`: fonte única de procedimento (R-30) — ⛔ **corrigir antes** (ver abaixo) | `salvar-ficha.ts` · `FichasTab.tsx` · `Odontograma.tsx` · `ToothDetailPanel.tsx` · `types/odontograma.ts` · `get-patient-workspace-data.ts` · `activity-log.ts` |
| **1** | `fix(pacientes)`: lista sem filtro por dentista (R-29) | `pacientes-list.tsx` |
| **1** | `fix(seguranca)`: itens do R-35 | auth/callback · calendar · perfil · configuracoes |
| **2** | `feat(orcamentos)`: plano de pagamento (R-34) | `orcamentos/actions.ts` · `financeiro/actions.ts` · os 2 modais · `orcamentos-client.tsx` |
| **2** | `chore(plans)`: specs, roadmap, artefato | `plans/**` |

`paciente-detail-client.tsx` tem R-30 **e** R-34 no mesmo arquivo — vai partido entre os dois
commits, é o único que precisa de `git add -p`.

### ✅ Regressão achada e corrigida 30/07

`fichaParaItens` lia **só** evento `indicado` — mas das 87 fichas, 82 têm texto (94%) e só
24 têm evento (28%). Subir assim tiraria o orçamento pré-preenchido de **58 fichas**.
Corrigido com `itensDoTexto` como fallback (evento primeiro, texto quando não há, nunca
somados). Cobertura volta a 82/87. Typecheck exit 0.

**Combinado: commit + push às 20h**, clínica vazia. Depois ele testa pelo
[roteiro](auditorias/2026-07-30-teste-pos-push.md) e volta com os problemas.

## Esperando você

- [ ] **Sinal de que a clínica esvaziou** (20h) → executo as duas ondas.
- [ ] **[Gate de 2 contas](auditorias/2026-07-30-gate-2-contas.md)** — pré-requisito da onda 2.
- [ ] **R-40: qual contrato?** Termo de consentimento (clínico) ou contrato de prestação
      (comercial). Muda o item inteiro.

## Investigações

[Mapa de atrito](auditorias/2026-07-30-mapa-de-atrito.md) ✅ fechado — achou a regressão
acima e 3 defeitos novos. **4 demandas novas** ainda rodando.

## Decisões de produto tomadas hoje

Ordem do roadmap = **importância pro dentista** (o concorrente é a tabelinha do Word) ·
odontograma geral é **só leitura**, escrita só pela ficha (R-42) · admin fica como está,
vira conta burocrática depois (R-36) · design do R-39 **aprovado** · editor de item do
orçamento vira **um campo** com sugestão de catálogo (R-39 §3).

**Correção registrada:** duplicata de paciente **não** vem de "banco não compartilhado" —
11 dos 14 grupos foram criados pelo mesmo dentista ([R-31a](specs/R-31a-paciente-unico-prevencao.md)).
A causa é não achar: busca sensível a acento e checagem só por CPF (226 de 238 não têm CPF).

## Pendências antigas ainda de pé

R-28 confirmar em prod · R-03c-1 dois cenários com login · numeração de migration (114-116
nunca existiram como arquivo) · limpar paciente de teste "Mateus" · `get_my_role` com
fallback sem casar clínica (virou R-43).
