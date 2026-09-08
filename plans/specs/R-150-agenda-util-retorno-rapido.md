# R-150 — Retorno com agenda completa do dentista

> **SPEC** · **R-150** · ⏳ fila
> **Aberto:** 2026-09-03 · **Revisado:** 2026-09-08 · **Fase:** correção incremental verificada localmente; concorrência pendente

## 1. Problema

O desktop permite escolher 09:15, mas a validação do mobile oculto apaga a seleção quando a grade
usa passos de 30 minutos. Reproduzido no componente do commit publicado `a2236a6` e corrigido no
mesmo cenário. Ficha, Meu Dia e perfil compartilham este modal; consultas e bloqueios já publicados
continuam visíveis, inclusive em +30 dias.

## 2. Escopo desta correção

Reusar `MarcarRetornoModal`, `RetornoSemanaGrid`, `RetornoMobileAgenda`, `useMarcarRetorno`,
`buscarDisponibilidadeSemana` e `slotEstaLivre`. Não há redesign, schema, RLS, rota, API, mudança de
direito ou banco remoto. Preservar a correção já publicada que busca a semana domingo–sábado do retorno
sem perder os seis dias operacionais da Agenda.

| Entrada | Alvo e vínculo preservados |
|---|---|
| Ficha (`ProntuarioTab`) | Dentista da visita e `atendimentoOrigemId` existente |
| Meu Dia (`registrar-painel`) | Próprio dentista; não inventa visita ainda não salva |
| Perfil (`paciente-detail-client`) | Próprio dentista ou seleção permitida da secretária; sem origem |

## 3. Contrato técnico

```ts
type Selecionavel = (inicioMin: number, duracaoMin: number, dia: DisponibilidadeDia, agora: Date) => boolean;
```

`slotEstaLivre` continua gerando os slots dentro da grade. A seleção do retorno usa
`slotPodeSerSelecionadoParaRetorno`: recusa passado e interseção com `ocupados`, permite adjacência
`[início, fim)` e preserva fora do expediente como aviso recuperável do servidor. Dia sem grade mantém
hora manual sem choque, com `agendaLivre: true`. Desktop e mobile jamais tratam falha de leitura como
livre. Trocar semana, dentista ou duração limpa uma seleção incompatível; resposta cancelada/atrasada
não substitui a chave atual. Abrir o modal começa uma nova chave de leitura; retry de pedido protético
usa seu agendamento já persistido e não depende mais da disponibilidade atual.
Enquanto há pedido protético pendente, data, hora e seleção ficam imutáveis até o retry concluir.
Troca de dentista e fechamento também ficam bloqueados durante envio/pendência: o callback do
perfil da secretária limpa o responsável ao fechar e não pode ser chamado nesse estado.

## 4. Comportamento

| Cenário | Resultado |
|---|---|
| Navegar até +30 dias | Busca agenda inteira do profissional alvo, com consultas e bloqueios visíveis. |
| Clicar/tentar digitar ocupado | Não seleciona nem habilita confirmação; o ocupado continua visível. |
| Mudar duração/semana/dentista | Invalida seleção incompatível com a resposta atual. |
| Erro da agenda | Mostra erro, não preserva seleção anterior e não permite confirmar. |
| Dia sem grade | Permite hora sem choque marcada como `agendaLivre`; servidor ainda revalida. |
| Conflito depois de abrir | Servidor recusa e preserva formulário para nova escolha. |

## 5. Referência visual

Sem tela nova. Reutiliza a grade e tokens atuais; ocupados seguem visíveis e inativos, sem depender
apenas de cor. Não há artefato visual para esta correção incremental.

## 6. Invariantes

1. Tenant, guard de dentista, server action e vínculo já existente não mudam.
2. Nunca expor agenda de outro profissional fora de `buscarDisponibilidadeSemana`.
3. Falha de consulta nunca é disponibilidade; ocupado nunca recebe seleção local.
4. Só o servidor decide conflito final e expediente; o modal não envia override de conflito.

## 7. Dependência pendente de R-156

`criarAgendamento` consulta conflitos e depois insere em operações separadas. Esta correção não envia
override, mas duas sessões ainda podem passar na leitura antes de uma inserir. I2 exige criação atômica,
o que pede contrato de RPC/migration e teste com duas contas; não é alterado nem anunciado como resolvido.

## 8. Gates de aceite

- [x] 208 testes de código, typecheck completo, lint do recorte e diff-check passaram.
- [x] Browser isolado: baseline apaga 09:15; patch mantém 555 e envia esse horário.
- [x] Browser: ocupado, adjacência, duração, limpeza da hora, troca de dentista, erro/reabertura,
  mobile, agenda sem grade, +30 dias e retry protético sem perder contexto passaram.
- [x] Perfil em localhost autenticado na clínica de teste: um retorno em 09/09/2026 09:15 BRT,
  30 minutos; SQL confirmou uma única linha (`d0f7fe67-7683-4ab2-b3c8-3989d91a859f`, 12:15 UTC).
  Observação: `QA retorno 09:15 - 2026-09-08`. Sem WhatsApp/e-mail; fixture mantida identificável.
- [x] Review TypeScript: HIGH sobre troca de dentista/fechamento na pendência corrigido e revalidado.
- [x] Review UX do recorte aprovado: mobile light/dark, teclado, alvos e CTA; build de produção passou.
- [x] Callers de Ficha/Meu Dia/perfil, alvo, vínculo e server actions não foram alterados.
- [ ] Smoke das entradas Ficha e Meu Dia com atendimento real de teste após publicação.
- [ ] CI e smoke do deployment com o commit publicado.

Não declarar R-150 inteiro concluído: concorrência de duas sessões (R-156) permanece pendente.

## 9. Fora de escopo

- Atalhos, domingo, ponte fixa, redesign, expediente, schema, RLS, migration, RPC, banco remoto,
  deploy e dados reais.

Os atalhos, domingo, ponte fixa e aviso de expediente do escopo original continuam adiados; esta
atualização não os aprova, cancela ou implementa.
