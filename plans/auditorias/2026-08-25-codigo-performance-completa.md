# Auditoria completa de código e fluidez — 25/08/2026

> Escopo: repositório inteiro, com foco em fluidez em celulares/computadores modestos,
> carregamento, renderização, consultas, efeitos, dependências, testes e código morto.
> Auditoria read-only: nenhum arquivo de produção foi removido ou refatorado nesta etapa.

## Veredito executivo

O sistema compila e o TypeScript está limpo, mas a fluidez ainda não está protegida por
arquitetura nem por gates automáticos. O principal desperdício confirmado não é o visual:
é o **Dex buscando quatro endpoints em toda entrada/navegação do dashboard mesmo fechado**.
Esses endpoints contêm até 24 pontos de consulta ao Supabase e ainda são recarregados por
qualquer `INSERT` em `notificacoes`.

O segundo risco é crescimento sem limite: Meu Dia e Ficha Completa carregam o histórico
clínico inteiro dos pacientes envolvidos. Hoje pode parecer rápido com bases pequenas, mas o
custo aumenta junto com o prontuário. O terceiro risco é de entrega: lint não bloqueia CI,
não existe script de testes e três testes nem iniciam por alias não resolvido.

Há código morto confirmado, mas ele **não é a causa principal da lentidão em produção**,
porque não entra nos bundles ativos. Sua remoção reduz confusão, tempo de lint/build e risco
de alguém reutilizar implementação antiga.

## Cobertura e medições

- 31 páginas, 41 endpoints e cerca de 500 arquivos em `src`.
- 177 arquivos client-side.
- `typecheck`: aprovado.
- `build`: aprovado; compilação em 21,4 s, 62 páginas geradas em 12,1 s, cerca de 55 s total.
- ESLint em `src`: **17 erros e 65 avisos**.
- Testes Node: 100 encontrados; 97 aprovados; 3 não iniciaram por alias `@/` não resolvido.
- `npm audit --omit=dev`: 13 vulnerabilidades (10 altas, 2 moderadas, 1 baixa).
- 46 chamadas de `router.refresh()`, 202 usos de `transition-all`, 33 de `backdrop-blur`,
  39 `setTimeout`, 10 `setInterval` e 63 arquivos com Motion.
- `.claude/worktrees`: 1,46 GB; `.next`: 4,02 GB. São custos locais, não payload de produção.
- Manifestos do build foram usados como **limite superior bruto**, não como bytes transferidos.
  Chunks de rota mais relevantes: Agenda 129 KB, Configurações 103 KB, Orçamentos 79 KB,
  Meu Dia 68 KB e layout do dashboard 50 KB, antes de compressão e chunks compartilhados.

## Achados priorizados

### C1 — Alto — Dex faz trabalho pesado mesmo fechado

**Evidência:** `DashboardShell` sempre monta `DexWidget`. O widget chama `useDexHub()` antes
de verificar se o modal está aberto. O hook dispara, ao montar, quatro requests em paralelo:
`/api/dex/alerts`, `/api/dex/context`, `/api/dex/retencao` e `/api/dex/mes`. Somados, esses
handlers têm 24 chamadas `.from()`. O realtime global repete o carregamento completo a cada
nova notificação.

**Impacto:** toda rota autenticada paga rede, CPU server-side e queries que só são necessárias
quando o dentista abre o painel. Em internet móvel, isso compete com os dados da tela principal.

**Correção:** manter globalmente apenas um badge leve; carregar contexto, retenção e números
quando o painel abrir. Deduplicar/cachear a leitura e atualizar somente a parte afetada pelo
evento realtime. Não criar um quinto endpoint pesado.

### C2 — Alto — histórico clínico cresce sem limite

**Evidência:** `getMeuDiaData` busca todas as fichas e todos os eventos dos pacientes do dia,
sem janela ou limite. `FichasTab` busca todas as fichas, depois todos os eventos e evoluções do
paciente, também sem paginação. O próprio comentário do Meu Dia depende de uma medição antiga
de “máximo 8 fichas”, não de uma trava do código.

**Impacto:** pacientes antigos tornam o payload, a redução em memória e a quantidade de cards
cada vez maiores. É um defeito de escala acumulativo.

**Correção:** Meu Dia recebe resumo recente + pendências abertas + estado atual da boca; histórico
completo passa a paginação “carregar anteriores”. Ficha Completa abre com as últimas visitas e
carrega blocos antigos sob demanda, sem perder acesso ao prontuário integral.

### C3 — Alto — dependências de produção com avisos de segurança

