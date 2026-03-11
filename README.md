# DentAI

Micro-SaaS odontológico com inteligência artificial para gestão de clínicas dentárias.

## Funcionalidades

- **Gestão de pacientes** — cadastro, histórico e ficha clínica completa
- **Fichas clínicas com IA** — transcrição de áudio via Whisper, extração de dados de documentos e radiografias via GPT-4o
- **Orçamentos** — geração automática a partir das fichas, envio por WhatsApp
- **Multi-tenant** — isolamento por clínica com Row Level Security no Supabase
- **Onboarding** — fluxo de cadastro guiado para novas clínicas
- **Autenticação** — login, cadastro, recuperação de senha via Supabase Auth

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router) |
| Linguagem | TypeScript estrito |
| Banco de dados | Supabase (PostgreSQL + RLS) |
| Autenticação | Supabase Auth |
| Estilização | Tailwind CSS v4 + shadcn/ui |
| IA | OpenAI GPT-4o + Whisper |
| WhatsApp | Evolution API |
| Pagamentos | Stripe |
| Deploy | Vercel |

## Estrutura do projeto

```
/
├── dentai/                  # Aplicação Next.js
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/      # Login, cadastro, recuperação de senha
│   │   │   ├── dashboard/   # Área autenticada
│   │   │   │   ├── pacientes/
│   │   │   │   ├── fichas/
│   │   │   │   ├── orcamentos/
│   │   │   │   └── configuracoes/
│   │   │   ├── onboarding/  # Fluxo de setup inicial
│   │   │   └── api/         # Route Handlers
│   │   ├── components/      # Componentes reutilizáveis
│   │   ├── lib/             # Supabase, auth, utils
│   │   ├── hooks/           # Custom hooks
│   │   └── types/           # Tipos TypeScript
│   └── package.json
├── supabase/
│   ├── config.toml
│   └── migrations/          # Migrations do banco
├── lib/                     # Lógica compartilhada (IA, WhatsApp, Stripe)
└── types/                   # Tipos globais
```

## Configuração local

### Pré-requisitos

- Node.js 20+
- Conta no [Supabase](https://supabase.com)
- Chave de API da [OpenAI](https://platform.openai.com)

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/dentai.git
cd dentai
```

### 2. Instale as dependências

```bash
cd dentai
npm install
```

### 3. Configure as variáveis de ambiente

Crie o arquivo `dentai/.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key

# OpenAI
OPENAI_API_KEY=sk-...

# Evolution API (WhatsApp) - opcional
EVOLUTION_API_URL=https://sua-instancia.evolution.com
EVOLUTION_API_KEY=sua_api_key

# Stripe - opcional
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 4. Execute as migrations

No painel do Supabase, execute os arquivos em `supabase/migrations/` na ordem numérica.

### 5. Inicie o servidor de desenvolvimento

```bash
cd dentai
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## Banco de dados

O schema é multi-tenant, isolado por `clinica_id` com RLS em todas as tabelas:

- `clinicas` — tenant raiz
- `dentistas` — usuários vinculados a uma clínica
- `pacientes` — pacientes da clínica
- `procedimentos` — tabela de procedimentos/preços
- `fichas` — fichas clínicas (áudio, transcrição, radiografia)
- `orcamentos` + `orcamento_itens` — orçamentos gerados

## Convenções de código

- TypeScript estrito, sem `any`
- Componentes em `/components`, páginas em `/app`, lógica de negócio em `/lib`
- Supabase apenas server-side (Server Components ou Route Handlers)
- Código IA isolado em `/lib/ai`, WhatsApp em `/lib/whatsapp`
- Erros sempre tratados explicitamente
