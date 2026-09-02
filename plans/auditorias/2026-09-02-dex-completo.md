# Auditoria completa do DEX — transcrição e captura

> **Data:** 02/09/2026 · **Escopo:** captura por voz/arquivo, transcrição, organização clínica e
> rotas `/api/dex/*` · **Ambientes:** Preview Vercel `dpl_4izMmTdWEPaNPtWyX1sF9QwxpCdM` (`main`,
> commit `19cbf0a`) e leitura do projeto Supabase `zenfemoxvwerplrjgfqz` · **Escritas:** nenhuma.

## Veredito

O DEX não está funcionando por completo. A transcrição está bloqueada por um erro de autorização
determinístico antes da chamada à Groq: a rota procura `dentistas.usuario_id`, mas o schema remoto
possui `dentistas.user_id`. O Preview registrou `POST /api/transcrever 401` nas duas tentativas
observadas. Portanto, trocar a chave Groq ou fazer novo redeploy sem corrigir a rota não resolve.

As demais rotas DEX usam o helper de autenticação compartilhado e não repetem esse mismatch, mas a
transcrição autenticada, a chamada real à Groq, formatos de arquivo e gravação em mobile ainda não
foram provados ponta a ponta.

## Evidência principal

| Evidência | Resultado |
|---|---|
| Preview Vercel | `POST /api/transcrever 401` às 15:03:40 e 15:03:48 UTC; deployment READY |
| Código da rota | `src/app/api/transcrever/route.ts:19-23` filtra `.eq('usuario_id', user.id)` |
| Schema Supabase | `public.dentistas` tem `user_id`; FK `dentistas_user_id_fkey` aponta para `auth.users(id)` |
| Policies | SELECT/UPDATE dependem de `belongs_to_active_clinic`; o helper canônico respeita clínica ativa |
| Dados atuais | 14 dentistas, 14 usuários vinculados, 0 usuários com mais de um vínculo |
| Regressão automatizada | 171/171 testes passaram; TypeScript estrito passou |

## Matriz auditada

| Área | Estado | Observação |
|---|---|---|
| Captura ao vivo | Parcial | MediaRecorder negocia WebM/Opus ou MP4; permissões e erros têm mensagens distintas, mas não houve prova em todos os browsers/dispositivos |
| Upload de áudio | **Falha P0** | Toda chamada autenticada passa pela consulta com coluna inexistente e retorna 401 |
| Retry sem novo ditado | Implementado, não provado | Blob fica retido no painel e o botão tenta novamente na mesma montagem |
| Bloqueio de salvar com áudio pendente | Implementado, não provado | `hasPendingAudio` impede organização/salvamento até resolver ou descartar |
| Arquivo de áudio | Parcial | `.opus` é reconhecido no cliente, mas `audio/opus` não está na allowlist da rota |
| Texto manual | Implementado | Campo não é apagado quando a organização falha |
| Organização clínica | Parcial | Rotas usam saída estruturada/Zod em vários pontos; integração real depende da autenticação e provider |
| Rotas `/api/dex/*` | Parcial | Todas as rotas vistoriadas usam `getDentistaCached()`; não houve chamada autenticada de cada uma |
| Rate limit | Parcial | Redis/Upstash é preferido; sem configuração ou após erro há fallback em memória por instância |
| Observabilidade | Parcial | Erro da Groq vira 502 genérico; não há status/request id do provider nem timeout/cancelamento de transporte na rota |
| Mobile, Safari e silêncio | Não verificado | Código prevê MP4 e corte por silêncio, mas falta prova real em dispositivos |

## Achados

### P0 — autenticação da transcrição usa coluna inexistente

Em `src/app/api/transcrever/route.ts`, a consulta usa `usuario_id`. O banco atual usa `user_id`.
O erro da consulta é ignorado; `dentista` fica nulo e a rota devolve 401. Isso explica exatamente
a mensagem do usuário e os logs do Preview. A correção deve usar `getDentistaCached()` para
autenticar usuário e clínica ativa, evitando uma segunda regra de tenancy.

