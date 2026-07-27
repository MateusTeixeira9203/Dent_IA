# R-02 — Ficha viva + fidelidade ao artefato

> **SPEC** · **R-02** · aprovada -> execucao · **Modelo:** Sonnet (contrato congelado, sem decisao
> de produto em aberto)
> **Aberto:** 2026-07-23 · **Fechado:** — · **Fase:** aprovada, execucao em andamento
> **Depende de:** R-01 (ja em prod, verificado — id estavel por evento)

## 1. Visao geral

Hoje a ficha desenha o registro de dois jeitos: um card artesanal enquanto o dentista monta o
rascunho, outro (RegistroCard) quando a ficha ja foi salva. E a mesma informacao, dois
desenhos — a causa raiz do "parece bagunçada". R-02 funde os dois num componente so, resolve a
ordenacao/agrupamento pra refletir o que esta em aberto de verdade, e fecha a fidelidade dos
simbolos do odontograma contra o catalogo aprovado. O resultado: abrir uma ficha nova ou uma
salva e a mesma experiencia visual, e o que ainda precisa de atencao do dentista sobe pro topo.

## 2. Escopo

**Cobre:**
- Um unico componente de card de registro, usado na criacao (rascunho) e na leitura (salvo).
- Ordenacao da lista de registros por estado (aberto vs. fechado — ver Decisao 1), nao mais
  so por numero de dente.
- Agrupamento por procedimento — hoje ha duas implementacoes quase identicas (draft e salvo);
  vira uma funcao so.
- Auditoria de fidelidade dos simbolos do odontograma contra o catalogo do artefato.
- Alicerce de dados pra grupo_id sobreviver entre consultas diferentes ("este trabalho", nao so
  "este card") — sem migration, se a Decisao 1 for a opcao minima (ver secao 4).

**Nao cobre:**
- Assinatura por procedimento (R-03) — a spec do R-01 ja reservou isso.
- Encaminhar detalhe de endo/implante pro destino (R-04b).
- Periograma, ponte/esfoliacao na IA e chips, voz nas especialidades — itens proprios (R-06,
  R-07, R-08, R-09).
- O cockpit do modo consulta e a confirmacao de amarracao "ao vivo" (R-15) — R-02 entrega a
  fundacao; a UI de confirmacao plena do cockpit e decidida quando o cockpit for o item ativo.

## 3. Achados desta sessao (codigo, nao suposicao)

- A duplicacao e real e esta localizada. FichasTab.tsx desenha o rascunho a mao (linhas
  1094-1190, dentro de gruposDraft.map) enquanto a ficha salva usa RegistroCard
  (src/components/fichas/registro-card.tsx, chamado na linha 1430 via eventosParaCards,
  linhas 263-298). Sao duas implementacoes da mesma ideia — inclusive o agrupamento por
  procedimento existe duas vezes: gruposDraft (linhas 423-438, memo) e eventosParaCards
  (linhas 263-298, funcao), com a mesma regra (grupo_id ou dente|tipo|status) escrita duas vezes.
- O rascunho hoje nao deixa alternar status. O pill "Planejado/Realizado" no card do rascunho
  (linha ~1135) e um span sem onClick — so a ficha salva tem o toggle (onToggleStatus, linha
  1433). Unificar no RegistroCard resolve isso de graca.
- Os simbolos ja batem com o catalogo. Comparei Odontograma.tsx/tooth-geometry.ts contra os 12
  simbolos do artefato (plans/_arquivo/artefatos/R-01-ficha-registro.html, linhas 823-884): canal
  vazio/preenchido, X coral de extracao indicada, contorno tracejado do dente ausente, textura
  pontilhada do pre-existente, parafuso do implante, retangulo do pino/nucleo, circulo da lesao
  periapical, ponto do selante, zigue-zague da fratura, contorno duplo da coroa — todos ja
  implementados (Odontograma.tsx:178-363). Nao ha reconstrucao de simbolo aqui, so uma
  verificacao lado a lado (Fase 0).
- grupo_id nao sobrevive entre fichas hoje. E gerado so pela IA (formatar-evolucao/route.ts,
  linhas 186-198, uma tag resolvida a um uuid novo por chamada) ou fica null em lancamento manual
  (ToothDetailPanel.tsx:140). Nenhum codigo hoje consulta eventos de OUTRAS fichas do mesmo
  paciente pra saber se existe um trabalho aberto no mesmo dente. Boa noticia: a coluna grupo_id
  (migration 101) nao tem FK nem constraint que impeca reuso entre fichas — a fundacao cabe sem
  migration, se a Decisao 1 escolher o modelo minimo.
