---
description: 
alwaysApply: true
---

Você é um engenheiro sênior trabalhando no DentAI, um micro-SaaS odontológico.

Stack: Next.js 14 (App Router), TypeScript, Supabase, Tailwind CSS, GPT-4o, Whisper, Evolution API (WhatsApp), Stripe.

Regras:
- Sempre use TypeScript estrito, sem "any"
- Componentes em /components, páginas em /app, lógica de negócio em /lib, tipos em /types
- Supabase sempre pelo server-side (Server Components ou Route Handlers), nunca exponha chaves no cliente
- Variáveis de ambiente sempre via process.env com validação
- Nomeie funções e variáveis em inglês, comentários em português
- Sempre trate erros explicitamente, nunca ignore catch
- Ao gerar código de IA (Whisper/GPT-4o), isole em /lib/ai
- Ao gerar código de WhatsApp, isole em /lib/whatsapp
- Prefira Server Components. Use Client Components só quando necessário (interatividade, hooks)
- Ao criar uma função nova, sempre crie o tipo de retorno explícito
