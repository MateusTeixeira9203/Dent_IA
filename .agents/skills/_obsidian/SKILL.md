---
name: obsidian
description: >
  Lê e escreve no vault Obsidian (brain_m) — o segundo cérebro. Salva decisões,
  captura ideias, busca contexto, registra aprendizados de livros, e atualiza
  projetos. Use quando: "salva no obsidian", "anota isso", "captura essa ideia",
  "salva essa decisão", "o que eu sei sobre X", "busca no brain", "adiciona ao
  projeto Y", "salva esse aprendizado", "nota rápida".
cpe:
  source: cpe-personal
  integrated_at: 2026-06-24
  adaptation: Atlas-authored — vault em C:\Users\mateu\Desktop\brain_m
---

# Obsidian — Segundo Cérebro

Lê e escreve no vault `brain_m`. É a memória durável e pessoal — diferente do
`plans/` (histórico de sessão por projeto) e do `~/.Codex/memory/` (perfil de
trabalho), o Obsidian guarda **conhecimento**: decisões, aprendizados, projetos,
ideias, livros.

## Vault

```
VAULT = C:\Users\mateu\Desktop\brain_m
```

## Estrutura

| Pasta | O que vai lá |
|---|---|
| `Entrada/` | Captura rápida, inbox, notas do Kindle |
| `Projetos/` | Um arquivo por projeto ativo |
| `Produto/` | Decisões de produto, estratégia, visão |
| `Arquitetura/` | Decisões técnicas, ADRs, escolhas de stack |
| `Livros/` | Aprendizados, citações, discussões de livros |
| `Pesquisa/` | Referências, tecnologias, artigos |
| `Ideias/` | Pensamentos em desenvolvimento |
| `Templates/` | Templates (não escrever aqui) |

## Operações

### Captura rápida → Entrada/

Para notas rápidas, ideias soltas, qualquer coisa que ainda não tem lugar:

```
Arquivo: Entrada/YYYY-MM-DD-HHmm-{slug}.md
Template: Templates/entrada.md
```

### Salvar/atualizar projeto → Projetos/

```
Arquivo: Projetos/{NomeProjeto}.md
```
Se já existe, **atualize** — não crie duplicata. Adicione ao Log de evolução
com a data de hoje. Se não existe, use o template `Templates/projeto.md`.

### Salvar decisão → Produto/ ou Arquitetura/

```
Arquivo: Produto/{slug-decisao}.md   (decisão de negócio/produto)
         Arquitetura/{slug-decisao}.md (decisão técnica/stack)
Template: Templates/decisao.md
```

### Salvar livro → Livros/

```
Arquivo: Livros/{Titulo}-{Autor}.md
Template: Templates/livro.md
```

### Buscar contexto

Use Grep no vault para encontrar conteúdo relevante:

```bash
grep -ril "{termo}" "C:\Users\mateu\Desktop\brain_m" --include="*.md"
```

Para ler um arquivo encontrado, use Read com o caminho completo.

### Listar projetos ativos

```bash
ls "C:\Users\mateu\Desktop\brain_m\Projetos\"
```

## Regras

- **Nunca duplique.** Antes de criar, verifique se já existe um arquivo para
  aquele projeto/decisão. Se existir, atualize.
- **Frontmatter sempre.** Todo arquivo começa com `---` e campos mínimos
  (tipo, data, tags).
- **Entrada é inbox.** Notas em `Entrada/` precisam ser processadas — mova
  para a pasta certa quando tiver contexto suficiente.
- **Log de evolução em projetos.** Toda atualização num arquivo de projeto
  adiciona uma entrada datada no final, não edita o texto existente.
- **Paths completos.** Ao usar Read/Write, sempre use o caminho absoluto
  começando por `C:\Users\mateu\Desktop\brain_m\`.
