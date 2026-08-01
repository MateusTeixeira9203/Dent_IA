# R-46b — Registrar no Meu dia

> **SPEC** · sub-item do **R-46** · fase **plano escrito, aguardando aprovação** (31/07)
> **Modelo:** Sonnet 5 + `[opus]` nas 2 partes marcadas — envolve dado clínico e reduce de
> estado, não é troca de rota como o R-46g.
> **Depende de:** R-46a + R-46g (no ar). **Bloqueia:** R-46b2 (salvar e chamar próximo — sem
> `eventosDraft` aqui, não tem o que salvar lá).
> **Artefato:** [R-46-ficha-dia.html](../artefatos/R-46-ficha-dia.html) §2, zonas "Registrar" e
> "Registros de hoje". **Pesquisa de código:** 3 varreduras completas (não excertos) em
> `Odontograma.tsx`, `ToothDetailPanel.tsx`, `consulta-client.tsx`, `arcadas.ts`,
> `FichasTab.tsx`, schema de `procedimentos`/`orcamento_itens` — achados abaixo, com
> arquivo:linha real.

## 1. Correção ao artefato — reuso é menor do que parecia

O artefato descreve "chips região + popover FDI... os mesmos [R-07]" como reuso. **Não é.**
Existem hoje **dois mecanismos de quadrante que não convertem entre si**:

- **Legado**: sentinelas numéricas 91-99 (`src/lib/arcadas.ts`), vivem dentro de
  `dentes_afetados: int[]`, servem o modelo antigo (`dentes_observacoes` por ficha).
- **Moderno**: `QuadranteFDI` (`1-4` permanente, `5-8` decíduo) direto em
  `odontograma_eventos.quadrante` — é o que o bloco real marcado "R-07" usa
  (`FichasTab.tsx:2006-2066`, chips de profilaxia/flúor/clareamento/exame periodontal +
  raspagem por quadrante) e o que a RPC 107 grava.

**Decisão (D1):** R-46b usa o **moderno** — é o único caminho compatível com
`odontograma_eventos`/RPC 107, que é o que o Meu dia lê e vai escrever. Os sentinelas de
`arcadas.ts` ficam de fora — pertencem ao modelo de ficha que R-46 já está substituindo.

**Popover FDI multi-toque também não existe** — nem a peça `Popover` do shadcn está
instalada no projeto (`src/components/ui/popover.tsx` não existe). Ver D3.

## 2. O que é reuso de verdade (verificado, não do artefato)

| Peça | Onde | Contrato |
|---|---|---|
| Pintura da boca + seleção | `Odontograma.tsx` (1132 linhas) | `eventos={draft} selectedTeeth={[]} onToothToggle={setDenteAberto} compact hideFilters` — é literalmente o que `consulta-client.tsx` já monta |
| Painel de detalhe por dente | `ToothDetailPanel.tsx` (870 linhas) | `dente, eventos (array COMPLETO), onChange (devolve array COMPLETO), onClose, dataPadrao, gruposAbertos?` |
| Lista agrupada por dente ("Registros de hoje") | `ToothGroupList` (`consulta/[agendamentoId]/_components/tooth-group-list.tsx`, 164 linhas) | Já existe pronto — mesmo padrão R-21 do artefato, já chama `setDenteAberto` ao clicar |
| Chips de arcada | `arch-chips.tsx` (50 linhas) — só arcada, sem quadrante | Copiar o padrão, estender com os quadrantes `1-4` do jeito que `FichasTab.tsx:2006` já faz |
| `gruposAbertos` (trabalho aberto no mesmo dente) | `getGruposAbertos(pacienteId)` — já é server action | 1 fetch no mount, igual `consulta-client.tsx` |
| Persistência | `salvarFicha` (`server/patients/salvar-ficha.ts`) + RPC `salvar_eventos_odontograma` | Contrato completo no R-46b2 — aqui só monta o rascunho, não salva |

### 2.1 Invariante mais fácil de quebrar

**`ToothDetailPanel.eventos` é a lista INTEIRA do rascunho, nunca filtrada por dente — e
`onChange` devolve a lista INTEIRA editada.** Se a tela nova passar só os eventos do dente
aberto, o `onChange` apaga silenciosamente os eventos dos outros dentes do rascunho. É o
achado mais perigoso da pesquisa — vira invariante I1.

## 3. Catálogo de procedimentos — decisão dele, 31/07

Pesquisa confirmou: **não existe typeahead em lugar nenhum do app** (Orçamentos usa
`<Select>` alfabético sem busca — `orcamentos-client.tsx:1987`) e **não existe nenhuma
coluna ou query de frequência de uso** (grep negativo em `supabase/migrations` e `src/`).
Construir "ordem aprendida do uso" do zero exigiria uma query nova (`unnest` em
`fichas.procedimentos` + `orcamento_itens`, com fallback pra `descricao` onde
`procedimento_id` é nulo) sobre dado heterogêneo (`fichas.procedimentos` mistura texto
livre com os 16 rótulos fechados de `TIPO_LABEL`).