**Evidência:** `next@16.1.6` tem avisos altos corrigidos em versão 16.3.x. A cadeia
`officeparser -> pdfjs-dist` inclui aviso de execução de JavaScript em PDF malicioso; o produto
processa documentos enviados por usuários. Há outros avisos transitivos em `@google/genai`.

**Impacto:** superfície real de arquivos externos e infraestrutura web. A auditoria não prova
exploração, mas manter versões avisadas antes do lançamento é risco desnecessário.

**Correção:** atualização focada, nunca em lote: Next + `eslint-config-next`; depois
`officeparser` com regressão de PDF/DOCX; depois `@google/genai` dentro do major atual. Rodar
typecheck, testes, build, login, upload e geração clínica após cada commit.

### C4 — Médio/alto — tempestade de `router.refresh()`

**Evidência:** 46 ocorrências. Hotspots: Orçamentos (9), Meu Dia (6 executáveis + callbacks),
Paciente (7) e Configurações (3). Cada refresh pode repetir layout, autorização, billing e
queries da página — além do Dex global de C1.

**Impacto:** ações simples parecem travar porque a árvore server-side inteira é reconstruída.

**Correção:** revisar mutação por mutação. Preferir estado otimista/local quando a resposta já
traz o dado novo; usar revalidação direcionada quando o servidor for a fonte obrigatória.
Não remover refresh em massa: alguns protegem consistência clínica e financeira.

### C5 — Médio — componentes client-side monolíticos

**Evidência:** `FichasTab` tem cerca de 2.955 linhas; Agenda 2.385; Orçamentos 2.245;
Paciente 1.817; Configurações 1.258; `ToothDetailPanel` 1.261; `Odontograma` 1.182. Agenda e
Meu Dia entram como grandes fronteiras client-side; Fichas e Documentos já usam import dinâmico,
o que é uma proteção positiva.

**Impacto:** parse/hidratação e rerenders abrangem áreas maiores que o necessário; manutenção
fica perigosa. O tamanho de arquivo não prova lentidão sozinho, mas coincide com os hotspots de
efeitos e refresh.

**Correção:** separar por fronteira de estado/uso, não por estética: grade da agenda, modal,
painel de edição e seções secundárias. Medir bundle/render antes e depois; evitar contextos novos
globais e `memo` indiscriminado.

### C6 — Médio — efeitos causam renders extras e risco de hidratação

**Evidência:** ESLint acusa 17 erros e 65 avisos. Entre os ativos estão estados espelhados em
effects no modal de orçamento, command palette, Dex, drawer mobile, tema, painel dental,
apresentação e inputs de data. Agenda tem 10 effects, Paciente 11, Meu Dia 8 e Apresentação 7.
Uma auditoria de runtime anterior reproduziu React #418 em quatro rotas.

**Impacto:** flicker, render duplo, estados temporariamente divergentes e dificuldade de prever
o custo de interação.

**Correção:** R-25 deve eliminar estado derivável, inicializar estado no evento de abertura e
isolar sincronizações externas reais. Resolver por família e validar visualmente, não aplicar
substituição mecânica.

### C7 — Médio — testes e lint não protegem o deploy

**Evidência:** não há script `test`; três testes falham antes de executar por alias. CI roda
typecheck e build, mas lint usa `continue-on-error: true`; nenhum teste roda no workflow.
`next build` pula validação de tipos por configuração — seguro apenas quando o deploy respeita
o CI do GitHub.

**Impacto:** uma regressão lógica pode chegar à produção com build verde. Deploy direto pela
Vercel pode não herdar o gate de typecheck, dependendo da configuração do projeto.

**Correção:** padronizar runner compatível com TypeScript/aliases, criar `npm test`, incluir no
CI e tornar lint bloqueante depois de zerar o baseline. Confirmar que produção depende do check.

### C8 — Médio/baixo — código morto confirmado e dependências sem uso

Foram confirmados 19 arquivos sem consumidor ativo: cerca de 2.881 linhas/116 KB de fonte.

- Dashboard/layout: `atendimentos-hoje`, `financeiro-hub`, `ganhos-7dias-chart`,
  `primeiros-passos-card`, `today-agenda`, cadeia `sidebar/sidebar-content/clinic-switcher`.
- Fluxos antigos: `ativacao-card`, `sync-button`, `whatsapp-connect-sheet`,
  `whatsapp-status-dot`, `PendenciasTab`, `tooth-group-list`, `ParticleNetwork`.
- Bibliotecas antigas: `rotina-boca`, `send-pdf` + seu gerador `lib/pdf/orcamento`,
  `uploadPatientPhoto`.
- Dependências sem import confirmado em `src`: `driver.js` e `openai`.
- `server-only` é importado diretamente, mas não está declarado no `package.json`.

