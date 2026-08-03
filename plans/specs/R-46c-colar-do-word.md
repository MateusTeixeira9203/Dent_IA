# R-46c — Colar do Word (nível 1, sem IA)

> **SPEC** · sub-item do **R-46** · 🔵 ativo
> **Aberto:** 2026-08-01 · **Fechado:** — · **Fase:** **aprovada** (03/08 — emendada pro
> cockpit real, escopo confirmado: upload/colar sem IA, D7; organizar com Dex vira R-46d)
> **Modelo:** Sonnet 5 (migration de 1 linha + wrapper fino + 2 pontos de exibição; sem IA,
> sem RLS nova, sem modelo de dado novo).
> **Depende de:** nada codado — `salvarFicha` (R-11) e o input de data retroativa já existem.
> **Bloqueia:** R-46d (colar nível 2 estrutura o texto que esta fatia traz).
> **Artefato:** [R-46-ficha-dia.html](../artefatos/R-46-ficha-dia.html) §2, zona "o antes".
>
> ⚠️ **CORREÇÃO 01/08 — a spec abaixo assume colar texto; ele quer SUBIR ARQUIVO.**
> Achado depois de escrita: `mammoth`, `officeparser` e `pdf-parse` **já estão instalados** e
> `/api/extrair-texto` já aceita `.docx`/`.doc`/`.pdf`/`.txt`, extraindo em memória sem
> persistir. Upload não é construção nova — é ligar o que existe. **O contrato dos §7/§10
> muda** (ganha o upload; a textarea vira o fallback de colar). Duas consequências:
> **(a)** o limite de 5000 chars de `anotacoes` (§5) deixa de ser hipótese remota — um `.docx`
> com 3 anos de histórico estoura fácil, então virou a A2 abaixo; **(b)** a UI deixa de morar
> no empty-state e passa a ser a **aba da coluna esquerda do cockpit** — ou seja, esta fatia
> agora depende do redesign, e o §10 se resolve lá. O resto da spec (migration, `importado`,
> exibição honesta, invariantes, gates) continua valendo inteiro.
>
> ⚠️ **EMENDA 03/08 — o cockpit saiu do papel; §7 e §10 abaixo referenciam arquivos que não
> existem mais.** `contexto-coluna.tsx` foi deletado (virou 3 blocos independentes) e
> `MeuDiaUltimaVisita` virou `MeuDiaVisita[]` (histórico inteiro, não só a última). Fixado:
>
> - **§10** — o botão de colar mora no `historico-bloco.tsx` (coluna esquerda), no estado vazio
>   dele: *"Sem histórico no sistema ainda — o contexto nasce nesta consulta."*
>   (`historico-bloco.tsx:44-47`), condição `visitas.length === 0`. **O achado 4 (paciente com
>   pendência mas sem ficha nunca via o botão) já morreu de graça no redesign** — o cockpit
>   separou histórico de pendência/orto em blocos independentes, então `visitas.length === 0`
>   não carrega mais a mistura que o `semNadaAinda` antigo tinha. Nenhum trabalho extra aqui.
> - **§7** — `MeuDiaUltimaVisita` não existe. D5 aplica-se agora a `MeuDiaVisita` (a interface
>   já existe em `get-meu-dia.ts`, ganha 1 campo): `visitas.map` calcula `resumo` como
>   `queixa_principal || procedimentos.slice(0,2).join() || 'Evolução'` — uma ficha importada
>   (`queixa_principal`/`procedimentos` vazios por §5) cai no MESMO `'Evolução'` que o achado 6
>   original descrevia. A correção é a mesma, só o lugar mudou.
> - **`historico-bloco.tsx`** ganha o botão + usa o novo campo pra rotular a visita importada
>   (nunca "Consulta realizada" — I3 continua valendo, é do domínio, não da tela).
>
> Nada do resto (D1-D7, migration §6, wrapper §9, invariantes I1-I7) muda — é só onde a UI
> pousa e qual arquivo o D5 toca.

## 1. O problema

O histórico de 3 anos do dentista mora numa tabela do Word. Ele abre o Meu dia, o paciente
tem 8 anos de tratamento, e a coluna do antes diz *"Sem histórico no sistema ainda"* — o
sistema mente, e o dentista continua consultando o Word em paralelo. Enquanto o antes vive
fora, o Meu dia não substitui nada.

## 2. Achados que mudaram o recorte (verificados no código/banco, 01/08)