**Decisão (D2):** **não constrói frequência.** Ele decidiu 31/07 — "sugerir frequência de
uso é muito relativo, vamos usar o que já está no sistema". Typeahead busca na tabela
`procedimentos` (privada por dentista desde a migration 084, `nome`+`categoria`+
`preco_padrao`), ordem alfabética — o mesmo catálogo e a mesma ordem que Orçamentos já usa,
só com busca incremental em vez de dropdown estático. **Isso descarta a A-aberta do R-46
sobre "MAIS USADOS DA CLÍNICA" do artefato** — não é mais o desenho.

`src/types/database.ts:114-126` (`Procedimento`) está desatualizado (falta `dentista_id`) —
corrigir junto, é trivial.

## 4. FDI popover — construção nova, mas pequena

Sem `Popover` instalado e sem grid FDI leve pronto. Duas opções:

| Opção | Custo | Risco |
|---|---|---|
| **(A) Instalar `Popover` do shadcn + grid numérico novo** | Médio — geometria de números já existe em `TEETH_UPPER`/`TEETH_LOWER` (exportados de `Odontograma.tsx`), só falta o layout leve | Componente a mais pra manter |
| **(B) Reusar o `Odontograma` inteiro dentro de um `Dialog`** (já existe `dialog.tsx` no projeto, shadcn) | Baixo — zero componente novo, `compact hideFilters` já deixa ele pequeno | Mais pesado visualmente que um popover simples (SVG anatômico pra só marcar presença) |

**Recomendação (D3): (A), grid leve.** O `Odontograma` desenha a boca inteira (faces,
cores, símbolos) — overkill pra "só marcar quais dentes", e abrir um SVG anatômico dentro de
um popup pequeno é mais peso visual do que o gesto pede. Grid de números (18 células por
arcada, toggle decíduos) é ~40 linhas reaproveitando os arrays já exportados. Ele decide se
concorda antes de codar.

## 5. "Fazer hoje →" — dado que falta

`MeuDiaPendencia` (`get-meu-dia.ts:25-33`) tem `{id, tipo, dente, arcada, quadrante,
registradoEm, dentistaNome}` — falta `origem`, `faces`, `papel_no_grupo` pra virar um
`OdontogramaEventoDraft` de verdade. **D4:** `get-meu-dia.ts` passa a selecionar essas 3
colunas a mais na mesma query de `odontograma_eventos` que já existe (zero query nova) — só
não vinham porque pendência, até aqui, era só exibição.

## 6. Contrato técnico

```typescript
// meu-dia/_components/registrar-painel.tsx — novo. Estado levantado aqui, não no pai.
const [eventosDraft, setEventosDraft] = useState<OdontogramaEventoDraft[]>([]);
const [denteAberto, setDenteAberto] = useState<number | null>(null);
const [gruposAbertos, setGruposAbertos] = useState<GrupoAberto[]>([]);
const [textoVisita, setTextoVisita] = useState('');

// "Fazer hoje →" numa pendência: converte MeuDiaPendencia (+ D4) num draft e ABRE o painel
// do dente já com ele — nunca insere direto sem o dentista ver (mesma regra do Dex: nunca
// aceitar sem revisão, mesmo vindo de uma pendência já conhecida).
function fazerHoje(p: MeuDiaPendencia): void;
```

```typescript
// Odontograma + ToothDetailPanel — exatamente o contrato de consulta-client.tsx (§2).
<Odontograma eventos={eventosDraft} selectedTeeth={[]} onToothToggle={setDenteAberto} compact hideFilters />
{denteAberto != null && (
  <ToothDetailPanel dente={denteAberto} eventos={eventosDraft} onChange={setEventosDraft}
    onClose={() => setDenteAberto(null)} dataPadrao={hojeBRT()} gruposAbertos={gruposAbertos} />
)}
<ToothGroupList eventos={eventosDraft} onDenteClick={setDenteAberto} />
```

`eventosDraft` sobe pro componente pai (`meu-dia-client.tsx` ou um novo state manager da
rota) — R-46b2 é quem lê esse estado pra chamar `salvarFicha`.

## 7. Invariantes

- [x] **I1** — `ToothDetailPanel` sempre recebe/devolve o array **completo** de
      `eventosDraft`, nunca filtrado por dente (§2.1). Confirmado por leitura do código
      (`registrar-painel.tsx`); não clicado ao vivo.
- [x] **I2** — Chips de região gravam `QuadranteFDI`/`AncoraClinica` (moderno), nunca os
      sentinelas de `arcadas.ts` (legado) — `onde-seletor.tsx` não importa `arcadas.ts`.