**Correção:** remover por cadeias independentes, uma por commit, repetindo busca de import,
typecheck, lint e build. Antes de retirar `send-pdf` ou parser, confirmar que não existe chamada
externa/webhook fora do TypeScript. Não apagar em lote nesta auditoria.

### C9 — Baixo — ambiente local faz trabalho inútil

**Evidência:** `npm run lint` entrou em `.claude/worktrees` e chegou a artefatos `.next` antigos.
O ESLint ignora `.next`, mas não ignora a raiz `.claude`. Há 1,46 GB de worktrees e 4,02 GB no
`.next` atual.

**Impacto:** lint lento/travado e consumo de disco na máquina de desenvolvimento; não afeta o
celular do dentista.

**Correção:** ignorar `.claude/**` e `.codex/**` no ESLint. Limpeza física dos worktrees só após
verificação de que nenhum contém trabalho não integrado; não automatizar exclusão.

### C10 — Baixo/médio — animações contínuas caras em poucos pontos

O background arquitetônico global faz apenas uma entrada de 700 ms e respeita redução de
movimento; ele não é a causa principal. Porém `.btn-glow` anima `box-shadow` infinitamente em
botões ativos do dashboard e não possui fallback `prefers-reduced-motion`. A classe antiga
`.blob-shape` também anima filtros caros, mas não tem consumidor encontrado.

**Correção:** tornar glow estático/hover em mobile e respeitar redução de movimento. Remover CSS
órfão junto do R-95. Preservar a identidade visual sem animação por frame constante.

### C11 — Candidato, precisa medir — índices compostos das leituras quentes

As consultas quentes combinam clínica, paciente/dentista e ordenação por data, enquanto o banco
tem vários índices simples. São candidatos a `EXPLAIN (ANALYZE, BUFFERS)`:

- `fichas (clinica_id, paciente_id, data_atendimento desc, created_at desc)`;
- `odontograma_eventos (clinica_id, paciente_id, registrado_em desc, created_at desc)`;
- `agendamentos (clinica_id, dentista_id, data_hora)`.

Não criar migration por palpite: medir produção/read replica primeiro e conferir tamanho/uso dos
índices atuais.

## Controles positivos encontrados

- `getPatientWorkspaceData` e as ondas principais de `getMeuDiaData` já usam `Promise.all`.
- Meu Dia evita catálogo/destinos quando não há atendimento.
- Ficha e Documentos do paciente já são carregados dinamicamente por aba.
- TypeScript estrito passa e o build de produção conclui.
- Background global respeita `prefers-reduced-motion` e não tem rede/canvas.
- Consultas revisadas mantêm `clinica_id`; nenhum novo furo multi-tenant foi identificado nesta
  auditoria estática. Isso não substitui gate RLS com duas contas.

## Ordem recomendada de execução

1. **Patch de segurança (R-131):** Next e parser de documentos, isoladamente.
2. **R-129 / Dex:** badge leve global e detalhes sob demanda; medir navegação antes/depois.
3. **R-129 / histórico:** limitar payload inicial e paginar sem esconder prontuário.
4. **R-129 / refresh:** remover somente refreshes redundantes comprovados.
5. **R-132:** runner de testes + CI; depois zerar lint e torná-lo bloqueante.
6. **R-95:** remover código morto em commits pequenos e dependências realmente órfãs.
7. **R-129 / componentes:** quebrar apenas os monólitos que continuarem caros nas medições.
8. Medir os índices candidatos antes de qualquer migration.

## Pontuação de dívida técnica

Fórmula da auditoria: `(Impacto + Risco) × (6 − Esforço)`, escala 1–5.

| Fila | Item | Pontos |
|---|---|---:|
| 1 | Gate de testes/CI (C7) | 32 |
| 2 | Dependências vulneráveis (C3) | 30 |
| 3 | Dex global ansioso (C1) | 27 |
| 4 | Histórico sem limite (C2) | 27 |
| 5 | Refreshes redundantes (C4) | 21 |
| 6 | Effects/hidratação (C6) | 18 |
| 7 | Código morto/deps órfãs (C8) | 16 |
| 8 | Ignore local do ESLint (C9) | 15 |

## Limitações honestas

- Esta rodada foi estática + build/test/lint; não repetiu todos os fluxos autenticados em
  celular real. As latências de 2–4,5 s e Configurações chegando a 8 s vêm da varredura de 24/08
  e servem apenas como evidência complementar.
- Bundle bruto não equivale ao transferido após compressão/cache.
- “Sem import” não autoriza apagar endpoint externo ou webhook; a confirmação final acontece
  imediatamente antes de cada remoção.
- Índices e ganhos de banco exigem `EXPLAIN ANALYZE`; não foram inventados como certeza.
