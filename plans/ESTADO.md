# Estado — 2026-08-10 (sessão #35)

## Agora

**Nenhum item 🔵 ativo.** O R-94 subiu e o R-92 segue pausado — a sessão terminou em
**planejamento**, não em execução.

**R-94 — Agenda do protético: no ar** (`58f6c14`..`3f295d8`, migrations 128-133). Ele confirmou
funcionando. 4 bugs achados testando ao vivo, todos corrigidos: loop infinito de redirect
(`response.headers` não chega no `headers()` de Server Component — derrubava o servidor por
memória), alerta de CRO vazando pro protético, login passando por `/dashboard` à toa (~2.4s
jogados fora) e ponto do calendário mentindo "pendente" em dia já entregue.

**Push feito:** 22 commits de uma vez (`86fc722`..`3f295d8`) — o lote represado do R-92 mais o
R-94 inteiro. O represamento acabou.

**Decisão de produto 10/08 — identidade e hierarquia.** Discussão longa, fechada:

- **Toda conta é clínica.** Solo e Clínica são planos **por tamanho** (1 dentista · vários), não
  dois tipos de entidade. A palavra "consultório" sai do produto
- Quem atende em dois lugares tem **dois logins**, porque são dois clientes pagando
- **Admin = quem paga**, não quem criou. E admin não é perfil separado: é atributo do dentista
  (os 5 admins do banco assinaram 37 fichas)
- **Ver é de todos, mudar quem entra e quanto se paga é do dono**

Isso reescreveu a [R-36](specs/R-36-um-login-uma-clinica.md) (migração automática do consultório
solo **cortada** — entregava a 5 estranhos prontuário que o paciente confiou a um; e o caso
aconteceu 0×) e abriu **R-96** e **R-97**.

## Travado

**O preço** (herdado do R-92). Ele mandou ignorar o R$249/R$179, número novo não fechado.
`lib/planos.ts` é fonte única desde `86fc722`, então mudar é barato.

**A R-36 reescrita aguarda aprovação dele** — não comecei nada dela.

## Esperando você

- [ ] **Aprovar a [R-36](specs/R-36-um-login-uma-clinica.md) reescrita.** O §7 tem 3 decisões abertas
- [ ] **Definir o preço** — trava o R-92 quando voltar
- [ ] **G6 do R-94** — teste deliberado de 2 contas (dentista cria pedido → protético marca
      entregue). O que rolou foi acidente de sessão instável, não teste controlado
- [ ] Gate de 2 contas (R-29/R-30/R-31a/R-32/R-34/R-39/R-03c) — 11 dias parado
- [ ] Testar pessoalmente R-85/R-86/R-65/R-66 (herdados do #33, ainda 🟡)
- [ ] **Escopar o Apresentar** — pedido dele em 09/08, nunca discutido de verdade

## Próximo da fila

R-96 (transferir admin, pequeno e destrava a hierarquia), R-97 (painel operacional), o Apresentar
e a volta do R-92. **`ROADMAP.md` está com 229 linhas (teto ~200)** — precisa de poda, não de mais
escrita.