| # | Achado | Consequência |
|---|---|---|
| 1 | `fichas_origem_check` só aceita `modo_consulta\|manual` (constraint real no banco) | `importado` exige **migration** |
| 2 | `fichas.origem` **nunca é exibido em lugar nenhum** — a timeline nem seleciona a coluna (`get-visible-timeline-events.ts:95`), o PDF também não (`pdf/route.ts:19`) | O "marca importado visível" é código de exibição novo em 2 lugares, não um flag existente |
| 3 | A timeline rotula **toda** ficha como `'Consulta realizada'`, hardcoded (`:198`) | Sem mudar isso, um bloco importado se apresenta como um atendimento que aconteceu — **mentira no prontuário**. Vira I3, não polish |
| 4 | O empty-state do Meu dia só aparece com `semNadaAinda` (nem ficha, nem pendência, nem orto — `contexto-coluna.tsx:64`) | Paciente com histórico no Word **e** uma pendência no sistema nunca veria o colar |
| 5 | `salvarFicha` barra `role === 'secretaria'` (`:136`) **e** a rota do Meu dia redireciona secretária (`meu-dia/page.tsx:23`) | D14 está bloqueado em 2 camadas — ver D3 |
| 6 | `MeuDiaUltimaVisita.resumo` cai em `'Evolução'` quando não há queixa nem procedimento (`get-meu-dia.ts:332`) | Ficha importada apareceria como "Evolução" na própria coluna que ela existe pra preencher — ver D5 |

**Já existe, não construir:** input de data retroativa (`FichasTab.tsx:1817`), ordenação
retroativa na timeline (usa `data_atendimento`), imutabilidade pós-assinatura (`assinado_em`
barra o update), e o PDF já imprime `anotacoes` como "Anotações".

## 3. Decisões (dele, 01/08)

| # | Decisão | Alternativa descartada |
|---|---|---|
| **D1** | **1 colagem = 1 ficha com o histórico todo**, uma data só | 1 ficha por visita (fiel, mas N colagens — o atrito que o R-46 existe pra matar) · fatiar por regex de data (erra formato → dado clínico errado) |
| **D2** | Vive em **2 lugares**: Meu dia (coluna do antes) e perfil do paciente (`FichasTab`) | Só no Meu dia (some pra quem tem pendência — achado 4) |
| **D3** | **Só dentista/admin nesta fatia. D14 fica pra depois** | Construir o caminho da secretária junto (mexeria em escrita clínica por role — decisão de risco, item próprio) |
| **D4** | Ficha importada **não finge ser atendimento**: timeline e PDF a rotulam como histórico transcrito (consequência direta do achado 3) | Badge decorativo mantendo "Consulta realizada" |
| **D5** | O resumo da "última visita" no Meu dia usa um **trecho do texto colado** quando `origem='importado'` | Deixar cair no `'Evolução'` (achado 6 — entregaria a metade que não resolve o problema) |
| **D6** | `status='concluida'` — registro histórico fechado, não trabalho em aberto | `'aberta'` (o default de `manual`) |
| **D7** | Texto entra **tal qual**: zero parsing, zero normalização, zero IA | Qualquer limpeza automática — é nível 1 por definição; estruturar é R-46d |

## 4. Escopo

**Cobre:** migration do `origem='importado'` · wrapper de escrita · UI de colar nos 2 lugares ·
exibição honesta na timeline, no PDF e na coluna do Meu dia.

**Não cobre:** estruturar o texto em registros (R-46d) · secretária colar (D3/D14) · importar
em lote/mutirão (a spec-mãe já veta: "sob demanda, paciente a paciente") · editar o texto
depois de colado pela UI de colar (edita pela ficha normal, como qualquer outra).

## 5. Assunções declaradas

- O texto colado cabe no limite atual de `anotacoes` no Zod (`max(5000)`). **Se o dentista
  colar 3 anos de tabela, estoura.** → o wrapper valida e devolve erro claro em vez de
  truncar em silêncio (I5). Se 5000 se mostrar apertado na prática, subir o teto é decisão
  dele, não minha — truncar prontuário nunca.
- `queixa_principal` fica **vazia** na ficha importada: o rótulo vem de `origem`, fonte única.
  Escrever "Histórico importado" ali seria string mágica em campo clínico.

## 6. Database

```sql
-- supabase/migrations/20260801xxxxxx_127_fichas_origem_importado.sql
alter table fichas drop constraint fichas_origem_check;
alter table fichas add constraint fichas_origem_check
  check (origem in ('modo_consulta', 'manual', 'importado'));
```