- "Estados e fluxos" do artefato (linhas 470-700) mostra o card de um dente aberto isolando os
  registros daquele dente da lista geral ("saem da lista abaixo enquanto o dente esta aberto") —
  comportamento que a ordenacao por estado deve preservar, nao substituir.

## 4. Decisoes — resolvidas (23/07)

Confirmadas as 3 recomendacoes: Decisao 1 = Opcao A (binario, sem etapas nomeadas, sem
migration). Decisao 2 = **REABERTA e resolvida em 25/07** (ver abaixo) — o Mateus pediu ligar o
auto-reaproveitamento agora, com **confirmacao** (nunca silencioso). Decisao 3 = abertos primeiro,
dente como criterio secundario. Texto original preservado como raciocinio.

> **Decisao 2 — resolucao 25/07 (vence o adiamento de 23/07, precedencia = fala do Mateus nesta
> sessao):** liga a amarracao AGORA, mas **com confirmacao explicita**, nao silenciosa. Ao criar
> um evento de um tipo que ja tem grupo ABERTO no MESMO dente, o painel pergunta antes de amarrar
> ("continuar o trabalho aberto ou comecar novo?"). **Escopo minimo:** so reaproveita grupos que
> ja tem `grupo_id` (originados por IA/voz) — trabalho 100% manual nasce com `grupo_id: null`
> (ToothDetailPanel `novo()`, linha 140) e nao vira continuavel sem decidir "quais tipos sao
> multi-consulta e sempre recebem grupo_id" — isso fica FORA (candidato a Fase 4 / R-15). O risco
> do "trabalho fantasma" (§Decisao 2 original) some porque a fusao nunca acontece sem o dentista
> confirmar.

### Decisao 1 — o que significa "grupo aberto" / "etapa derivada"?

A spec do R-15 registrou a visao como "etapa atual derivada (preparo->cimentado), nunca maquina
de estados" — mas isso foi debate de cockpit, nao contrato. Duas leituras possiveis:

- Opcao A (recomendada por mim) — binario, sem schema novo. Um grupo esta ABERTO se qualquer
  evento dele tem status=indicado; FECHADO quando todos sao realizado. Sem etapas nomeadas, sem
  coluna nova — uma funcao pura sobre os eventos que ja existem. Cobre literalmente "ativo =
  grupo aberto". A leitura da "etapa atual" continua sendo a observacao em texto do evento mais
  recente do grupo — nao um enum.
- Opcao B — etapas nomeadas por tipo de procedimento. Cada tipo multi-consulta (coroa, ponte,
  implante) ganha uma lista fixa de etapas (ex.: coroa: preparo -> moldagem -> prova ->
  cimentacao). Exige: eu nao posso inventar essa lista — precisaria vir de voce, por tipo — mais
  uma coluna nova (etapa) e migration.

  Minha posicao: a Opcao B resolve um problema que o cockpit (R-15) ainda nao existe pra sentir.
  Construir a lista de etapas agora e especular sobre um uso que nao tem tela ainda — risco de
  chutar etapas erradas e ter que desfazer quando o cockpit vier. Prefiro a A agora e revisitar
  quando o R-15 virar item ativo.

Preciso que voce escolha A, B, ou aponte uma terceira leitura.

### Decisao 2 — a amarracao entre consultas pede confirmacao agora, ou fica so o alicerce?

Quando o dentista abre um dente que ja tem um trabalho aberto (mesmo tipo), o sistema pode: (a)
perguntar explicitamente "continuar o trabalho aberto (coroa, iniciado em 10/07) ou comecar um
registro novo?", ou (b) amarrar automaticamente por estrutura (mesmo dente + mesmo tipo + grupo
aberto), sem perguntar. A spec do R-15 registrou que "a tela confirma antes de gravar, nunca em
silencio" — mas isso foi pensado pro cockpit, que ainda nao existe. Pra ficha rapida/consulta
atual (sem cockpit), meu instinto e (a) ser inevitavel mesmo assim — amarrar errado
silenciosamente cria um "trabalho" fantasma que mistura dois procedimentos — mas isso e uma tela
nova (mini-modal ou banner no ToothDetailPanel) que ninguem pediu ainda.

