# Estado — 2026-08-10 (sessão #35)

## Agora

**R-98a — Apresentar visual (tipo de bloco + fix do bug): codado, testado ao vivo por ele e
aprovado 100%** (`4fe53e2`..`0b86843`, migration 134, pushado). Ele vai testar em produção hoje
e retorna o veredito à noite — só então isso vira ✅ de verdade.

O que foi: seção do Apresentar ganha **tipo** (`texto` · `imagem` cheia · `odontograma`, esse
último derivado sozinho de `odontograma_eventos`, sem escolha manual de dente). Bug corrigido
junto: `generateFullPlanWithAI` nunca salvava — 23 chamadas à rota, 6 de dentistas reais, 0
linhas correspondentes; o toast dizia sucesso e o dentista perdia tudo ao fechar o painel.

**2 achados extras, testando ao vivo, já corrigidos:**
- Botão Apresentar só aparecia com `fichasRecentes.length > 0` — suposição velha (Apresentar
  sempre parte de uma ficha). Com bloco imagem/odontograma isso não é mais verdade; tirei a trava
- `dashboard/protetico/page.tsx` (R-94) era a única página do dashboard sem `PageContainer` —
  conteúdo colado na borda

**Não confirmado explicitamente:** se ele testou o editor em **light mode** — o artefato só
cobria dark, e eu não vi confirmação específica disso no teste dele.

**R-98b (modelo reutilizável)** e **R-99 (anotar radiografia)** têm spec escrita, aguardando o
98a passar pela produção antes de começar.

## Travado

**O preço** (herdado do R-92). Ele mandou ignorar o R$249/R$179, número novo não fechado.
`lib/planos.ts` é fonte única desde `86fc722`, então mudar é barato.

**A [R-36](specs/R-36-um-login-uma-clinica.md) reescrita aguarda aprovação dele** — não comecei
nada dela. §7 tem 3 decisões abertas.

## Esperando você

- [ ] **Veredito de produção do R-98a** — hoje à noite, por ele
- [ ] **Aprovar a R-36 reescrita**
- [ ] **Definir o preço** — trava o R-92 quando voltar
- [ ] **G6 do R-94** — teste deliberado de 2 contas (dentista cria pedido → protético marca
      entregue); o que rolou até aqui foi acidente de sessão, não teste controlado
- [ ] Gate de 2 contas (R-29/R-30/R-31a/R-32/R-34/R-39/R-03c) — 11 dias parado
- [ ] Testar pessoalmente R-85/R-86/R-65/R-66 (herdados do #33, ainda 🟡)

## Próximo da fila

Depois do veredito de produção: **R-98b** (modelo) e **R-99** (anotar radiografia), ambos com
spec pronta. Depois: R-96 (transferir admin), R-97 (painel operacional), volta do R-92.

**`ROADMAP.md` está com 231 linhas (teto ~200)** — 3ª sessão seguida anotando isso sem podar.
