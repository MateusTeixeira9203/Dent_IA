# Roadmap — Odonto.IA

> **ROADMAP** · **Odonto.IA** · atualizado 2026-07-24
> **Ativo:** R-21 (registros por dente — spec escrita, **aguardando aprovação do Mateus**) ·
> **Fila:** 16 · **Concluídos:** 3 · **Congelados:** 0 · **Committado, aguardando deploy (9 commits à
> frente do origin):** R-16, R-17, R-18, R-04, R-02 (+ fix do pino), R-20 (validado ao vivo)

> Reconstruído do zero em 2026-07-21 por decisão do Mateus. O histórico anterior está no
> git (`git show 4a93234:plans/roadmap/roadmap-mestre-2026-07-21.md`) e na pasta
> `Desktop/roadmap,spec, handofs antigos/` — consulta, não operação.

**Status:** ⏳ fila · 🔵 ativo (máx 1) · 🟡 no ar não verificado · ✅ no ar e verificado ·
🧊 congelado · ✂️ cortado. **Código escrito ≠ código verificado** — 🟡 se trata como não-feito.

## Agora

**Verificação ao vivo (Mateus, 24-25/07, desktop + mobile):** R-16, R-17, R-18, R-04 Fase 3 e
R-02 Fase 1 rodam certo nos dois dispositivos — Mateus autorizou marcar como 100%. Ficam ✅ na
essência, mas **falta commit + deploy** (código local, não commitado): promoção formal a "no ar" +
fechamento (mover spec/artefato pro _arquivo) acontece junto do deploy no fim da sessão. QA completo
multi-dispositivo (desktop/mobile/tablet, claro/escuro) fica como passo futuro — há muita correção
pela frente. **Ativo agora:** R-02 Fase 3 — o Mateus pediu ligar o auto-reaproveitamento de
`grupo_id`, o que **reabre a Decisão 2 da spec** (que tinha deixado só a leitura). Ver `plans/ESTADO.md`.

## Fila

Ordem = prioridade. Só entra item com objetivo claro em uma linha.
Peso: **P** (uma sessão) · **M** (2–3 sessões) · **G** (precisa quebrar).

> **Regra de produto (21/07):** *toda especialidade precisa de entrada manual, não só por voz.*
> Se o dentista não ditar, ou se a IA errar, tem que haver caminho pra lançar e corrigir na mão.
> Vale para os itens R-05 a R-08.

> A ordem abaixo é **provisória** — o Mateus revisa depois de ler o R-01 e de trazer o material
> de base de cada especialidade (previsto para 22/07). Nada aqui é especulação: todo item saiu
> de achado verificado no código em 21/07.

> **Visão do modo consulta (cockpit) — 22/07:** a reformulação virou o item **R-15**, e a sessão
> fixou a cadeia de dependência que ordena boa parte da fila:
> **R-01 (id estável) → R-02 (odontograma · grupo · card) → plugins → R-15 (cockpit)** — o cockpit
> não sobe antes das fundações. Visão e decisões (raio-x sem IA, etapas derivadas, orçamento por
> trabalho — adiado) na [spec R-15](specs/R-15-modo-consulta-cockpit.md).

