# R-131 — Patches de segurança de dependências

> **SPEC** · **R-131** · aprovada pelo usuário em 2026-08-25
> **Aberto:** 2026-08-25 · **Fechado:** — · **Fase:** aprovada
> **Migration:** nenhuma.

## 1. Problema

`npm audit --omit=dev` encontrou 13 avisos em dependências de produção, incluindo
vulnerabilidades altas na cadeia do Next.js e em `pdfjs-dist`, usado pelo
`officeparser` para documentos enviados pelos usuários.

## 2. Decisão

Atualizar em três commits independentes, sem `npm audit fix` amplo:

1. `next` e `eslint-config-next`: `16.1.6` → `16.3.3`;
2. remover `officeparser` e extrair o texto de `.pptx` diretamente do ZIP/XML com
   `fflate`; a investigação pós-upgrade mostrou que até `officeparser@7.8.0` fixa
   `pdfjs-dist@6.1.200`, ainda vulnerável e incompatível com a versão corrigida sob o
   Node atual;
3. `@google/genai`: `1.46.0` → `1.52.0` (última versão da mesma major).

Não há mudança de schema, RLS, API pública ou desenho de interface.

## 3. Objetivo

Reduzir a superfície conhecida de vulnerabilidades sem misturar upgrade de framework,
parser de documentos e SDK de IA no mesmo lote de código.

## 4. Contrato técnico

- `package.json` e `package-lock.json` refletem somente a dependência do commit atual.
- Next e `eslint-config-next` atualizam juntos por serem versões acopladas.
- O fluxo de upload/processamento continua em `POST /api/processar-documento` e não recebe
  arquivos nem caminhos novos. Para `.pptx`, `extractTextFromFile` descompacta apenas
  `ppt/slides/slide*.xml` e as notas correspondentes em `ppt/notesSlides/`, concatena os nós
  de texto (`a:t`) na ordem de cada lâmina e devolve texto simples; não processa PDF nem
  executa conteúdo do arquivo.
- A integração Gemini continua usando o provider existente em `src/lib/ai/provider.ts`.

## 5. Comportamento

- Upload de PDF/DOCX válido continua extraindo texto como antes; `.pptx` continua retornando
  texto de seus slides.
- Documento inválido continua devolvendo erro controlado, sem travar a rota.
- Uma chamada Gemini estruturada mantém o mesmo schema e retorno tipado.
- Login, build e páginas App Router continuam funcionais após o upgrade do Next.

## 6. Referência visual

Não se aplica: sem UI nova ou alterada.

## 7. Invariantes

- Nenhuma migração e nenhuma alteração de dados clínicos.
- Nenhuma atualização em lote fora das três dependências declaradas.
- `npm audit` restante é documentado; aviso sem correção disponível não é mascarado.
- Cada upgrade é reversível isoladamente.

## 8. Gates de aceite

- `npm run typecheck` e `npm run build` passam após cada commit.
- Após remover `officeparser`, a extração de PPTX sintético com dois slides devolve os textos
  na ordem esperada; PDF e DOCX permanecem inalterados.
- Após Gemini, os testes/rotas de estruturação tipada existentes passam.
- `npm audit --omit=dev` reduz ou elimina os avisos corrigíveis das cadeias atualizadas.

## 9. Fora de escopo

- Atualização major do Gemini.
- Refactor de upload, IA, autenticação ou Next App Router.
- Correção de vulnerabilidades sem versão corrigida no ecossistema.