Preciso saber: essa confirmacao entra na Fase 3 deste item, ou fica adiada pro R-15 (Fase 3 vira
so a query "existe grupo aberto?", sem UI de escolha — todo lancamento continua criando grupo
novo ate o cockpit existir)?

### Decisao 3 — ordenacao por estado, regra exata

Hoje a lista ordena so por numero de dente (FichasTab.tsx:276 e :437). "Ordenacao por estado"
(ROADMAP) nao tem regra escrita em lugar nenhum. Minha proposta, amarrada a Decisao 1: grupos
abertos primeiro, fechados depois; dentro de cada bloco, mantem a ordenacao por dente (atual,
estavel, sem surpresa). Se voce quiser outra leitura (ex.: mais recente primeiro, ou por tipo de
procedimento), diga — nao vou supor.

## 5. Assuncoes (inferidas, nao preciso de confirmacao salvo objecao)

- Coroa/ponte/esfoliacao/protese removivel etc. seguem fora do catalogo de simbolos por decisao
  ja registrada no proprio artefato (rodape, linha 880) — nao e lacuna do R-02, e escopo do R-06.
- O card unificado usa sempre RegistroCard como casca visual; o corpo (children) continua
  variando entre formulario editavel (criacao) e card somente-leitura (salvo) — isso ja e assim
  hoje na leitura, so estende pra criacao.
- Nenhuma tela nova de design entra aqui — o artefato R-01-ficha-registro.html ja cobre 100% do
  visual necessario (card, simbolos, estados). Nao acho necessario design-brief/design-shotgun
  pra este item.

---

## Parte 1 — Plano de implementacao

### Fase 0 — Auditoria de simbolos (Risco: BAIXO — sem codigo)

**Acoes:**
1. Servir plans/_arquivo/artefatos/R-01-ficha-registro.html por HTTP local (skill
   artefato-visual) e comparar, claro e escuro, os 12 simbolos contra Odontograma.tsx.
2. Registrar divergencia encontrada (se houver) — hoje a leitura de codigo nao achou nenhuma.

**Verificavel:** tabela lado a lado (achado / implementacao) sem pendencia, ou lista de
divergencias concretas se aparecer alguma no browser (cor, opacidade, posicao).
**Dependencias:** nenhuma.

**REVISAO 24/07 — a auditoria foi mais fundo e achou COLISAO no proprio artefato.**
Ao ver renderizado (Mateus, ao vivo), implante e pino desenhavam IGUAL (cápsula+curva) — o
artefato canonico regrediu o implante de parafuso pra capsula, contradizendo a propria legenda
("a raiz vira parafuso") E esta tabela de conferencia (linha "Implante = linhas paralelas"). Meu
fix anterior copiou o desenho errado. Coroa era so contorno duplo, sem identidade. Rodei pesquisa
de convencoes reais (Open Dental, Dentrix, DALE/Bird&Robinson, FOUSP — ver artefato) e redesenhei:
- **Implante** = parafuso na raiz (corpo afunilado + roscas horizontais + plataforma), **alargado
  ~3px** p/ leitura. Volta ao que a spec/legenda ja pediam.
- **Coroa** = capa com hachura diagonal sobre a coroa (raiz intocada). Ganha identidade.
- **Pino/nucleo** = haste no canal + nucleo triangular no colo (nao mais cápsula) — sai da colisao.
- Cor = status como sempre (coral a fazer / teal feito / slate pre-existente).
Referencia visual dos glifos escolhidos: **plans/artefatos/R-02-simbolos-odontograma.html**
(aprovado pelo Mateus 24/07). Execucao: portar os 3 glifos pro Odontograma.tsx E corrigir o
catalogo do artefato canonico R-01-ficha-registro.html.

### Fase 1 — Card unico (Risco: BAIXO-MEDIO)

**Acoes:**
1. src/components/fichas/registro-card.tsx — estender RegistroCardProps com editavel (boolean),
   onObservacaoChange (v: string) => void, onRemover () => void. Quando editavel, o paragrafo de
   observacao (linha 136) vira um input e um botao remover aparece no header (ao lado do pill de
   status).