- [x] **I3** — **Reescrita na implementação (31/07), aceita por ele (01/08 — "gostei
      bastante").** Texto original dizia "nunca insere sem abrir o painel primeiro"
      (disciplina do Dex). Implementado diferente: "fazer hoje" insere direto (reusando o
      `id` real — fecha a pendência por upsert, nunca cria fantasma) e o registro fica
      imediatamente visível e clicável no `ToothGroupList` pra revisão/detalhe depois.
      Diferença do caso Dex: ali é a IA propondo às cegas; aqui é o dentista clicando um
      rótulo que ele mesmo já tinha indicado — é o próprio ato de revisão. Comportamento
      final, não muda mais sem nova decisão.
- [x] ~~I4~~ **Não se aplica mais** — o typeahead não usa o catálogo `procedimentos`
      (ver §1-bis abaixo), usa `TIPO_LABEL`, que é global, não por dentista.
- [x] **I5** — Nada aqui salva no banco. Confirmado por grep: `registrar-painel.tsx`,
      `onde-seletor.tsx`, `fdi-popover.tsx` não têm nenhuma chamada Supabase — só
      `getGruposAbertos` (leitura). `eventosDraft`/`textoVisita` ficam locais até o R-46b2.

### 7.1 A3 resolvida (01/08) — busca única, catálogo vira `observação`

Decisão dele: "vamos usar o nome comercial". Dado real checado (query no `procedimentos` de
produção) confirmou o problema do §7.1 original — categoria não é um de-para confiável:
"Geral" (76 linhas) mistura "Ajuste Oclusal", "Exodontia", "Prótese Total" sem padrão;
"Prevenção" tem `fluor` E `selante` na mesma categoria. Auto-mapear por categoria seria
adivinhar em cima de prontuário de qualquer forma — descartado.

**Desenho implementado:** 1 busca só. Digitar mostra os 16 tipos estruturais (`TIPO_LABEL`,
sempre visíveis) **e** o catálogo comercial (`catalogoProcedimentos`, só aparece digitando —
são 250+ linhas reais, listar tudo por padrão seria ruído; limitado a 8 resultados). Escolher
um tipo estrutural registra direto, sem mudança. Escolher um item do catálogo NÃO registra
sozinho — abre um prompt "'{nome}' — qual tipo clínico?" com os 16 chips; escolher um
completa o registro com esse tipo **e** o nome comercial como `observação` do evento. Zero
inferência automática, 1 toque a mais só no caminho do catálogo. Verificado ao vivo
(01/08): busca "limp" → achou "Limpeza (profilaxia)" do catálogo real, prompt apareceu,
escolhi "Profilaxia" → draft correto (tipo=profilaxia, quadrante certo, status certo).

## 8. Gates de aceite

31/07: verificação ao vivo ficou parcial (pane do browser intermitente, só renderização
estrutural). **01/08: clique real** (dispatch de evento fiel — pointerdown/mouseup/click, não
só `.click()` — via script, o pane continuou instável pra tela) em cima do dev server rodando,
com prova cruzada no banco pra G4/salvar.

- [x] **G1** — Digitar filtra `TIPO_LABEL` **e** `catalogoProcedimentos` juntos (§7.1/A3).
      Verificado ao vivo: "limp" achou "Limpeza (profilaxia)" do catálogo real.
- [ ] **G2** — Escolher tipo + tocar 3 dentes na grid FDI → 3 eventos no rascunho (1 por
      dente — lote multi-dente). Não testado (só toque de 1 dente por vez foi verificado).
- [ ] **G3** — Abrir `ToothDetailPanel` de um dente, editar, fechar → os OUTROS dentes do
      rascunho continuam intactos (prova direta do I1). Não testado ao vivo.
- [x] **G4** — "Fazer hoje" numa pendência insere direto (ver I3) e o item aparece no
      `ToothGroupList`. Verificado ao vivo: chip "Implante · fazer hoje →" → draft
      "16 · 1º Molar · Implante · Feito", chip vira "Implante ✓" desabilitado.
- [x] **G5** — `ToothGroupList` reflete o rascunho em tempo real. Verificado em todo teste
      desta sessão (typeahead, fazer-hoje, catálogo) — a contagem e o conteúdo sempre
      bateram com o que foi registrado.
- [ ] **G6** — Dark e light conferidos nos componentes novos (grid FDI, painel de registrar).

## 9. Abertas

- ~~A1~~ **FECHADA** — codado com a opção (A), grid leve. Bônus achado na implementação:
  `@base-ui/react` (já dependência do projeto — é o que `dialog.tsx` usa) já tem `popover` e
  `combobox` prontos — **zero pacote novo instalado**, nem o que a spec previa (`shadcn
  Popover`). Wrappers em `src/components/ui/popover.tsx` e `combobox.tsx`.
- ~~A2~~ **FECHADA** — textarea simples, sem formatação, como assumido.
- ~~A3~~ **FECHADA 01/08** — busca única + catálogo vira observação, tipo sempre confirmado
  à mão. Ver §7.1.
- ~~A4~~ **FECHADA 01/08** — aceito como implementado ("gostei bastante"). Ver I3.