| ID | Item | Objetivo | Peso |
|---|---|---|---|
| R-21 | 🔵 Registros agrupados por dente | A lista vira **dentes colapsáveis** (ordem 11→48; dente solo mostra direto, 2+ colapsa): clica → abre os procedimentos com status → clica fecha; tabela de especialidade dentro do dente aberto; clicar o dente no odontograma abre o grupo. Camada nova `agruparPorDente` por cima do que já existe (não toca `agruparRegistros`). **Validado com dentista.** [spec](specs/R-21-registros-por-dente.md) **aprovada** (25/07), 3 fases. Próximo: mockup → execução. | M |
| R-20 | ✅ Redesenho da ficha odontograma — codado, validado ao vivo, **committado** (22db484); falta deploy | **Só a ficha**: layout responsivo lado-a-lado (odontograma sempre visível + detalhe) com `@container`; tabela de especialidade full-width abaixo; destaque do registro ao clicar o dente (Site A e B). Componente `OdontogramaComPainel`. Modo consulta reusa depois. [spec](specs/R-20-ficha-odontograma-redesign.md) | M |
| R-17 | ✅ `EncaminharBar` colide com o dock de navegação (desktop) | Não era z-order, era **posição**: `EncaminharBar` e o dock miram o mesmo centro-inferior. Fix 24/07: `bottom-0 md:bottom-28` + `createPortal` pro body (escapa de ancestral com transform) + `z-[60]`. **Verificado ao vivo por Mateus 24-25/07 (desktop+mobile); falta commit+deploy.** Achado: [auditoria 24/07](auditorias/2026-07-24-ficha-odontograma.md) | P |
| R-18 | ✅ Filtro por responsável trava em tela vazia após desfazer encaminhamento | Fix aplicado 24/07: `filtroAindaValido()` (nova, 4 testes) reseta o filtro pra "Todos" quando o responsável selecionado deixa de existir. **Verificado ao vivo por Mateus 24-25/07 (desktop+mobile); falta commit+deploy.** Achado: [auditoria 24/07](auditorias/2026-07-24-ficha-odontograma.md) | P |
| R-19 | ⏳ Barras contextuais colidem com o dock inferior-central (sistêmico) | Mateus viu ao vivo (24/07): não é só a `EncaminharBar` (R-17). O dock (`floating-dock`, centro-inferior, só `/dashboard/*` desktop) é âncora fixa e qualquer barra que mire o mesmo lugar o atropela. Confirmado: `voice-ux` (gravação) tem a mesma causa — MAS ela aparece na ficha (com dock) E na consulta (sem dock), então o fix dela é contexto-dependente, não a mesma classe do R-17. Precisa de uma **convenção** (dock some quando há barra contextual, ou wrapper que sabe da zona do dock) pra não recriar o bug a cada barra nova. Design decision | M |
| R-02 | ✅ Ficha viva + fidelidade — codada e **committada** (Fases 0-3), falta deploy | Símbolos do odontograma (+ fix do pino), card único (I1/I2), ordenação abertos-primeiro, e amarração de `grupo_id` na criação **COM confirmação** (Fase 3, Decisão 2 resolvida 25/07). Fases 1/2 validadas ao vivo; **Fase 3 (modal) 🟡 não vista na tela**. Committado (5693dbe). [spec](specs/R-02-ficha-viva-fidelidade-artefato.md) | M |
| R-16 | ✅ Filtro por responsável na ficha | Chips Meus/Todos/[por dentista] sobre `encaminhado_para ?? dentista_id`, 14 testes. **Verificado ao vivo por Mateus 24-25/07 (desktop+mobile); falta commit+deploy.** [spec](specs/R-16-filtro-responsavel-ficha.md) | P |
| R-03 | ⏳ Assinatura e data por procedimento | O paciente assina o que foi feito, registro a registro; registro assinado congela e o resto da ficha segue editável | M |
| R-04b | ⏳ Encaminhamento: destino edita detalhe clínico do endo/implante | Hoje (R-04) o destino só marca realizado; aqui ele também preenche a tabela de canais/implante do que recebeu — RPC própria + `EndoForm`/`ImplanteForm` editável fora do fluxo do autor | P |
| R-05 | ⏳ Ortodontia: lançamento e edição manual | `OrtoForm` existe e **nunca é renderizado** — hoje só a voz cria manutenção e não há como corrigir. Registro de arcada, não de dente | P |
| R-07 | ⏳ Procedimentos de rotina sem dono | `profilaxia`, `raspagem`, `clareamento`, `fluor`, `exame_periodontal` entraram no banco na migration 106 e não existem em plugin, chip nem enum da IA — "fiz profilaxia" não vira registro | M |
| R-06 | ⏳ Prótese fixa e odontopediatria completas | `ponte` e `esfoliacao` estão barradas no enum da IA e ausentes dos chips; faltam os símbolos (colchete pilar-pôntico, seta do permanente) | M |
| R-09 | ⏳ Voz nas especialidades (pass 2) | `/api/dex/extrair-especialidade` não tem um único chamador — endo e implante são 100% digitados. Começar pela endo | M |
| R-08 | ⏳ Periodontia: periograma | Tela própria (6 sítios × 32 dentes), tabela `perio_exames` — hoje só existe a declaração no registry. NIC calculado, nunca digitado | G |
| R-10 | ⏳ Rótulo do procedimento no orçamento e no PDF | `derivarV2DosEventos` gera "Extração - planejado (resto radicular)" — jargão interno e observação clínica no documento que o paciente lê | P |
| R-11 | ⏳ Unificar o caminho de gravação da ficha | Consulta usa server action e grava `status: concluida`; ficha rápida escreve do browser e grava `aberta`. Mesmo artefato clínico, dois contratos | M |
| R-12 | ⏳ Contraste AA nos tokens do app | `--text-3` e o botão primário reprovam WCAG AA (2,34:1 e 3,38:1 no claro); achado novo 23/07 — `--color-text-muted` no escuro dá 1,82:1 (`ToothDetailPanel`). Valores corrigidos já estão na [spec arquivada do R-01](_arquivo/specs/R-01-registro-unidade-salvamento.md); falta aplicar no app inteiro | P |
| R-15 | ⏳ Modo consulta: o cockpit do atendimento | Vira o cockpit do atendimento — procedimentos ativos, odontograma vivo, tabelas, implante, raio-x, gravação como canto pequeno; motor compartilhado com a ficha rápida. [Visão em debate](specs/R-15-modo-consulta-cockpit.md); depende de R-01 · R-02 · plugins | G |

## Congelado

| ID | Item | Por que parou | Descongelar quando |
|---|---|---|---|

## Concluído

| ID | Item | Fechado | Spec |
|---|---|---|---|
| R-01 | ✅ Ficha: o registro como unidade de salvamento | 2026-07-23 | [R-01](_arquivo/specs/R-01-registro-unidade-salvamento.md) |
| R-14 | ✅ Dashboard da secretária monta "hoje" no fuso do servidor | 2026-07-23 | sem spec (pontual — mesma classe do `feb4b68`) |
| R-13 | ✅ Agenda: janela de busca, multi-dentista e clique na grade | 2026-07-22 | [R-13](_arquivo/specs/R-13-agenda-janela-multidentista.md) |

## Cortado

| ID | Item | Por que não vamos fazer |
|---|---|---|
