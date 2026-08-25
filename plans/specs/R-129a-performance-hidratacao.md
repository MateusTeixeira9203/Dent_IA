# R-129a — Performance e hidratação do workspace

> **SPEC** · **R-129a** · fase **plano — aguardando execução**
> **Aberto:** 2026-08-24 · **Migration:** zero

## 1. Problema

Transições clínicas levam 2–4,5 s, Configurações pode ficar apenas com o logo por vários
segundos e o console registra `React #418`. O usuário não distingue carregamento de falha.

## 2. Decisão

Medir antes de otimizar. Corrigir primeiro o mismatch e os efeitos de montagem do shell; depois
atacar somente consultas/código que a medição confirmar lentos. Não esconder erro com
`suppressHydrationWarning`, não adicionar cache global e não fazer refactor amplo.

## 3. Objetivo e funcionamento

Toda navegação responde visualmente de imediato, mantém estrutura estável enquanto carrega e
entrega conteúdo útil sem erro de hidratação. Busca e troca de visão nunca mostram controle
novo com conteúdo velho sem indicar transição.

## 4. Contrato técnico

### Fase A — diagnóstico reproduzível

- Medir cinco vezes as rotas do plano-mestre, separando clique → feedback, resposta do servidor
  e hidratação.
- Mapear o primeiro componente divergente do `React #418` em build de desenvolvimento.
- Usar `performance.mark/measure` apenas em desenvolvimento; nenhum dado clínico em log.

### Fase B — shell e hidratação

- Estado derivável de `matchMedia`, tema, rota ou props não nasce de `setState` de montagem se
  puder usar snapshot estável (`useSyncExternalStore`) ou markup idêntico.
- `PageTransition` não pode esconder conteúdo até JS montar.
- Loading de rota usa skeleton da própria superfície, sem tela vazia/logo isolado.
- Remover apenas os erros de lint dos componentes tocados e configurar o lint para ignorar
  worktrees/builds; a dívida restante vira contagem explícita, não bloqueio invisível.

### Fase C — dados

- Consultas independentes continuam em `Promise.all`.
- Instrumentar `getPatientWorkspaceData`, Agenda e Configurações por bloco; otimizar o bloco
  dominante, evitando buscar abas pesadas que não são necessárias no primeiro paint quando a
  separação não muda autorização nem consistência.
- Busca de paciente usa debounce/cancelamento já existente ou equivalente simples; resultado
  antigo nunca substitui consulta mais nova.

## 5. Estados

| Estado | Tela |
|---|---|
| Navegando | skeleton imediato da rota de destino |
| Carregado | conteúdo substitui skeleton sem salto estrutural grande |
| Erro | `error.tsx`/mensagem acionável; nunca espera infinita |
| Busca | indicador discreto; lista anterior não se declara resultado novo |

## 6. Referência visual

Mesma geometria das páginas atuais. Skeletons usam `bg-card`, `border-border` e dimensões do
bloco real. Transição de opacidade curta, sem deslocamento de 14 px em toda navegação.

## 7. Invariantes

- Auth, RLS, filtros por clínica e dados retornados não mudam.
- Nenhum dado sensível entra em telemetria.
- Otimização não introduz estado global novo nem dependência.
- Conteúdo server-rendered continua útil sem esperar uma flag `mounted`.

## 8. Gates de aceite

- [ ] Zero `React #418` em Dashboard, Meu Dia, Agenda, paciente e Configurações.
- [ ] Clique produz feedback visual em até 100 ms no dispositivo de teste.
- [ ] Em cinco navegações quentes na mesma rede, mediana até conteúdo útil é ≤1,5 s; qualquer
      exceção fica explicada por uma consulta medida e registrada.
- [ ] Configurações nunca fica em estado de logo isolado; skeleton aparece imediatamente.
- [ ] Trocar Dia/Semana/Mês mantém estado de carregamento coerente até os dados correspondentes.
- [ ] Buscar paciente rapidamente não mostra resposta de consulta anterior.
- [ ] Lint focado nos arquivos tocados, TypeScript e build passam.

## 9. Fora de escopo

- CDN, troca de banco, Redis/caching especulativo e reescrita do Supabase.
- Zerar todos os avisos antigos do repositório.