### P1 — frontend esconde o motivo real da falha

`src/hooks/useCapturaLivre.ts` trata qualquer resposta não-2xx como `Erro <status>` e mostra sempre
“Não foi possível transcrever...”. Os códigos `UNAUTHORIZED`, `UNSUPPORTED_MEDIA`, `413` e `502`
não chegam ao dentista. Isso aumenta o tempo de diagnóstico e faz um problema de configuração
parecer falha aleatória de áudio.

### P1 — não há teste de integração da rota de áudio

Existem testes de utilitários, mas nenhum cobre `/api/transcrever`, `useCapturaLivre` ou
`useAudioRecorder` com Supabase/Groq simulados. O mismatch de coluna passou sem ser detectado.

### P2 — rota de áudio não usa o caminho comum do provider

Ela instancia `Groq` diretamente e não reaproveita retry/timeout/logging de
`src/lib/ai/provider.ts`. O timeout existente é `Promise.race` (não cancela o transporte), e a rota
não diferencia erro de credencial, limite, formato ou indisponibilidade do provider nos logs.

### P2 — MIME aceito pelo cliente diverge do servidor

O parser considera `.opus` áudio, mas `MIME_AUDIO_ACEITOS` não inclui `audio/opus`. Uploads que o
browser identificar dessa forma recebem 415 mesmo com uma extensão válida. Também convém normalizar
aliases comuns (`audio/x-wav`, `audio/x-m4a`, `audio/aac`) somente após confirmar o suporte da Groq.

### P2 — rate limit perde consistência sem Upstash

O fallback em memória é por instância/serverless, portanto não é um limite global confiável em
múltiplas instâncias. Não causou o 401 observado, mas deve ser tratado como requisito de produção.

### P3 — cobertura de browser e captura ainda é insuficiente

O código cobre permissão negada, hardware, MediaRecorder e corte por silêncio, mas não existe prova
automatizada ou manual documentada para Safari/iOS, Android, ausência de `AudioContext`, ruído de
consultório, arquivo longo e interrupção de chamada.

## O que foi provado e o que não foi

**Provado:** causa do 401 no Preview; divergência do schema; uso do helper canônico nas outras rotas;
limites e allowlist declarados; retenção/retry do Blob no código; 171 testes e TypeScript.

**Não provado:** transcrição bem-sucedida com a nova chave Groq no Preview; validade/escopo da chave
no ambiente Vercel; chamada efetiva ao Whisper; todos os endpoints DEX com sessão real; upload `.opus`;
captura em Safari/iOS/Android; RLS com duas contas; rate limit distribuído.

## Ordem segura para corrigir e revalidar

1. Corrigir a autenticação de `/api/transcrever` com `getDentistaCached()` e adicionar teste de
   regressão que falhe se `usuario_id` voltar.
2. Retornar/mapear `code` no cliente (`401`, `413`, `415`, `429`, `502`) sem apagar o áudio pendente.
3. Adicionar testes de integração com Supabase e Groq mockados: sessão válida, sem dentista,
   clínica ativa, MIME, tamanho, provider 429/5xx e resposta vazia.
4. Alinhar MIME cliente/servidor, começando por `audio/opus` e aliases comprovadamente suportados.
5. Centralizar timeout, retry e logs agregados do provider; medir latência e falhas sem registrar
   áudio, texto clínico ou chave.
6. Reimplantar Preview, sair/entrar novamente e provar uma transcrição real; depois repetir arquivo,
   retry, descarte, texto manual e salvar ficha.
7. Fazer a rodada de browser/dispositivo e RLS com duas contas antes de promover para produção.

## Conclusão

O bloqueio atual é de código/configuração de tenancy, não evidência de que a nova chave Groq esteja
inválida. Nenhum código, migration, deploy ou dado foi alterado nesta auditoria. O item deve voltar
como correção prioritária antes de considerar o DEX aprovado.
