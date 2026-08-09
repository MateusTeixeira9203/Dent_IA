# Auditoria — Bloco 1 (parcial), a pedido dele

> **AUDITORIA** · Meu dia / ficha / orçamento, dentro da clínica **Teste01** · 2026-08-08
> **Ambiente:** produção (`dentia.app.br`), escrita confinada à clínica de teste · **Rotas
> tocadas:** 5 de 27 páginas + 1 de 34 endpoints (ver Cobertura) · **Fluxos:** 3

## Por que esta auditoria rodou

Ele disse "tem muita coisa já codada e em prod que tá amarelo, acredito que pode subir tudo
pra concluído". Antes de aceitar isso: os 🟡 do roadmap têm motivos muito diferentes entre si
(gate técnico pendente, feature incompleta, ou "ele não testou") — não dá pra tratar como uma
categoria só. Ele pediu pra rodar `/auditar completa` em vez de resolver por memória de
nenhum dos dois lados.

## Veredito

**Não dá pra subir tudo.** Nos primeiros 20 minutos de sweep, achei 2 críticos novos que
nenhuma sessão anterior tinha pego — um deles (R-85) significa que o fluxo mais recente de
orçamento pode cobrar o paciente sem nenhum registro clínico correspondente. O que testei do
R-83/R-58/tema claro se comportou bem; o resto do Bloco 1 (uns 20 itens) não foi tocado —
escopo parcial por tempo de sessão, não por não ter achado nada.

## Achados

Severidade: **crítico** (vaza dado / perde dado / bloqueia uso) · **alto** (fluxo principal
quebrado) · **médio** (atrito ou inconsistência visível) · **baixo** (polimento).

| # | Severidade | Onde | O que acontece | Como reproduzir |
|---|---|---|---|---|
| 1 | **Crítico** | Meu dia → Gerar orçamento (R-83) | Orçamento nasce com `ficha_id=null` e item com `dente=null` — zero linha em `fichas`/`odontograma_eventos`. Procedimento cobrado nunca existe como registro clínico | Encaixe de paciente novo → clicar face de um dente (vira "Planejado") → **Gerar orçamento** → Criar Orçamento, **sem clicar Salvar antes**. Confirmado por SQL: orçamento `ec60babb-b4b9-4661-a9eb-05e42b78385d` |
| 2 | **Crítico/incerto** | Meu dia → Salvar e passar (R-76) | Numa tentativa, `POST /dashboard/meu-dia` voltou **503**; nem essa nem a tentativa seguinte gravaram nada (ficha, status do agendamento, observação digitada) — tela não mostrou erro nenhuma vez | Encaixe → digitar observação + trocar status → Salvar e passar. Confirmado por rede (503) + SQL (`agendamentos.observacoes` nunca mudou, `fichas` vazio). Não isolei se é bug de código ou flakiness — o mesmo 503 apareceu em 2 outras rotas na sessão |
| 3 | **Médio** | Toda navegação (dashboard, orçamentos, pacientes, ficha do paciente) | Erro de hidratação React (minified #418) no console, mesmo chunk, em toda troca de rota | Navegar entre `/dashboard`, `/dashboard/orcamentos`, `/dashboard/pacientes`, `/dashboard/pacientes/[id]` — reproduzido 5× seguidas |
| 4 | **Baixo** | Layout do Meu dia, viewport ~1536px | Scroll horizontal aparece ao interagir com o painel de detalhe do dente (conteúdo à esquerda corta) | Abrir painel de um dente com a janela em ~1536px de largura, interagir — a página desliza pro lado |

## Promoções 🟡 → ✅

Não vieram da auditoria técnica (que não alcança upload de arquivo real nem voz) — vieram da
confirmação pessoal dele, feita nesta mesma sessão, em resposta direta e específica:

| Item | Como foi verificado |
|---|---|
| R-82 | Ele confirmou ter testado o cenário exato (documento real anexado + "Nesta ficha" populado) |
| R-75 | Ele confirmou upload real de documento de histórico na UI |
| R-62 | Ele confirmou comando de voz real (G10/I4) |

## Não verificado

Honestidade sobre o que ficou de fora, não cobertura forçada:

- **Resto do Bloco 1** (~20 itens: R-46h, R-49, R-50, R-51, R-53, R-55, R-57, R-58 completo,
  R-59, R-61, R-63, R-64, R-30, R-31a, R-29, R-41, R-77, R-80) — não tocados nesta passada.
- **Gate de 2 contas** (R-29/R-30/R-31a/R-32/R-34/R-39/R-03c) — precisa das contas reais
  Paula/Renato/Gabriel/secretária (`plans/auditorias/2026-07-30-gate-2-contas.md`, parado há
  9 dias). Login com senha é dele, não meu — regra do projeto.
- **Mobile e responsivo** — Claude in Chrome controla o Brave real do desktop, sem resize de
  viewport disponível nessa ferramenta.
- **Sessão anônima / rota protegida sem login** — teria exigido logout da sessão autenticada
  atual, com risco de não conseguir voltar a logar (não posso digitar senha). Pulado por
  segurança da própria sessão de trabalho.
- **Bloco 2, 3, 4** (financeiro, assinatura, fundação) — fora do escopo desta passada.

## Cobertura

| Rota | Técnica | Visual | Papéis testados |
|---|---|---|---|
| `/dashboard` | ✓ (achou #418) | parcial (dark) | dentista (Teste01) |
| `/dashboard/meu-dia` | ✓ (achou R-85, R-86) | dark + light | dentista (Teste01) |
| `/dashboard/orcamentos` | ✓ (achou #418) | dark | dentista (Teste01) |
| `/dashboard/pacientes` | ✓ (achou #418) | dark | dentista (Teste01) |
| `/dashboard/pacientes/[id]` | ✓ (achou #418) | dark + light | dentista (Teste01) |
| Demais 22 páginas + 34 endpoints | não visitado | não visitado | — |