2. Extrair a regra de agrupamento duplicada — gruposDraft (FichasTab.tsx:423-438) e
   eventosParaCards (FichasTab.tsx:263-298) — pra uma funcao so, generica o bastante pra servir
   os dois formatos (OdontogramaEventoDraft e EventoView). Decidir na execucao se vale um arquivo
   novo (src/lib/odontograma/agrupar-registros.ts) ou uma funcao so dentro de FichasTab.tsx — nao
   vale criar modulo novo se o generico nao pagar a complexidade.
3. FichasTab.tsx — substituir o bloco ad-hoc (linhas 1094-1190) por RegistroCard com editavel,
   com children = EndoForm/ImplanteForm quando aplicavel (mesma condicao de hoje, linha 1112),
   onObservacaoChange -> atualizarObsGrupo, onRemover -> removerGrupoDraft, onToggleStatus ->
   novo toggler local (flip indicado/realizado no draft, sem chamada ao servidor — so grava no
   save).
4. Remover grupoDetalheAberto/setGrupoDetalheAberto (linhas 411, 1113 e adjacentes) — o "aberto"
   interno do RegistroCard assume; multiplos cards podem abrir ao mesmo tempo, igual a leitura
   hoje.
5. Autor do card em criacao: reaproveitar nome/CRO de qualquer ficha ja carregada deste mesmo
   dentistaId em evolutions (fallback: query em dentistas, mesmo padrao da busca de
   destinosDisponiveis, linhas ~540-556). assinada=false, registradoEm=new Date().toISOString().

**Verificavel:** abrir "Nova Evolucao", lancar um registro a mao ou via Dex — o card do rascunho
e literalmente o mesmo componente-fonte do card da ficha salva (nao duas arvores JSX parecidas).
Toggle de status e remover funcionam sem salvar; comparado contra o artefato nos dois temas, bate.
**Dependencias:** nenhuma (roda sobre o R-01, ja em prod).

### Fase 2 — Ordenacao por estado (Risco: MEDIO — depende da Decisao 1 e 3)

**Acoes (apos decisao):**
1. Funcao pura grupoEstaAberto(itens) — true se algum evento do grupo tem status=indicado — na
   mesma funcao de agrupamento da Fase 1.
2. Trocar o sort atual ((a,b) => dente(a) - dente(b), FichasTab.tsx:276 e :437) por: abertos
   primeiro, dente como criterio secundario — um lugar so, serve draft e salvo.

**Verificavel:** ficha com 1 grupo aberto e 2 fechados mostra o aberto no topo, nos dois modos.
**Dependencias:** Fase 1 (funcao de agrupamento unica) + Decisao 1/3 respondidas.

### Fase 3 — grupo_id reaproveitado COM confirmacao (Risco: MEDIO — Decisao 2 resolvida 25/07)

**Contrato (escopo minimo, sem migration — Opcao A):**

1. **Dados.** `buscarGruposAbertos(pacienteId, clinicaId)` (ja pronto, testado) devolve
   `GrupoAberto[]` (`grupoId`, `tipo`, `dentes[]`, `iniciadoEm`). Carregar UMA vez no contexto que
   monta o odontograma de criacao e passar como prop pro `ToothDetailPanel` — nunca buscar por
   dente aberto. (Reuso: a `FichasTab` ja carrega todos os eventos do paciente (linha ~575); a
   agregacao `agregarGruposAbertos` e pura e pode rodar client-side nesses dados, evitando
   round-trip novo. Decidir na execucao entre prop server vs. derivacao client — o que pagar menos.)

2. **Gatilho da confirmacao.** No `ToothDetailPanel`, ao o dentista criar um evento de tipo T no
   dente D, procurar em `gruposAbertos` um grupo com `tipo === T` e `dentes.includes(D)`. Se existir
   → abrir a confirmacao ANTES de inserir o draft. Se nao existir → comportamento de hoje
   (`grupo_id: null`), sem interrupcao.

3. **UI de confirmacao.** Reusa o padrao ja existente na `FichasTab` (`showDeleteConfirm`), nao e
   tela de marca — nao passa por design-brief. Copy: *"Continuar o trabalho aberto ({label do tipo},
   iniciado em {iniciadoEm formatado}) ou comecar um registro novo?"* Dois botoes: **Continuar**
   (reusa `grupoId`) · **Novo** (segue com `grupo_id: null`, como hoje). Multiplos grupos abertos do
   mesmo tipo+dente (raro) → oferecer o mais recente por `iniciadoEm`; os demais ignorados nesta
   fase (nota no codigo).

