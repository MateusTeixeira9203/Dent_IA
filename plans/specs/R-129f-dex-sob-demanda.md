# R-129f — Dex sob demanda

> **SPEC** · **R-129f** · aprovada pelo usuário em 2026-08-25
> **Aberto:** 2026-08-25 · **Fechado:** — · **Fase:** aprovada
> **Migration:** nenhuma.

## 1. Problema

O `DexWidget` monta em toda rota autenticada e chama `useDexHub()` imediatamente. O hook
busca alertas, contexto, retenção e números mensais, mesmo quando o dentista nunca abre o
painel. Uma notificação nova repete as quatro leituras.

## 2. Decisão

Separar o dado leve do painel completo:

- dock: apenas contagem de notificações não lidas;
- painel fechado: zero chamadas a contexto, retenção e mês;
- painel aberto: carrega os quatro dados atuais e preserva o resultado em memória por dois
  minutos; atualização manual ignora esse cache;
- realtime fechado atualiza apenas a contagem; realtime aberto atualiza apenas alertas.

## 3. Objetivo

Eliminar as três rotas pesadas do carregamento/navegação do dashboard sem remover nenhuma
informação do Dex quando o profissional decidir abri-lo.

## 4. Contrato técnico

```ts
type DexBadgeResponse = { count: number };

// GET /api/dex/alerts?modo=badge
// autenticação e recorte por clinica/role/dentista idênticos ao endpoint atual.
```

- `GET /api/dex/alerts` sem query mantém o contrato atual de alertas completos.
- `GET /api/dex/alerts?modo=badge` retorna somente a contagem de notificações não lidas.
- O hook do badge faz uma query contada e entrega a contagem diretamente ao dock.
- O hook do hub recebe `enabled`; sem painel aberto não faz fetch nem assinatura de dados
  pesados.
- Toda query continua usando a clínica e o recorte atual do usuário; nenhuma service role
  entra nesta mudança.

## 5. Comportamento

| Estado | Resultado |
|---|---|
| Dashboard abre, Dex fechado | badge pode carregar; não há request para `/context`, `/retencao` ou `/mes` |
| Profissional abre Dex | quatro dados carregam uma vez e o modal mostra skeleton até concluir |
| Fecha e reabre em até 2 min | usa os dados em memória, sem novo lote pesado |
| Clica em atualizar | recarrega os quatro dados, mesmo dentro da janela |
| Notificação chega com Dex fechado | apenas badge atualiza |
| Notificação chega com Dex aberto | alertas atualizam; contexto, retenção e mês não recarregam |
| Marcar notificação como lida | card some otimisticamente e badge sincroniza |

## 6. Referência visual

Nenhuma alteração visual. Modal, dock, badge, skeleton e motion existentes são preservados.

## 7. Invariantes

- O Dex fechado não atrasa Meu Dia, Agenda, Ficha ou Orçamentos.
- Abrir Dex continua exibindo pendências, agenda do dia, números mensais e novidades atuais.
- Uma notificação de outra clínica nunca entra no badge nem no painel.
- Falha do badge não bloqueia o dashboard; falha do painel mantém o erro já existente.
- Não criar endpoint adicional para cada coluna; o modo leve pertence a `alerts`.

## 8. Gates de aceite

- Em carga limpa de `/dashboard/meu-dia`, network não mostra `/api/dex/context`,
  `/api/dex/retencao` ou `/api/dex/mes` antes do clique no Dex.
- Abrir o Dex executa essas três rotas e entrega todos os dados atuais.
- Fechar/abrir dentro de dois minutos não repete o lote completo; botão atualizar repete.
- Inserir notificação para o usuário atual aumenta o badge; inserção de outra clínica não.
- TypeScript, lint focado e build passam.

## 9. Fora de escopo

- Novo design do Dex, novos alertas ou mudança de regras clínicas.
- Paginação do histórico, redução de `router.refresh()` e divisão dos monólitos (próximas
  fatias do R-129).