Só isto. Sem coluna nova, sem índice novo, sem RLS nova (`fichas` já é silo por clínica +
autoria). Reversível: o `drop`/`add` inverso, e nenhuma linha existente usa o valor novo.

## 7. TypeScript — contratos

```typescript
// src/server/patients/salvar-ficha.ts — o union ganha o 3º valor
export type OrigemFicha = 'modo_consulta' | 'manual' | 'importado';

// salvarFichaSchema: z.enum(['modo_consulta', 'manual', 'importado'])
// Derivação de status no create passa a ser explícita:
//   modo_consulta → 'concluida' · importado → 'concluida' (D6) · manual → 'aberta'
```

```typescript
// src/server/patients/importar-historico.ts — NOVO. Wrapper fino, mesmo padrão do
// salvarVisitaMeuDia (R-46b2): fixa a origem no servidor e valida o que só ele sabe.
export async function importarHistoricoDoWord(dados: {
  pacienteId: string;
  /** 'YYYY-MM-DD'. Nunca futura (I4). */
  dataAtendimento: string;
  /** O texto colado, tal qual (D7). */
  texto: string;
}): Promise<SalvarFichaResult>;
```

```typescript
// src/components/pacientes/colar-do-word-dialog.tsx — NOVO. Um componente, 2 chamadores.
export interface ColarDoWordDialogProps {
  pacienteId: string;
  pacienteNome: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Meu dia passa router.refresh(); o perfil passa o refetch das fichas. */
  onImportado: () => void;
}
```

```typescript
// src/server/dashboard/get-meu-dia.ts — MeuDiaVisita (já existe, R-55) ganha 1 campo (D5)
export interface MeuDiaVisita {
  fichaId: string;
  data: string;
  dentistaNome: string;
  resumo: string;
  nota: string | null;
  eventos: MeuDiaEventoVisita[];
  /** R-46c — true quando `fichas.origem === 'importado'`. `historico-bloco.tsx` rotula a
   *  visita como histórico transcrito e o `resumo` vira trecho do texto colado, não
   *  'Evolução' (mesmo defeito do achado 6, lugar novo). Cálculo: 1ª linha de `anotacoes`
   *  quando `importado`, senão a regra atual (`queixa_principal || procedimentos.join`). */
  importado: boolean;
}

// src/server/patients/get-visible-timeline-events.ts — o tipo do evento ganha o discriminante
export type TimelineEventType = /* …os 7 de hoje… */ | 'history_imported';
```

## 8. Zod

```typescript
// importar-historico.ts
const importarSchema = z.object({
  pacienteId:      z.string().uuid(),
  dataAtendimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  texto:           z.string().trim().min(1, 'Cole o texto antes de salvar.').max(5000),
});
// A regra "não pode ser futura" fica FORA do Zod (precisa de hojeBRT() no servidor) —
// checada no wrapper, com mensagem própria.
```

## 9. Mapeamento pro `salvarFicha` existente

| Campo | Valor na importação |
|---|---|
| `origem` | `'importado'` — **é o que dispara tudo**: status, rótulo e não-efeito |
| `fichaId` | ausente (sempre create) |
| `agendamentoId` | **ausente** — não existe agendamento; garante I1 |
| `dataAtendimento` | a data escolhida (retroativa) |
| `anotacoes` | o texto colado, tal qual |
| `queixaPrincipal`, `conduta` | `''` (assunção §5) |
| `dentesAfetados`, `dentesObservacoes`, `procedimentos`, `odontogramaEventos` | vazios — nível 1 não estrutura nada (D7) |

## 10. Componentes

```
ColarDoWordDialog                        ← Client. Dialog + textarea + input de data
  ├─ chamado por: historico-bloco.tsx    (Meu dia — botão no estado vazio, visitas.length === 0)
  └─ chamado por: FichasTab.tsx          (perfil — botão ao lado de "Nova Evolução")
```

| Onde | Quando o botão aparece |
|---|---|
| Meu dia (`historico-bloco.tsx:44-47`) | Quando **`visitas.length === 0`** — substitui/acompanha o texto "Sem histórico no sistema ainda". Já é independente de pendência/orto por construção do cockpit (blocos separados) — o achado 4 não existe mais nesta versão |
| Perfil (`FichasTab.tsx`) | Sempre, ao lado de "Nova Evolução", sob o mesmo `canWrite` que já gateia aquele CTA |

Exibição (D4) — os 2 pontos que precisam mudar:

