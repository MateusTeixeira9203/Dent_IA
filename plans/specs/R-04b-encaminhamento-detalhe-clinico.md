# R-04b — Encaminhamento: destino edita detalhe clínico do endo/implante

> **SPEC** · **R-04b** · fase **CODADO (Fases 0-3, 26/07), 🟡 não verificado** — falta aplicar a
> migration 110 no banco (prod) + teste de 2 contas + deploy. Gates typecheck/build verdes.
> **Modelo:** Sonnet na execução (reusou o template de RPC do R-04/109 e os forms já existentes).
> **Escopo dobrou pra dois lados (26/07):** lado autor (input de observação no ToothDetailPanel,
> inexistente hoje) + lado destino (RPC + tabela editável). Ainda peso P.
> **Aberto:** 2026-07-26 · **Depende de:** R-04 (no ar, migration 109) · **Peso:** P
> **Migration nova + RPC SECURITY DEFINER:** vai sozinha, com teste de 2 contas (autor / destino /
> terceiro) antes de qualquer deploy — regra do projeto pra tudo que toca permissão de escrita.

## Visão geral

Hoje (R-04, no ar) um dentista encaminha um procedimento planejado a outro dentista da clínica; o
destino só consegue marcar realizado (concluir_evento_encaminhado, migration 109) — ele não
preenche a tabela clínica da especialidade (canais do endo, marca/medidas do implante). O R-04b
abre essa lacuna.

