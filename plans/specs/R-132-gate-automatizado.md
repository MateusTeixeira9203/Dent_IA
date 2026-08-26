# R-132 — Gate automatizado de testes e CI

> **SPEC** · **R-132** · aprovada pelo usuário em 2026-08-26
> **Aberto:** 2026-08-26 · **Fechado:** — · **Fase:** aprovada
> **Migration:** nenhuma.

## 1. Problema

O repositório tem testes `node:test`, mas não possui `npm test`. Três testes com imports `@/`
não iniciam no runner nativo, e o CI não executa testes. O lint permanece informativo porque o
baseline ativo contém 17 erros que pertencem ao R-25; torná-lo bloqueante agora pararia todo
deploy sem melhorar a cobertura.

## 2. Decisão

Adicionar `tsx` como única dependência de desenvolvimento e usar o Node test runner através dele.
`tsx` lê o `tsconfig.json`, inclusive o alias `@/*`, sem migrar os testes existentes nem adicionar
Jest/Vitest. O CI passa a bloquear em typecheck, testes e build. Lint continua executando e
visível, porém não bloqueante até o baseline ser corrigido pelo R-25.

## 3. Objetivo

Garantir que regressões puras — inclusive nos módulos clínicos que não rendem uma página — não
cheguem ao deploy com build verde.

## 4. Contrato técnico

### Scripts

```json
{
  "scripts": {
    "test": "tsx --test src/**/*.test.ts",
    "test:watch": "tsx --test --watch src/**/*.test.ts"
  }
}
```

- `tsx` fica em `devDependencies`, sem afetar bundle de produção.
- Todos os testes atuais continuam em `src/**/*.test.ts` e usam `node:test`/`node:assert`.
- Não adicionar configuração de Jest, Vitest, Babel ou um segundo alias manual.

### CI

O workflow único mantém Node 20 e executa, nesta ordem:

1. `npm ci`;
2. `npm run typecheck`;
3. `npm test`;
4. `npm run lint` como diagnóstico temporariamente não bloqueante, com comentário que referencia R-25;
5. `npm run build`.

`npm test`, typecheck e build nunca recebem `continue-on-error`. A remoção de
`continue-on-error` do lint é fora de escopo até o R-25 eliminar seu baseline sem esconder regras.

## 5. Comportamento

| Estado | Resultado esperado |
|---|---|
| Todos os testes passam | `npm test` encerra com código 0 e o CI avança para lint/build. |
| Teste falha ou não inicia | `npm test` encerra não-zero e bloqueia o workflow antes do build. |
| Import `@/` em teste | é resolvido pelo mesmo `tsconfig.json` usado pelo app. |
| Lint encontra o baseline atual | é reportado no log; não mascara typecheck/test/build. |
| Novo erro de lint após R-25 | passa a ser bloqueante somente quando o baseline tiver sido resolvido. |

Exemplo: `nome-tratamento.test.ts`, que hoje falha em `ERR_MODULE_NOT_FOUND` para `@/types`,
deve iniciar e executar no mesmo comando que `extract-text.test.ts`.

## 6. Referência visual

Não se aplica: não há UI.

## 7. Invariantes

- Não mover ou reescrever testes clínicos apenas para satisfazer o runner.
- Não esconder erros de lint com exclusões amplas, `--quiet` ou `|| true`.
- Não alterar runtime, schema, RLS ou configuração da Vercel.
- CI continua reproduzível por `npm ci` e pelos scripts do `package.json`.

## 8. Gates de aceite

- [ ] `npm test` encontra e executa todos os `src/**/*.test.ts` localmente, inclusive testes com `@/`.
- [ ] Falhar deliberadamente uma asserção em um arquivo temporário faz `npm test` falhar; o arquivo não entra no commit.
- [ ] `npm run typecheck` e `npm run build` passam com o runner instalado.
- [ ] Pull request com teste falho mostra falha no job de CI antes do build.
- [ ] O lint aparece no CI como diagnóstico e não é indevidamente declarado verde/bloqueante enquanto R-25 estiver aberto.

## 9. Fora de escopo

- Zerar os erros e avisos do lint (R-25).
- E2E de browser, seed de Supabase, testes de RLS ou Stripe.
- Refactor dos módulos testados e remoção de código morto (R-95).