4. **Wiring.** Em "Continuar", o(s) draft(s) daquele ato de criacao recebem `grupo_id = grupoId`
   escolhido — todo o resto do fluxo de save (`salvarEventosOdontograma`) ja persiste o campo. Em
   "Novo", nada muda.

**Verificavel (G5):** numa consulta, a IA/voz cria uma coroa (nasce com grupo_id) e a deixa
`indicado`; noutra consulta do mesmo paciente, criar coroa no mesmo dente dispara a confirmacao;
"Continuar" grava o evento novo com o MESMO grupo_id (conferivel no banco); "Novo" grava com
grupo_id null. A ficha assinada nao muda (I5); autoria de cada evento intacta (I6).
**Fora desta fase:** tornar trabalho 100% manual (grupo_id null) continuavel — exige a lista de
tipos multi-consulta, que vem do Mateus (candidato a Fase 4 / R-15).
**Dependencias:** Fase 1 (funcao de agrupamento unica) + alicerce `buscarGruposAbertos` (pronto).

### Riscos e mitigacoes

| Risco | Probabilidade | Mitigacao |
|---|---|---|
| Unificar o card muda comportamento sutil que ninguem pediu | media | Declarado como mudanca deliberada (secao 3), nao regressao |
| Fase 3 codada em cima da leitura errada de "etapa derivada" | alta se pular a Decisao 1 | Fase 3 trancada atras da decisao explicita |
| Refatorar o agrupamento quebra caso de borda hoje coberto (orto/arcada) | baixa-media | Fase 1 mantem as duas chamadas ate confirmar paridade, so depois deleta o codigo antigo |

---

## Parte 2 — Contrato tecnico (Spec)

### TypeScript — extensao de RegistroCard

```typescript
// src/components/fichas/registro-card.tsx
export interface RegistroCardProps {
  data: RegistroCardData;
  children?: React.ReactNode;
  defaultOpen?: boolean;
  onToggleStatus?: () => void;
  destinosDisponiveis?: { id: string; nome: string }[];
  onEncaminhar?: (dentistaDestinoId: string | null) => void;
  // Novo (R-02): card em modo de edicao (rascunho, ainda nao salvo).
  editavel?: boolean;
  // So relevante com editavel=true — troca o paragrafo de observacao por input.
  onObservacaoChange?: (valor: string) => void;
  // So relevante com editavel=true — mostra o botao remover no header.
  onRemover?: () => void;
}
```

### Agrupamento unico (Fase 1)

```typescript
// assinatura provisoria — o nome/local exatos (arquivo proprio vs. inline) se decidem na execucao
export interface RegistroAgrupavel {
  id: string;
  grupoId: string | null;
  tipo: TipoRegistroOdontograma;
  status: StatusRegistro;
  ancora: AncoraClinica;
}
export function agruparRegistros<T extends RegistroAgrupavel>(
  itens: T[],
): Array<{ chave: string; itens: T[]; aberto: boolean }>;
```

### Etapa derivada (Fase 2/3 — Opcao A, se confirmada)

```typescript
// true se QUALQUER evento do grupo ainda esta indicado — nunca um campo persistido.
export function grupoEstaAberto(itens: { status: StatusRegistro }[]): boolean {
  return itens.some((e) => e.status === 'indicado');
}
```

### Database

Fase 0-2: nenhuma migration.

Fase 3, so se Decisao 1 = Opcao B (nao escrever antes da decisao):
```sql
-- migration 110 (condicional a Decisao 1 = Opcao B)
alter table public.odontograma_eventos add column etapa text;
-- lista de etapas validas por tipo entra como CHECK ou tabela de referencia —
-- definida junto com a lista que vem de voce, nao inventada aqui.
```

### Componentes

```
FichasTab            <- criacao E leitura chamam agruparRegistros() + RegistroCard
  RegistroCard        <- casca unica (header: tipo/ancora/estado/autor + corpo colapsavel)
    EndoForm / ImplanteForm     <- corpo editavel (criacao)
    EndoCard / ImplanteCard     <- corpo somente-leitura (salvo)
```

### Invariantes

- [ ] I1 — Existe um unico componente de card de registro; nenhum caminho (criacao ou leitura)
      desenha o header do registro por conta propria.