**Fluxo real (Mateus, 26/07):** o AUTOR, no meio de outro procedimento, percebe que o dente vai
precisar de canal → seleciona "canal" (cria o registro de endo, `indicado`), escreve uma
**observação de contexto** pro colega ("dá uma olhada direito, só olhei por cima, pode ter mais
coisa") e **encaminha — sem mexer na tabela de endo** (ele não faz o endo). O DESTINO
(endodontista) recebe, **lê a observação do autor** como contexto, e é ele quem **preenche a
tabela** (os canais). Divisão de propriedade: **observação = do autor** (contexto do
encaminhamento, o destino só lê); **detalhe/tabela = do destino** (só ele grava).

Por isso a RPC do destino grava **só `detalhe`**, nunca `observacao` — o dado do autor fica
intacto. A UI troca o card read-only por EndoForm/ImplanteForm editável, mostrando a observação do
autor acima como contexto.

## O que já existe hoje (confirmado no código)

- RPC template + RLS: concluir_evento_encaminhado (migration 109, SECURITY DEFINER) valida
  encaminhado_para = get_my_dentista_id() mais fichas.assinado_em is null, grava só 2 colunas
  (status, realizado_em). odontograma_eventos_write_own (migration 101, FOR ALL, dentista_id =
  get_my_dentista_id()) não alcança o destino — só RPC resolve. O nome reservado no comentário da
  109 era atualizar_detalhe_evento_encaminhado; este doc usa preencher_detalhe_encaminhado
  (Decisão 1 explica a diferença de escopo).
- Schema: odontograma_eventos.detalhe jsonb e .encaminhado_para uuid (migration 106) — detalhe já
  existe, nullable, sem índice GIN (não precisa pra este item).
- Forms já prontos: EndoForm e ImplanteForm (src/components/fichas/) já toleram valor nulo (caem
  no fallback VAZIO) — funcionam sem ajuste num evento ainda sem detalhe. Zod já existe:
  endoDetalheSchema e implanteDetalheSchema (src/lib/especialidades/).
- Onde os forms já são usados hoje (Site A, rascunho do autor): corpoEspecialidadeEditavel em
  FichasTab.tsx linha 346, só dentro do fluxo de reabrir a ficha inteira em edição.
- Onde o card read-only é usado (Site B, ficha salva, todo mundo): corpoEspecialidade
  (FichasTab.tsx linha 455) faz safeParse e monta EndoCard/ImplanteCard; retorna null quando
  detalhe é null ou inválido (invariante I2: card nunca recebe null, só monta com dado). Chamado
  2x no render do card (linhas 1821 e 1853).
- Achado: corpoEspecialidade/corpoEspecialidadeEditavel tratam só tipo igual a 'endodontia' ou
  'implante' — não tratam 'lesao_periapical', mesmo o endoPlugin.tiposEvento incluindo esse tipo
  no registry. Lacuna pré-existente, fora de escopo aqui — o R-04b espelha os 2 tipos do switch
  atual, não deriva do registry (evita mudar comportamento de lesao_periapical por acidente).
- Gate de status por card já existe (FichasTab.tsx linhas 1840-1848): onToggleStatus bifurca autor
  (toggleStatusRegistro) vs destino (concluirEncaminhado -> RPC 109) vs terceiro (só leitura). O
  R-04b espelha esse mesmo padrão, mas pro corpo (children), não pro pill.

## Escopo

**Dois lados (Mateus, 26/07):**
- **Lado AUTOR (novo):** um textarea de **observação no `ToothDetailPanel`** pra ele escrever o
  contexto ao criar/editar o registro ("dá uma olhada direito aqui"). **Confirmado na investigação:
  hoje esse input NÃO existe** — o `ToothDetailPanel` só tem `observacao: ''` como default do draft
  e exibição read-only; o campo só é preenchido hoje pela extração do Dex/voz. R-04b adiciona o input
  (Fase 0). É a `observacao` do próprio registro — serve pra qualquer registro, não só encaminhado.
- **Lado DESTINO:** RPC estreita pro destino gravar **só o `detalhe`** (a tabela clínica) de um
  evento endodontia/implante encaminhado a ele; action com validação Zod; card do destino (Site B)
  vira editável mesmo com detalhe null, **mostrando a observação do autor read-only acima**; botão
  Salvar explícito, otimista com rollback (padrão de concluirEncaminhado).

Não cobre: **editar a observação pelo destino** (é do autor — Decisão 4); marcar realizado (pill
existente, RPC 109 — Decisão 1); outras especialidades sem Form hoje (perio, orto, dentística);
retrofit de lesao_periapical; reencaminhar ou histórico de quem editou o quê.

## Decisões — aguardando o Mateus

### Decisão 1 — Preencher detalhe também marca realizado, ou são atos separados?

O enunciado sugeria um parâmetro opcional pra marcar realizado na mesma RPC. Recomendo separar:
esta RPC só toca detalhe/observacao; marcar realizado continua no pill já codado (RPC 109). Se o
destino terminou tudo numa visita só, a UI chama as duas actions em sequência (decisão de UX, não
de schema). Trade-off: 1 clique a mais no caso feliz; em troca, o destino preenche canais aos
poucos sem ser forçado a decidir o status junto. Recomendação: separar.

### Decisão 2 — Depois que o destino preenche, o autor ainda edita aquele detalhe?

Hoje o autor edita detalhe reabrindo a ficha inteira em rascunho (corpoEspecialidadeEditavel já
cobre qualquer evento seu, mesmo os encaminhados — nenhum código novo precisa disso). Recomendo
não travar agora: dado continua mutável até assinar (núcleo clínico, migration 099). Quando R-03a
(assinatura por procedimento, ainda não no ar) subir, o trigger de imutabilidade passa a bloquear
os dois lados igual — ver "Interação com R-03a" abaixo. Recomendação: sem trava adicional agora.

### Decisão 3 — Escopo dos forms: só endo mais implante, ou toda especialidade encaminhável?

Recomendo travar em endo mais implante — únicos plugins com Form implementado hoje (registry.ts:
dentistica/cirurgia/protese_fixa/odontopediatria têm Form nulo; periodontia é tabela-satelite,
fora do modelo detalhe). Abrir pra outras exigiria criar Form novo — peso maior que P.

### Decisão 4 — Observação (nota livre) também editável pelo destino, ou só a tabela clínica? ✅ RESOLVIDA (Mateus, 26/07)

**Só a tabela.** A observação é do AUTOR (nota de contexto no encaminhamento — "dá uma olhada
direito, só olhei por cima"); o destino **só lê**, nunca sobrescreve. A RPC do destino toca só
`detalhe`. Isso elimina o risco de o destino apagar a nota do autor (a ressalva que abriu esta
decisão). Contrapartida: se um dia o destino quiser deixar a própria nota, é item futuro (campo
separado), não este.

### Decisões 1–3 — mantidas nas recomendações (Mateus não objetou, 26/07)
1. Detalhe e "marcar realizado" são **atos separados** (RPC nova só toca detalhe; realizado segue no pill/RPC 109).
2. Autor **não fica travado** de editar agora (trava sozinha quando R-03a/assinatura subir).
3. Escopo **endo + implante** (únicos plugins com Form pronto).

O desenho abaixo assume essas 4 decisões travadas.

## Assunções

- Endo/implante nunca têm grupo_id (não são multi-dente) — comentário já existente em
  FichasTab.tsx linha 712. A RPC opera em 1 evento por chamada (p_evento_id), não em lote —
  diferente da 109, que é batch porque status é ação em massa e detalhe não é.
- Numeração da migration: 109 é a última aplicada; R-03a reserva "110" no próprio doc mas ainda
  não tem arquivo criado. Confirmar o próximo número livre na hora de codar (110 ou 111).
- Secretária nunca chama isso — já é barrada em todas as actions irmãs, mesmo padrão aqui.

## Interação com features vizinhas

- R-03a (assinatura por procedimento, contrato pronto, não executado): quando assinatura_id e o
  trigger de imutabilidade subirem, um evento assinado rejeita UPDATE de qualquer origem,
  inclusive esta RPC — o trigger barra sozinho. Dívida anotada: quando R-03a estiver no ar,
  revisar se o erro do trigger precisa de tradução própria na action (hoje ela só traduz
  sem_permissao e tipo_nao_suportado).
- R-11 (unificar gravação da ficha): já deixa alternarStatusRegistro/encaminharProcedimento fora
  do escopo dele (só unifica fichas, não odontograma_eventos). Esta action soma mais um caminho de
  escrita no mesmo padrão — não conflita, mas é mais um pra um futuro inventário.

## Parte 1 — Plano de implementação

### Mudanças de arquitetura

| Arquivo | O que muda |
|---|---|
| src/components/odontograma/ToothDetailPanel.tsx | **(lado autor, Fase 0)** textarea de observação bound ao draft do registro (hoje só `observacao: ''` default, sem input) — o autor escreve o contexto; flui pro save via a RPC 107 (a `observacao` já é coluna do upsert — confirmar) |
| supabase/migrations/*_11X_detalhe_encaminhado.sql (novo) | RPC preencher_detalhe_encaminhado (SECURITY DEFINER) |
| src/app/consulta/[agendamentoId]/actions.ts | nova action preencherDetalheEncaminhado |
| src/components/pacientes/FichasTab.tsx | novo helper corpoEspecialidadeDestino (mostra observação do autor read-only + form editável); estado de edição por card; branch que troca corpoEspecialidade por corpoEspecialidadeDestino quando encaminhadoPara.id igual a dentistaId |

Sem mudança em src/types/odontograma.ts (detalhe já é unknown ou null) nem em registro-card.tsx (o
corpo continua entrando por children, sem props novas no componente).

### Fases

#### Fase 0: Autor — input de observação no ToothDetailPanel (Risco: BAIXO)

1. Adicionar um textarea "Observação" no `ToothDetailPanel`, controlado, bound ao `observacao` do
   draft do registro (hoje só `observacao: ''` no default da linha 174, sem input). onChange atualiza
   o draft.
2. Garantir que a `observacao` do draft flui pro save via `salvarEventosOdontograma` → RPC 107
   (`salvar_eventos_odontograma`) — **confirmar que o upsert da 107 já inclui a coluna `observacao`;
   se não incluir, esse é o único ajuste de banco desta fase** (senão a nota do autor não persiste).

Verificável: autor cria/edita um registro, escreve uma observação, salva, **recarrega** → a
observação persiste e aparece read-only no card. Independente do lado destino. Dependências: nenhuma
— pode ir sozinha (mais fácil de subir primeiro, valida o caminho antes da parte com RPC).

#### Fase 1: Migration — RPC de escrita do detalhe (Risco: MÉDIO)

1. preencher_detalhe_encaminhado(p_evento_id uuid, p_detalhe jsonb, p_observacao text) — SQL na
   Parte 2. Valida encaminhado_para = get_my_dentista_id(), tipo em ('endodontia', 'implante') e
   fichas.assinado_em is null (mesmo left join da 109 — ficha_id é nullable).
2. revoke execute from anon, public; grant execute to authenticated (padrão da casa).
3. Sem índice novo — lookup por PK, diferente da 109 (batch, precisou de índice parcial).

Verificável: 2 contas — destino (B) grava no evento certo; autor (A) chamando a mesma RPC no
mesmo evento falha (encaminhado_para é B) com sem_permissao; terceiro (C) falha igual; tipo fora
de endo/implante falha (tipo_nao_suportado); ficha assinada falha pros três. Dependências: nenhuma.

#### Fase 2: Action wrapper + validação Zod (Risco: BAIXO)

1. actions.ts — preencherDetalheEncaminhado (contrato na Parte 2): busca o tipo do evento,
   resolve endoDetalheSchema ou implanteDetalheSchema (nenhum Zod novo), valida p_detalhe com
   safeParse antes de chamar a RPC (a RPC não sabe de Zod — sem isso, um detalhe corrompido só
   apareceria na leitura seguinte, silenciosamente "sem tabela"). Traduz sem_permissao e
   tipo_nao_suportado em mensagens PT-BR, mesmo padrão de atualizarStatusEncaminhado.

Verificável: detalhe válido grava; detalhe inválido (ex. comprimentoRaiz como string) recusa antes
do banco. Dependências: Fase 1.

#### Fase 3: UI — card do destino vira editável (Risco: MÉDIO)

1. FichasTab.tsx — novo helper puro corpoEspecialidadeDestino(tipo, detalheAtual, rascunho,
   observacaoAutor, onChange, onSalvar, salvando): renderiza (a) a observacaoAutor **read-only** no
   topo, como contexto ("nota do encaminhante"), quando existir; (b) EndoForm/ImplanteForm com valor
   = rascunho com fallback pro detalheAtual; (c) botão "Salvar tabela" abaixo, desabilitado enquanto
   salvando. Espelha corpoEspecialidadeEditavel na forma, mas com Salvar explícito (grava no servidor
   a cada clique, não só no save da ficha inteira) e a nota do autor visível sem ser editável.
2. Novo estado local: detalheRascunho (Record<string, unknown>, chave = key do card = id do
   evento, já que endo/implante nunca agrupam) e salvandoDetalheKey (string | null).
3. No branch de render do card (renderCardVis, linhas 1814-1857): computar souDestinoDoDetalhe =
   encaminhadoPara.id === dentistaId E tipo é endodontia/implante E ficha não assinada. Quando
   true, children do RegistroCard vira corpoEspecialidadeDestino(...) em vez de
   corpoEspecialidade(...) — e isso vale MESMO com detalhe null (oposto do card comum, que só
   monta com dado — I2). É o ponto mais fácil de regredir: sem essa distinção, o destino nunca vê
   o form quando o detalhe ainda está vazio, o caso mais comum (acabou de receber).
4. Handler salvarDetalheEncaminhado(key, eventoId, detalhe): snapshot antes =
   evolutions (mesmo padrão de concluirEncaminhado/encaminharRegistro), aplica local, chama a
   action, toast.error + rollback se falhar; limpa o rascunho da key ao suceder. A observação do
   autor entra só como texto read-only no topo do form (não é campo do destino).

Verificável: ver Gates de aceite. Dependências: Fases 1 e 2.

### Riscos e mitigações

| Risco | Prob. | Mitigação |
|---|---|---|
| souDestinoDoDetalhe calibrado errado (autor/terceiro ganham o form por engano) | média | testar as 3 contas antes de subir |
| Card do destino não aparece quando detalhe é null (regressão de I2) | média | é o comportamento OPOSTO intencional — cobrir no gate |
| RPC restrita demais ou de menos | média | mesmo padrão de teste de 2 contas da 109 |
| Autor sobrescreve o que o destino preencheu (2 editores, sem lock) | baixa | aceito (Decisão 2) — sem lock nesta rodada |
| R-03a sobe depois e o trigger quebra o erro silenciosamente | baixa, certa quando R-03a for ao ar | dívida anotada acima — revisar tradução de erro nessa hora |

## Parte 2 — Contrato técnico

### TypeScript

```typescript
// src/app/consulta/[agendamentoId]/actions.ts — nova action
export async function preencherDetalheEncaminhado(params: {
  eventoId: string;
  /** Validado contra endoDetalheSchema/implanteDetalheSchema conforme o tipo do evento —
   *  nenhum schema novo, reusa os dois já existentes. */
  detalhe: unknown;
  // sem observacao: é do autor (Decisão 4), o destino nunca a escreve.
}): Promise<{ ok: boolean; error?: string }>;
```

Nenhum tipo novo em src/types/odontograma.ts — OdontogramaEvento.detalhe e .encaminhado_para já
cobrem o que este item precisa.

### RPC SQL

```sql
create or replace function public.preencher_detalhe_encaminhado(
  p_evento_id   uuid,
  p_detalhe     jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := get_my_dentista_id();
  v_tipo   text;
begin
  select e.tipo into v_tipo
  from public.odontograma_eventos e
  left join public.fichas f on f.id = e.ficha_id
  where e.id = p_evento_id
    and e.clinica_id = get_my_clinica_id()
    and e.encaminhado_para = v_caller
    and f.assinado_em is null;

  if v_tipo is null then
    raise exception 'sem_permissao';
  end if;
  if v_tipo not in ('endodontia', 'implante') then
    raise exception 'tipo_nao_suportado';
  end if;

  -- SET direto, nunca merge: quem decide o valor final (inclusive limpar pra null) e a
  -- action, nao o banco. NUNCA toca observacao -- ela e do AUTOR (Decisao 4).
  update public.odontograma_eventos
     set detalhe = p_detalhe
   where id = p_evento_id;
end;
$$;

comment on function public.preencher_detalhe_encaminhado is
  'Escrita estreita do DESTINO de um encaminhamento (R-04b): so o detalhe (tabela clinica),
   restrita a tipo in (endodontia, implante). NUNCA toca observacao (e do autor), status, tipo,
   ancora, autoria nem encaminhado_para -- marcar realizado continua em concluir_evento_encaminhado
   (migration 109).';

revoke execute on function public.preencher_detalhe_encaminhado(uuid, jsonb) from anon, public;
grant  execute on function public.preencher_detalhe_encaminhado(uuid, jsonb) to authenticated;
```

Sem índice novo (lookup por PK). Sem policy nova em odontograma_eventos — a RPC é o único caminho
de escrita do destino, igual à 109.

### Componentes

```
FichasTab (client)
  -> Site B (ficha salva), por card de registro:
       souDestinoDoDetalhe = encaminhadoPara.id === dentistaId AND tipo in (endo,implante) AND !assinada
       -> false: RegistroCard children = corpoEspecialidade(tipo, detalhe)         [inalterado, read-only]
       -> true : RegistroCard children = corpoEspecialidadeDestino(...)           [NOVO]
                   -> EndoForm | ImplanteForm (editável, aceita detalhe null)
                   -> botão "Salvar tabela" -> salvarDetalheEncaminhado -> preencherDetalheEncaminhado (action) -> RPC
```

### Invariantes

- [ ] Só quem tem encaminhado_para igual a get_my_dentista_id() naquele evento grava
      **o `detalhe`** por esta RPC — autor e terceiro nunca passam.
- [ ] Restrito a tipo em ('endodontia', 'implante') — nenhuma outra especialidade ganha escrita
      por este caminho.
- [ ] A RPC nunca toca **observacao** (é do autor), status, tipo, âncora, dentista_id, ficha_id ou encaminhado_para.
- [ ] A observação do autor aparece **read-only** pro destino (contexto do encaminhamento) — ele nunca a edita.
- [ ] Ficha assinada (fichas.assinado_em) barra a escrita — igual ao padrão de toda RPC da
      família R-04.
- [ ] O card do destino é editável mesmo com detalhe igual a null — regra oposta e explícita ao
      card comum (que só monta com dado, I2).
- [ ] Leitura de detalhe/encaminhado_para não muda — já é aberta pra clínica inteira (migration
      099).

### Gates de aceite

- [ ] **(Fase 0)** Autor cria um registro de endo, escreve a observação no ToothDetailPanel, salva
      e **recarrega** → a observação persiste e aparece read-only.
- [ ] Autor A encaminha um evento endodontia (ou implante) indicado pro dentista B, **com uma
      observação de contexto** ("dá uma olhada direito aqui...").
- [ ] B abre a ficha, vê a **observação do autor read-only** no topo do card, e a tabela vazia e
      editável abaixo (chevron/form aparece mesmo sem dado prévio) — preenche 2 canais, clica
      "Salvar" e grava sem erro.
- [ ] Depois que B salva, **a observação do autor continua intacta** (B nunca a editou) e a tabela
      aparece preenchida.
- [ ] A reabre a mesma ficha (sem entrar em modo edição) e vê a tabela preenchida read-only — não
      ganhou nenhum controle de edição novo no card.
- [ ] Terceiro dentista C (nem autor nem destino) não vê nenhum form nem botão de salvar nesse
      card; só vê a tabela em modo leitura se e quando ela estiver preenchida.
- [ ] B tenta chamar a action num evento que não foi encaminhado a ele — recusa (sem_permissao),
      nada grava.
- [ ] Ficha assinada — RPC recusa pros três (A, B, C).
- [ ] Detalhe malformado (por exemplo, campo numérico como string) — action recusa antes da RPC.
- [ ] Testado com 2+ contas reais logadas (autor mais destino; terceiro se disponível).