| Arquivo | Mudança |
|---|---|
| `get-visible-timeline-events.ts` | Passa a selecionar `origem`; ficha com `origem='importado'` vira `type: 'history_imported'`, título **"Histórico importado"** (nunca "Consulta realizada") |
| `pdf/route.ts` + `prontuario-html.ts` | Passa a selecionar `origem`; o badge do topo (hoje `queixa_principal ?? 'Evolução'`) vira **"Histórico importado — transcrito do registro anterior"** quando `importado` |

## 11. Invariantes

- [ ] **I1** — Importar **nunca** fecha agendamento nem notifica secretária. Garantido por
      construção: o bloco de efeitos exige `origem === 'modo_consulta' && agendamentoId`
      (`salvar-ficha.ts:286`), e a importação não manda nenhum dos dois.
- [ ] **I2** — O texto gravado é **byte a byte** o texto colado (D7). Nenhum trim além do
      `.trim()` das pontas, nenhuma normalização, nenhuma quebra reescrita.
- [ ] **I3** — Ficha importada **nunca se apresenta como atendimento** — nem na timeline,
      nem no PDF, nem na coluna do Meu dia. É a invariante de honestidade do prontuário
      (achado 3); se algum lugar novo passar a listar fichas, herda esta regra.
- [ ] **I4** — `dataAtendimento` nunca é futura (`> hojeBRT()` → erro, não gravação).
- [ ] **I5** — Texto acima do limite **falha com mensagem clara**; nunca trunca (§5).
- [ ] **I6** — Só dentista/admin. Herdado de `salvarFicha:136`; a UI também esconde o botão
      (defesa em profundidade, não substituto do servidor).
- [ ] **I7** — `origem` nunca muda depois de criada — herdado: o ramo de update do
      `salvarFicha` não aceita o campo (`:161-176`). Editar uma ficha importada pela ficha
      rápida não a converte em `manual`.

## 12. Gates de aceite

Rodar em localhost, logado como dentista, num paciente de teste.

- [ ] **G1** — Colar um texto + escolher data de 6 meses atrás → 1 linha nova em `fichas`
      com `origem='importado'`, `status='concluida'`, `data_atendimento` = a escolhida, e
      `anotacoes` **idêntico** ao colado (conferir no banco, não na tela).
- [ ] **G2** — A ficha aparece na timeline do paciente como **"Histórico importado"** —
      e **não** como "Consulta realizada" (prova direta do I3/achado 3).
- [ ] **G3** — O PDF da ficha marca a importação no badge do topo.
- [ ] **G4** — A ficha ordena pela data retroativa na timeline (entre os eventos daquele mês,
      não no topo).
- [ ] **G5** — Data futura → erro visível, nada gravado (I4).
- [ ] **G6** — Texto acima do limite → erro claro, nada gravado, nada truncado (I5).
- [ ] **G7** — **Conferir no banco:** nenhum agendamento mudou de status e nenhuma
      notificação foi criada pela importação (I1).
- [ ] **G8** — No Meu dia, o paciente que só tem a ficha importada mostra o trecho do texto
      no bloco Histórico (`historico-bloco.tsx`, prévia da visita mais recente) — não a
      palavra "Evolução" (D5/achado 6, agora em `MeuDiaVisita.resumo`).
- [ ] **G9** — No Meu dia, o botão de colar aparece pra paciente **com pendência aberta e
      sem ficha** (bloco "A fazer" tem item, bloco "Histórico" está vazio) — prova de que o
      achado 4 não voltou com o redesign dos blocos independentes.
- [ ] **G10** — Dark e light conferidos no dialog.

## 13. Riscos

| Risco | Mitigação |
|---|---|
| Dentista cola 3 anos e estoura o limite de 5000 | G6 falha alto com mensagem clara; subir o teto é decisão dele com o dado real na mão |
| Ficha importada polui a métrica §6 do R-46 (% de `completed` com ficha no mesmo dia) | A régua da métrica é `data_atendimento` = dia do agendamento; ficha retroativa sem agendamento não entra. **Conferir ao medir** |
| "Histórico importado" vira desculpa pra não registrar no sistema | É o oposto do objetivo — monitorar se importação cresce enquanto registro do dia não |

## 14. Abertas

- **A1 · D14 (secretária cola o nível 1)** — adiada por D3. Vira item próprio; exige decidir
  se secretária ganha escrita clínica restrita por origem, e por qual superfície (a rota do
  Meu dia a redireciona hoje).