- [ ] I2 — Agrupamento por procedimento (mesmo grupo_id, ou mesmo dente+tipo+status sem grupo)
      usa uma unica funcao, chamada dos dois lugares — nunca duas implementacoes da mesma regra.
- [ ] I3 — Corpo de especialidade nunca renderiza sem dado (herdado do R-01, P3).
- [ ] I4 — "Grupo aberto" e sempre derivado dos eventos existentes (status), nunca um campo
      separado que possa dessincronizar — vale mesmo se a Decisao 1 escolher a Opcao B (a coluna
      nova seria rotulo de exibicao, nao fonte de verdade do aberto/fechado).
- [ ] I5 — Ficha assinada continua imutavel por inteiro (herdado, nao muda aqui).
- [ ] I6 — (Fase 3) Reaproveitar grupo_id entre fichas nunca reatribui a autoria do evento antigo
      — cada evento mantem seu proprio dentista_id/ficha_id; so o grupo_id e compartilhado.

### Gates de aceite

- [ ] G1 — Simbolos do odontograma comparados contra o catalogo do artefato, claro e escuro —
      sem divergencia (ou divergencias listadas e resolvidas antes de fechar).
- [ ] G2 — Card do rascunho e card da ficha salva vem do mesmo componente-fonte (RegistroCard) —
      confirmavel por grep: nenhum outro lugar renderiza header de registro.
- [ ] G3 — No rascunho: alternar status (planejado/realizado), editar observacao e remover um
      registro funcionam sem precisar salvar a ficha.
- [ ] G4 — Lista com grupos abertos e fechados mostra os abertos primeiro, nos dois modos
      (criacao e leitura) — depende da Decisao 1/3.
- [ ] G5 — (Fase 3, se aplicavel) Lancar um registro de coroa numa consulta e continua-lo numa
      consulta seguinte reaproveita o mesmo grupo_id, sem digitacao extra.
- [ ] G6 — npx tsc --noEmit limpo, nenhum any novo.
- [ ] G7 — Testado com o mesmo paciente/ficha usado no dogfood do R-01, comparando visualmente
      lado a lado com plans/_arquivo/artefatos/R-01-ficha-registro.html.

## 6. Referencia visual

Tokens de cor/tipografia/raio: ja extraidos e congelados na spec do R-01
(plans/_arquivo/specs/R-01-registro-unidade-salvamento.md, secao 12) — mesmo artefato, nao repito
aqui (CLAUDE.md: nao duplicar entre documentos).

Catalogo de simbolos (R-01-ficha-registro.html, linhas 823-884) — ja implementado em
Odontograma.tsx, tabela de conferencia da Fase 0:

| Simbolo | Regra visual | Implementado em |
|---|---|---|
| Carie a restaurar / restauracao feita | crown tint coral/teal via color-mix | ToothSVG linha ~192 |
| Restauracao antiga (pre-existente) | textura pontilhada sobre a coroa | needsDots, linha 244/335 |
| Canal a tratar / tratado | silhueta vazia (contorno) vs. preenchida | canalPaths, linha 279-290 |
| Lesao periapical | circulo vazado no apice | linha 317-319 |
| Extracao indicada | X coral sobre a coroa | linha 358-363 |
| Extraido | so contorno tracejado (vaga) | branch resumo.ausente, linha 178-185 |
| Implante instalado | **parafuso na raiz — corpo afunilado + roscas horizontais + plataforma, alargado ~3px** (revisao 24/07; codigo atual desenha capsula+curva, PORTAR) | linha 293-314 |
| Pino / nucleo | **haste no canal + nucleo triangular no colo** (revisao 24/07; codigo atual = cápsula+curva, PORTAR) | linha 316-336 |
| Selante | ponto na oclusal | linha 345-347 |
| Fratura | zigue-zague na coroa | linha 350-355 |
| Coroa total | **capa com hachura diagonal sobre a coroa** (revisao 24/07; codigo atual = contorno duplo, PORTAR) | linha 361-364 |

Comportamento que o artefato mostra e nao e so cor: ao abrir um dente, os registros DAQUELE dente
saem da lista geral de baixo (linhas 470-560 do artefato) — preservar isso na Fase 2, a ordenacao
por estado se aplica a lista geral, nao ao painel do dente aberto.
